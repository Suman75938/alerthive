import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types/api';
import { prisma } from '../db/prisma';

function parseApprovals(value: Prisma.JsonValue): unknown[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return []; }
  }
  return [];
}

async function normalizeChange(item: Awaited<ReturnType<typeof prisma.change.findFirstOrThrow>>, userMap: Record<string, string>) {
  return {
    ...item,
    raisedBy: userMap[item.raisedById] ?? item.raisedById,
    assignee: item.assigneeId ? (userMap[item.assigneeId] ?? item.assigneeId) : undefined,
    approvals: parseApprovals(item.approvals),
  };
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { status, page = '1', pageSize = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const where = { orgId: req.user!.orgId, ...(status ? { status } : {}) };
  const [rawItems, total] = await Promise.all([
    prisma.change.findMany({ where, skip, take: parseInt(pageSize), orderBy: { createdAt: 'desc' } }),
    prisma.change.count({ where }),
  ]);

  const userIds = [...new Set([
    ...rawItems.map((i) => i.raisedById),
    ...rawItems.map((i) => i.assigneeId).filter(Boolean) as string[],
  ])];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  const items = await Promise.all(rawItems.map((i) => normalizeChange(i, userMap)));
  res.json({ success: true, data: items, meta: { total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) } } satisfies ApiResponse);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.change.findFirstOrThrow({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  const userIds = [item.raisedById, item.assigneeId].filter(Boolean) as string[];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const normalized = await normalizeChange(item, userMap);
  res.json({ success: true, data: normalized } satisfies ApiResponse);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.change.create({ data: { ...req.body, orgId: req.user!.orgId } });
  res.status(201).json({ success: true, data: item } satisfies ApiResponse);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await prisma.change.updateMany({ where: { id: (req.params.id as string), orgId: req.user!.orgId }, data: req.body });
  const item = await prisma.change.findFirst({ where: { id: (req.params.id as string) } });
  res.json({ success: true, data: item } satisfies ApiResponse);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await prisma.change.deleteMany({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  res.json({ success: true, data: { message: 'Deleted' } } satisfies ApiResponse);
});
