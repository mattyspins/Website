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

// ─── Admin ────────────────────────────────────────────────────────────────────
router.post('/', authMiddleware, adminMiddleware, adminLimiter, TournamentController.create);
router.patch('/:id', authMiddleware, adminMiddleware, adminLimiter, TournamentController.updateTournament);
router.post('/:id/open-registration', authMiddleware, adminMiddleware, adminLimiter, TournamentController.openRegistration);
router.post('/:id/lock', authMiddleware, adminMiddleware, adminLimiter, TournamentController.lockRegistration);
router.get('/:id/draw', authMiddleware, adminMiddleware, adminLimiter, TournamentController.getDrawStatus);
router.post('/:id/draw/run', authMiddleware, adminMiddleware, adminLimiter, TournamentController.runDraw);
router.post('/:id/start', authMiddleware, adminMiddleware, adminLimiter, TournamentController.startTournament);
router.post('/:id/cancel', authMiddleware, adminMiddleware, adminLimiter, TournamentController.cancel);
router.delete('/:id', authMiddleware, adminMiddleware, adminLimiter, TournamentController.deleteTournament);

router.get('/:id/entries', authMiddleware, adminMiddleware, adminLimiter, TournamentController.getEntries);
router.post('/:id/entries/:entryId/invalidate', authMiddleware, adminMiddleware, adminLimiter, TournamentController.invalidateEntry);
router.post('/:id/entries/:entryId/restore', authMiddleware, adminMiddleware, adminLimiter, TournamentController.restoreEntry);

router.post('/:id/ban', authMiddleware, adminMiddleware, adminLimiter, TournamentController.banUser);
router.delete('/:id/ban/:identifier', authMiddleware, adminMiddleware, adminLimiter, TournamentController.unbanUser);

router.post('/:id/participants/:participantId/replace', authMiddleware, adminMiddleware, adminLimiter, TournamentController.replaceParticipant);

router.post('/matches/:matchId/result', authMiddleware, adminMiddleware, adminLimiter, TournamentController.setMatchResult);
router.post('/matches/:matchId/winner', authMiddleware, adminMiddleware, adminLimiter, TournamentController.declareMatchWinner);
router.delete('/matches/:matchId/winner', authMiddleware, adminMiddleware, adminLimiter, TournamentController.revertMatchWinner);
router.post('/matches/:matchId/pause', authMiddleware, adminMiddleware, adminLimiter, TournamentController.pauseMatch);
router.post('/matches/:matchId/resume', authMiddleware, adminMiddleware, adminLimiter, TournamentController.resumeMatch);

export default router;
