import { Router } from 'express';
import * as sla from '../controllers/slaController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/',              sla.listPolicies);
router.put('/:severity',    requireRole('admin'), sla.updatePolicy);

export default router;
