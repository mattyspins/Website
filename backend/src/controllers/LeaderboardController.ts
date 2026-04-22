import { Request, Response } from 'express';
import {
  LeaderboardService,
  LeaderboardPeriod,
  ScoreType,
} from '@/services/LeaderboardService';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { logger } from '@/utils/logger';

export class LeaderboardController {
  // Get leaderboard rankings
  static getLeaderboard = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const {
        period = 'daily',
        scoreType = 'points',
        limit = 50,
        page = 1,
        pageSize = 20,
      } = req.query;

      // Validate parameters
      const validPeriods: LeaderboardPeriod[] = [
        'daily',
        'weekly',
        'monthly',
        'all-time',
      ];
      const validScoreTypes: ScoreType[] = [
        'points',
        'wins',
        'viewing_time',
        'engagement',
      ];

      if (!validPeriods.includes(period as LeaderboardPeriod)) {
        throw createError.badRequest(
          'Invalid period. Must be one of: daily, weekly, monthly, all-time'
        );
      }

      if (!validScoreTypes.includes(scoreType as ScoreType)) {
        throw createError.badRequest(
          'Invalid scoreType. Must be one of: points, wins, viewing_time, engagement'
        );
      }

      const limitNum = Math.min(parseInt(limit as string) || 50, 100); // Max 100
      const pageNum = Math.max(parseInt(page as string) || 1, 1);
      const pageSizeNum = Math.min(parseInt(pageSize as string) || 20, 50); // Max 50

