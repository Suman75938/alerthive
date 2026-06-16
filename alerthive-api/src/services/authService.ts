import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db/prisma';
import { config } from '../config';
import { TokenPair } from '../types/api';

function signAccess(userId: string, email: string, role: string, orgId: string): string {
  return jwt.sign(
    { sub: userId, email, role, orgId },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'] },
  );
}

async function signRefresh(userId: string): Promise<string> {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await prisma.refreshToken.create({ data: { userId, token, expiresAt } });
  return token;
}

export async function login(email: string, password: string, orgSlug: string): Promise<TokenPair> {
  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) throw Object.assign(new Error('Organisation not found'), { status: 404 });

  const user = await prisma.user.findUnique({ where: { email_orgId: { email, orgId: org.id } } });
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const valid = await bcrypt.compare(password, user.passwordHash ?? '');
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const accessToken = signAccess(user.id, user.email, user.role, org.id);
  const refreshToken = await signRefresh(user.id);
  return { accessToken, refreshToken };
}

export async function signup(email: string, password: string, name: string, orgSlug: string, orgName?: string): Promise<TokenPair> {
  // Upsert org (admins can create new orgs on first signup)
  const org = await prisma.organization.upsert({
    where: { slug: orgSlug },
    update: {},
    create: { name: orgName ?? orgSlug, slug: orgSlug },
  });

  const existing = await prisma.user.findUnique({ where: { email_orgId: { email, orgId: org.id } } });
  if (existing) throw Object.assign(new Error('Email already in use'), { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { orgId: org.id, email, name, passwordHash, role: 'end_user' },
  });

  const accessToken = signAccess(user.id, user.email, user.role, org.id);
  const refreshToken = await signRefresh(user.id);
  return { accessToken, refreshToken };
}

export async function refreshTokens(token: string): Promise<TokenPair> {
  const record = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!record || record.expiresAt < new Date()) {
    throw Object.assign(new Error('Invalid or expired refresh token'), { status: 401 });
  }
  // Rotate: delete old, issue new pair
  await prisma.refreshToken.delete({ where: { id: record.id } });

  const { user } = record;
  const accessToken = signAccess(user.id, user.email, user.role, user.orgId);
  const refreshToken = await signRefresh(user.id);
  return { accessToken, refreshToken };
}

export async function logout(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token } });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, orgId: true, lastLoginAt: true, createdAt: true },
  });
  return user;
}
