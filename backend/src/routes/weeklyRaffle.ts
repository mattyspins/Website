import { Router } from 'express';
import rateLimit from '@/config/rateLimit';
import { WeeklyRaffleController } from '@/controllers/WeeklyRaffleController';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';

const router = Router();
const lim = rateLimit({ windowMs: 5 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });

// Public — static paths first so they aren't swallowed by `/:id`.
router.get('/current', lim, WeeklyRaffleController.getCurrent);
router.get('/history', lim, WeeklyRaffleController.getHistory);
router.get('/:id', lim, WeeklyRaffleController.getById);
router.get('/:id/eligible-count', lim, WeeklyRaffleController.getEligibleCount);
router.get('/:id/my-eligibility', authMiddleware, lim, WeeklyRaffleController.getMyEligibility);

// Admin
router.post('/', authMiddleware, adminMiddleware, lim, WeeklyRaffleController.create);
router.get('/:id/eligible-preview', authMiddleware, adminMiddleware, lim, WeeklyRaffleController.getEligiblePreview);
router.post('/:id/draw', authMiddleware, adminMiddleware, lim, WeeklyRaffleController.draw);

export default router;