      try {
        if (pageNum > 1) {
          // Paginated request
          const result = await LeaderboardService.getLeaderboardPage(
            period as LeaderboardPeriod,
            scoreType as ScoreType,
            pageNum,
            pageSizeNum,
            req.user?.id
          );

          res.json({
            success: true,
            data: {
              entries: result.entries,
              pagination: {
                currentPage: result.currentPage,
                totalPages: result.totalPages,
                totalEntries: result.totalEntries,
                pageSize: pageSizeNum,
              },
              period,
              scoreType,
            },
          });
        } else {
          // Simple list request
          const entries = await LeaderboardService.getCurrentRankings(
            period as LeaderboardPeriod,
            scoreType as ScoreType,
            limitNum,
            req.user?.id
          );

          res.json({
            success: true,
            data: {
              entries,
              period,
              scoreType,
              total: entries.length,
            },
          });
        }
      } catch (error) {
        logger.error('Error getting leaderboard:', error);
        throw createError.internal('Failed to get leaderboard');
      }
    }
  );

  // Get user's rank
  static getUserRank = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { period = 'daily', scoreType = 'points' } = req.query;

      const { userId } = req.params;

      // Validate parameters
      const validPeriods: LeaderboardPeriod[] = [
        'daily',
        'weekly',
        'monthly',
        'all-time',
      ];
      const validScoreTypes: ScoreType[] = [
        'points',
        'wins',
        'viewing_time',
        'engagement',
      ];

      if (!validPeriods.includes(period as LeaderboardPeriod)) {
        throw createError.badRequest('Invalid period');
      }

      if (!validScoreTypes.includes(scoreType as ScoreType)) {
        throw createError.badRequest('Invalid scoreType');
      }

      // Check if user can access this rank (own rank or admin)
      const targetUserId = userId || req.user.id;
      if (targetUserId !== req.user.id && !req.user.isAdmin) {
        throw createError.forbidden('Cannot access other user ranks');
      }

      try {
        const userRank = await LeaderboardService.getUserRank(
          targetUserId,
          period as LeaderboardPeriod,
          scoreType as ScoreType
        );

        if (!userRank) {
          return res.json({
            success: true,
            data: {
              userId: targetUserId,
              rank: null,
              score: 0,
              totalParticipants: 0,
              percentile: 0,
              period,
              scoreType,
              message: 'User not found in leaderboard',
            },
          });
        }

        res.json({
          success: true,
          data: {
            ...userRank,
            period,
            scoreType,
          },
        });
      } catch (error) {
        logger.error('Error getting user rank:', error);
        throw createError.internal('Failed to get user rank');
      }
    }
  );

  // Get user's historical rankings
  static getUserHistory = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { period = 'daily', scoreType = 'points', limit = 30 } = req.query;

      const { userId } = req.params;

      // Check if user can access this history (own history or admin)
      const targetUserId = userId || req.user.id;
      if (targetUserId !== req.user.id && !req.user.isAdmin) {
        throw createError.forbidden('Cannot access other user history');
      }

      const limitNum = Math.min(parseInt(limit as string) || 30, 100);

      try {
        const history = await LeaderboardService.getHistoricalRankings(
          targetUserId,
          period as LeaderboardPeriod,
          scoreType as ScoreType,
          limitNum
        );

        res.json({
          success: true,
          data: {
            userId: targetUserId,
            history,
            period,
            scoreType,
            total: history.length,
          },
        });
      } catch (error) {
        logger.error('Error getting user history:', error);
        throw createError.internal('Failed to get user history');
      }
    }
  );

  // Get multiple leaderboards (dashboard view)
  static getMultipleLeaderboards = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const {
        periods = 'daily,weekly,monthly',
        scoreType = 'points',
        limit = 10,
      } = req.query;

      const periodList = (periods as string).split(',') as LeaderboardPeriod[];
      const limitNum = Math.min(parseInt(limit as string) || 10, 20);

      // Validate periods
      const validPeriods: LeaderboardPeriod[] = [
        'daily',
        'weekly',
        'monthly',
        'all-time',
      ];
      const invalidPeriods = periodList.filter(p => !validPeriods.includes(p));

      if (invalidPeriods.length > 0) {
        throw createError.badRequest(
          `Invalid periods: ${invalidPeriods.join(', ')}`
        );
      }

      try {
        const leaderboards: any = {};

        for (const period of periodList) {
          const entries = await LeaderboardService.getCurrentRankings(
            period,
            scoreType as ScoreType,
            limitNum,
            req.user?.id
          );

          leaderboards[period] = {
            entries,
            period,
            scoreType,
            total: entries.length,
          };
        }

        res.json({
          success: true,
          data: leaderboards,
        });
      } catch (error) {
        logger.error('Error getting multiple leaderboards:', error);
        throw createError.internal('Failed to get leaderboards');
      }
    }
  );

  // Admin: Reset leaderboard
  static resetLeaderboard = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { period, scoreType = 'points' } = req.body;

      if (!period) {
        throw createError.badRequest('Period is required');
      }

      const validPeriods: LeaderboardPeriod[] = [
        'daily',
        'weekly',
        'monthly',
        'all-time',
      ];
      if (!validPeriods.includes(period)) {
        throw createError.badRequest('Invalid period');
      }

      try {
        await LeaderboardService.resetLeaderboard(period, scoreType);

        logger.info(
          `Leaderboard reset by admin ${req.user.id}: ${period} ${scoreType}`
        );

        res.json({
          success: true,
          message: `Leaderboard reset successfully: ${period} ${scoreType}`,
          data: {
            period,
            scoreType,
            resetAt: new Date(),
            resetBy: req.user.id,
          },
        });
      } catch (error) {
        logger.error('Error resetting leaderboard:', error);
        throw createError.internal('Failed to reset leaderboard');
      }
    }
  );

  // Admin: Set manual rank
  static setManualRank = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { userId, rank, period, scoreType = 'points' } = req.body;

      if (!userId || !rank || !period) {
        throw createError.badRequest('userId, rank, and period are required');
      }

      if (rank < 1) {
        throw createError.badRequest('Rank must be positive');
      }

      const validPeriods: LeaderboardPeriod[] = [
        'daily',
        'weekly',
        'monthly',
        'all-time',
      ];
      if (!validPeriods.includes(period)) {
        throw createError.badRequest('Invalid period');
      }

      try {
        await LeaderboardService.setManualRank(userId, rank, period, scoreType);

        logger.info(
          `Manual rank set by admin ${req.user.id}: ${userId} -> rank ${rank} in ${period} ${scoreType}`
        );

        res.json({
          success: true,
          message: 'Manual rank set successfully',
          data: {
            userId,
            rank,
            period,
            scoreType,
            setAt: new Date(),
            setBy: req.user.id,
          },
        });
      } catch (error) {
        logger.error('Error setting manual rank:', error);
        throw createError.internal('Failed to set manual rank');
      }
    }
  );

  // Admin: Update user score
  static updateUserScore = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { userId, scoreType = 'points', value } = req.body;

      if (!userId || value === undefined) {
        throw createError.badRequest('userId and value are required');
      }

      if (value < 0) {
        throw createError.badRequest('Score value must be non-negative');
      }

      const validScoreTypes: ScoreType[] = [
        'points',
        'wins',
        'viewing_time',
        'engagement',
      ];
      if (!validScoreTypes.includes(scoreType)) {
        throw createError.badRequest('Invalid scoreType');
      }

      try {
        await LeaderboardService.updateUserScore(userId, scoreType, value);

        logger.info(
          `User score updated by admin ${req.user.id}: ${userId} -> ${scoreType}: ${value}`
        );

        res.json({
          success: true,
          message: 'User score updated successfully',
          data: {
            userId,
            scoreType,
            value,
            updatedAt: new Date(),
            updatedBy: req.user.id,
          },
        });
      } catch (error) {
        logger.error('Error updating user score:', error);
        throw createError.internal('Failed to update user score');
      }
    }
  );

  // Get leaderboard statistics
  static getLeaderboardStats = asyncHandler(
    async (req: Request, res: Response) => {
      const { period = 'daily', scoreType = 'points' } = req.query;

      try {
        // Get top 10 for statistics
        const topEntries = await LeaderboardService.getCurrentRankings(
          period as LeaderboardPeriod,
          scoreType as ScoreType,
          10
        );

        const stats = {
          period,
          scoreType,
          totalParticipants: topEntries.length,
          topScore: topEntries[0]?.score || 0,
          averageTopTenScore:
            topEntries.length > 0
              ? Math.round(
                  topEntries.reduce((sum, entry) => sum + entry.score, 0) /
                    topEntries.length
                )
              : 0,
          lastUpdated: new Date(),
        };

        res.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        logger.error('Error getting leaderboard stats:', error);
        throw createError.internal('Failed to get leaderboard statistics');
      }
    }
  );
}
