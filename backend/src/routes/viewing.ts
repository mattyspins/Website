import { Router } from 'express';
import { ViewingController } from '@/controllers/ViewingController';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for viewing endpoints
const viewingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per minute (for heartbeat)
  message: {
    error: 'Too many viewing requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const sessionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit session start/end to 10 per minute
  message: {
    error: 'Too many session requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // limit admin requests
  message: {
    error: 'Too many admin requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.get('/stream/status', viewingLimiter, ViewingController.getStreamStatus);

// Protected routes (require authentication)
router.post(
  '/session/start',
  sessionLimiter,
  authMiddleware,
  ViewingController.startViewingSession
);
router.post(
  '/session/end',
  sessionLimiter,
  authMiddleware,
  ViewingController.endViewingSession
);
router.post(
  '/session/heartbeat',
  viewingLimiter,
  authMiddleware,
  ViewingController.updateViewingActivity
);
router.get(
  '/session/:streamId',
  viewingLimiter,
  authMiddleware,
  ViewingController.getActiveSession
);
router.get(
  '/stats/:userId?',
  viewingLimiter,
  authMiddleware,
  ViewingController.getViewingStats
);

// Admin routes
router.get(
  '/admin/sessions',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  ViewingController.getAllViewingSessions
);

export default router;
