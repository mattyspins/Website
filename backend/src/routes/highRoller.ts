import { Router } from 'express';
import rateLimit from '@/config/rateLimit';
import { HighRollerController } from '@/controllers/HighRollerController';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';

const router = Router();
const lim = rateLimit({ windowMs: 5 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });

router.get('/', authMiddleware, adminMiddleware, lim, HighRollerController.getAll);
router.get('/active', lim, HighRollerController.getActive);
router.post('/', authMiddleware, adminMiddleware, lim, HighRollerController.create);
router.post('/:id/add-player', authMiddleware, adminMiddleware, lim, HighRollerController.addPlayer);
router.delete('/players/:playerId', authMiddleware, adminMiddleware, lim, HighRollerController.removePlayer);
router.post('/:id/lock', authMiddleware, adminMiddleware, lim, HighRollerController.lockPredictions);
router.post('/:id/reset-round', authMiddleware, adminMiddleware, lim, HighRollerController.resetRound);
router.post('/:id/resolve', authMiddleware, adminMiddleware, lim, HighRollerController.resolveRound);
router.post('/:id/threshold', authMiddleware, adminMiddleware, lim, HighRollerController.changeThreshold);
router.post('/:id/pause', authMiddleware, adminMiddleware, lim, HighRollerController.pause);
router.post('/:id/resume', authMiddleware, adminMiddleware, lim, HighRollerController.resume);
router.post('/:id/final-round', authMiddleware, adminMiddleware, lim, HighRollerController.setFinalRound);
router.post('/:id/end', authMiddleware, adminMiddleware, lim, HighRollerController.endGame);
router.post('/:id/draw-suggestion', authMiddleware, adminMiddleware, lim, HighRollerController.drawSuggestion);
router.delete('/:id', authMiddleware, adminMiddleware, lim, HighRollerController.deleteSession);

export default router;
