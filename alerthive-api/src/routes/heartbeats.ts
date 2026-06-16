import { Router } from 'express';
import * as ctrl from '../controllers/heartbeatController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', requireRole('admin', 'developer'), ctrl.create);
router.patch('/:id', requireRole('admin', 'developer'), ctrl.update);
router.post('/:id/ping', ctrl.ping);
router.delete('/:id', requireRole('admin'), ctrl.remove);
export default router;
