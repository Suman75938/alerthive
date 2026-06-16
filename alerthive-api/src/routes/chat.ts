import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { chat } from '../controllers/chatController';

const router = Router();

router.use(authenticate);

// POST /api/v1/chat  – send messages, get response (streaming or not)
router.post('/', chat);

export default router;
