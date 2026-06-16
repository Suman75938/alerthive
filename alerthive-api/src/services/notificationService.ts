/**
 * notificationService.ts
 * Sends push notifications to on-call users via Expo Push API.
 * No additional SDK needed — uses the Expo push HTTP endpoint directly.
 */
import { prisma } from '../db/prisma';
import logger from '../utils/logger';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: 'default' | 'normal' | 'high';
  sound?: 'default' | null;
  badge?: number;
}

// ── Send push to a list of Expo tokens ───────────────────────────────────────
async function sendPushNotifications(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const json = await res.json() as { data: Array<{ status: string; message?: string }> };
    const failed = (json.data ?? []).filter((r) => r.status !== 'ok');
    if (failed.length > 0) {
      logger.warn('[Push] Some notifications failed:', failed);
    } else {
      logger.info(`[Push] Sent ${messages.length} notification(s) successfully`);
    }
  } catch (err) {
    logger.error('[Push] Failed to send notifications:', err);
  }
}

// ── Notify on-call users for an org when a new alert arrives ─────────────────
export async function notifyOnCallUsers(
  orgId: string,
  alert: { id: string; title: string; priority: string; source: string },
): Promise<void> {
  // Only notify for high/critical alerts
  if (!['critical', 'high'].includes(alert.priority)) return;

  // Find on-call team members with push tokens
  const onCallMembers = await prisma.teamMember.findMany({
    where: { isOnCall: true, team: { orgId } },
    include: { user: { select: { id: true, name: true, pushToken: true } } },
  });

  // Also notify admin users as fallback if no on-call members
  let targets = onCallMembers.map((m) => m.user).filter((u) => u.pushToken);

  if (targets.length === 0) {
    const admins = await prisma.user.findMany({
      where: { orgId, role: 'admin', pushToken: { not: null } },
      select: { id: true, name: true, pushToken: true },
    });
    targets = admins;
  }

  if (targets.length === 0) {
    logger.info(`[Push] No on-call users with push tokens for org ${orgId}`);
    return;
  }

  const priorityLabel = alert.priority === 'critical' ? '🔴 CRITICAL' : '🟠 HIGH';
  const messages: PushMessage[] = targets.map((user) => ({
    to: user.pushToken!,
    title: `${priorityLabel}: ${alert.title}`,
    body: `Source: ${alert.source} — Tap to view and acknowledge`,
    data: { alertId: alert.id, priority: alert.priority },
    priority: 'high',
    sound: 'default',
    badge: 1,
  }));

  logger.info(`[Push] Notifying ${messages.length} on-call user(s) for alert ${alert.id}`);
  await sendPushNotifications(messages);
}
