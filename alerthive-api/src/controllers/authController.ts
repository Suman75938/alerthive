import { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/authService';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse, TokenPair } from '../types/api';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  orgSlug: z.string().min(1),
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  orgSlug: z.string().min(1),
  orgName: z.string().optional(),
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, orgSlug } = loginSchema.parse(req.body);
  const tokens = await authService.login(email, password, orgSlug);
  res.json({ success: true, data: tokens } satisfies ApiResponse<TokenPair>);
});

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name, orgSlug, orgName } = signupSchema.parse(req.body);
  const tokens = await authService.signup(email, password, name, orgSlug, orgName);
  res.status(201).json({ success: true, data: tokens } satisfies ApiResponse<TokenPair>);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
  const tokens = await authService.refreshTokens(refreshToken);
  res.json({ success: true, data: tokens } satisfies ApiResponse<TokenPair>);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
  await authService.logout(refreshToken);
  res.json({ success: true, message: 'Logged out' } satisfies ApiResponse);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.id);
  res.json({ success: true, data: user } satisfies ApiResponse);
});
