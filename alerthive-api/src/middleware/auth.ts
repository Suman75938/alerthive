import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../db/prisma';
import { ApiResponse, AuthUser } from '../types/api';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  orgId: string;
  iat: number;
  exp: number;
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' } satisfies ApiResponse);
    return;
  }

  const token = authHeader.slice(7);
  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
  } catch {
    res.status(401).json({ success: false, error: 'Token invalid or expired' } satisfies ApiResponse);
    return;
  }

  // Attach lightweight user info without extra DB round-trip on every request.
  // For role-sensitive operations, controllers can refetch.
  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    orgId: payload.orgId,
    name: '',
  } satisfies AuthUser;

  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthenticated' } satisfies ApiResponse);
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' } satisfies ApiResponse);
      return;
    }
    next();
  };
}
