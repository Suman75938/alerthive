import { Request, Response } from 'express';
import { z } from 'zod';
import * as alertService from '../services/alertService';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types/api';
import { AlertStatus, AlertPriority } from '@prisma/client';
import { broadcast } from '../websocket';
import { publishEvent } from '../config/kafka';
import { TOPICS } from '../messaging/kafkaConsumer';

const createSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  source: z.string().min(1),
  priority: z.nativeEnum(AlertPriority),
  tags: z.array(z.string()).optional(),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { status, priority, page, pageSize } = req.query as Record<string, string | undefined>;
  const result = await alertService.listAlerts({
    orgId: req.user!.orgId,
    status: status as AlertStatus | undefined,
    priority: priority as AlertPriority | undefined,
    page: page ? parseInt(page) : 1,
    pageSize: pageSize ? parseInt(pageSize) : 20,
  });
  res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages } } satisfies ApiResponse);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const alert = await alertService.getAlert(req.params.id as string, req.user!.orgId);
  res.json({ success: true, data: alert } satisfies ApiResponse);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const body = createSchema.parse(req.body);
  const alert = await alertService.createAlert(req.user!.orgId, body);
  broadcast(req.user!.orgId, { event: 'alert.new', data: alert });
  await publishEvent(TOPICS.ALERTS, alert.id, { event: 'alert.created', orgId: req.user!.orgId, data: alert });
  res.status(201).json({ success: true, data: alert } satisfies ApiResponse);
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = z.object({ status: z.nativeEnum(AlertStatus) }).parse(req.body);
  const id = req.params.id as string;
  await alertService.updateAlertStatus(id, req.user!.orgId, status, req.user!.id);
  const updated = await alertService.getAlert(id, req.user!.orgId);
  broadcast(req.user!.orgId, { event: 'alert.updated', data: updated });
  await publishEvent(TOPICS.ALERTS, id, { event: 'alert.status_changed', orgId: req.user!.orgId, data: updated });
  res.json({ success: true, data: updated } satisfies ApiResponse);
});

export const deleteAlert = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await alertService.deleteAlert(id, req.user!.orgId);
  broadcast(req.user!.orgId, { event: 'alert.deleted', data: { id } });
  res.json({ success: true, data: { message: 'Alert deleted' } } satisfies ApiResponse);
});
