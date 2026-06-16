import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types/api';
import { prisma } from '../db/prisma';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query as Record<string, string>;
  const where = { orgId: req.user!.orgId, ...(status ? { status } : {}) };
  const items = await prisma.maintenanceWindow.findMany({ where, orderBy: { startTime: 'desc' } });
  res.json({ success: true, data: items } satisfies ApiResponse);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.maintenanceWindow.findFirstOrThrow({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  res.json({ success: true, data: item } satisfies ApiResponse);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.maintenanceWindow.create({ data: { ...req.body, orgId: req.user!.orgId, createdById: req.user!.id } });
  res.status(201).json({ success: true, data: item } satisfies ApiResponse);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await prisma.maintenanceWindow.updateMany({ where: { id: (req.params.id as string), orgId: req.user!.orgId }, data: req.body });
  const item = await prisma.maintenanceWindow.findFirst({ where: { id: (req.params.id as string) } });
  res.json({ success: true, data: item } satisfies ApiResponse);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await prisma.maintenanceWindow.deleteMany({ where: { id: (req.params.id as string), orgId: req.user!.orgId } });
  res.json({ success: true, data: { message: 'Deleted' } } satisfies ApiResponse);
});
