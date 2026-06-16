import { Router } from 'express';
import * as incidents from '../controllers/incidentController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/',                      incidents.list);
router.get('/:id',                   incidents.get);
router.post('/',                     incidents.create);
router.patch('/:id/status',          incidents.updateStatus);
router.post('/:id/timeline',         incidents.addTimelineNote);

export default router;
