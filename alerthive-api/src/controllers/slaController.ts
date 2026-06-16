import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types/api';
import { AlertPriority } from '@prisma/client';

export const listPolicies = asyncHandler(async (req: Request, res: Response) => {
  const policies = await prisma.slaPolicy.findMany({
    where: { orgId: req.user!.orgId },
    orderBy: { severity: 'asc' },
  });
  res.json({ success: true, data: policies } satisfies ApiResponse);
});

export const updatePolicy = asyncHandler(async (req: Request, res: Response) => {
  const { severity } = req.params;
  const schema = z.object({
    responseTimeMinutes: z.number().int().positive().optional(),
    resolutionTimeMinutes: z.number().int().positive().optional(),
    escalateAfterMinutes: z.number().int().positive().optional(),
    description: z.string().optional(),
  });
  const data = schema.parse(req.body);

  const policy = await prisma.slaPolicy.upsert({
    where: { orgId_severity: { orgId: req.user!.orgId, severity: severity as AlertPriority } },
    update: data,
    create: {
      orgId: req.user!.orgId,
      severity: severity as AlertPriority,
      responseTimeMinutes: data.responseTimeMinutes ?? 60,
      resolutionTimeMinutes: data.resolutionTimeMinutes ?? 240,
      escalateAfterMinutes: data.escalateAfterMinutes ?? 120,
      description: data.description ?? '',
    },
  });
  res.json({ success: true, data: policy } satisfies ApiResponse);
});
