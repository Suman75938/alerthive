/**
 * Inbound webhook routes — no JWT auth required by default.
 * External systems (e.g. Dynatrace) POST here directly.
 * Security: X-AlertHive-Secret header (timing-safe comparison), dedicated rate limit.
 *
 * Authenticated management routes (stats, send-test) require JWT.
 */
import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import * as alertService from '../services/alertService';
import * as ticketService from '../services/ticketService';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { ApiResponse } from '../types/api';
import { logger } from '../utils/logger';
import { broadcast } from '../websocket';

const router = Router();

// ── Shared secret — MUST be set in production ─────────────────────────────────
const WEBHOOK_SECRET = process.env.ALERTHIVE_WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) {
  logger.warn('[DT Webhook] ALERTHIVE_WEBHOOK_SECRET is not set — webhook is unauthenticated!');
}

// Constant HMAC salt normalises both buffers to 32 bytes before timingSafeEqual,
// preventing length-based timing leaks.
const HMAC_SALT = 'alerthive-webhook-hmac-v1';

function verifySecret(req: Request, res: Response): boolean {
  if (!WEBHOOK_SECRET) return true; // dev: secret not configured — allow (warning logged at startup)
  const provided = req.headers['x-alerthive-secret'];
  if (typeof provided !== 'string' || !provided) {
    res.status(401).json({ success: false, error: 'Invalid webhook secret' } satisfies ApiResponse);
    return false;
  }
  // HMAC-SHA256 digests are always 32 bytes — safe for timingSafeEqual
  const a = crypto.createHmac('sha256', HMAC_SALT).update(provided).digest();
  const b = crypto.createHmac('sha256', HMAC_SALT).update(WEBHOOK_SECRET).digest();
  if (!crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ success: false, error: 'Invalid webhook secret' } satisfies ApiResponse);
    return false;
  }
  return true;
}

// ── Input sanitisation helpers ────────────────────────────────────────────────
const MAX_LEN = { title: 200, entity: 150, pid: 100, url: 2048, tag: 80 } as const;

function safeStr(v: unknown, max: number): string {
  return String(v ?? '').trim().slice(0, max);
}

function safeUrl(v: unknown): string {
  if (!v) return '';
  try {
    const url = new URL(String(v).trim());
    // Only allow safe schemes — reject javascript:, data:, etc.
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    return url.toString().slice(0, MAX_LEN.url);
  } catch { return ''; }
}

// ── Dynatrace severity → AlertHive priority ────────────────────────────────────
const DT_SEVERITY_MAP: Record<string, string> = {
  AVAILABILITY:           'critical',
  ERROR:                  'high',
  PERFORMANCE:            'high',
  RESOURCE_CONTENTION:    'medium',
  CUSTOM_ALERT:           'medium',
  MONITORING_UNAVAILABLE: 'low',
  INFO:                   'info',
};

// ── GET /api/v1/webhooks/dynatrace/:orgSlug — liveness probe for DT config ───
router.get(
  '/dynatrace/:orgSlug',
  asyncHandler(async (req: Request, res: Response) => {
    const { orgSlug } = req.params as { orgSlug: string };
    const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
    if (!org) {
      res.status(404).json({ success: false, error: `Organisation '${orgSlug}' not found` } satisfies ApiResponse);
      return;
    }
    res.json({
      success: true,
      data: {
        message: 'AlertHive Dynatrace webhook is reachable',
        org: org.name,
        endpoint: `POST /api/v1/webhooks/dynatrace/${orgSlug}`,
        secretRequired: !!WEBHOOK_SECRET,
      },
    } satisfies ApiResponse);
  }),
);

/**
 * POST /api/v1/webhooks/dynatrace/:orgSlug
 *
 * Accepts both Dynatrace Classic problem notifications and
 * Dynatrace Workflow (Automation) HTTP request action payloads.
 *
 * Classic fields:   PID, ProblemTitle, ProblemSeverity, ImpactedEntity, State, Tags, ProblemURL
 * Workflow fields:  id, title, severityLevel, entityName, status, entityTags (array), url
 *
 * State/Status values:
 *   OPEN | ACTIVE   → create / deduplicate alert
 *   RESOLVED        → close matching open/acknowledged alert
 */
