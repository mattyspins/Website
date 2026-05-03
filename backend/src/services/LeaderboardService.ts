import {
  PrismaClient,
  Leaderboard,
  LeaderboardPrize,
  LeaderboardWager,
} from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Leaderboard Service
 * Manages manual leaderboard competitions and wager tracking
 * Feature: kick-oauth-manual-leaderboard
 */

export interface CreateLeaderboardRequest {
  title: string;
  description?: string;
  prizePool: string;
  startDate: Date;
  endDate: Date;
  prizes: PrizeDistribution[];
  createdBy?: string;
}

export interface PrizeDistribution {
  position: number;
  prizeAmount: string;
  prizeDescription?: string;
}

export interface WagerData {
  userId: string;
  amount: number;
  notes?: string;
  verifiedBy: string;
}

export interface LeaderboardRanking {
  rank: number;
  userId: string;
  username: string;
  kickUsername?: string | undefined;
  totalWagers: number;
  wagerCount: number;
  prize?: string | undefined;
  prizeDescription?: string | undefined;
}

export interface LeaderboardWithDetails extends Leaderboard {
  prizes: LeaderboardPrize[];
  wagers: (LeaderboardWager & {
    user: {
      id: string;
      displayName: string;
      kickUsername: string | null;
    };
  })[];
}

export interface ExportData {
  leaderboard: Leaderboard;
  rankings: LeaderboardRanking[];
  metadata: {
    exportedAt: Date;
    totalParticipants: number;
    totalWagers: number;
    averageWager: number;
  };
}

export class LeaderboardService {
  /**
   * Create a new leaderboard with validation
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
   */
  static async createLeaderboard(
    data: CreateLeaderboardRequest
  ): Promise<Leaderboard> {
    try {
      // Validate required fields
      if (!data.title || data.title.trim().length === 0) {
        throw new Error('Leaderboard title is required');
      }

      if (!data.prizePool || data.prizePool.trim().length === 0) {
        throw new Error('Prize pool is required');
      }

      if (!data.startDate || !data.endDate) {
        throw new Error('Start date and end date are required');
      }

      // Validate date logic (Requirement 6.6)
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      if (startDate >= endDate) {
        throw new Error('Start date must be before end date');
      }

      // Validate minimum duration (Requirement 20.2)
      const durationHours =
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      if (durationHours < 1) {
        throw new Error('Leaderboard duration must be at least 1 hour');
      }

      // Validate prize positions are unique
      if (data.prizes && data.prizes.length > 0) {
        const positions = data.prizes.map(p => p.position);
        const uniquePositions = new Set(positions);
        if (positions.length !== uniquePositions.size) {
          throw new Error('Prize positions must be unique');
        }

        // Validate prize positions are positive integers
        for (const prize of data.prizes) {
          if (prize.position < 1 || !Number.isInteger(prize.position)) {
            throw new Error('Prize positions must be positive integers');
          }
        }
      }

      // Create leaderboard with prizes in a transaction
      const leaderboard = await prisma.$transaction(async tx => {
        // Create leaderboard (Requirement 6.3)
        const newLeaderboard = await tx.leaderboard.create({
          data: {
            title: data.title.trim(),
            description: data.description?.trim() || null,
            prizePool: data.prizePool.trim(),
            status: 'active',
            startDate: startDate,
            endDate: endDate,
            createdBy: data.createdBy || null,
          },
        });

        // Create prizes if provided (Requirement 6.4, 6.5)
        if (data.prizes && data.prizes.length > 0) {
          await tx.leaderboardPrize.createMany({
            data: data.prizes.map(prize => ({
              leaderboardId: newLeaderboard.id,
              position: prize.position,
              prizeAmount: prize.prizeAmount.trim(),
              prizeDescription: prize.prizeDescription?.trim() || null,
            })),
          });
        }

        return newLeaderboard;
      });

      logger.info(
        `Leaderboard created: ${leaderboard.id} - ${leaderboard.title}`
      );
      return leaderboard;
    } catch (error) {
      logger.error('Error creating leaderboard:', error);
      throw error;
    }
  }

