import { Router } from 'express';
import authRoutes     from './auth';
import alertRoutes    from './alerts';
import ticketRoutes   from './tickets';
import incidentRoutes from './incidents';
import userRoutes     from './users';
import analyticsRoutes from './analytics';
import slaRoutes      from './sla';
import webhookRoutes  from './webhooks';
import problemRoutes  from './problems';
import changeRoutes   from './changes';
import knowledgeRoutes from './knowledge';
import postmortemRoutes from './postmortems';
import heartbeatRoutes from './heartbeats';
import routingRoutes  from './routing';
import escalationRoutes from './escalation';
import maintenanceRoutes from './maintenance';
import channelRoutes  from './channels';
import playbookRoutes from './playbooks';
import catalogRoutes  from './catalog';
import oncallRoutes   from './oncall';
import chatRoutes     from './chat';
import { isRedisAvailable } from '../config/redis';
import { isKafkaAvailable } from '../config/kafka';
import { webhookLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/health', (_req, res) => {
  const redis = isRedisAvailable();
  const kafka = isKafkaAvailable();
  const status = 'ok';
  res.json({
    status,
    ts: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
    uptime: Math.round(process.uptime()),
    dependencies: {
      redis: redis ? 'connected' : 'unavailable',
      kafka: kafka ? 'connected' : 'unavailable',
      database: 'connected',
    },
  });
});

router.use('/auth',        authRoutes);
router.use('/alerts',      alertRoutes);
router.use('/tickets',     ticketRoutes);
router.use('/incidents',   incidentRoutes);
router.use('/users',       userRoutes);
router.use('/analytics',   analyticsRoutes);
router.use('/sla',         slaRoutes);
router.use('/webhooks',    webhookLimiter, webhookRoutes);
router.use('/problems',    problemRoutes);
router.use('/changes',     changeRoutes);
router.use('/knowledge',   knowledgeRoutes);
router.use('/postmortems', postmortemRoutes);
router.use('/heartbeats',  heartbeatRoutes);
router.use('/routing',     routingRoutes);
router.use('/escalation',  escalationRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/channels',    channelRoutes);
router.use('/playbooks',   playbookRoutes);
router.use('/catalog',     catalogRoutes);
router.use('/oncall',      oncallRoutes);
router.use('/chat',        chatRoutes);

export default router;
