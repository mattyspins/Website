import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { WagerLeaderboardController } from '@/controllers/WagerLeaderboardController';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';

const router = Router();
const lim = rateLimit({ windowMs: 5 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });

router.get('/monthly', lim, WagerLeaderboardController.getMonthly);
router.get('/monthly/history', lim, WagerLeaderboardController.getMonthlyHistory);
router.get('/admin/wagers', authMiddleware, adminMiddleware, lim, WagerLeaderboardController.getAdminWagers);
router.get('/admin/prizes', authMiddleware, adminMiddleware, lim, WagerLeaderboardController.getPrizes);
router.put('/admin/prizes', authMiddleware, adminMiddleware, lim, WagerLeaderboardController.setPrizes);
router.post('/admin/resync', authMiddleware, adminMiddleware, lim, WagerLeaderboardController.resync);

export default router;
