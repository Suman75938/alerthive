import { Router } from 'express';
import * as ctrl from '../controllers/catalogController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', requireRole('admin'), ctrl.create);
router.patch('/:id', requireRole('admin'), ctrl.update);
router.delete('/:id', requireRole('admin'), ctrl.remove);
export default router;
