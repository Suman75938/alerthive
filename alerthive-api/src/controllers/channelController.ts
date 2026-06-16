import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types/api';
import { prisma } from '../db/prisma';
import { Prisma } from '@prisma/client';

const VALID_TYPES = new Set(['sms', 'email', 'phone', 'push', 'slack', 'teams', 'webhook']);

function parseConfig(value: Prisma.JsonValue): Record<string, unknown> {
  if (typeof value === 'string') {
    try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeChannel(ch: any) {
  return {
    ...ch,
    config: parseConfig(ch.config),
    type: VALID_TYPES.has(ch.type) ? ch.type : 'webhook',
  };
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const items = await prisma.notificationChannel.findMany({ where: { orgId: req.user!.orgId }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: items.map(normalizeChannel) } satisfies ApiResponse);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.notificationChannel.findFirstOrThrow({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  res.json({ success: true, data: normalizeChannel(item) } satisfies ApiResponse);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.notificationChannel.create({ data: { ...req.body, orgId: req.user!.orgId } });
  res.status(201).json({ success: true, data: normalizeChannel(item) } satisfies ApiResponse);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await prisma.notificationChannel.updateMany({ where: { id: (req.params.id as string), orgId: req.user!.orgId }, data: req.body });
  const item = await prisma.notificationChannel.findFirst({ where: { id: (req.params.id as string) } });
  res.json({ success: true, data: item ? normalizeChannel(item) : null } satisfies ApiResponse);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await prisma.notificationChannel.deleteMany({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  res.json({ success: true, data: { message: 'Deleted' } } satisfies ApiResponse);
});
