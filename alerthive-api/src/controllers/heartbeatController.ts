import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types/api';
import { prisma } from '../db/prisma';

// Map any DB status values not known to the frontend to a safe equivalent
const VALID_STATUSES = new Set(['active', 'expired', 'paused']);
function normalize(item: { status: string; [key: string]: unknown }) {
  return { ...item, status: VALID_STATUSES.has(item.status) ? item.status : 'paused' };
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { status, page = '1', pageSize = '50' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const where = { orgId: req.user!.orgId, ...(status ? { status } : {}) };
  const [items, total] = await Promise.all([
    prisma.heartbeat.findMany({ where, skip, take: parseInt(pageSize), orderBy: { createdAt: 'desc' } }),
    prisma.heartbeat.count({ where }),
  ]);
  res.json({ success: true, data: items.map(normalize), meta: { total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) } } satisfies ApiResponse);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.heartbeat.findFirstOrThrow({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  res.json({ success: true, data: normalize(item) } satisfies ApiResponse);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.heartbeat.create({ data: { ...req.body, orgId: req.user!.orgId } });
  res.status(201).json({ success: true, data: item } satisfies ApiResponse);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await prisma.heartbeat.updateMany({ where: { id: (req.params.id as string), orgId: req.user!.orgId }, data: req.body });
  const item = await prisma.heartbeat.findFirst({ where: { id: (req.params.id as string) } });
  res.json({ success: true, data: item } satisfies ApiResponse);
});

export const ping = asyncHandler(async (req: Request, res: Response) => {
  const hb = await prisma.heartbeat.findFirstOrThrow({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  const now = new Date();
  const intervalMs = hb.unit === 'seconds' ? hb.interval * 1000 : hb.unit === 'minutes' ? hb.interval * 60000 : hb.unit === 'hours' ? hb.interval * 3600000 : hb.interval * 86400000;
  await prisma.heartbeat.update({ where: { id: hb.id }, data: { lastPingAt: now, expiresAt: new Date(now.getTime() + intervalMs * 2), status: 'active' } });
  res.json({ success: true, data: { message: 'Ping recorded' } } satisfies ApiResponse);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await prisma.heartbeat.deleteMany({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  res.json({ success: true, data: { message: 'Deleted' } } satisfies ApiResponse);
});
