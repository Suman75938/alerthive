import { Router } from 'express';
import * as analytics from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/tickets',       analytics.getTicketAnalytics);
router.get('/alerts',        analytics.getAlertAnalytics);
router.get('/top-resolvers', analytics.getTopResolvers);
router.post('/email-report', analytics.emailReport);

export default router;
