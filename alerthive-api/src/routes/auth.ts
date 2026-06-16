import { Router } from 'express';
import * as auth from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/login',   authLimiter, auth.login);
router.post('/signup',  authLimiter, auth.signup);
router.post('/refresh', authLimiter, auth.refresh);
router.post('/logout',  auth.logout);
router.get('/me',       authenticate, auth.me);

export default router;
