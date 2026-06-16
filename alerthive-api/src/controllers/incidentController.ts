import { Request, Response } from 'express';
import { z } from 'zod';
import * as incidentService from '../services/incidentService';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types/api';
import { IncidentStatus, AlertPriority } from '@prisma/client';
import { broadcast } from '../websocket';
import { publishEvent } from '../config/kafka';
import { TOPICS } from '../messaging/kafkaConsumer';

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.nativeEnum(AlertPriority),
  assigneeId: z.string().optional(),
  alertIds: z.array(z.string()).optional(),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { status, page, pageSize } = req.query as Record<string, string | undefined>;
  const result = await incidentService.listIncidents({
    orgId: req.user!.orgId,
    status: status as IncidentStatus | undefined,
    page: page ? parseInt(page) : 1,
    pageSize: pageSize ? parseInt(pageSize) : 20,
  });
  res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages } } satisfies ApiResponse);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const incident = await incidentService.getIncident(req.params.id as string, req.user!.orgId);
  res.json({ success: true, data: incident } satisfies ApiResponse);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const body = createSchema.parse(req.body);
  const incident = await incidentService.createIncident(req.user!.orgId, req.user!.id, body);
  broadcast(req.user!.orgId, { event: 'incident.created', data: incident });
  await publishEvent(TOPICS.INCIDENTS, incident.id, { event: 'incident.created', orgId: req.user!.orgId, data: incident });
  res.status(201).json({ success: true, data: incident } satisfies ApiResponse);
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, note } = z.object({ status: z.nativeEnum(IncidentStatus), note: z.string().optional() }).parse(req.body);
  const id = req.params.id as string;
  await incidentService.updateIncidentStatus(id, req.user!.orgId, status, req.user!.id, note);
  const updated = await incidentService.getIncident(id, req.user!.orgId);
  broadcast(req.user!.orgId, { event: 'incident.updated', data: updated });
  await publishEvent(TOPICS.INCIDENTS, id, { event: 'incident.status_changed', orgId: req.user!.orgId, data: updated });
  res.json({ success: true, data: updated } satisfies ApiResponse);
});

export const addTimelineNote = asyncHandler(async (req: Request, res: Response) => {
  const { message } = z.object({ message: z.string().min(1) }).parse(req.body);
  const event = await incidentService.addTimelineNote(req.params.id as string, req.user!.orgId, req.user!.id, message);
  res.status(201).json({ success: true, data: event } satisfies ApiResponse);
});
