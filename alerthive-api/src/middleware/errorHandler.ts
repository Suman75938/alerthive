import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types/api';

// ── Async wrapper ──────────────────────────────────────────────
type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<void>;
export const asyncHandler = (fn: AsyncFn) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ── 404 handler ────────────────────────────────────────────────
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` } satisfies ApiResponse);
}

// ── Global error handler ───────────────────────────────────────
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  logger.error(err);

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      data: err.flatten().fieldErrors,
    } satisfies ApiResponse);
    return;
  }

  // Prisma known request errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, error: 'A record with those values already exists' } satisfies ApiResponse);
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Record not found' } satisfies ApiResponse);
      return;
    }
  }

  const status: number = (err as { status?: number }).status ?? 500;
  const message: string = (err as { message?: string }).message ?? 'Internal server error';

  if (status >= 500) {
    logger.error({ err, msg: 'Unhandled server error' });
  }

  res.status(status).json({ success: false, error: message } satisfies ApiResponse);
};
