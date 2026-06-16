import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types/api';
import { prisma } from '../db/prisma';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const items = await prisma.escalationPolicy.findMany({ where: { orgId: req.user!.orgId }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: items } satisfies ApiResponse);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.escalationPolicy.findFirstOrThrow({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  res.json({ success: true, data: item } satisfies ApiResponse);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.escalationPolicy.create({ data: { ...req.body, orgId: req.user!.orgId } });
  res.status(201).json({ success: true, data: item } satisfies ApiResponse);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await prisma.escalationPolicy.updateMany({ where: { id: (req.params.id as string), orgId: req.user!.orgId }, data: req.body });
  const item = await prisma.escalationPolicy.findFirst({ where: { id: (req.params.id as string) } });
  res.json({ success: true, data: item } satisfies ApiResponse);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await prisma.escalationPolicy.deleteMany({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  res.json({ success: true, data: { message: 'Deleted' } } satisfies ApiResponse);
});