router.post(
  '/dynatrace/:orgSlug',
  asyncHandler(async (req: Request, res: Response) => {
    if (!verifySecret(req, res)) return;

    const { orgSlug } = req.params as { orgSlug: string };

    const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
    if (!org) {
      res.status(404).json({ success: false, error: `Organisation '${orgSlug}' not found` } satisfies ApiResponse);
      return;
    }

    // Support both Classic and Workflow payload shapes.
    // Classic fields reference: https://www.dynatrace.com/support/help/setup-and-configuration/integrations/problem-notifications/webhook-integration
    // Workflow fields: used by Automation / Davis problem trigger HTTP request action.
    // safeStr/safeUrl guard against object injection, oversized strings, and dangerous URL schemes.
    const body = req.body as Record<string, unknown>;

    const problemTitle = safeStr(body.ProblemTitle ?? body.title ?? 'Unknown Dynatrace Problem', MAX_LEN.title);
    const severity     = safeStr(body.ProblemSeverity ?? body.severityLevel ?? 'CUSTOM_ALERT', 40).toUpperCase();
    const rawState     = safeStr(body.State ?? body.status ?? 'OPEN', 20).toUpperCase();
    // ImpactedEntities is an array in Classic payloads; fall back to ImpactedEntity string or Workflow entityName
    const impactedArr  = Array.isArray(body.ImpactedEntities)
      ? (body.ImpactedEntities as unknown[])
          .slice(0, 10)
          .map((e) => safeStr((e as Record<string, unknown>)?.name ?? e, MAX_LEN.entity))
          .filter(Boolean)
      : [];
    const impacted     = impactedArr.length > 0
      ? impactedArr.join(', ')
      : safeStr(body.ImpactedEntity ?? body.entityName ?? 'Unknown Entity', MAX_LEN.entity);
    // Classic has both PID (internal) and ProblemID (display); Workflow uses id
    const pid          = safeStr(body.ProblemID ?? body.PID ?? body.id ?? 'UNKNOWN', MAX_LEN.pid);
    // Classic field is "Problem URL" (with a space) — also accept ProblemURL and Workflow url
    const problemURL   = safeUrl((body as Record<string, unknown>)['Problem URL'] ?? body.ProblemURL ?? body.url);
    // ProblemImpact: INFRASTRUCTURE | SERVICE | APPLICATION | ENVIRONMENT (Classic only)
    const problemImpact = safeStr(body.ProblemImpact ?? '', 40).toUpperCase();
    // ProblemDetailsJSON is a raw JSON object (Classic only) — log it for debugging
    if (body.ProblemDetailsJSON && typeof body.ProblemDetailsJSON === 'object') {
      logger.debug({ msg: '[DT Webhook] ProblemDetailsJSON received', pid, details: body.ProblemDetailsJSON });
    }

    // entityTags can be an array (Workflow) or comma-string (Classic).
    // Cap to 20 tags, each max 80 chars, to prevent oversized tag payloads.
    let tags: string[] = [];
    if (Array.isArray(body.entityTags)) {
      tags = (body.entityTags as unknown[])
        .slice(0, 20)
        .map((t) => safeStr(t, MAX_LEN.tag))
        .filter(Boolean);
    } else if (typeof body.Tags === 'string') {
      tags = body.Tags.split(',').slice(0, 20).map((t) => t.trim().slice(0, MAX_LEN.tag)).filter(Boolean);
    }

    // Normalise state: both OPEN and ACTIVE mean "problem is firing"
    const isActive   = rawState === 'OPEN' || rawState === 'ACTIVE';
    const isResolved = rawState === 'RESOLVED';

    logger.info({ msg: '[DT Webhook]', org: orgSlug, pid, severity, state: rawState, title: problemTitle });

    // ── RESOLVED: close the specific alert matching this problem's fingerprint ──
    if (isResolved) {
      // Reconstruct the exact fingerprint alertService.createAlert uses:
      //   `${source.toLowerCase()}::${title.toLowerCase()...}`  →  "dynatrace::dt-high-cpu-on-prod-web-01"
      const dtTitle     = `[DT] ${problemTitle}`;
      const fingerprint = `dynatrace::${dtTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;

      const existing = await prisma.alert.findFirst({
        where: {
          orgId:  org.id,
          source: 'Dynatrace',
          status: { in: ['open', 'acknowledged'] },
          metadata: { path: ['fingerprint'], equals: fingerprint },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        await prisma.alert.update({
          where: { id: existing.id },
          data:  { status: 'closed', updatedAt: new Date() },
        });
        logger.info({ msg: '[DT Webhook] Alert auto-closed on RESOLVED', alertId: existing.id, pid, fingerprint });
      }

      // Also resolve any active ticket for this problem
      if (pid !== 'UNKNOWN') {
        const externalId = `DT::${pid}`;
        const ticketResult = await ticketService.createOrUpdateWebhookTicket(org.id, {
          externalId,
          source:      'Dynatrace',
          title:       `[DT] ${problemTitle}`,
          description: `Problem ${pid} resolved by Dynatrace.`,
          priority:    'low',
          resolve:     true,
        });
        if (ticketResult.action === 'resolved') {
          broadcast(org.id, { event: 'ticket.resolved', data: { id: ticketResult.ticketId, source: 'Dynatrace' } });
          logger.info({ msg: '[DT Webhook] Ticket auto-resolved on RESOLVED', ticketId: ticketResult.ticketId, pid });
        }
      }

      if (existing) {
        res.json({ success: true, data: { message: 'Alert closed', alertId: existing.id } } satisfies ApiResponse);
      } else {
        res.json({ success: true, data: { message: 'RESOLVED received — no matching open alert found' } } satisfies ApiResponse);
      }
      return;
    }

    if (!isActive) {
      res.json({ success: true, data: { message: `State '${rawState}' acknowledged — no action taken` } } satisfies ApiResponse);
      return;
    }

    // ProblemImpact can refine priority: AVAILABILITY issues escalate severity
    let priority = DT_SEVERITY_MAP[severity] ?? 'medium';
    if (problemImpact === 'AVAILABILITY' && priority !== 'critical') priority = 'critical';

    const messageParts = [`Dynatrace problem detected on ${impacted}.`];
    if (pid !== 'UNKNOWN') messageParts.push(`Problem ID: ${pid}.`);
    if (problemImpact) messageParts.push(`Impact: ${problemImpact}.`);
    messageParts.push(`Severity: ${severity}.`);
    if (problemURL) messageParts.push(`Details: ${problemURL}`);
    const message = messageParts.join(' ');

    const alert = await alertService.createAlert(org.id, {
      title:    `[DT] ${problemTitle}`,
      message,
      source:   'Dynatrace',
      priority,
      tags:     ['dynatrace', severity.toLowerCase(), ...(problemImpact ? [problemImpact.toLowerCase()] : []), ...tags],
    });

    logger.info({ msg: '[DT Webhook] Alert created/deduped', alertId: alert.id, hitCount: (alert.metadata as Record<string, unknown>)?.duplicateCount });

    // Auto-create / update ticket for this Dynatrace problem
    if (pid !== 'UNKNOWN') {
      const dtTicket = await ticketService.createOrUpdateWebhookTicket(org.id, {
        externalId:  `DT::${pid}`,
        source:      'Dynatrace',
        title:       `[DT] ${problemTitle}`,
        description: message,
        priority,
        tags:        ['dynatrace', severity.toLowerCase(), ...(problemImpact ? [problemImpact.toLowerCase()] : []), ...tags],
        rawPayload:  { pid, severity, impacted, problemImpact, problemURL, state: rawState },
      }).catch((e) => { logger.warn({ msg: '[DT Webhook] Ticket upsert failed', err: (e as Error).message }); return null; });
      if (dtTicket?.action === 'created') {
        broadcast(org.id, { event: 'ticket.created', data: { id: dtTicket.ticketId, source: 'Dynatrace' } });
        logger.info({ msg: '[DT Webhook] Ticket auto-created', ticketId: dtTicket.ticketId, pid });
      } else if (dtTicket?.action === 'updated') {
        broadcast(org.id, { event: 'ticket.updated', data: { id: dtTicket.ticketId, source: 'Dynatrace' } });
        logger.info({ msg: '[DT Webhook] Ticket auto-updated (duplicate event)', ticketId: dtTicket.ticketId, pid });
      }
    }

    res.status(201).json({ success: true, data: alert } satisfies ApiResponse);
  }),
);

// ── GET /api/v1/webhooks/dynatrace/:orgSlug/stats (JWT required) ──────────────
// Returns real Dynatrace-sourced alert counts from the database.
router.get(
  '/dynatrace/:orgSlug/stats',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { orgSlug } = req.params as { orgSlug: string };
    const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
    if (!org) {
      res.status(404).json({ success: false, error: `Organisation '${orgSlug}' not found` } satisfies ApiResponse);
      return;
    }
    const [totalAlerts, openAlerts, lastAlert] = await Promise.all([
      prisma.alert.count({ where: { orgId: org.id, source: 'Dynatrace' } }),
      prisma.alert.count({ where: { orgId: org.id, source: 'Dynatrace', status: { in: ['open', 'acknowledged'] } } }),
      prisma.alert.findFirst({
        where: { orgId: org.id, source: 'Dynatrace' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);
    res.json({
      success: true,
      data: { totalAlerts, openAlerts, lastEventAt: lastAlert?.createdAt ?? null },
    } satisfies ApiResponse);
  }),
);

// ── POST /api/v1/webhooks/dynatrace/:orgSlug/send-test (JWT required) ─────────
// Fires a test alert from the Dynatrace integration without needing the webhook secret.
// Useful for verifying end-to-end webhook → alert pipeline from the UI.
router.post(
  '/dynatrace/:orgSlug/send-test',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { orgSlug } = req.params as { orgSlug: string };
    const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
    if (!org) {
      res.status(404).json({ success: false, error: `Organisation '${orgSlug}' not found` } satisfies ApiResponse);
      return;
    }
    const alert = await alertService.createAlert(org.id, {
      title:    '[DT] Webhook connectivity test',
      message:  'This is a test alert fired from the AlertHive Integrations page to verify the Dynatrace webhook pipeline is working end-to-end.',
      source:   'Dynatrace',
      priority: 'low',
      tags:     ['dynatrace', 'test', 'webhook-probe'],
    });
    logger.info({ msg: '[DT Webhook] Test alert fired via /send-test', alertId: alert.id, user: req.user?.id });
    res.status(201).json({ success: true, data: alert } satisfies ApiResponse);
  }),
);

// ═══════════════════════════════════════════════════════════════════════════════
// UiPath Orchestrator Webhooks
// Docs: https://docs.uipath.com/orchestrator/docs/webhook-event-types
//
// AlertHive only creates alerts for actionable (failure/error) events.
// Informational lifecycle events (created, started, updated) are acknowledged
// and discarded without creating noise in the alert feed.
// ═══════════════════════════════════════════════════════════════════════════════

// Job/QueueItem/Schedule event type → { priority, shouldAlert }
const UIPATH_EVENT_MAP: Record<string, { priority: string; shouldAlert: boolean }> = {
  // Job events
  'job.faulted':                    { priority: 'critical', shouldAlert: true  },
  'job.stopped':                    { priority: 'medium',   shouldAlert: true  },
  'job.created':                    { priority: 'info',     shouldAlert: false },
  'job.started':                    { priority: 'info',     shouldAlert: false },
  'job.completed':                  { priority: 'info',     shouldAlert: false },
  'job.suspended':                  { priority: 'low',      shouldAlert: false },
  // Queue item events
  'queueitem.transactionfailed':    { priority: 'high',     shouldAlert: true  },
  'queueitem.transactionabandoned': { priority: 'medium',   shouldAlert: true  },
  'queueitem.added':                { priority: 'info',     shouldAlert: false },
  'queueitem.transactionstarted':   { priority: 'info',     shouldAlert: false },
  'queueitem.transactioncompleted': { priority: 'info',     shouldAlert: false },
  // Trigger events
  'schedule.failed':                { priority: 'high',     shouldAlert: true  },
  // Robot events
  'robot.deleted':                  { priority: 'medium',   shouldAlert: true  },
  'robot.created':                  { priority: 'info',     shouldAlert: false },
  'robot.updated':                  { priority: 'info',     shouldAlert: false },
  'robot.status':                   { priority: 'info',     shouldAlert: false },
  // Process events
  'process.deleted':                { priority: 'low',      shouldAlert: true  },
  'process.created':                { priority: 'info',     shouldAlert: false },
  'process.updated':                { priority: 'info',     shouldAlert: false },
  // Task / Action Center events
  'task.completed':                 { priority: 'info',     shouldAlert: false },
  'task.created':                   { priority: 'info',     shouldAlert: false },
  'task.assignmentchanged':         { priority: 'info',     shouldAlert: false },
  'task.saved':                     { priority: 'info',     shouldAlert: false },
  'task.deleted':                   { priority: 'low',      shouldAlert: true  },
  'task.forwarded':                 { priority: 'info',     shouldAlert: false },
};

// ── GET /api/v1/webhooks/uipath/:orgSlug — liveness probe ────────────────────
router.get(
  '/uipath/:orgSlug',
  asyncHandler(async (req: Request, res: Response) => {
    const { orgSlug } = req.params as { orgSlug: string };
    const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
    if (!org) {
      res.status(404).json({ success: false, error: `Organisation '${orgSlug}' not found` } satisfies ApiResponse);
      return;
    }
    res.json({
      success: true,
      data: {
        message: 'AlertHive UiPath Orchestrator webhook is reachable',
        org: org.name,
        endpoint: `POST /api/v1/webhooks/uipath/${orgSlug}`,
        secretRequired: !!WEBHOOK_SECRET,
        supportedEvents: Object.keys(UIPATH_EVENT_MAP),
      },
    } satisfies ApiResponse);
  }),
);

/**
 * POST /api/v1/webhooks/uipath/:orgSlug
 *
 * Accepts UiPath Orchestrator webhook events.
 * Uses the same X-AlertHive-Secret header for authentication.
 * Only actionable (failure/error) events create alerts.
 */
router.post(
  '/uipath/:orgSlug',
  asyncHandler(async (req: Request, res: Response) => {
    if (!verifySecret(req, res)) return;

    const { orgSlug } = req.params as { orgSlug: string };
    const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
    if (!org) {
      res.status(404).json({ success: false, error: `Organisation '${orgSlug}' not found` } satisfies ApiResponse);
      return;
    }

    const body = req.body as Record<string, unknown>;
    const rawType = safeStr(body.Type ?? body.type ?? '', 60);
    const eventType = rawType.toLowerCase();
    const eventConfig = UIPATH_EVENT_MAP[eventType];

    logger.info({ msg: '[UiPath Webhook]', org: orgSlug, type: rawType });

    // Unknown event type — acknowledge and discard
    if (!eventConfig) {
      logger.warn({ msg: '[UiPath Webhook] Unknown event type', type: rawType });
      res.json({ success: true, data: { message: `Event '${rawType}' is not mapped — acknowledged` } } satisfies ApiResponse);
      return;
    }

    // Non-alertable informational event — acknowledge and discard
    if (!eventConfig.shouldAlert) {
      res.json({ success: true, data: { message: `Event '${rawType}' is informational — no alert created` } } satisfies ApiResponse);
      return;
    }

    // ── Build alert from event payload ────────────────────────────────────────
    let title: string;
    let message: string;
    const tags: string[] = ['uipath', eventType.replace('.', '-')];

    if (eventType.startsWith('job.')) {
      const job = (body.Job ?? (Array.isArray(body.Jobs) ? body.Jobs[0] : null)) as Record<string, unknown> | null;
      const processKey = safeStr((job?.Release as Record<string, unknown>)?.ProcessKey ?? 'Unknown Process', 100);
      const jobId      = String(job?.Id ?? body.Id ?? 'N/A');
      const state      = safeStr(job?.State ?? '', 40);
      const info       = safeStr(job?.Info ?? '', 500);
      title   = `[UiPath] Job ${rawType.replace('job.', '')}: ${processKey}`;
      message = `UiPath job event: ${rawType}. Process: ${processKey}. Job ID: ${jobId}. State: ${state}.${info ? ` Info: ${info}` : ''}`;
      tags.push(processKey.toLowerCase().replace(/\s+/g, '-').slice(0, 50));
    } else if (eventType.startsWith('queueitem.')) {
      const item     = (body.QueueItem ?? (Array.isArray(body.QueueItems) ? body.QueueItems[0] : null)) as Record<string, unknown> | null;
      const queue    = body.Queue as Record<string, unknown> | null;
      const qName    = safeStr(queue?.Name ?? 'Unknown Queue', 100);
      const itemKey  = safeStr(item?.Key ?? item?.Id ?? 'N/A', 50);
      const reason   = safeStr((item?.ProcessingException as Record<string, unknown>)?.Reason ?? '', 200);
      title   = `[UiPath] ${rawType.replace('queueItem.', '').replace('queueitem.', '')}: Queue ${qName}`;
      message = `UiPath queue item event: ${rawType}. Queue: ${qName}. Item key: ${itemKey}.${reason ? ` Reason: ${reason}` : ''}`;
      tags.push(qName.toLowerCase().replace(/\s+/g, '-').slice(0, 50));
    } else if (eventType === 'schedule.failed') {
      const schedule  = body.ProcessSchedule as Record<string, unknown> | null;
      const name      = safeStr(schedule?.Name ?? 'Unknown Schedule', 100);
      const reason    = safeStr(body.Reason ?? '', 300);
      const procKey   = safeStr((schedule?.Release as Record<string, unknown>)?.ProcessKey ?? '', 100);
      title   = `[UiPath] Schedule failed: ${name}`;
      message = `UiPath schedule failed to execute. Schedule: ${name}. Process: ${procKey}.${reason ? ` Reason: ${reason}` : ''}`;
      tags.push(name.toLowerCase().replace(/\s+/g, '-').slice(0, 50));
    } else if (eventType.startsWith('robot.')) {
      const robots    = Array.isArray(body.Robots) ? body.Robots as Record<string, unknown>[] : [];
      const robotName = safeStr(robots[0]?.Name ?? 'Unknown Robot', 100);
      title   = `[UiPath] Robot ${rawType.replace('robot.', '')}: ${robotName}`;
      message = `UiPath robot event: ${rawType}. Robot: ${robotName}.`;
    } else if (eventType.startsWith('process.') || eventType.startsWith('task.')) {
      title   = `[UiPath] ${rawType}`;
      message = `UiPath event received: ${rawType}.`;
    } else {
      title   = `[UiPath] ${rawType}`;
      message = `UiPath event received: ${rawType}.`;
    }

    const alert = await alertService.createAlert(org.id, {
      title,
      message,
      source:   'UiPath',
      priority: eventConfig.priority,
      tags,
    });

    logger.info({ msg: '[UiPath Webhook] Alert created/deduped', alertId: alert.id, type: rawType });

    // Auto-create / update ticket; compute stable externalId from event type + resource key
    {
      let upExternalId: string;
      if (eventType.startsWith('job.')) {
        const j = (body.Job ?? (Array.isArray(body.Jobs) ? body.Jobs[0] : null)) as Record<string, unknown> | null;
        const jobId = String(j?.Id ?? body.Id ?? 'unknown');
        upExternalId = `UP::job::${jobId}`;
      } else if (eventType.startsWith('queueitem.')) {
        const it = (body.QueueItem ?? (Array.isArray(body.QueueItems) ? body.QueueItems[0] : null)) as Record<string, unknown> | null;
        upExternalId = `UP::queue::${String(it?.Key ?? it?.Id ?? 'unknown')}`;
      } else if (eventType === 'schedule.failed') {
        const sched = body.ProcessSchedule as Record<string, unknown> | null;
        upExternalId = `UP::sched::${safeStr(String(sched?.Name ?? 'unknown'), 80)}`;
      } else {
        // Non-deduplicable events (robot state-changes, process publishes) — unique per firing
        upExternalId = `UP::${eventType}::${Date.now()}`;
      }
      const upTicket = await ticketService.createOrUpdateWebhookTicket(org.id, {
        externalId:  upExternalId,
        source:      'UiPath',
        title,
        description: message,
        priority:    eventConfig.priority,
        tags,
        rawPayload:  { type: rawType, tenantId: body.TenantId },
      }).catch((e) => { logger.warn({ msg: '[UiPath Webhook] Ticket upsert failed', err: (e as Error).message }); return null; });
      if (upTicket?.action === 'created') {
        broadcast(org.id, { event: 'ticket.created', data: { id: upTicket.ticketId, source: 'UiPath' } });
        logger.info({ msg: '[UiPath Webhook] Ticket auto-created', ticketId: upTicket.ticketId, type: rawType });
      } else if (upTicket?.action === 'updated') {
        broadcast(org.id, { event: 'ticket.updated', data: { id: upTicket.ticketId, source: 'UiPath' } });
        logger.info({ msg: '[UiPath Webhook] Ticket auto-updated', ticketId: upTicket.ticketId, type: rawType });
      }
    }

    res.status(201).json({ success: true, data: alert } satisfies ApiResponse);
  }),
);

// ── GET /api/v1/webhooks/uipath/:orgSlug/stats (JWT required) ────────────────
router.get(
  '/uipath/:orgSlug/stats',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { orgSlug } = req.params as { orgSlug: string };
    const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
    if (!org) {
      res.status(404).json({ success: false, error: `Organisation '${orgSlug}' not found` } satisfies ApiResponse);
      return;
    }
    const [totalAlerts, openAlerts, lastAlert] = await Promise.all([
      prisma.alert.count({ where: { orgId: org.id, source: 'UiPath' } }),
      prisma.alert.count({ where: { orgId: org.id, source: 'UiPath', status: { in: ['open', 'acknowledged'] } } }),
      prisma.alert.findFirst({
        where: { orgId: org.id, source: 'UiPath' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);
    res.json({
      success: true,
      data: { totalAlerts, openAlerts, lastEventAt: lastAlert?.createdAt ?? null },
    } satisfies ApiResponse);
  }),
);

// ═══════════════════════════════════════════════════════════════════════════════
// Splunk Webhooks
//
// Splunk fires a webhook alert action (POST) when a saved search threshold
// is breached. AlertHive maps the result fields from your DSM latency search
// to a structured alert + ticket.
//
// Payload format (Splunk Cloud / Enterprise ≥ 8.x):
//   POST body: {
//     sid, search_name, app, owner, results_link?,
//     result: { service, environment, status, p95?, slo_95pct?, total_requests?, ... }
//   }
//
// Splunk Config (Alerts → Add Actions → Webhook):
//   URL: https://<your-host>/api/v1/webhooks/splunk/fedex-ito
//   Header: X-AlertHive-Secret: <ALERTHIVE_WEBHOOK_SECRET>
// ═══════════════════════════════════════════════════════════════════════════════

// result.status / alert-name keyword → AlertHive priority
const SPLUNK_STATUS_MAP: Record<string, string> = {
  CRITICAL:  'critical',
  FATAL:     'critical',
  HIGH:      'high',
  ERROR:     'high',
  WARNING:   'medium',
  WARN:      'medium',
  MEDIUM:    'medium',
  LOW:       'low',
  INFO:      'info',
  NORMAL:    'info',
};

function splunkPriority(status: string, searchName: string): string {
  const upper = status.toUpperCase();
  if (SPLUNK_STATUS_MAP[upper]) return SPLUNK_STATUS_MAP[upper];
  // Fall back to keyword scan of alert name
  if (/critical|fatal/i.test(searchName)) return 'critical';
  if (/high|error/i.test(searchName))     return 'high';
  if (/warn/i.test(searchName))           return 'medium';
  if (/low/i.test(searchName))            return 'low';
  return 'medium';
}

// ── GET /api/v1/webhooks/splunk/:orgSlug — liveness probe ────────────────────
router.get(
  '/splunk/:orgSlug',
  asyncHandler(async (req: Request, res: Response) => {
    const { orgSlug } = req.params as { orgSlug: string };
    const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
    if (!org) {
      res.status(404).json({ success: false, error: `Organisation '${orgSlug}' not found` } satisfies ApiResponse);
      return;
    }
    res.json({
      success: true,
      data: {
        message: 'AlertHive Splunk webhook is reachable',
        org: org.name,
        endpoint: `POST /api/v1/webhooks/splunk/${orgSlug}`,
        secretRequired: !!WEBHOOK_SECRET,
      },
    } satisfies ApiResponse);
  }),
);

/**
 * POST /api/v1/webhooks/splunk/:orgSlug
 *
 * Accepts Splunk saved-search webhook alert action payloads.
 * Parses result fields (service, environment, p95, slo_95pct, total_requests, status)
 * and creates an alert + ticket in AlertHive.
 *
 * result.status NORMAL is treated as auto-resolution (closes the matching open alert).
 */
router.post(
  '/splunk/:orgSlug',
  asyncHandler(async (req: Request, res: Response) => {
    if (!verifySecret(req, res)) return;

    const { orgSlug } = req.params as { orgSlug: string };
    const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
    if (!org) {
      res.status(404).json({ success: false, error: `Organisation '${orgSlug}' not found` } satisfies ApiResponse);
      return;
    }

    const body       = req.body as Record<string, unknown>;
    const result     = (body.result ?? {}) as Record<string, unknown>;

    const searchName   = safeStr(body.search_name ?? 'Unknown Splunk Alert', MAX_LEN.title);
    const sid          = safeStr(body.sid ?? '', MAX_LEN.pid);
    const resultsLink  = safeUrl(body.results_link ?? '');
    const app          = safeStr(body.app ?? '', 80);

    // Core result fields from your DSM latency search
    const service      = safeStr(result.service ?? result.serviceName ?? '', MAX_LEN.entity);
    const environment  = safeStr(result.environment ?? result.env ?? '', MAX_LEN.entity);
    const rawStatus    = safeStr(result.status ?? result.severity ?? result.alert_level ?? '', 40);
    const p95          = safeStr(result.p95 ?? result.p95_latency ?? '', 20);
    const slo95pct     = safeStr(result.slo_95pct ?? result.slo_pct ?? '', 20);
    const totalReqs    = safeStr(result.total_requests ?? result.request_count ?? '', 20);

    const priority = splunkPriority(rawStatus, searchName);
    const title    = `[Splunk] ${searchName}`;

    logger.info({ msg: '[Splunk Webhook]', org: orgSlug, sid, searchName, rawStatus, service, environment });

    // ── NORMAL status → auto-resolve ────────────────────────────────────────
    if (rawStatus.toUpperCase() === 'NORMAL') {
      const fingerprint = `splunk::${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
      const existing = await prisma.alert.findFirst({
        where: {
          orgId:  org.id,
          source: 'Splunk',
          status: { in: ['open', 'acknowledged'] },
          metadata: { path: ['fingerprint'], equals: fingerprint },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        await prisma.alert.update({
          where: { id: existing.id },
          data:  { status: 'closed', updatedAt: new Date() },
        });
        logger.info({ msg: '[Splunk Webhook] Alert auto-closed on NORMAL', alertId: existing.id, sid });
      }
      if (sid) {
        const spTicket = await ticketService.createOrUpdateWebhookTicket(org.id, {
          externalId: `SPL::${sid}`,
          source:     'Splunk',
          title,
          description: `Splunk search '${searchName}' returned to NORMAL.`,
          priority:   'low',
          resolve:    true,
        }).catch(() => null);
        if (spTicket?.action === 'resolved') {
          broadcast(org.id, { event: 'ticket.resolved', data: { id: spTicket.ticketId, source: 'Splunk' } });
        }
      }
      res.json({ success: true, data: { message: 'Alert auto-closed on NORMAL status' } } satisfies ApiResponse);
      return;
    }

    // ── Build message with all available metrics ─────────────────────────────
    const msgParts: string[] = [];
    if (service)     msgParts.push(`Service: ${service}.`);
    if (environment) msgParts.push(`Environment: ${environment}.`);
    if (totalReqs)   msgParts.push(`Total Requests: ${totalReqs}.`);
    if (p95)         msgParts.push(`p95 Latency: ${p95} ms.`);
    if (slo95pct)    msgParts.push(`SLO (95th pct): ${slo95pct}%.`);
    if (rawStatus)   msgParts.push(`Status: ${rawStatus}.`);
    if (app)         msgParts.push(`Splunk App: ${app}.`);
    if (resultsLink) msgParts.push(`Results: ${resultsLink}`);

    const message = msgParts.length > 0 ? msgParts.join(' ') : `Splunk alert fired: ${searchName}.`;

    // Build tags
    const tags: string[] = ['splunk'];
    if (rawStatus)   tags.push(rawStatus.toLowerCase());
    if (service)     tags.push(service.toLowerCase().replace(/\s+/g, '-').slice(0, 50));
    if (environment) tags.push(environment.toLowerCase().replace(/\s+/g, '-').slice(0, 50));
    if (app)         tags.push(app.toLowerCase().replace(/\s+/g, '-').slice(0, 40));

    const alert = await alertService.createAlert(org.id, {
      title,
      message,
      source:   'Splunk',
      priority,
      tags,
    });

    logger.info({ msg: '[Splunk Webhook] Alert created/deduped', alertId: alert.id, priority });

    // Auto-create / update ticket
    if (sid) {
      const spTicket = await ticketService.createOrUpdateWebhookTicket(org.id, {
        externalId:  `SPL::${sid}`,
        source:      'Splunk',
        title,
        description: message,
        priority,
        tags,
        rawPayload:  { sid, searchName, service, environment, rawStatus, p95, slo95pct, totalReqs, resultsLink },
      }).catch((e) => { logger.warn({ msg: '[Splunk Webhook] Ticket upsert failed', err: (e as Error).message }); return null; });
      if (spTicket?.action === 'created') {
        broadcast(org.id, { event: 'ticket.created', data: { id: spTicket.ticketId, source: 'Splunk' } });
        logger.info({ msg: '[Splunk Webhook] Ticket auto-created', ticketId: spTicket.ticketId, sid });
      } else if (spTicket?.action === 'updated') {
        broadcast(org.id, { event: 'ticket.updated', data: { id: spTicket.ticketId, source: 'Splunk' } });
        logger.info({ msg: '[Splunk Webhook] Ticket auto-updated', ticketId: spTicket.ticketId, sid });
      }
    }

    res.status(201).json({ success: true, data: alert } satisfies ApiResponse);
  }),
);

// ── GET /api/v1/webhooks/splunk/:orgSlug/stats (JWT required) ─────────────────
router.get(
  '/splunk/:orgSlug/stats',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { orgSlug } = req.params as { orgSlug: string };
    const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
    if (!org) {
      res.status(404).json({ success: false, error: `Organisation '${orgSlug}' not found` } satisfies ApiResponse);
      return;
    }
    const [totalAlerts, openAlerts, lastAlert] = await Promise.all([
      prisma.alert.count({ where: { orgId: org.id, source: 'Splunk' } }),
      prisma.alert.count({ where: { orgId: org.id, source: 'Splunk', status: { in: ['open', 'acknowledged'] } } }),
      prisma.alert.findFirst({
        where: { orgId: org.id, source: 'Splunk' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);
    res.json({
      success: true,
      data: { totalAlerts, openAlerts, lastEventAt: lastAlert?.createdAt ?? null },
    } satisfies ApiResponse);
  }),
);

// ── POST /api/v1/webhooks/splunk/:orgSlug/send-test (JWT required) ────────────
// Fires a test alert that mimics your DSM latency search payload.
router.post(
  '/splunk/:orgSlug/send-test',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { orgSlug } = req.params as { orgSlug: string };
    const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
    if (!org) {
      res.status(404).json({ success: false, error: `Organisation '${orgSlug}' not found` } satisfies ApiResponse);
      return;
    }
    const alert = await alertService.createAlert(org.id, {
      title:   '[Splunk] Warning: Latency Spike Observed in DSM Non-Prod',
      message: 'Service: agent-interaction-service. Environment: eai-3541234-dev. Total Requests: 29. p95 Latency: 5060.40 ms. SLO (95th pct): 89.66%. Status: WARNING. [Test alert from AlertHive Integrations page]',
      source:  'Splunk',
      priority: 'medium',
      tags:    ['splunk', 'warning', 'agent-interaction-service', 'eai-3541234-dev', 'latency', 'test'],
    });
    logger.info({ msg: '[Splunk Webhook] Test alert fired via /send-test', alertId: alert.id, user: req.user?.id });
    res.status(201).json({ success: true, data: alert } satisfies ApiResponse);
  }),
);

export default router;

