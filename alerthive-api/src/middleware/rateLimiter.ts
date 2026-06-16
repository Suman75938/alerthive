import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { ApiResponse } from '../types/api';

const isDev = process.env.NODE_ENV === 'development';

const rateLimitHandler = (msg: string) => (_req: Request, res: Response) => {
  res.status(429).json({ success: false, error: msg } satisfies ApiResponse);
};

/** General API rate limit – 200 req/min in production, relaxed in development */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 100_000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many requests. Please slow down.'),
});

/** Strict limiter for auth endpoints – 10 req/15 min in production, relaxed in development */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10_000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many login attempts. Try again in 15 minutes.'),
});

/**
 * Webhook ingestion limiter – 60 req/min per IP in production.
 * Prevents alert-flooding DoS while staying permissive enough for real monitoring tools.
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 100_000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many webhook requests. Please slow down.'),
});
