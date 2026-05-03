import { Request, Response } from 'express';
import { LeaderboardService } from '../services/LeaderboardService';
import { logger } from '../utils/logger';
import { io } from '../index';

/**
 * Leaderboard Controller
 * Handles HTTP requests for manual leaderboard management
 * Feature: kick-oauth-manual-leaderboard
 */

export class LeaderboardController {
  /**
   * Create a new leaderboard (Admin only)
   * POST /api/admin/leaderboards
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
   */
  static async createLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, prizePool, startDate, endDate, prizes } =
        req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const leaderboard = await LeaderboardService.createLeaderboard({
        title,
        description,
        prizePool,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        prizes: prizes || [],
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        leaderboard,
      });
    } catch (error: any) {
      logger.error('Error in createLeaderboard:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create leaderboard',
      });
    }
  }

  /**
   * Get all leaderboards with optional status filter
   * GET /api/leaderboards?status=active&limit=10
   * Validates: Requirements 8.1, 8.2
   */
  static async getLeaderboards(req: Request, res: Response): Promise<void> {
    try {
      const { status, limit } = req.query;
      const limitNum = limit ? parseInt(limit as string, 10) : 10;

      const leaderboards = await LeaderboardService.getLeaderboards(
        status as string | undefined,
        limitNum
      );

      res.status(200).json({
        success: true,
        leaderboards,
      });
    } catch (error: any) {
      logger.error('Error in getLeaderboards:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch leaderboards',
      });
    }
  }

  /**
   * Get leaderboard details with rankings
   * GET /api/leaderboards/:id
   * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
   */
  static async getLeaderboardDetails(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const leaderboard = await LeaderboardService.getLeaderboardById(id);

      if (!leaderboard) {
        res.status(404).json({
          success: false,
          error: 'Leaderboard not found',
        });
        return;
      }

      const rankings = await LeaderboardService.getRankings(id);

      // Find user's rank if logged in
      let userRank: number | undefined;
      if (userId) {
        const userRanking = rankings.find(r => r.userId === userId);
        userRank = userRanking?.rank;
      }

      // Calculate time remaining
      const now = new Date();
      const endDate = new Date(leaderboard.endDate);
      const timeRemaining = Math.max(0, endDate.getTime() - now.getTime());

      res.status(200).json({
        success: true,
        data: {
          leaderboard,
          rankings,
          userRank,
          timeRemaining,
        },
      });
    } catch (error: any) {
      logger.error('Error in getLeaderboardDetails:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch leaderboard details',
      });
    }
  }

  /**
   * Add a wager to a leaderboard (Admin only)
   * POST /api/admin/leaderboards/:id/wagers
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
   */
  static async addWager(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { userId, amount, notes } = req.body;
      const adminId = (req as any).user?.id;

      if (!adminId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const wager = await LeaderboardService.addWager(id, {
        userId,
        amount: parseFloat(amount),
        notes,
        verifiedBy: adminId,
      });

      // Get updated total for the user
      const userTotal = await LeaderboardService.getUserTotalWagers(id, userId);

      // Emit real-time update via Socket.IO
      io.to(`leaderboard:${id}`).emit('wagerAdded', {
        leaderboardId: id,
        wager,
        userTotal,
      });

      // Fetch and emit updated rankings
      const rankings = await LeaderboardService.getRankings(id);
      io.to(`leaderboard:${id}`).emit('rankingsUpdated', {
        leaderboardId: id,
        rankings,
      });

      res.status(201).json({
        success: true,
        wager,
        userTotal,
      });
    } catch (error: any) {
      logger.error('Error in addWager:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to add wager',
      });
    }
  }

  /**
   * Export leaderboard data (Admin only)
   * GET /api/admin/leaderboards/:id/export
   * Validates: Requirements 24.1, 24.2, 24.3, 24.4, 24.5
   */
  static async exportLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { format } = req.query;

      const exportData = await LeaderboardService.exportLeaderboardData(id);

      if (format === 'csv') {
        // Generate CSV
        const csvRows: string[] = [];

        // Header
        csvRows.push(
          'Rank,Username,Kick Username,Total Wagers,Wager Count,Prize,Prize Description'
        );

        // Data rows
        for (const ranking of exportData.rankings) {
          csvRows.push(
            [
              ranking.rank,
              `"${ranking.username}"`,
              ranking.kickUsername ? `"${ranking.kickUsername}"` : '',
              ranking.totalWagers.toFixed(2),
              ranking.wagerCount,
              ranking.prize ? `"${ranking.prize}"` : '',
              ranking.prizeDescription ? `"${ranking.prizeDescription}"` : '',
            ].join(',')
          );
        }

        // Metadata
        csvRows.push('');
        csvRows.push('Metadata');
        csvRows.push(`Leaderboard Title,"${exportData.leaderboard.title}"`);
        csvRows.push(`Prize Pool,"${exportData.leaderboard.prizePool}"`);
        csvRows.push(
          `Start Date,${exportData.leaderboard.startDate.toISOString()}`
        );
        csvRows.push(
          `End Date,${exportData.leaderboard.endDate.toISOString()}`
        );
        csvRows.push(`Status,${exportData.leaderboard.status}`);
        csvRows.push(
          `Total Participants,${exportData.metadata.totalParticipants}`
        );
        csvRows.push(`Total Wagers,${exportData.metadata.totalWagers}`);
        csvRows.push(
          `Average Wager,${exportData.metadata.averageWager.toFixed(2)}`
        );
        csvRows.push(
          `Exported At,${exportData.metadata.exportedAt.toISOString()}`
        );

        const csv = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="leaderboard-${id}-${Date.now()}.csv"`
        );
        res.status(200).send(csv);
      } else {
        // Return JSON
        res.status(200).json({
          success: true,
          data: exportData,
        });
      }
    } catch (error: any) {
      logger.error('Error in exportLeaderboard:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to export leaderboard',
      });
    }
  }

  /**
   * Update prize distribution (Admin only)
   * PUT /api/admin/leaderboards/:id/prizes
   * Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7
   */
  static async updatePrizes(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { prizes } = req.body;
      const adminId = (req as any).user?.id;

      if (!adminId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      if (!Array.isArray(prizes)) {
        res.status(400).json({
          success: false,
          error: 'Prizes must be an array',
        });
        return;
      }

      await LeaderboardService.updatePrizeDistribution(id, prizes);

      res.status(200).json({
        success: true,
        message: 'Prize distribution updated successfully',
      });
    } catch (error: any) {
      logger.error('Error in updatePrizes:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update prizes',
      });
    }
  }

  /**
   * Get user's total wagers for a leaderboard
   * GET /api/leaderboards/:id/user-total
   * Validates: Requirements 7.5, 20.4
   */
  static async getUserTotal(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const total = await LeaderboardService.getUserTotalWagers(id, userId);

      res.status(200).json({
        success: true,
        total,
      });
    } catch (error: any) {
      logger.error('Error in getUserTotal:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get user total',
      });
    }
  }

  /**
   * Delete a leaderboard (Admin only)
   * DELETE /api/admin/leaderboards/:id
   * Validates: Requirements 18.1, 18.2, 18.3, 18.4
   */
  static async deleteLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = (req as any).user?.id;

      if (!adminId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      await LeaderboardService.deleteLeaderboard(id);

      res.status(200).json({
        success: true,
        message: 'Leaderboard deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error in deleteLeaderboard:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to delete leaderboard',
      });
    }
  }
}
