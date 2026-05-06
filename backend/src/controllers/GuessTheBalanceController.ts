import { Response } from 'express';
import { GuessTheBalanceService } from '@/services/GuessTheBalanceService';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { z } from 'zod';
import { GuessTheBalanceStatus } from '@prisma/client';

// Validation schemas
const createGameSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  startingBalance: z.number().positive().min(1),
  numberOfBonuses: z.number().int().positive().min(1).max(1000),
  breakEvenMultiplier: z.number().positive().min(0.01).max(10),
});

const completeGameSchema = z.object({
  finalBalance: z.number().positive().min(0),
  winnerReward: z.number().int().min(0).optional(),
});

const submitGuessSchema = z.object({
  guessAmount: z.number().positive().min(0.01),
});

export class GuessTheBalanceController {
  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Create a new game
   * POST /api/admin/guess-the-balance
   */
  static createGame = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      if (!req.user.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      // Validate input
      const validatedData = createGameSchema.parse(req.body);

      // Create game
      const game = await GuessTheBalanceService.createGame(
        validatedData,
        req.user.id
      );

      res.status(201).json({
        success: true,
        game,
      });
    }
  );

  /**
   * Open guessing for a game
   * PATCH /api/admin/guess-the-balance/:id/open
   */
  static openGuessing = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      if (!req.user.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { id } = req.params;

      if (!id) {
        throw createError.badRequest('Game ID is required');
      }

      const game = await GuessTheBalanceService.openGuessing(id);

      res.json({
        success: true,
        game,
      });
    }
  );

  /**
   * Close guessing for a game
   * PATCH /api/admin/guess-the-balance/:id/close
   */
  static closeGuessing = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      if (!req.user.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { id } = req.params;

      if (!id) {
        throw createError.badRequest('Game ID is required');
      }

      const game = await GuessTheBalanceService.closeGuessing(id);

      res.json({
        success: true,
        game,
      });
    }
  );

  /**
   * Complete game - enter final balance and draw winner
   * POST /api/admin/guess-the-balance/:id/complete
   */
  static completeGame = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      if (!req.user.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { id } = req.params;

      if (!id) {
        throw createError.badRequest('Game ID is required');
      }

      // Validate input
      const validatedData = completeGameSchema.parse(req.body);

      const game = await GuessTheBalanceService.completeGame(id, validatedData);

      res.json({
        success: true,
        game,
      });
    }
  );

  /**
   * Get all guesses for a game
   * GET /api/admin/guess-the-balance/:id/guesses
   */
  static getAllGuesses = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      if (!req.user.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { id } = req.params;

      if (!id) {
        throw createError.badRequest('Game ID is required');
      }

      const guesses = await GuessTheBalanceService.getAllGuesses(id);

      res.json({
        success: true,
        gameId: id,
        totalGuesses: guesses.length,
        guesses,
      });
    }
  );

  /**
   * Delete a game
   * DELETE /api/admin/guess-the-balance/:id
   */
  static deleteGame = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      if (!req.user.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { id } = req.params;

      if (!id) {
        throw createError.badRequest('Game ID is required');
      }

      await GuessTheBalanceService.deleteGame(id);

      res.json({
        success: true,
        message: 'Game deleted successfully',
      });
    }
  );

  /**
   * Get all games with filters
   * GET /api/admin/guess-the-balance
   */
  static getAllGames = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      if (!req.user.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { status, limit, offset } = req.query;

      const filters: any = {};

      if (status && typeof status === 'string') {
        if (Object.values(GuessTheBalanceStatus).includes(status as any)) {
          filters.status = status as GuessTheBalanceStatus;
        }
      }

      if (limit && typeof limit === 'string') {
        filters.limit = parseInt(limit, 10);
      }

      if (offset && typeof offset === 'string') {
        filters.offset = parseInt(offset, 10);
      }

      const games = await GuessTheBalanceService.getAllGames(filters);

      res.json({
        success: true,
        total: games.length,
        games,
      });
    }
  );

  // ==================== USER ENDPOINTS ====================

  /**
   * Get active games
   * GET /api/guess-the-balance
   */
  static getActiveGames = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user?.id;

      const games = await GuessTheBalanceService.getActiveGames(userId);

      res.json({
        success: true,
        games,
      });
    }
  );

  /**
   * Get game details
   * GET /api/guess-the-balance/:id
   */
  static getGameDetails = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;

      if (!id) {
        throw createError.badRequest('Game ID is required');
      }

      const userId = req.user?.id;

      const game = await GuessTheBalanceService.getGameDetails(id, userId);

      res.json({
        success: true,
        game,
      });
    }
  );

  /**
   * Submit or update guess
   * POST /api/guess-the-balance/:id/guess
   */
  static submitGuess = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { id } = req.params;

      if (!id) {
        throw createError.badRequest('Game ID is required');
      }

      // Validate input
      const validatedData = submitGuessSchema.parse(req.body);

      const guess = await GuessTheBalanceService.submitGuess(
        id,
        req.user.id,
        validatedData.guessAmount
      );

      res.json({
        success: true,
        guess,
      });
    }
  );

  /**
   * Get user's guess for a game
   * GET /api/guess-the-balance/:id/my-guess
   */
  static getUserGuess = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { id } = req.params;

      if (!id) {
        throw createError.badRequest('Game ID is required');
      }

      const guess = await GuessTheBalanceService.getUserGuess(id, req.user.id);

      res.json({
        success: true,
        guess,
      });
    }
  );

  /**
   * Get completed games with winners
   * GET /api/guess-the-balance/completed
   */
  static getCompletedGames = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const games = await GuessTheBalanceService.getCompletedGames();

      res.json({
        success: true,
        games,
      });
    }
  );
}
