import { Router } from 'express';
import authRoutes     from './auth';
import alertRoutes    from './alerts';
import ticketRoutes   from './tickets';
import incidentRoutes from './incidents';
import userRoutes     from './users';
import analyticsRoutes from './analytics';
import slaRoutes      from './sla';
import webhookRoutes  from './webhooks';
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
      database: 'connected',   // prisma would have thrown on startup if DB was down
    },
  });
});

router.use('/auth',      authRoutes);
router.use('/alerts',    alertRoutes);
router.use('/tickets',   ticketRoutes);
router.use('/incidents', incidentRoutes);
router.use('/users',     userRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/sla',       slaRoutes);
router.use('/webhooks',  webhookLimiter, webhookRoutes);

export default router;
