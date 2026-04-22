import { Router } from 'express';
import { RaffleController } from '@/controllers/RaffleController';
import {
  authMiddleware,
  optionalAuthMiddleware,
  adminMiddleware,
} from '@/middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for raffle endpoints
const raffleLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: {
    error: 'Too many raffle requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const purchaseLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // limit ticket purchases to 5 per minute
  message: {
    error: 'Too many purchase attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit admin requests
  message: {
    error: 'Too many admin requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.get('/', raffleLimiter, RaffleController.getActiveRaffles);
router.get('/stats', raffleLimiter, RaffleController.getRaffleStats);
router.get('/:raffleId', raffleLimiter, RaffleController.getRaffleDetails);
router.get(
  '/:raffleId/winners',
  raffleLimiter,
  RaffleController.getRaffleWinners
);

// Protected routes (require authentication)
router.post(
  '/:raffleId/purchase',
  purchaseLimiter,
  authMiddleware,
  RaffleController.purchaseTickets
);
router.get(
  '/:raffleId/tickets',
  raffleLimiter,
  authMiddleware,
  RaffleController.getUserTickets
);

// Admin routes
router.post(
  '/',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  RaffleController.createRaffle
);
router.post(
  '/:raffleId/select-winners',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  RaffleController.selectWinners
);
router.post(
  '/:raffleId/cancel',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  RaffleController.cancelRaffle
);
router.put(
  '/:raffleId',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  RaffleController.updateRaffle
);
router.get(
  '/admin/all',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  RaffleController.getAllRaffles
);

export default router;
