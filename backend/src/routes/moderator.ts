import { Router } from 'express';
import { AdminController } from '@/controllers/AdminController';
import { authMiddleware, moderatorMiddleware } from '@/middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// All moderator routes require authentication and moderator privileges
router.use(authMiddleware);
router.use(moderatorMiddleware);

// Rate limiting for moderator endpoints
const moderatorLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // limit each IP to 100 requests per 5 minutes
  message: {
    error: 'Too many moderator requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const moderatorActionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // limit each IP to 30 actions per 5 minutes
  message: {
    error: 'Too many moderator actions, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(moderatorLimiter);

// User Management (limited to viewing and suspending)
router.get('/users/search', AdminController.searchUsers);
router.get('/users/:userId', AdminController.getUserDetails);
router.post(
  '/users/:userId/suspend',
  moderatorActionLimiter,
  AdminController.suspendUser
);
router.post(
  '/users/:userId/unsuspend',
  moderatorActionLimiter,
  AdminController.unsuspendUser
);

export default router;
