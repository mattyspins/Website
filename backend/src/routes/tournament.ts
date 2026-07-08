import { Router } from 'express';
import rateLimit from '@/config/rateLimit';
import { TournamentController } from '@/controllers/TournamentController';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';

const router = Router();

const tournamentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
  message: { error: 'Too many admin requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Public ──────────────────────────────────────────────────────────────────
router.get('/', tournamentLimiter, TournamentController.getAll);
router.get('/:id', tournamentLimiter, TournamentController.getById);

// ─── Viewer (auth required) ───────────────────────────────────────────────────
router.get('/:id/my-entry', authMiddleware, tournamentLimiter, TournamentController.getMyEntry);
router.post('/:id/enter', authMiddleware, tournamentLimiter, TournamentController.enterRaffle);
router.delete('/:id/enter', authMiddleware, tournamentLimiter, TournamentController.leaveRaffle);
router.post('/:id/slot', authMiddleware, tournamentLimiter, TournamentController.setInitialSlot);
router.post('/matches/:matchId/slot', authMiddleware, tournamentLimiter, TournamentController.setMatchSlot);
router.post('/matches/:matchId/confirm', authMiddleware, tournamentLimiter, TournamentController.confirmMatchSlot);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.post('/', authMiddleware, adminMiddleware, adminLimiter, TournamentController.create);
router.post('/:id/open-registration', authMiddleware, adminMiddleware, adminLimiter, TournamentController.openRegistration);
router.get('/:id/entries', authMiddleware, adminMiddleware, adminLimiter, TournamentController.getEntries);
router.post('/:id/draw', authMiddleware, adminMiddleware, adminLimiter, TournamentController.drawWinners);
router.post('/:id/start', authMiddleware, adminMiddleware, adminLimiter, TournamentController.startTournament);
router.post('/:id/cancel', authMiddleware, adminMiddleware, adminLimiter, TournamentController.cancel);
router.delete('/:id', authMiddleware, adminMiddleware, adminLimiter, TournamentController.deleteTournament);
router.post('/:id/participants/:participantId/reroll', authMiddleware, adminMiddleware, adminLimiter, TournamentController.rerollParticipant);
router.post('/matches/:matchId/winner', authMiddleware, adminMiddleware, adminLimiter, TournamentController.declareMatchWinner);
router.delete('/matches/:matchId/winner', authMiddleware, adminMiddleware, adminLimiter, TournamentController.revertMatchWinner);

export default router;
