import { Router } from 'express';
import rateLimit from '@/config/rateLimit';
import { WagerLeaderboardController } from '@/controllers/WagerLeaderboardController';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';

const router = Router();
const lim = rateLimit({ windowMs: 5 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });

router.get('/active', lim, WagerLeaderboardController.getActive);
router.get('/history', lim, WagerLeaderboardController.getHistory);

// Races live in the database and are managed from /admin/leaderboards. Nothing in code
// overwrites them, so an admin's saved schedule and prizes are authoritative.
router.get('/admin/races', authMiddleware, adminMiddleware, lim, WagerLeaderboardController.listRaces);
router.post('/admin/races', authMiddleware, adminMiddleware, lim, WagerLeaderboardController.createRace);
router.put('/admin/races/:raceId', authMiddleware, adminMiddleware, lim, WagerLeaderboardController.updateRace);
router.delete('/admin/races/:raceId', authMiddleware, adminMiddleware, lim, WagerLeaderboardController.deleteRace);

// Resync only re-pulls wager figures from Razed, so it can't alter a race.
router.post('/admin/resync', authMiddleware, adminMiddleware, lim, WagerLeaderboardController.resync);
router.get('/admin/resync/status', authMiddleware, adminMiddleware, lim, WagerLeaderboardController.resyncStatus);

export default router;
