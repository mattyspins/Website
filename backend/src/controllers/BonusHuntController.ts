import { Request, Response } from 'express';
import {
  BonusHuntService,
  CreateSessionRequest,
  AddBonusBuyRequest,
  CreatePredictionRequest,
} from '@/services/BonusHuntService';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { logger } from '@/utils/logger';

export class BonusHuntController {
  // Create new bonus hunt session
  static createSession = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { sessionName, startingBalance, targetBalance } = req.body;

      if (!startingBalance || startingBalance <= 0) {
        throw createError.badRequest('Starting balance must be positive');
      }

      const request: CreateSessionRequest = {
        userId: req.user.id,
        sessionName,
        startingBalance: parseFloat(startingBalance),
        targetBalance: targetBalance ? parseFloat(targetBalance) : undefined,
      };

      try {
        const session = await BonusHuntService.createSession(request);

        logger.info(
          `Bonus hunt session created: ${session.id} by ${req.user.id}`
        );

        res.status(201).json({
          success: true,
          data: session,
          message: 'Bonus hunt session created successfully',
        });
      } catch (error) {
        logger.error('Error creating bonus hunt session:', error);
        throw error;
      }
    }
  );

  // Get session by ID
  static getSession = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { sessionId } = req.params;

      if (!sessionId) {
        throw createError.badRequest('Session ID is required');
      }

      try {
        const session = await BonusHuntService.getSession(sessionId);

        if (!session) {
          throw createError.notFound('Bonus hunt session not found');
        }

        // Check if user can access this session (owner or admin)
        if (req.user && session.userId !== req.user.id && !req.user.isAdmin) {
          throw createError.forbidden('Cannot access this session');
        }

        res.json({
          success: true,
          data: session,
        });
      } catch (error) {
        logger.error('Error getting bonus hunt session:', error);
        throw error;
      }
    }
  );

  // Get user sessions
  static getUserSessions = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { limit = '50', offset = '0' } = req.query;
      const { userId } = req.params;

      // Check if user can access these sessions (own sessions or admin)
      const targetUserId = userId || req.user.id;
      if (targetUserId !== req.user.id && !req.user.isAdmin) {
        throw createError.forbidden('Cannot access other user sessions');
      }

      const limitNum = Math.min(parseInt(limit as string) || 50, 100);
      const offsetNum = Math.max(parseInt(offset as string) || 0, 0);

      try {
        const result = await BonusHuntService.getUserSessions(
          targetUserId,
          limitNum,
          offsetNum
        );

        res.json({
          success: true,
          data: {
            sessions: result.sessions,
            pagination: {
              limit: limitNum,
              offset: offsetNum,
              total: result.total,
              hasMore: offsetNum + limitNum < result.total,
            },
          },
        });
      } catch (error) {
        logger.error('Error getting user sessions:', error);
        throw createError.internal('Failed to get user sessions');
      }
    }
  );

  // Add bonus buy to session
  static addBonusBuy = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { sessionId } = req.params;
      const { gameName, buyAmount, payout, metadata } = req.body;

      if (!sessionId) {
        throw createError.badRequest('Session ID is required');
      }

      if (!gameName || !buyAmount || payout === undefined) {
        throw createError.badRequest(
          'Game name, buy amount, and payout are required'
        );
      }

      // Verify session ownership
      const session = await BonusHuntService.getSession(sessionId);
      if (!session) {
        throw createError.notFound('Bonus hunt session not found');
      }

      if (session.userId !== req.user.id && !req.user.isAdmin) {
        throw createError.forbidden('Cannot add bonus buy to this session');
      }

      const request: AddBonusBuyRequest = {
        sessionId,
        gameName,
        buyAmount: parseFloat(buyAmount),
        payout: parseFloat(payout),
        metadata,
      };

      try {
        const bonusBuy = await BonusHuntService.addBonusBuy(request);

        logger.info(
          `Bonus buy added to session ${sessionId}: ${gameName} by ${req.user.id}`
        );

        res.status(201).json({
          success: true,
          data: bonusBuy,
          message: 'Bonus buy added successfully',
        });
      } catch (error) {
        logger.error('Error adding bonus buy:', error);
        throw error;
      }
    }
  );

  // Get session bonus buys
  static getSessionBonusBuys = asyncHandler(
    async (req: Request, res: Response) => {
      const { sessionId } = req.params;

      if (!sessionId) {
        throw createError.badRequest('Session ID is required');
      }

      try {
        const bonusBuys = await BonusHuntService.getSessionBonusBuys(sessionId);

        res.json({
          success: true,
          data: {
            bonusBuys,
            total: bonusBuys.length,
          },
        });
      } catch (error) {
        logger.error('Error getting session bonus buys:', error);
        throw createError.internal('Failed to get session bonus buys');
      }
    }
  );

  // Complete session
  static completeSession = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { sessionId } = req.params;

      if (!sessionId) {
        throw createError.badRequest('Session ID is required');
      }

      try {
        const session = await BonusHuntService.completeSession(
          sessionId,
          req.user.id
        );

        logger.info(
          `Bonus hunt session completed: ${sessionId} by ${req.user.id}`
        );

        res.json({
          success: true,
          data: session,
          message: 'Bonus hunt session completed successfully',
        });
      } catch (error) {
        logger.error('Error completing session:', error);
        throw error;
      }
    }
  );

  // Abandon session
  static abandonSession = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { sessionId } = req.params;

      if (!sessionId) {
        throw createError.badRequest('Session ID is required');
      }

      try {
        const session = await BonusHuntService.abandonSession(
          sessionId,
          req.user.id
        );

        logger.info(
          `Bonus hunt session abandoned: ${sessionId} by ${req.user.id}`
        );

        res.json({
          success: true,
          data: session,
          message: 'Bonus hunt session abandoned',
        });
      } catch (error) {
        logger.error('Error abandoning session:', error);
        throw error;
      }
    }
  );

  // Create prediction
  static createPrediction = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { sessionId } = req.params;
      const { predictedBalance, pointsWagered } = req.body;

      if (!sessionId) {
        throw createError.badRequest('Session ID is required');
      }

      if (!predictedBalance || !pointsWagered) {
        throw createError.badRequest(
          'Predicted balance and points wagered are required'
        );
      }

      const request: CreatePredictionRequest = {
        sessionId,
        userId: req.user.id,
        predictedBalance: parseFloat(predictedBalance),
        pointsWagered: parseInt(pointsWagered),
      };

      try {
        const prediction = await BonusHuntService.createPrediction(request);

        logger.info(
          `Prediction created for session ${sessionId} by ${req.user.id}`
        );

        res.status(201).json({
          success: true,
          data: prediction,
          message: 'Prediction created successfully',
        });
      } catch (error) {
        logger.error('Error creating prediction:', error);
        throw error;
      }
    }
  );

  // Get session predictions
  static getSessionPredictions = asyncHandler(
    async (req: Request, res: Response) => {
      const { sessionId } = req.params;

      if (!sessionId) {
        throw createError.badRequest('Session ID is required');
      }

      try {
        const predictions =
          await BonusHuntService.getSessionPredictions(sessionId);

        res.json({
          success: true,
          data: {
            predictions,
            total: predictions.length,
          },
        });
      } catch (error) {
        logger.error('Error getting session predictions:', error);
        throw createError.internal('Failed to get session predictions');
      }
    }
  );

  // Get user statistics
  static getUserStatistics = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { userId } = req.params;

      // Check if user can access these statistics (own stats or admin)
      const targetUserId = userId || req.user.id;
      if (targetUserId !== req.user.id && !req.user.isAdmin) {
        throw createError.forbidden('Cannot access other user statistics');
      }

      try {
        const stats = await BonusHuntService.getUserStatistics(targetUserId);

        res.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        logger.error('Error getting user statistics:', error);
        throw createError.internal('Failed to get user statistics');
      }
    }
  );
}
