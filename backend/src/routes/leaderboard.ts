import { Router } from 'express';
import { LeaderboardController } from '@/controllers/LeaderboardController';
import {
  authMiddleware,
  optionalAuthMiddleware,
  adminMiddleware,
} from '@/middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for leaderboard endpoints
const leaderboardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: {
    error: 'Too many leaderboard requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit each IP to 20 admin requests per 5 minutes
  message: {
    error: 'Too many admin requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes (with optional auth for user highlighting)
router.get(
  '/',
  leaderboardLimiter,
  optionalAuthMiddleware,
  LeaderboardController.getLeaderboard
);
router.get(
  '/stats',
  leaderboardLimiter,
  LeaderboardController.getLeaderboardStats
);
router.get(
  '/multiple',
  leaderboardLimiter,
  optionalAuthMiddleware,
  LeaderboardController.getMultipleLeaderboards
);

// Protected routes (require authentication)
router.get(
  '/rank/:userId?',
  leaderboardLimiter,
  authMiddleware,
  LeaderboardController.getUserRank
);
router.get(
  '/history/:userId?',
  leaderboardLimiter,
  authMiddleware,
  LeaderboardController.getUserHistory
);

// Admin routes
router.post(
  '/reset',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  LeaderboardController.resetLeaderboard
);
router.post(
  '/manual-rank',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  LeaderboardController.setManualRank
);
router.post(
  '/update-score',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  LeaderboardController.updateUserScore
);

export default router;
