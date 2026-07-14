import { Router } from 'express';
import rateLimit from '@/config/rateLimit';
import { KingOfTheHillController } from '@/controllers/KingOfTheHillController';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';

const router = Router();
const lim = rateLimit({ windowMs: 5 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });

router.get('/', authMiddleware, adminMiddleware, lim, KingOfTheHillController.getAll);
router.get('/active', lim, KingOfTheHillController.getActive);
router.post('/', authMiddleware, adminMiddleware, lim, KingOfTheHillController.create);
router.post('/:id/close', authMiddleware, adminMiddleware, lim, KingOfTheHillController.close);
router.post('/:id/draw', authMiddleware, adminMiddleware, lim, KingOfTheHillController.draw);
router.post('/:id/cancel-draw', authMiddleware, adminMiddleware, lim, KingOfTheHillController.cancelDraw);
router.post('/:id/add-entry', authMiddleware, adminMiddleware, lim, KingOfTheHillController.addEntry);
router.delete('/entries/:entryId', authMiddleware, adminMiddleware, lim, KingOfTheHillController.removeEntry);
router.post('/entries/:entryId/slot', authMiddleware, adminMiddleware, lim, KingOfTheHillController.setSlot);
router.post('/entries/:entryId/round', authMiddleware, adminMiddleware, lim, KingOfTheHillController.submitRound);
router.delete('/:id', authMiddleware, adminMiddleware, lim, KingOfTheHillController.deleteSession);

export default router;
