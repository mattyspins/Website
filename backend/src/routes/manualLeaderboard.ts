import { Router } from 'express';
import { LeaderboardController } from '../controllers/LeaderboardController';
import {
  authMiddleware,
  optionalAuthMiddleware,
  adminMiddleware,
} from '../middleware/auth';
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

/**
 * Manual Leaderboard Routes
 * Feature: kick-oauth-manual-leaderboard
 */

// Public routes (with optional auth for user highlighting)
// GET /api/manual-leaderboards?status=active&limit=10
router.get('/', leaderboardLimiter, LeaderboardController.getLeaderboards);

// GET /api/manual-leaderboards/:id
router.get(
  '/:id',
  leaderboardLimiter,
  optionalAuthMiddleware,
  LeaderboardController.getLeaderboardDetails
);

// Protected routes (require authentication)
// GET /api/manual-leaderboards/:id/user-total
router.get(
  '/:id/user-total',
  leaderboardLimiter,
  authMiddleware,
  LeaderboardController.getUserTotal
);

// Admin routes
// POST /api/admin/manual-leaderboards
router.post(
  '/admin/create',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  LeaderboardController.createLeaderboard
);

// POST /api/admin/manual-leaderboards/:id/wagers
router.post(
  '/admin/:id/wagers',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  LeaderboardController.addWager
);

// PUT /api/admin/manual-leaderboards/:id/prizes
router.put(
  '/admin/:id/prizes',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  LeaderboardController.updatePrizes
);

// GET /api/admin/manual-leaderboards/:id/export
router.get(
  '/admin/:id/export',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  LeaderboardController.exportLeaderboard
);

// DELETE /api/admin/manual-leaderboards/:id
router.delete(
  '/admin/:id',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  LeaderboardController.deleteLeaderboard
);

export default router;
