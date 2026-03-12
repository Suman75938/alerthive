import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../db/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types/api';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  timezone: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

// ── List all users in the org ─────────────────────────────────────────────────
export const list = asyncHandler(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    where: { orgId: req.user!.orgId },
    select: USER_SELECT,
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: users } satisfies ApiResponse);
});

// ── Get single user ───────────────────────────────────────────────────────────
export const getById = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findFirstOrThrow({
    where: { id: req.params.id as string, orgId: req.user!.orgId },
    select: USER_SELECT,
  });
  res.json({ success: true, data: user } satisfies ApiResponse);
});

// ── Create a new user (admin only) ────────────────────────────────────────────
export const create = asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['admin', 'developer', 'end_user']).default('end_user'),
    phone: z.string().optional(),
    timezone: z.string().optional(),
  });
  const body = schema.parse(req.body);

  // Ensure email is unique within the org
  const existing = await prisma.user.findUnique({
    where: { email_orgId: { email: body.email, orgId: req.user!.orgId } },
  });
  if (existing) {
    res.status(409).json({ success: false, error: 'Email already in use in this organisation' } satisfies ApiResponse);
    return;
  }

  const passwordHash = await bcrypt.hash(body.password, 12);
  const user = await prisma.user.create({
    data: {
      orgId: req.user!.orgId,
      name: body.name,
      email: body.email,
      passwordHash,
      role: body.role,
      phone: body.phone,
      timezone: body.timezone ?? 'America/Chicago',
    },
    select: USER_SELECT,
  });
  res.status(201).json({ success: true, data: user } satisfies ApiResponse);
});

// ── Update a user profile ─────────────────────────────────────────────────────
// Admin can update any user with full fields + password reset.
// Non-admin can only update their own profile (name, phone, timezone).
export const update = asyncHandler(async (req: Request, res: Response) => {
  const targetId = req.params.id as string;
  const requestingRole = req.user!.role;

  if (requestingRole !== 'admin' && targetId !== req.user!.id) {
    res.status(403).json({ success: false, error: 'Insufficient permissions' } satisfies ApiResponse);
    return;
  }

  const adminSchema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    role: z.enum(['admin', 'developer', 'end_user']).optional(),
    phone: z.string().nullable().optional(),
    timezone: z.string().optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(8).optional(), // admin can reset a user's password
  });
  const selfSchema = z.object({
    name: z.string().min(1).optional(),
    phone: z.string().nullable().optional(),
    timezone: z.string().optional(),
  });

  const body = requestingRole === 'admin' ? adminSchema.parse(req.body) : selfSchema.parse(req.body);

  // Prevent demoting the last remaining admin
  if ('role' in body && body.role && body.role !== 'admin') {
    const target = await prisma.user.findFirst({ where: { id: targetId, orgId: req.user!.orgId } });
    if (target?.role === 'admin') {
      const adminCount = await prisma.user.count({ where: { orgId: req.user!.orgId, role: 'admin' } });
      if (adminCount <= 1) {
        res.status(400).json({ success: false, error: 'Cannot demote the last admin — promote another user first' } satisfies ApiResponse);
        return;
      }
    }
  }

  const updateData: Prisma.UserUpdateInput = {};
  if ('name'     in body && body.name     !== undefined) updateData.name     = body.name as string;
  if ('email'    in body && body.email    !== undefined) updateData.email    = body.email as string;
  if ('role'     in body && body.role     !== undefined) updateData.role     = body.role as UserRole;
  if ('phone'    in body && body.phone    !== undefined) updateData.phone    = body.phone as string | null;
  if ('timezone' in body && body.timezone !== undefined) updateData.timezone = body.timezone as string;
  if ('isActive' in body && body.isActive !== undefined) updateData.isActive = body.isActive as boolean;
  if ('password' in body && body.password) {
    updateData.passwordHash = await bcrypt.hash(body.password as string, 12);
  }

  const user = await prisma.user.update({
    where: { id: targetId },
    data: updateData,
    select: USER_SELECT,
  });
  res.json({ success: true, data: user } satisfies ApiResponse);
});

// ── Delete a user (admin only) ────────────────────────────────────────────────
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const targetId = req.params.id as string;

  if (targetId === req.user!.id) {
    res.status(400).json({ success: false, error: 'You cannot delete your own account' } satisfies ApiResponse);
    return;
  }

  const target = await prisma.user.findFirst({ where: { id: targetId, orgId: req.user!.orgId } });
  if (!target) {
    res.status(404).json({ success: false, error: 'User not found' } satisfies ApiResponse);
    return;
  }

  // Protect the last admin
  if (target.role === 'admin') {
    const adminCount = await prisma.user.count({ where: { orgId: req.user!.orgId, role: 'admin' } });
    if (adminCount <= 1) {
      res.status(400).json({ success: false, error: 'Cannot delete the last admin account' } satisfies ApiResponse);
      return;
    }
  }

  await prisma.user.delete({ where: { id: targetId } });
  res.json({ success: true, data: { message: 'User deleted successfully' } } satisfies ApiResponse);
});
