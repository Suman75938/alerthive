import { AlertStatus, AlertPriority, Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { cacheGet, cacheSet, cacheDelete, cacheDeletePattern, alertKeys } from './cacheService';

interface ListAlertsOpts {
  orgId: string;
  status?: AlertStatus;
  priority?: AlertPriority;
  page?: number;
  pageSize?: number;
}

export async function listAlerts({ orgId, status, priority, page = 1, pageSize = 20 }: ListAlertsOpts) {
  const cacheKey = alertKeys.list(orgId, page, pageSize, status, priority);
  const cached = await cacheGet<{ items: unknown[]; total: number; page: number; pageSize: number; totalPages: number }>(cacheKey);
  if (cached) return cached;

  const where: Prisma.AlertWhereInput = { orgId, ...(status && { status }), ...(priority && { priority }) };
  const [items, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      include: { assignee: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.alert.count({ where }),
  ]);
  const result = { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  await cacheSet(cacheKey, result, 60);
  return result;
}

export async function getAlert(id: string, orgId: string) {
  const cacheKey = alertKeys.single(orgId, id);
  const cached = await cacheGet<Awaited<ReturnType<typeof prisma.alert.findFirstOrThrow>>>(cacheKey);
  if (cached) return cached;

  const alert = await prisma.alert.findFirstOrThrow({
    where: { id, orgId },
    include: { assignee: { select: { id: true, name: true, email: true } } },
  });
  await cacheSet(cacheKey, alert, 30);
  return alert;
}

export async function createAlert(orgId: string, data: { title: string; message: string; source: string; priority: string; tags?: string[] }) {
  // ── De-duplication fingerprint ──────────────────────────────────────────────
  // An alert is a duplicate if: same org, same source, same normalised title,
  // and it is still open/acknowledged (i.e. not yet closed/snoozed).
  const fingerprint = `${data.source.toLowerCase()}::${data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;

  const existing = await prisma.alert.findFirst({
    where: {
      orgId,
      status: { in: [AlertStatus.open, AlertStatus.acknowledged] },
      metadata: { path: ['fingerprint'], equals: fingerprint },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    // Bump duplicate counter and return the existing alert instead of creating a new one
    const currentCount: number = (existing.metadata as Record<string, unknown> | null)?.duplicateCount as number ?? 1;
    return prisma.alert.update({
      where: { id: existing.id },
      data: {
        updatedAt: new Date(),
        metadata: { ...(existing.metadata as object ?? {}), fingerprint, duplicateCount: currentCount + 1, lastDuplicateAt: new Date().toISOString() },
      },
    });
  }

  const alert = await prisma.alert.create({
    data: {
      orgId,
      title: data.title,
      message: data.message,
      source: data.source,
      priority: data.priority as AlertPriority,
      status: AlertStatus.open,
      tags: data.tags ?? [],
      metadata: { fingerprint, duplicateCount: 1 },
    },
  });
  await cacheDeletePattern(alertKeys.listPattern(orgId));
  return alert;
}

export async function acknowledgeAlert(id: string, orgId: string, userId: string) {
  return prisma.alert.updateMany({
    where: { id, orgId },
    data: { status: AlertStatus.acknowledged, acknowledgedById: userId, acknowledgedAt: new Date() },
  });
}

export async function resolveAlert(id: string, orgId: string) {
  return prisma.alert.update({
    where: { id },
    data: { status: AlertStatus.closed },
  });
}

export async function updateAlertStatus(id: string, orgId: string, status: AlertStatus, userId?: string) {
  const data: Prisma.AlertUpdateInput = { status };
  if (status === AlertStatus.acknowledged && userId) {
    data.acknowledgedBy = { connect: { id: userId } };
    data.acknowledgedAt = new Date();
  }
  const result = await prisma.alert.updateMany({ where: { id, orgId }, data: { status, acknowledgedAt: status === AlertStatus.acknowledged ? new Date() : undefined, acknowledgedById: status === AlertStatus.acknowledged ? userId : undefined } });
  await Promise.all([
    cacheDelete(alertKeys.single(orgId, id)),
    cacheDeletePattern(alertKeys.listPattern(orgId)),
  ]);
  return result;
}

export async function deleteAlert(id: string, orgId: string) {
  await prisma.alert.findFirstOrThrow({ where: { id, orgId } }); // verify ownership
  await prisma.alert.delete({ where: { id } });
  await Promise.all([
    cacheDelete(alertKeys.single(orgId, id)),
    cacheDeletePattern(alertKeys.listPattern(orgId)),
  ]);
}
