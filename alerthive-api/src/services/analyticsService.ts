import { prisma } from '../db/prisma';
import { TicketStatus, AlertStatus, AlertPriority } from '@prisma/client';

interface AnalyticsOpts {
  orgId: string;
  from?: Date;
  to?: Date;
}

export async function getTicketAnalytics({ orgId, from, to }: AnalyticsOpts) {
  const dateFilter = {
    ...(from || to
      ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
  };

  const [total, byStatus, byPriority, breached, avgResolution] = await Promise.all([
    prisma.ticket.count({ where: { orgId, ...dateFilter } }),

    prisma.ticket.groupBy({
      by: ['status'],
      where: { orgId, ...dateFilter },
      _count: { status: true },
    }),

    prisma.ticket.groupBy({
      by: ['priority'],
      where: { orgId, ...dateFilter },
      _count: { priority: true },
    }),

    prisma.ticket.count({ where: { orgId, slaBreached: true, ...dateFilter } }),

    prisma.$queryRaw<[{ avg_minutes: number | null }]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 60) as avg_minutes
      FROM "Ticket"
      WHERE "orgId" = ${orgId}
        AND "resolvedAt" IS NOT NULL
        ${from ? prisma.$queryRaw`AND "createdAt" >= ${from}` : prisma.$queryRaw``}
        ${to ? prisma.$queryRaw`AND "createdAt" <= ${to}` : prisma.$queryRaw``}
    `.catch(() => [{ avg_minutes: null }]),
  ]);

  const open = byStatus.find((s) => s.status === TicketStatus.open)?._count.status ?? 0;
  const inProgress = byStatus.find((s) => s.status === TicketStatus.in_progress)?._count.status ?? 0;
  const resolved = byStatus.find((s) => s.status === TicketStatus.resolved)?._count.status ?? 0;

  return {
    total,
    open,
    inProgress,
    resolved,
    slaBreached: breached,
    slaComplianceRate: total > 0 ? Math.round(((total - breached) / total) * 100) : 100,
    avgResolutionMinutes: avgResolution[0]?.avg_minutes ?? null,
    byPriority: byPriority.map((r) => ({ priority: r.priority, count: r._count.priority })),
  };
}

export async function getAlertAnalytics({ orgId, from, to }: AnalyticsOpts) {
  const dateFilter = {
    ...(from || to
      ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
  };

  const [total, byStatus, byPriority] = await Promise.all([
    prisma.alert.count({ where: { orgId, ...dateFilter } }),
    prisma.alert.groupBy({ by: ['status'], where: { orgId, ...dateFilter }, _count: { status: true } }),
    prisma.alert.groupBy({ by: ['priority'], where: { orgId, ...dateFilter }, _count: { priority: true } }),
  ]);

  return {
    total,
    open: byStatus.find((s) => s.status === AlertStatus.open)?._count.status ?? 0,
    acknowledged: byStatus.find((s) => s.status === AlertStatus.acknowledged)?._count.status ?? 0,
    resolved: byStatus.find((s) => s.status === AlertStatus.closed)?._count.status ?? 0,
    byPriority: byPriority.map((r) => ({ priority: r.priority, count: r._count.priority })),
  };
}

export async function getTopResolvers({ orgId, from, to }: AnalyticsOpts) {
  const dateFilter = {
    ...(from || to
      ? { resolvedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
  };

  const rows = await prisma.ticket.groupBy({
    by: ['assignedToId'],
    where: { orgId, status: TicketStatus.resolved, assignedToId: { not: null }, ...dateFilter },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const userIds = rows.map((r) => r.assignedToId!);
  const usersMap = await prisma.user
    .findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    .then((u) => new Map(u.map((x) => [x.id, x.name])));

  return rows
    .filter((r) => r.assignedToId)
    .map((r) => ({ userId: r.assignedToId!, name: usersMap.get(r.assignedToId!) ?? 'Unknown', resolved: r._count.id }));
}
