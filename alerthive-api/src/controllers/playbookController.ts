import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types/api';
import { prisma } from '../db/prisma';
import { Prisma } from '@prisma/client';

function parseJson(value: Prisma.JsonValue): unknown[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') { try { return JSON.parse(value) as unknown[]; } catch { return []; } }
  return [];
}

function normalizeStep(s: Record<string, unknown>) {
  return {
    order: Number(s.order ?? 0),
    title: String(s.title ?? ''),
    description: String(s.description ?? ''),
    responsible: String(s.responsible ?? s.assignee ?? 'On-call engineer'),
    estimatedMinutes: Number(s.estimatedMinutes ?? 15),
    checklistItems: Array.isArray(s.checklistItems) ? (s.checklistItems as string[]) : [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePlaybook(pb: any) {
  return {
    ...pb,
    steps: parseJson(pb.steps).map((s) => normalizeStep(s as Record<string, unknown>)),
  };
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const items = await prisma.playbook.findMany({ where: { orgId: req.user!.orgId }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: items.map(normalizePlaybook) } satisfies ApiResponse);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.playbook.findFirstOrThrow({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  res.json({ success: true, data: normalizePlaybook(item) } satisfies ApiResponse);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.playbook.create({ data: { ...req.body, orgId: req.user!.orgId } });
  res.status(201).json({ success: true, data: normalizePlaybook(item) } satisfies ApiResponse);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await prisma.playbook.updateMany({ where: { id: (req.params.id as string), orgId: req.user!.orgId }, data: req.body });
  const item = await prisma.playbook.findFirst({ where: { id: (req.params.id as string) } });
  res.json({ success: true, data: item ? normalizePlaybook(item) : null } satisfies ApiResponse);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await prisma.playbook.deleteMany({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  res.json({ success: true, data: { message: 'Deleted' } } satisfies ApiResponse);
});
