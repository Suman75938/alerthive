import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types/api';
import { prisma } from '../db/prisma';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { status, category, page = '1', pageSize = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const where = { orgId: req.user!.orgId, ...(status ? { status } : {}), ...(category ? { category } : {}) };
  const [items, total] = await Promise.all([
    prisma.kBArticle.findMany({ where, skip, take: parseInt(pageSize), orderBy: { createdAt: 'desc' } }),
    prisma.kBArticle.count({ where }),
  ]);
  res.json({ success: true, data: items, meta: { total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) } } satisfies ApiResponse);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.kBArticle.findFirstOrThrow({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  await prisma.kBArticle.updateMany({ where: { id: (req.params.id as string) }, data: { views: { increment: 1 } } });
  res.json({ success: true, data: item } satisfies ApiResponse);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.kBArticle.create({ data: { ...req.body, orgId: req.user!.orgId } });
  res.status(201).json({ success: true, data: item } satisfies ApiResponse);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await prisma.kBArticle.updateMany({ where: { id: (req.params.id as string), orgId: req.user!.orgId }, data: req.body });
  const item = await prisma.kBArticle.findFirst({ where: { id: (req.params.id as string) } });
  res.json({ success: true, data: item } satisfies ApiResponse);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await prisma.kBArticle.deleteMany({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  res.json({ success: true, data: { message: 'Deleted' } } satisfies ApiResponse);
});
