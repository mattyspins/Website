import { Router } from 'express';
import rateLimit from '@/config/rateLimit';
import { SlotWorldCupController } from '@/controllers/SlotWorldCupController';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';

const router = Router();
const lim = rateLimit({ windowMs: 5 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
const adminLim = rateLimit({ windowMs: 5 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

// ─── Public ──────────────────────────────────────────────────────────────────
router.get('/', lim, SlotWorldCupController.getAll);
router.get('/:id', lim, SlotWorldCupController.getById);
router.get('/:id/nominations', lim, SlotWorldCupController.getNominations);
router.get('/:id/leaderboard', lim, SlotWorldCupController.getLeaderboard);
router.get('/:id/matches/:matchId/stats', lim, SlotWorldCupController.getMatchStats);

// ─── Viewer (auth required) ───────────────────────────────────────────────────
router.post('/:id/nominate', authMiddleware, lim, SlotWorldCupController.nominate);
router.get('/:id/my-prediction', authMiddleware, lim, SlotWorldCupController.getMyPrediction);
router.post('/:id/predict', authMiddleware, lim, SlotWorldCupController.submitPrediction);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.post('/', authMiddleware, adminMiddleware, adminLim, SlotWorldCupController.create);
router.post('/:id/lock-nominations', authMiddleware, adminMiddleware, adminLim, SlotWorldCupController.lockNominations);
router.post('/:id/slots', authMiddleware, adminMiddleware, adminLim, SlotWorldCupController.addSlot);
router.delete('/:id/slots/:slotId', authMiddleware, adminMiddleware, adminLim, SlotWorldCupController.removeSlot);
router.post('/:id/finalize-participants', authMiddleware, adminMiddleware, adminLim, SlotWorldCupController.finalizeParticipants);
router.post('/:id/generate-bracket', authMiddleware, adminMiddleware, adminLim, SlotWorldCupController.generateBracket);
router.post('/:id/open-predictions', authMiddleware, adminMiddleware, adminLim, SlotWorldCupController.openPredictions);
router.post('/matches/:matchId/winner', authMiddleware, adminMiddleware, adminLim, SlotWorldCupController.declareMatchWinner);
router.post('/:id/cancel', authMiddleware, adminMiddleware, adminLim, SlotWorldCupController.cancel);
router.post('/:id/config', authMiddleware, adminMiddleware, adminLim, SlotWorldCupController.updateConfig);

export default router;
