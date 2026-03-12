/**
 * kafkaConsumer.ts
 * Consumes events from Kafka topics and simulates downstream processing:
 *   - alerthive.alerts     → simulated notification dispatch
 *   - alerthive.incidents  → simulated on-call paging & escalation
 *
 * In production, this would kick off BullMQ jobs, send Dynatrace webhook notifications,
 * dispatch SMS/email via Twilio/SendGrid, etc.
 */
import { Consumer } from 'kafkajs';
import { kafka } from '../config/kafka';
import { logger } from '../utils/logger';

export const TOPICS = {
  ALERTS: 'alerthive.alerts',
  INCIDENTS: 'alerthive.incidents',
  NOTIFICATIONS: 'alerthive.notifications',
} as const;

let consumer: Consumer | null = null;

/** Simulates sending a notification for an alert event */
function handleAlertEvent(key: string | null, payload: Record<string, unknown>) {
  const { event, orgId, data } = payload as { event: string; orgId: string; data: Record<string, unknown> };
  logger.info({ msg: `[Kafka Consumer] 🔔 Alert event received`, event, orgId, alertId: data?.id });

  if (event === 'alert.created') {
    const priority = data?.priority ?? 'unknown';
    const title = data?.title ?? 'Untitled';
    logger.info({
      msg: `[Notification Sim] Dispatching alert notification`,
      channel: priority === 'critical' ? 'Dynatrace + Slack + SMS' : 'Slack',
      title,
      priority,
    });
  }

  if (event === 'alert.status_changed') {
    logger.info({
      msg: `[Notification Sim] Alert status update dispatched`,
      alertId: data?.id,
      newStatus: data?.status,
      channel: 'Slack',
    });
  }
}

/** Simulates on-call paging for incident events */
function handleIncidentEvent(key: string | null, payload: Record<string, unknown>) {
  const { event, orgId, data } = payload as { event: string; orgId: string; data: Record<string, unknown> };
  logger.info({ msg: `[Kafka Consumer] 🚨 Incident event received`, event, orgId, incidentId: data?.id });

  if (event === 'incident.created') {
    logger.info({
      msg: `[On-call Sim] Paging on-call engineer`,
      incidentId: data?.id,
      priority: data?.priority,
      channel: 'Dynatrace alert policy → phone call → SMS fallback',
    });
  }

  if (event === 'incident.status_changed') {
    const status = data?.status;
    if (status === 'resolved') {
      logger.info({
        msg: `[On-call Sim] Incident resolved – sending stakeholder update`,
        incidentId: data?.id,
        channel: 'Email + Slack',
      });
    } else {
      logger.info({
        msg: `[On-call Sim] Incident status update dispatched`,
        incidentId: data?.id,
        newStatus: status,
      });
    }
  }
}

export async function startKafkaConsumer(): Promise<void> {
  try {
    consumer = kafka.consumer({ groupId: 'alerthive-notification-worker' });
    await consumer.connect();

    await consumer.subscribe({ topics: [TOPICS.ALERTS, TOPICS.INCIDENTS], fromBeginning: false });

    consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const key = message.key?.toString() ?? null;
          const raw = message.value?.toString();
          if (!raw) return;

          const payload = JSON.parse(raw) as Record<string, unknown>;

          if (topic === TOPICS.ALERTS) handleAlertEvent(key, payload);
          if (topic === TOPICS.INCIDENTS) handleIncidentEvent(key, payload);
        } catch (err) {
          logger.warn({ msg: '[Kafka Consumer] Failed to process message', err: (err as Error).message });
        }
      },
    }).catch((err) => {
      logger.warn({ msg: '[Kafka Consumer] run() error', err: (err as Error).message });
    });

    logger.info(`✅  Kafka consumer started – subscribed to [${TOPICS.ALERTS}, ${TOPICS.INCIDENTS}]`);
  } catch (err) {
    logger.warn({ msg: '⚠️  Kafka consumer unavailable (demo mode)', err: (err as Error).message });
  }
}

export async function stopKafkaConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
    logger.info('Kafka consumer disconnected');
  }
}
