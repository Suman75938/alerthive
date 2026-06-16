import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types/api';
import { prisma } from '../db/prisma';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const schedules = await prisma.onCallSchedule.findMany({
    where: { team: { orgId: req.user!.orgId } },
    include: { team: { include: { members: { include: { user: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: schedules } satisfies ApiResponse);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.onCallSchedule.findFirstOrThrow({
    where: { id: (req.params.id as string) },
    include: { team: { include: { members: { include: { user: true } } } } },
  });
  res.json({ success: true, data: item } satisfies ApiResponse);
});
