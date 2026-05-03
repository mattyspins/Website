import { Router } from 'express';
import { ScheduleController } from '@/controllers/ScheduleController';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for schedule endpoints
const scheduleLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: {
    error: 'Too many schedule requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminScheduleLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 admin schedule updates per 5 minutes
  message: {
    error: 'Too many schedule updates, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(scheduleLimiter);

// Public endpoints
router.get('/current', ScheduleController.getCurrentSchedule);
router.get('/today', ScheduleController.getTodaySchedule);
router.get('/live', ScheduleController.isStreamingNow);

// Admin endpoints
router.put(
  '/update',
  authMiddleware,
  adminMiddleware,
  adminScheduleLimiter,
  ScheduleController.updateSchedule
);

export default router;