  /**
   * Add a wager to a leaderboard
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
   */
  static async addWager(
    leaderboardId: string,
    wager: WagerData
  ): Promise<LeaderboardWager> {
    try {
      // Validate required fields
      if (!leaderboardId || leaderboardId.trim().length === 0) {
        throw new Error('Leaderboard ID is required');
      }

      if (!wager.userId || wager.userId.trim().length === 0) {
        throw new Error('User ID is required');
      }

      if (!wager.verifiedBy || wager.verifiedBy.trim().length === 0) {
        throw new Error('Verifier ID is required');
      }

      // Validate wager amount (Requirement 7.6, 7.7, 20.1)
      if (typeof wager.amount !== 'number' || wager.amount <= 0) {
        throw new Error(
          'Wager amount must be a positive number greater than zero'
        );
      }

      if (!Number.isFinite(wager.amount)) {
        throw new Error('Wager amount must be a valid number');
      }

      // Fetch leaderboard to validate status
      const leaderboard = await prisma.leaderboard.findUnique({
        where: { id: leaderboardId },
      });

      if (!leaderboard) {
        throw new Error('Leaderboard not found');
      }

      // Prevent wager entry on ended leaderboards (Requirement 10.3, 20.5)
      if (
        leaderboard.status === 'ended' ||
        leaderboard.status === 'cancelled'
      ) {
        throw new Error(
          `Cannot add wagers to ${leaderboard.status} leaderboards`
        );
      }

      // Validate user exists and is not suspended (Requirement 20.3)
      const user = await prisma.user.findUnique({
        where: { id: wager.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.isSuspended) {
        throw new Error('Cannot add wagers for suspended users');
      }

      // Create wager (Requirement 7.3, 7.4)
      const now = new Date();
      const newWager = await prisma.leaderboardWager.create({
        data: {
          leaderboardId: leaderboardId,
          userId: wager.userId,
          wagerAmount: wager.amount,
          submittedAt: now,
          verifiedBy: wager.verifiedBy || null,
          verifiedAt: now,
          notes: wager.notes?.trim() || null,
        },
      });

      logger.info(
        `Wager added: ${newWager.id} - User ${wager.userId} - Amount ${wager.amount}`
      );
      return newWager;
    } catch (error) {
      logger.error('Error adding wager:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard rankings with aggregated wagers
   * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
   */
  static async getRankings(
    leaderboardId: string
  ): Promise<LeaderboardRanking[]> {
    try {
      if (!leaderboardId || leaderboardId.trim().length === 0) {
        throw new Error('Leaderboard ID is required');
      }

      // Fetch leaderboard with wagers and prizes
      const leaderboard = await prisma.leaderboard.findUnique({
        where: { id: leaderboardId },
        include: {
          wagers: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  kickUsername: true,
                },
              },
            },
          },
          prizes: {
            orderBy: {
              position: 'asc',
            },
          },
        },
      });

      if (!leaderboard) {
        throw new Error('Leaderboard not found');
      }

      // If no wagers, return empty array (Requirement 8.6)
      if (leaderboard.wagers.length === 0) {
        return [];
      }

      // Aggregate wagers by user (Requirement 7.5)
      const userWagers = new Map<
        string,
        {
          userId: string;
          username: string;
          kickUsername?: string | undefined;
          totalWagers: number;
          wagerCount: number;
        }
      >();

      for (const wager of leaderboard.wagers) {
        const existing = userWagers.get(wager.userId);
        if (existing) {
          existing.totalWagers += Number(wager.wagerAmount);
          existing.wagerCount += 1;
        } else {
          userWagers.set(wager.userId, {
            userId: wager.userId,
            username: wager.user.displayName,
            kickUsername: wager.user.kickUsername || undefined,
            totalWagers: Number(wager.wagerAmount),
            wagerCount: 1,
          });
        }
      }

      // Sort by total wagers descending (Requirement 8.1)
      const sortedUsers = Array.from(userWagers.values()).sort(
        (a, b) => b.totalWagers - a.totalWagers
      );

      // Assign ranks and prizes (Requirement 8.2, 8.4)
      const rankings: LeaderboardRanking[] = sortedUsers.map((user, index) => {
        const rank = index + 1;
        const prize = leaderboard.prizes.find(p => p.position === rank);

        return {
          rank,
          userId: user.userId,
          username: user.username,
          kickUsername: user.kickUsername,
          totalWagers: user.totalWagers,
          wagerCount: user.wagerCount,
          prize: prize?.prizeAmount,
          prizeDescription: prize?.prizeDescription || undefined,
        };
      });

      return rankings;
    } catch (error) {
      logger.error('Error getting rankings:', error);
      throw error;
    }
  }

  /**
   * Expire leaderboards that have passed their end date
   * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5
   */
  static async expireLeaderboards(): Promise<number> {
    try {
      const now = new Date();

      // Find active leaderboards past their end date (Requirement 10.2)
      const expiredLeaderboards = await prisma.leaderboard.findMany({
        where: {
          status: 'active',
          endDate: {
            lt: now,
          },
        },
      });

      if (expiredLeaderboards.length === 0) {
        return 0;
      }

      // Update status to ended (Requirement 10.2)
      const result = await prisma.leaderboard.updateMany({
        where: {
          id: {
            in: expiredLeaderboards.map(lb => lb.id),
          },
        },
        data: {
          status: 'ended',
        },
      });

      logger.info(`Expired ${result.count} leaderboards`);
      return result.count;
    } catch (error) {
      logger.error('Error expiring leaderboards:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard by ID with full details
   */
  static async getLeaderboardById(
    leaderboardId: string
  ): Promise<LeaderboardWithDetails | null> {
    try {
      const leaderboard = await prisma.leaderboard.findUnique({
        where: { id: leaderboardId },
        include: {
          prizes: {
            orderBy: {
              position: 'asc',
            },
          },
          wagers: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  kickUsername: true,
                },
              },
            },
            orderBy: {
              submittedAt: 'desc',
            },
          },
        },
      });

      return leaderboard;
    } catch (error) {
      logger.error('Error fetching leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get all leaderboards with optional status filter and calculated fields
   */
  static async getLeaderboards(
    status?: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const where = status ? { status } : {};

      const leaderboards = await prisma.leaderboard.findMany({
        where,
        include: {
          prizes: true,
          wagers: {
            select: {
              userId: true,
              wagerAmount: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });

      // Calculate additional fields for each leaderboard
      const leaderboardsWithStats = leaderboards.map(leaderboard => {
        // Calculate total prize pool from individual prizes
        const totalPrizePool = leaderboard.prizes.reduce((sum, prize) => {
          // Try to parse prize amount as number, fallback to 0
          const amount =
            parseFloat(prize.prizeAmount.replace(/[^0-9.-]+/g, '')) || 0;
          return sum + amount;
        }, 0);

        // Calculate unique participants
        const uniqueParticipants = new Set(
          leaderboard.wagers.map(w => w.userId)
        );
        const participantCount = uniqueParticipants.size;

        return {
          id: leaderboard.id,
          title: leaderboard.title,
          description: leaderboard.description,
          prizePool: leaderboard.prizePool,
          status: leaderboard.status,
          startDate: leaderboard.startDate,
          endDate: leaderboard.endDate,
          createdAt: leaderboard.createdAt,
          updatedAt: leaderboard.updatedAt,
          createdBy: leaderboard.createdBy,
          totalPrizePool,
          participantCount,
        };
      });

      return leaderboardsWithStats;
    } catch (error) {
      logger.error('Error fetching leaderboards:', error);
      throw error;
    }
  }

  /**
   * Export leaderboard data for reporting
   * Validates: Requirements 24.1, 24.2, 24.3, 24.4, 24.5
   */
  static async exportLeaderboardData(
    leaderboardId: string
  ): Promise<ExportData> {
    try {
      const leaderboard = await prisma.leaderboard.findUnique({
        where: { id: leaderboardId },
      });

      if (!leaderboard) {
        throw new Error('Leaderboard not found');
      }

      const rankings = await this.getRankings(leaderboardId);

      // Calculate statistics (Requirement 24.5)
      const totalParticipants = rankings.length;
      const totalWagers = rankings.reduce((sum, r) => sum + r.wagerCount, 0);
      const totalWagerAmount = rankings.reduce(
        (sum, r) => sum + r.totalWagers,
        0
      );
      const averageWager = totalWagers > 0 ? totalWagerAmount / totalWagers : 0;

      return {
        leaderboard,
        rankings,
        metadata: {
          exportedAt: new Date(),
          totalParticipants,
          totalWagers,
          averageWager,
        },
      };
    } catch (error) {
      logger.error('Error exporting leaderboard data:', error);
      throw error;
    }
  }

  /**
   * Update leaderboard prize distribution
   * Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7
   */
  static async updatePrizeDistribution(
    leaderboardId: string,
    prizes: PrizeDistribution[]
  ): Promise<void> {
    try {
      // Validate leaderboard exists and is active
      const leaderboard = await prisma.leaderboard.findUnique({
        where: { id: leaderboardId },
      });

      if (!leaderboard) {
        throw new Error('Leaderboard not found');
      }

      // Allow updates only for active leaderboards (Requirement 17.7)
      if (leaderboard.status !== 'active') {
        throw new Error('Can only update prizes for active leaderboards');
      }

      // Validate prize positions are unique (Requirement 17.5)
      const positions = prizes.map(p => p.position);
      const uniquePositions = new Set(positions);
      if (positions.length !== uniquePositions.size) {
        throw new Error('Prize positions must be unique');
      }

      // Update prizes in a transaction
      await prisma.$transaction(async tx => {
        // Delete existing prizes
        await tx.leaderboardPrize.deleteMany({
          where: { leaderboardId },
        });

        // Create new prizes
        if (prizes.length > 0) {
          await tx.leaderboardPrize.createMany({
            data: prizes.map(prize => ({
              leaderboardId,
              position: prize.position,
              prizeAmount: prize.prizeAmount.trim(),
              prizeDescription: prize.prizeDescription?.trim() || null,
            })),
          });
        }
      });

      logger.info(
        `Updated prize distribution for leaderboard ${leaderboardId}`
      );
    } catch (error) {
      logger.error('Error updating prize distribution:', error);
      throw error;
    }
  }

  /**
   * Get user's total wagers for a leaderboard
   * Validates: Requirements 7.5, 20.4
   */
  static async getUserTotalWagers(
    leaderboardId: string,
    userId: string
  ): Promise<number> {
    try {
      const wagers = await prisma.leaderboardWager.findMany({
        where: {
          leaderboardId,
          userId,
        },
      });

      const total = wagers.reduce(
        (sum, wager) => sum + Number(wager.wagerAmount),
        0
      );
      return total;
    } catch (error) {
      logger.error('Error getting user total wagers:', error);
      throw error;
    }
  }

  /**
   * Delete a leaderboard and all associated data (Admin only)
   * Validates: Requirements 18.1, 18.2, 18.3, 18.4
   */
  static async deleteLeaderboard(leaderboardId: string): Promise<void> {
    try {
      if (!leaderboardId || leaderboardId.trim().length === 0) {
        throw new Error('Leaderboard ID is required');
      }

      // Check if leaderboard exists
      const leaderboard = await prisma.leaderboard.findUnique({
        where: { id: leaderboardId },
        include: {
          wagers: true,
          prizes: true,
        },
      });

      if (!leaderboard) {
        throw new Error('Leaderboard not found');
      }

      // Prevent deletion of active leaderboards with wagers (safety check)
      if (leaderboard.status === 'active' && leaderboard.wagers.length > 0) {
        throw new Error(
          'Cannot delete active leaderboards with existing wagers. Please end the leaderboard first.'
        );
      }

      // Delete all associated data in a transaction
      await prisma.$transaction(async tx => {
        // Delete wagers first (foreign key constraint)
        await tx.leaderboardWager.deleteMany({
          where: { leaderboardId },
        });

        // Delete prizes
        await tx.leaderboardPrize.deleteMany({
          where: { leaderboardId },
        });

        // Delete the leaderboard itself
        await tx.leaderboard.delete({
          where: { id: leaderboardId },
        });
      });

      logger.info(
        `Leaderboard deleted: ${leaderboardId} - ${leaderboard.title}`
      );
    } catch (error) {
      logger.error('Error deleting leaderboard:', error);
      throw error;
    }
  }
}
