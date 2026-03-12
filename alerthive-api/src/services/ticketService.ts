import { TicketStatus, AlertPriority, IssueCategory, Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';

interface ListTicketsOpts {
  orgId: string;
  status?: TicketStatus;
  priority?: AlertPriority;
  assignedToId?: string;
  page?: number;
  pageSize?: number;
}

export async function listTickets({ orgId, status, priority, assignedToId, page = 1, pageSize = 20 }: ListTicketsOpts) {
  const where: Prisma.TicketWhereInput = {
    orgId,
    ...(status && { status }),
    ...(priority && { priority }),
    ...(assignedToId && { assignedToId }),
  };
  const [items, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        raisedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getTicket(id: string, orgId: string) {
  return prisma.ticket.findFirstOrThrow({
    where: { id, orgId },
    include: {
      raisedBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      comments: {
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function createTicket(
  orgId: string,
  raisedById: string,
  data: { title: string; description: string; priority: string; issueCategory?: string; rootCause?: string; resolution?: string; assignedToId?: string; tags?: string[] },
) {
  const priority = data.priority as AlertPriority;

  // Look up SLA policy for this org+priority to compute slaDueAt
  const sla = await prisma.slaPolicy.findUnique({ where: { orgId_severity: { orgId, severity: priority } } });
  // Fall back to 7 days if no SLA policy configured for this priority
  const slaDueAt = sla
    ? new Date(Date.now() + sla.resolutionTimeMinutes * 60 * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return prisma.ticket.create({
    data: {
      orgId,
      raisedById,
      title: data.title,
      description: data.description,
      priority,
      status: TicketStatus.open,
      issueCategory: (data.issueCategory as IssueCategory) ?? IssueCategory.others,
      ...(data.assignedToId ? { assignedToId: data.assignedToId } : {}),
      tags: data.tags ?? [],
      slaBreached: false,
      slaDueAt,
      ...(data.rootCause ? { rootCause: data.rootCause } : {}),
      ...(data.resolution ? { resolution: data.resolution } : {}),
    },
  });
}

export async function updateTicket(
  id: string,
  orgId: string,
  data: { title?: string; description?: string; status?: string; priority?: string; issueCategory?: string; rootCause?: string; resolution?: string; assignedToId?: string; tags?: string[] },
) {
  const update: Prisma.TicketUpdateInput = {
    ...(data.title && { title: data.title }),
    ...(data.description && { description: data.description }),
    ...(data.priority && { priority: data.priority as AlertPriority }),
    ...(data.issueCategory && { issueCategory: data.issueCategory as IssueCategory }),
    ...(data.rootCause !== undefined && { rootCause: data.rootCause || null }),
    ...(data.resolution !== undefined && { resolution: data.resolution || null }),
    ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
    ...(data.tags && { tags: data.tags }),
  };

  if (data.status) {
    update.status = data.status as TicketStatus;
    if (data.status === TicketStatus.resolved || data.status === TicketStatus.closed) {
      update.resolvedAt = new Date();
    }
  }

  return prisma.ticket.update({ where: { id }, data: update });
}

export async function addComment(ticketId: string, orgId: string, authorId: string, content: string) {
  // Verify ticket belongs to org first
  await prisma.ticket.findFirstOrThrow({ where: { id: ticketId, orgId } });
  return prisma.ticketComment.create({ data: { ticketId, authorId, text: content } });
}

export async function deleteTicket(id: string, orgId: string) {
  await prisma.ticket.findFirstOrThrow({ where: { id, orgId } }); // verify ownership
  await prisma.ticket.delete({ where: { id } });
}

// ── Webhook-originated ticket: create / update / resolve ──────────────────────
//
// Strategy:
//   OPEN event  → look for an active ticket (open/in_progress/on_hold) with the
//                 same orgId + externalId. If found, add a comment + escalate
//                 priority if the new event is higher. If not found, create one.
//   RESOLVED    → find the active ticket and close it. If none, no-op.
//
// The `externalId` is the source-system's canonical problem key:
//   Dynatrace  → "DT::<ProblemID>"
//   UiPath Job → "UP::job::<JobId>"
//   UiPath Q   → "UP::queue::<ItemKey>"
//   UiPath Sched → "UP::sched::<ScheduleName>"
//
export async function createOrUpdateWebhookTicket(
  orgId: string,
  data: {
    externalId: string;
    source: string;
    title: string;
    description: string;
    priority: string;
    tags?: string[];
    rawPayload?: Record<string, unknown>;
    resolve?: boolean;
  },
): Promise<{ action: 'created' | 'updated' | 'resolved' | 'noop'; ticketId: string | null }> {
  const activeStatuses = [TicketStatus.open, TicketStatus.in_progress, TicketStatus.on_hold];

  const existing = await prisma.ticket.findFirst({
    where: { orgId, externalId: data.externalId, status: { in: activeStatuses } },
    orderBy: { createdAt: 'desc' },
  });

  // ── RESOLVED path ─────────────────────────────────────────────────────────
  if (data.resolve) {
    if (!existing) return { action: 'noop', ticketId: null };

    const systemUser = await getOrgSystemUser(orgId);
    await prisma.ticket.update({
      where: { id: existing.id },
      data: {
        status: TicketStatus.resolved,
        resolvedAt: new Date(),
        resolution: `Auto-resolved by ${data.source} — problem cleared.`,
        updatedAt: new Date(),
      },
    });
    if (systemUser) {
      await prisma.ticketComment.create({
        data: {
          ticketId: existing.id,
          authorId: systemUser.id,
          text: `[${data.source}] Problem resolved — this ticket has been automatically closed.`,
        },
      });
    }
    return { action: 'resolved', ticketId: existing.id };
  }

  // ── UPDATE path — existing active ticket ─────────────────────────────────
  if (existing) {
    const priorities = ['info', 'low', 'medium', 'high', 'critical'] as const;
    const existingIdx = priorities.indexOf(existing.priority as (typeof priorities)[number]);
    const incomingIdx = priorities.indexOf(data.priority as (typeof priorities)[number]);
    const shouldEscalate = incomingIdx > existingIdx && incomingIdx !== -1;

    const systemUser = await getOrgSystemUser(orgId);
    if (systemUser) {
      const escalateNote = shouldEscalate ? ` Priority escalated from ${existing.priority} → ${data.priority}.` : '';
      await prisma.ticketComment.create({
        data: {
          ticketId: existing.id,
          authorId: systemUser.id,
          text: `[${data.source}] Problem still active — duplicate event received.${escalateNote} ${data.description}`.trim(),
        },
      });
    }
    if (shouldEscalate) {
      await prisma.ticket.update({
        where: { id: existing.id },
        data: { priority: data.priority as AlertPriority, updatedAt: new Date() },
      });
    }
    return { action: 'updated', ticketId: existing.id };
  }

  // ── CREATE path — no active ticket for this externalId ───────────────────
  const systemUser = await getOrgSystemUser(orgId);
  if (!systemUser) {
    throw new Error(`[WebhookTicket] No active user found in org ${orgId} — cannot raise ticket`);
  }

  const sla = await prisma.slaPolicy.findUnique({
    where: { orgId_severity: { orgId, severity: data.priority as AlertPriority } },
  });
  const slaDueAt = sla
    ? new Date(Date.now() + sla.resolutionTimeMinutes * 60 * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const ticket = await prisma.ticket.create({
    data: {
      orgId,
      raisedById: systemUser.id,
      title: data.title,
      description: data.description,
      priority: data.priority as AlertPriority,
      status: TicketStatus.open,
      issueCategory: IssueCategory.system_issue,
      tags: data.tags ?? [],
      slaBreached: false,
      slaDueAt,
      externalId: data.externalId,
      source: data.source,
      ...(data.rawPayload ? { metadata: data.rawPayload as Prisma.InputJsonValue } : {}),
    },
  });

  return { action: 'created', ticketId: ticket.id };
}

// Returns the most privileged active user in the org (admin first, then any active user).
async function getOrgSystemUser(orgId: string) {
  return prisma.user.findFirst({
    where: { orgId, isActive: true },
    // admin < developer < end_user alphabetically — asc gives admin first
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function checkSlaBreaches(orgId: string) {
  await prisma.ticket.updateMany({
    where: {
      orgId,
      status: { notIn: [TicketStatus.resolved, TicketStatus.closed] },
      slaDueAt: { lt: new Date() },
      slaBreached: false,
    },
    data: { slaBreached: true },
  });
}

/**
 * Find resolved/closed tickets with overlapping tags or similar title keywords.
 * Returns up to `limit` tickets sorted by tag overlap score descending.
 */
export async function findSimilarTickets(orgId: string, ticketId: string, tags: string[], title: string, limit = 5) {
  const resolved = await prisma.ticket.findMany({
    where: {
      orgId,
      id: { not: ticketId },
      status: { in: [TicketStatus.resolved, TicketStatus.closed] },
    },
    select: { id: true, title: true, tags: true, resolvedAt: true, status: true },
    orderBy: { resolvedAt: 'desc' },
    take: 200,
  });

  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'on', 'in', 'for', 'of', 'and', 'or', 'to', 'with', 'at', 'by', 'from']);
  const titleWords = new Set(
    title.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w)),
  );

  const scored = resolved
    .map((t) => {
      const tagOverlap = t.tags.filter(tag => tags.includes(tag)).length;
      const tWords = t.title.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w));
      const titleOverlap = tWords.filter(w => titleWords.has(w)).length;
      const score = tagOverlap * 2 + titleOverlap;
      return { ...t, score };
    })
    .filter(t => t.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}
