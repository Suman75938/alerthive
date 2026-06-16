import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types/api';
import { prisma } from '../db/prisma';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { status, page = '1', pageSize = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const where = { orgId: req.user!.orgId, ...(status ? { status } : {}) };
  const [items, total] = await Promise.all([
    prisma.problem.findMany({ where, skip, take: parseInt(pageSize), orderBy: { createdAt: 'desc' } }),
    prisma.problem.count({ where }),
  ]);
  res.json({ success: true, data: items, meta: { total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) } } satisfies ApiResponse);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.problem.findFirstOrThrow({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  res.json({ success: true, data: item } satisfies ApiResponse);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.problem.create({ data: { ...req.body, orgId: req.user!.orgId } });
  res.status(201).json({ success: true, data: item } satisfies ApiResponse);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.problem.updateMany({
    where: { id: (req.params.id as string), orgId: req.user!.orgId },
    data: req.body,
  });
  res.json({ success: true, data: item } satisfies ApiResponse);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await prisma.problem.deleteMany({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  res.json({ success: true, data: { message: 'Deleted' } } satisfies ApiResponse);
});
