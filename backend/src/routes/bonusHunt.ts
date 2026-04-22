import { Router } from 'express';
import { BonusHuntController } from '@/controllers/BonusHuntController';
import { authMiddleware, optionalAuthMiddleware } from '@/middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for bonus hunt endpoints
const bonusHuntLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: {
    error: 'Too many bonus hunt requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const actionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 action requests per minute
  message: {
    error: 'Too many action requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Session management routes (require authentication)
router.post(
  '/sessions',
  actionLimiter,
  authMiddleware,
  BonusHuntController.createSession
);
router.get(
  '/sessions/:sessionId',
  bonusHuntLimiter,
  optionalAuthMiddleware,
  BonusHuntController.getSession
);
router.get(
  '/sessions/user/:userId?',
  bonusHuntLimiter,
  authMiddleware,
  BonusHuntController.getUserSessions
);
router.post(
  '/sessions/:sessionId/complete',
  actionLimiter,
  authMiddleware,
  BonusHuntController.completeSession
);
router.post(
  '/sessions/:sessionId/abandon',
  actionLimiter,
  authMiddleware,
  BonusHuntController.abandonSession
);

// Bonus buy routes
router.post(
  '/sessions/:sessionId/bonus-buys',
  actionLimiter,
  authMiddleware,
  BonusHuntController.addBonusBuy
);
router.get(
  '/sessions/:sessionId/bonus-buys',
  bonusHuntLimiter,
  BonusHuntController.getSessionBonusBuys
);

// Prediction routes
router.post(
  '/sessions/:sessionId/predictions',
  actionLimiter,
  authMiddleware,
  BonusHuntController.createPrediction
);
router.get(
  '/sessions/:sessionId/predictions',
  bonusHuntLimiter,
  BonusHuntController.getSessionPredictions
);

// Statistics routes
router.get(
  '/statistics/:userId?',
  bonusHuntLimiter,
  authMiddleware,
  BonusHuntController.getUserStatistics
);

export default router;
