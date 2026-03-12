import { Request, Response } from 'express';
import { z } from 'zod';
import * as ticketService from '../services/ticketService';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types/api';
import { TicketStatus, AlertPriority, IssueCategory } from '@prisma/client';
import { broadcast } from '../websocket';

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.nativeEnum(AlertPriority),
  issueCategory: z.nativeEnum(IssueCategory).default('others'),
  rootCause: z.string().optional(),
  resolution: z.string().optional(),
  assignedToId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(AlertPriority).optional(),
  issueCategory: z.nativeEnum(IssueCategory).optional(),
  rootCause: z.string().optional(),
  resolution: z.string().optional(),
  assignedToId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { status, priority, assignedToId, page, pageSize } = req.query as Record<string, string | undefined>;
  const result = await ticketService.listTickets({
    orgId: req.user!.orgId,
    status: status as TicketStatus | undefined,
    priority: priority as AlertPriority | undefined,
    assignedToId: assignedToId,
    page: page ? parseInt(page) : 1,
    pageSize: pageSize ? parseInt(pageSize) : 20,
  });
  res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages } } satisfies ApiResponse);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await ticketService.getTicket(req.params.id as string, req.user!.orgId);
  res.json({ success: true, data: ticket } satisfies ApiResponse);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const body = createSchema.parse(req.body);
  const ticket = await ticketService.createTicket(req.user!.orgId, req.user!.id, body);
  broadcast(req.user!.orgId, { event: 'ticket.created', data: ticket });
  res.status(201).json({ success: true, data: ticket } satisfies ApiResponse);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const body = updateSchema.parse(req.body);
  const ticket = await ticketService.updateTicket(req.params.id as string, req.user!.orgId, body);
  broadcast(req.user!.orgId, { event: 'ticket.updated', data: ticket });
  res.json({ success: true, data: ticket } satisfies ApiResponse);
});

export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
  const comment = await ticketService.addComment(req.params.id as string, req.user!.orgId, req.user!.id, content);
  res.status(201).json({ success: true, data: comment } satisfies ApiResponse);
});

export const deleteTicket = asyncHandler(async (req: Request, res: Response) => {
  await ticketService.deleteTicket(req.params.id as string, req.user!.orgId);
  broadcast(req.user!.orgId, { event: 'ticket.deleted', data: { id: req.params.id } });
  res.json({ success: true, data: { message: 'Ticket deleted' } } satisfies ApiResponse);
});
