import { Router } from 'express';
import rateLimit from '@/config/rateLimit';
import { WagerLeaderboardController } from '@/controllers/WagerLeaderboardController';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';

const router = Router();
const lim = rateLimit({ windowMs: 5 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });

router.get('/active', lim, WagerLeaderboardController.getActive);
router.get('/history', lim, WagerLeaderboardController.getHistory);

// Race schedules/prizes are hardcoded in @/config/wagerRaces — no admin CRUD.
// Resync only re-pulls wager figures from Razed, so it stays available.
router.post('/admin/resync', authMiddleware, adminMiddleware, lim, WagerLeaderboardController.resync);
router.get('/admin/resync/status', authMiddleware, adminMiddleware, lim, WagerLeaderboardController.resyncStatus);

export default router;
