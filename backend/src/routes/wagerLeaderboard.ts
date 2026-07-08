import { Router } from 'express';
import rateLimit from '@/config/rateLimit';
import { WagerLeaderboardController } from '@/controllers/WagerLeaderboardController';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';

const router = Router();
const lim = rateLimit({ windowMs: 5 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });

router.get('/active', lim, WagerLeaderboardController.getActive);
router.get('/history', lim, WagerLeaderboardController.getHistory);
router.get('/admin/wagers', authMiddleware, adminMiddleware, lim, WagerLeaderboardController.getAdminWagers);
router.get('/admin/all-wagerers', authMiddleware, adminMiddleware, lim, WagerLeaderboardController.getAllWagerers);
router.get('/admin/races', authMiddleware, adminMiddleware, lim, WagerLeaderboardController.listRaces);
router.post('/admin/races', authMiddleware, adminMiddleware, lim, WagerLeaderboardController.createRace);
router.put('/admin/races/:raceId', authMiddleware, adminMiddleware, lim, WagerLeaderboardController.updateRace);
router.delete('/admin/races/:raceId', authMiddleware, adminMiddleware, lim, WagerLeaderboardController.deleteRace);
router.post('/admin/resync', authMiddleware, adminMiddleware, lim, WagerLeaderboardController.resync);

export default router;
