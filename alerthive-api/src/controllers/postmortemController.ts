import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types/api';
import { prisma } from '../db/prisma';

function parseJson(value: Prisma.JsonValue): unknown[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return []; }
  }
  return [];
}

function normalizeFiveWhys(raw: unknown[]): { why: number; question: string; answer: string }[] {
  return raw.map((entry, idx) => {
    if (typeof entry === 'string') {
      return { why: idx + 1, question: `Why ${idx + 1}`, answer: entry };
    }
    if (typeof entry === 'object' && entry !== null) {
      const e = entry as Record<string, unknown>;
      return {
        why: (e.why as number) ?? idx + 1,
        question: (e.question as string) ?? `Why ${idx + 1}`,
        answer: (e.answer as string) ?? '',
      };
    }
    return { why: idx + 1, question: `Why ${idx + 1}`, answer: String(entry) };
  });
}

function normalizeActionItems(raw: unknown[]): unknown[] {
  return raw.map((item) => {
    if (typeof item === 'object' && item !== null) {
      const i = item as Record<string, unknown>;
      // seed used 'title', frontend expects 'description'
      return { ...i, description: i.description ?? i.title ?? '' };
    }
    return item;
  });
}

function normalizePostmortem(item: Awaited<ReturnType<typeof prisma.postmortem.findFirstOrThrow>>) {
  const rawFiveWhys = parseJson(item.fiveWhys);
  const rawActionItems = parseJson(item.actionItems);
  return {
    ...item,
    fiveWhys: normalizeFiveWhys(rawFiveWhys),
    actionItems: normalizeActionItems(rawActionItems),
  };
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { status, page = '1', pageSize = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const where = { orgId: req.user!.orgId, ...(status ? { status } : {}) };
  const [rawItems, total] = await Promise.all([
    prisma.postmortem.findMany({ where, skip, take: parseInt(pageSize), orderBy: { createdAt: 'desc' } }),
    prisma.postmortem.count({ where }),
  ]);
  const items = rawItems.map(normalizePostmortem);
  res.json({ success: true, data: items, meta: { total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) } } satisfies ApiResponse);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.postmortem.findFirstOrThrow({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  res.json({ success: true, data: normalizePostmortem(item) } satisfies ApiResponse);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.postmortem.create({ data: { ...req.body, orgId: req.user!.orgId } });
  res.status(201).json({ success: true, data: item } satisfies ApiResponse);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await prisma.postmortem.updateMany({ where: { id: (req.params.id as string), orgId: req.user!.orgId }, data: req.body });
  const item = await prisma.postmortem.findFirst({ where: { id: (req.params.id as string) } });
  res.json({ success: true, data: item } satisfies ApiResponse);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await prisma.postmortem.deleteMany({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  res.json({ success: true, data: { message: 'Deleted' } } satisfies ApiResponse);
});
