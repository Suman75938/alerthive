import { Router } from 'express';
import * as alerts from '../controllers/alertController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/',             alerts.list);
router.get('/:id',          alerts.get);
router.post('/',            alerts.create);
router.patch('/:id/status', alerts.updateStatus);
router.delete('/:id',       requireRole('admin'), alerts.deleteAlert); // admin only

export default router;
