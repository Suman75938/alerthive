import { IncidentStatus, AlertPriority, TimelineEventType, Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { cacheGet, cacheSet, cacheDelete, cacheDeletePattern, incidentKeys } from './cacheService';

interface ListIncidentsOpts {
  orgId: string;
  status?: IncidentStatus;
  page?: number;
  pageSize?: number;
}

export async function listIncidents({ orgId, status, page = 1, pageSize = 20 }: ListIncidentsOpts) {
  const cacheKey = incidentKeys.list(orgId, page, pageSize, status);
  const cached = await cacheGet<{ items: unknown[]; total: number; page: number; pageSize: number; totalPages: number }>(cacheKey);
  if (cached) return cached;

  const where: Prisma.IncidentWhereInput = { orgId, ...(status && { status }) };
  const [items, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      include: { assignee: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.incident.count({ where }),
  ]);
  const result = { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  await cacheSet(cacheKey, result, 60);
  return result;
}

export async function getIncident(id: string, orgId: string) {
  const cacheKey = incidentKeys.single(orgId, id);
  const cached = await cacheGet<Awaited<ReturnType<typeof prisma.incident.findFirstOrThrow>>>(cacheKey);
  if (cached) return cached;

  const incident = await prisma.incident.findFirstOrThrow({
    where: { id, orgId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      alerts: { include: { alert: true } },
      timeline: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
    },
  });
  await cacheSet(cacheKey, incident, 30);
  return incident;
}

export async function createIncident(
  orgId: string,
  createdById: string,
  data: { title: string; description: string; priority: string; assigneeId?: string; alertIds?: string[] },
) {
  const incident = await prisma.incident.create({
    data: {
      orgId,
      title: data.title,
      description: data.description,
      priority: data.priority as AlertPriority,
      status: IncidentStatus.triggered,
      assigneeId: data.assigneeId,
    },
  });

  if (data.alertIds?.length) {
    await prisma.incidentAlert.createMany({
      data: data.alertIds.map((alertId) => ({ incidentId: incident.id, alertId })),
      skipDuplicates: true,
    });
  }

  await prisma.timelineEvent.create({
    data: {
      incidentId: incident.id,
      type: TimelineEventType.created,
      message: 'Incident created',
      userId: createdById,
    },
  });

  await cacheDeletePattern(incidentKeys.listPattern(orgId));
  return incident;
}

export async function updateIncidentStatus(id: string, orgId: string, status: IncidentStatus, userId: string, note?: string) {
  const incident = await prisma.incident.findFirstOrThrow({ where: { id, orgId } });

  const data: Prisma.IncidentUpdateInput = { status };
  if (status === IncidentStatus.resolved) data.resolvedAt = new Date();

  await prisma.incident.update({ where: { id: incident.id }, data });

  const typeMap: Record<string, TimelineEventType> = {
    investigating: TimelineEventType.acknowledged,
    resolved: TimelineEventType.resolved,
    closed: TimelineEventType.resolved,
  };

  await prisma.timelineEvent.create({
    data: {
      incidentId: id,
      type: typeMap[status] ?? TimelineEventType.note,
      message: note ?? `Status changed to ${status}`,
      userId,
    },
  });

  await Promise.all([
    cacheDelete(incidentKeys.single(orgId, id)),
    cacheDeletePattern(incidentKeys.listPattern(orgId)),
  ]);
}

export async function addTimelineNote(incidentId: string, orgId: string, userId: string, message: string) {
  await prisma.incident.findFirstOrThrow({ where: { id: incidentId, orgId } });
  return prisma.timelineEvent.create({
    data: { incidentId, userId, message, type: TimelineEventType.note },
  });
}
