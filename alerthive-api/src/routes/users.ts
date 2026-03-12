import { Router } from 'express';
import * as users from '../controllers/userController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Any authenticated user can list / view
router.get('/',      users.list);
router.get('/:id',   users.getById);

// Admin-only user management
router.post('/',       requireRole('admin'), users.create);      // create user
router.patch('/:id',   requireRole('admin'), users.update);      // full profile update + password reset
router.delete('/:id',  requireRole('admin'), users.deleteUser);  // delete user

export default router;
