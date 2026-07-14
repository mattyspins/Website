import { Router } from 'express';
import rateLimit from '@/config/rateLimit';
import { BountyHunterController } from '@/controllers/BountyHunterController';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';

const router = Router();
const lim = rateLimit({ windowMs: 5 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });

router.get('/', authMiddleware, adminMiddleware, lim, BountyHunterController.getAll);
router.get('/active', lim, BountyHunterController.getActive);
router.get('/active/admin', authMiddleware, adminMiddleware, lim, BountyHunterController.getActiveAdmin);
router.post('/', authMiddleware, adminMiddleware, lim, BountyHunterController.create);
router.post('/:id/registration', authMiddleware, adminMiddleware, lim, BountyHunterController.setRegistrationOpen);
router.post('/:id/add-entry', authMiddleware, adminMiddleware, lim, BountyHunterController.addEntry);
router.delete('/entries/:entryId', authMiddleware, adminMiddleware, lim, BountyHunterController.removeEntry);
router.post('/:id/draw', authMiddleware, adminMiddleware, lim, BountyHunterController.draw);
router.post('/entries/:entryId/slot', authMiddleware, adminMiddleware, lim, BountyHunterController.setSlot);
router.post('/entries/:entryId/skip', authMiddleware, adminMiddleware, lim, BountyHunterController.skipPlayer);
router.post('/entries/:entryId/round', authMiddleware, adminMiddleware, lim, BountyHunterController.submitRound);
router.post('/:id/settle', authMiddleware, adminMiddleware, lim, BountyHunterController.settleBounty);
router.post('/:id/force-rollover', authMiddleware, adminMiddleware, lim, BountyHunterController.forceRollover);
router.post('/:id/reroll-target', authMiddleware, adminMiddleware, lim, BountyHunterController.rerollTarget);
router.post('/:id/target', authMiddleware, adminMiddleware, lim, BountyHunterController.setTarget);
router.post('/:id/claim-zone', authMiddleware, adminMiddleware, lim, BountyHunterController.setClaimZone);
router.post('/:id/pot', authMiddleware, adminMiddleware, lim, BountyHunterController.setPot);
router.delete('/:id', authMiddleware, adminMiddleware, lim, BountyHunterController.deleteHunt);

export default router;
