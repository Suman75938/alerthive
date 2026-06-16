import { Router } from 'express';
import * as ctrl from '../controllers/oncallController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
export default router;
