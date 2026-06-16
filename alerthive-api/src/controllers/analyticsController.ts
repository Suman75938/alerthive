import { Request, Response } from 'express';
import * as analyticsService from '../services/analyticsService';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types/api';

function parseDates(from?: string, to?: string) {
  return {
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  };
}

export const getTicketAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = parseDates(req.query.from as string, req.query.to as string);
  const data = await analyticsService.getTicketAnalytics({ orgId: req.user!.orgId, from, to });
  res.json({ success: true, data } satisfies ApiResponse);
});

export const getAlertAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = parseDates(req.query.from as string, req.query.to as string);
  const data = await analyticsService.getAlertAnalytics({ orgId: req.user!.orgId, from, to });
  res.json({ success: true, data } satisfies ApiResponse);
});

export const getTopResolvers = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = parseDates(req.query.from as string, req.query.to as string);
  const data = await analyticsService.getTopResolvers({ orgId: req.user!.orgId, from, to });
  res.json({ success: true, data } satisfies ApiResponse);
});

export const emailReport = asyncHandler(async (req: Request, res: Response) => {
  const { email, range, ticketCount, csvData } = req.body as {
    email: string;
    range: string;
    ticketCount: number;
    csvData: string;
  };

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ success: false, error: 'Valid recipient email is required' } satisfies ApiResponse);
    return;
  }

  // Log the outbound email (acts as email queue in demo mode).
  // In production: replace with nodemailer / SendGrid / SES call.
  console.log(
    `[EMAIL REPORT] To: ${email} | Range: ${range ?? 'N/A'} | Tickets: ${ticketCount ?? 0} | Org: ${req.user!.orgId}`,
  );
  if (csvData) {
    console.log(`[EMAIL REPORT] CSV size: ${csvData.length} bytes`);
  }

  res.json({
    success: true,
    data: { message: `Report queued for delivery to ${email}` },
  } satisfies ApiResponse);
});
