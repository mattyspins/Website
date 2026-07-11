import { Router } from 'express';
import rateLimit from '@/config/rateLimit';
import { BossRaidController } from '@/controllers/BossRaidController';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';

const router = Router();
const lim = rateLimit({ windowMs: 5 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });

router.get('/roster', lim, BossRaidController.getRoster);
router.get('/', authMiddleware, adminMiddleware, lim, BossRaidController.getAll);
router.get('/active', lim, BossRaidController.getActive);
router.post('/', authMiddleware, adminMiddleware, lim, BossRaidController.create);
router.post('/:id/close-registration', authMiddleware, adminMiddleware, lim, BossRaidController.closeRegistration);
router.post('/:id/add-entry', authMiddleware, adminMiddleware, lim, BossRaidController.addEntry);
router.delete('/entries/:entryId', authMiddleware, adminMiddleware, lim, BossRaidController.removeEntry);
router.post('/:id/draw', authMiddleware, adminMiddleware, lim, BossRaidController.draw);
router.post('/entries/:entryId/slot', authMiddleware, adminMiddleware, lim, BossRaidController.setSlot);
router.post('/entries/:entryId/skip', authMiddleware, adminMiddleware, lim, BossRaidController.skipPlayer);
router.post('/entries/:entryId/dead-bonus', authMiddleware, adminMiddleware, lim, BossRaidController.submitDeadBonus);
router.post('/entries/:entryId/round', authMiddleware, adminMiddleware, lim, BossRaidController.submitRound);
router.post('/:id/end', authMiddleware, adminMiddleware, lim, BossRaidController.endRaid);
router.delete('/:id', authMiddleware, adminMiddleware, lim, BossRaidController.deleteRaid);

export default router;
