import { Request } from 'express';
import { User, Organization } from '@prisma/client';

// ── Express augmentation ───────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      org?: Organization;
    }
  }
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  orgId: string;
}

// ── Standard API envelope ──────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedQuery {
  page?: string;
  pageSize?: string;
}

// ── Auth ───────────────────────────────────────────────────────
export interface LoginBody {
  email: string;
  password: string;
  orgSlug: string;
}

export interface SignupBody {
  email: string;
  password: string;
  name: string;
  orgSlug: string;
  orgName?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ── Tickets ────────────────────────────────────────────────────
export interface CreateTicketBody {
  title: string;
  description: string;
  priority: string;
  assignedToId?: string;
  tags?: string[];
}

export interface UpdateTicketBody {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignedToId?: string;
  tags?: string[];
}

// ── Alerts ─────────────────────────────────────────────────────
export interface CreateAlertBody {
  title: string;
  message: string;
  source: string;
  priority: string;
  tags?: string[];
}

// ── Incidents ──────────────────────────────────────────────────
export interface CreateIncidentBody {
  title: string;
  description: string;
  priority: string;
  assigneeId?: string;
  alertIds?: string[];
}

export interface AddTimelineEventBody {
  message: string;
  type?: string;
}

// ── Typed Request shortcuts ────────────────────────────────────
export type AuthRequest = Request & { user: AuthUser; org: Organization };
