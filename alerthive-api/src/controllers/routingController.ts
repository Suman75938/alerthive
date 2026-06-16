import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types/api';
import { prisma } from '../db/prisma';

function parseConditions(value: Prisma.JsonValue): unknown[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return []; }
  }
  return [];
}

function normalize(item: Awaited<ReturnType<typeof prisma.alertRoutingRule.findFirstOrThrow>>) {
  return { ...item, conditions: parseConditions(item.conditions) };
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const items = await prisma.alertRoutingRule.findMany({ where: { orgId: req.user!.orgId }, orderBy: { order: 'asc' } });
  res.json({ success: true, data: items.map(normalize) } satisfies ApiResponse);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.alertRoutingRule.findFirstOrThrow({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  res.json({ success: true, data: normalize(item) } satisfies ApiResponse);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.alertRoutingRule.create({ data: { ...req.body, orgId: req.user!.orgId } });
  res.status(201).json({ success: true, data: item } satisfies ApiResponse);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await prisma.alertRoutingRule.updateMany({ where: { id: (req.params.id as string), orgId: req.user!.orgId }, data: req.body });
  const item = await prisma.alertRoutingRule.findFirst({ where: { id: (req.params.id as string) } });
  res.json({ success: true, data: item } satisfies ApiResponse);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await prisma.alertRoutingRule.deleteMany({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  res.json({ success: true, data: { message: 'Deleted' } } satisfies ApiResponse);
});
