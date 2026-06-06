import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { BingoBoardController } from '@/controllers/BingoBoardController';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';

const router = Router();

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
const adminLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });

// Public
router.get('/', limiter, BingoBoardController.getAll);
router.get('/:id', limiter, BingoBoardController.getById);

// Viewer (auth)
router.post('/:id/join', authMiddleware, limiter, BingoBoardController.join);
router.delete('/:id/join', authMiddleware, limiter, BingoBoardController.leave);
router.post('/:id/cells/:cellId/slot', authMiddleware, limiter, BingoBoardController.setSlot);

// Admin
router.post('/', authMiddleware, adminMiddleware, adminLimiter, BingoBoardController.create);
router.post('/:id/open-registration', authMiddleware, adminMiddleware, adminLimiter, BingoBoardController.openRegistration);
router.post('/:id/start', authMiddleware, adminMiddleware, adminLimiter, BingoBoardController.startGame);
router.post('/:id/spin-cell', authMiddleware, adminMiddleware, adminLimiter, BingoBoardController.spinCell);
router.post('/:id/draw-player', authMiddleware, adminMiddleware, adminLimiter, BingoBoardController.drawPlayer);
router.post('/:id/result', authMiddleware, adminMiddleware, adminLimiter, BingoBoardController.markResult);
router.post('/:id/cancel', authMiddleware, adminMiddleware, adminLimiter, BingoBoardController.cancel);
router.delete('/:id', authMiddleware, adminMiddleware, adminLimiter, BingoBoardController.deleteGame);
router.delete('/:id/participants/:userId', authMiddleware, adminMiddleware, adminLimiter, BingoBoardController.removeParticipant);

export default router;
