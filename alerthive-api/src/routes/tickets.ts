import { Router } from 'express';
import * as tickets from '../controllers/ticketController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/',              tickets.list);
router.get('/:id',           tickets.get);
router.post('/',             tickets.create);
router.patch('/:id',         tickets.update);
router.post('/:id/comments', tickets.addComment);
router.delete('/:id',        requireRole('admin'), tickets.deleteTicket); // admin only

export default router;
