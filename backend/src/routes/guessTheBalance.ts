import { Router } from 'express';
import { GuessTheBalanceController } from '@/controllers/GuessTheBalanceController';
import { authMiddleware, optionalAuthMiddleware } from '@/middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for guess submissions
const guessLimiter = rateLimit({
  windowMs: 5 * 1000, // 5 seconds
  max: 1, // 1 request per 5 seconds
  message: {
    error: 'Please wait before submitting another guess.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for game creation
const createGameLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 games per hour
  message: {
    error: 'Too many games created. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== ADMIN ROUTES ====================

// Create game
router.post(
  '/admin',
  authMiddleware,
  createGameLimiter,
  GuessTheBalanceController.createGame
);

// Open guessing
router.patch(
  '/admin/:id/open',
  authMiddleware,
  GuessTheBalanceController.openGuessing
);

// Close guessing
router.patch(
  '/admin/:id/close',
  authMiddleware,
  GuessTheBalanceController.closeGuessing
);

// Complete game (enter final balance and draw winner)
router.post(
  '/admin/:id/complete',
  authMiddleware,
  GuessTheBalanceController.completeGame
);

// Disqualify winner and select next closest
router.post(
  '/admin/:id/disqualify-winner',
  authMiddleware,
  GuessTheBalanceController.disqualifyWinner
);

// Get all guesses for a game
router.get(
  '/admin/:id/guesses',
  authMiddleware,
  GuessTheBalanceController.getAllGuesses
);

// Delete game
router.delete(
  '/admin/:id',
  authMiddleware,
  GuessTheBalanceController.deleteGame
);

// Get all games (with filters)
router.get('/admin', authMiddleware, GuessTheBalanceController.getAllGames);

// ==================== USER ROUTES ====================

// Get active games
router.get(
  '/',
  optionalAuthMiddleware,
  GuessTheBalanceController.getActiveGames
);

// Get completed games
router.get(
  '/completed',
  optionalAuthMiddleware,
  GuessTheBalanceController.getCompletedGames
);

// Get game details
router.get(
  '/:id',
  optionalAuthMiddleware,
  GuessTheBalanceController.getGameDetails
);

// Submit/update guess
router.post(
  '/:id/guess',
  authMiddleware,
  guessLimiter,
  GuessTheBalanceController.submitGuess
);

// Get user's guess
router.get(
  '/:id/my-guess',
  authMiddleware,
  GuessTheBalanceController.getUserGuess
);

export default router;
