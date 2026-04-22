import { prisma } from '@/config/database';
import { RedisService } from '@/config/redis';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatar?: string;
  score: number;
  change: number; // rank change from previous period
  isCurrentUser?: boolean;
}

export interface UserRank {
  userId: string;
  rank: number;
  score: number;
  totalParticipants: number;
  percentile: number;
}

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all-time';
export type ScoreType = 'points' | 'wins' | 'viewing_time' | 'engagement';

export interface LeaderboardConfig {
  period: LeaderboardPeriod;
  scoreType: ScoreType;
  limit: number;
  includeInactive?: boolean;
}

export class LeaderboardService {
  // Get current rankings for a period
  static async getCurrentRankings(
    period: LeaderboardPeriod,
    scoreType: ScoreType = 'points',
    limit: number = 50,
    userId?: string
  ): Promise<LeaderboardEntry[]> {
    try {
      const cacheKey = this.getLeaderboardKey(period, scoreType);

      // Get rankings from Redis
      const redisRankings = await RedisService.getLeaderboard(
        cacheKey,
        0,
        limit - 1,
        true
      );

      if (
        Array.isArray(redisRankings) &&
        redisRankings.length > 0 &&
        typeof redisRankings[0] === 'object'
      ) {
        // Redis has data, format it
        const rankings = redisRankings as Array<{
          member: string;
          score: number;
        }>;
        const userIds = rankings.map(r => r.member);

        // Get user details from database
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        });

        const userMap = new Map(users.map(u => [u.id, u]));

        // Get previous rankings for change calculation
        const previousRankings = await this.getPreviousPeriodRankings(
          period,
          scoreType,
          userIds
        );

        return rankings.map((ranking, index) => {
          const user = userMap.get(ranking.member);
          const previousRank = previousRankings.get(ranking.member);
          const currentRank = index + 1;
          const change = previousRank ? previousRank - currentRank : 0;

          return {
            rank: currentRank,
            userId: ranking.member,
            displayName: user?.displayName || 'Unknown User',
            avatar: user?.avatarUrl || undefined,
            score: ranking.score,
            change,
            isCurrentUser: userId === ranking.member,
          };
        });
      }

      // Fallback to database if Redis is empty
      return await this.buildLeaderboardFromDatabase(
        period,
        scoreType,
        limit,
        userId
      );
    } catch (error) {
      logger.error('Error getting current rankings:', error);
      throw createError.internal('Failed to get leaderboard rankings');
    }
  }

  // Get user's rank in leaderboard
  static async getUserRank(
    userId: string,
    period: LeaderboardPeriod,
    scoreType: ScoreType = 'points'
  ): Promise<UserRank | null> {
    try {
      const cacheKey = this.getLeaderboardKey(period, scoreType);

      // Get rank from Redis
      const rank = await RedisService.getUserRank(cacheKey, userId);
      const score = await RedisService.getUserScore(cacheKey, userId);

      if (rank === null || score === null) {
        // User not in leaderboard or Redis is empty, check database
        return await this.getUserRankFromDatabase(userId, period, scoreType);
      }

      // Get total participants
      const totalKey = `${cacheKey}:total`;
      let totalParticipants = await RedisService.get(totalKey);

      if (!totalParticipants) {
        // Count from Redis leaderboard
        const allRankings = await RedisService.getLeaderboard(
          cacheKey,
          0,
          -1,
          false
        );
        totalParticipants = allRankings.length.toString();
        await RedisService.set(totalKey, totalParticipants, 300); // Cache for 5 minutes
      }

      const total = parseInt(totalParticipants);
      const percentile = Math.round(((total - rank + 1) / total) * 100);

      return {
        userId,
        rank,
        score,
        totalParticipants: total,
        percentile,
      };
    } catch (error) {
      logger.error('Error getting user rank:', error);
      throw createError.internal('Failed to get user rank');
    }
  }

  // Update user score in leaderboard
  static async updateUserScore(
    userId: string,
    scoreType: ScoreType,
    value: number
  ): Promise<void> {
    try {
      const periods: LeaderboardPeriod[] = [
        'daily',
        'weekly',
        'monthly',
        'all-time',
      ];

      for (const period of periods) {
        const cacheKey = this.getLeaderboardKey(period, scoreType);
        await RedisService.addToLeaderboard(cacheKey, value, userId);

        // Update database entry
        await this.updateDatabaseLeaderboardEntry(
          userId,
          period,
          scoreType,
          value
        );
      }

      logger.info(
        `Leaderboard score updated: ${userId} -> ${scoreType}: ${value}`
      );
    } catch (error) {
      logger.error('Error updating user score:', error);
      throw createError.internal('Failed to update leaderboard score');
    }
  }

  // Reset leaderboard for a period
  static async resetLeaderboard(
    period: LeaderboardPeriod,
    scoreType: ScoreType = 'points'
  ): Promise<void> {
    try {
      const cacheKey = this.getLeaderboardKey(period, scoreType);

      // Clear Redis leaderboard
      await RedisService.del(cacheKey);
      await RedisService.del(`${cacheKey}:total`);

      // Archive current period in database
      await this.archiveLeaderboardPeriod(period, scoreType);

      // Initialize new period
      await this.initializeNewPeriod(period, scoreType);

      logger.info(`Leaderboard reset: ${period} ${scoreType}`);
    } catch (error) {
      logger.error('Error resetting leaderboard:', error);
      throw createError.internal('Failed to reset leaderboard');
    }
  }

  // Set manual rank (admin override)
  static async setManualRank(
    userId: string,
    rank: number,
    period: LeaderboardPeriod,
    scoreType: ScoreType = 'points'
  ): Promise<void> {
    try {
      const periodStart = this.getPeriodStart(period);

      // Update database with manual rank
      await prisma.leaderboardEntry.upsert({
        where: {
          userId_periodType_periodStart_scoreType: {
            userId,
            periodType: period,
            periodStart,
            scoreType,
          },
        },
        update: {
          manualRank: rank,
          updatedAt: new Date(),
        },
        create: {
          userId,
          periodType: period,
          periodStart,
          scoreType,
          score: 0,
          manualRank: rank,
        },
      });

      // Rebuild leaderboard to reflect manual changes
      await this.rebuildLeaderboard(period, scoreType);

      logger.info(
        `Manual rank set: ${userId} -> rank ${rank} in ${period} ${scoreType}`
      );
    } catch (error) {
      logger.error('Error setting manual rank:', error);
      throw createError.internal('Failed to set manual rank');
    }
  }

  // Get leaderboard with pagination
  static async getLeaderboardPage(
    period: LeaderboardPeriod,
    scoreType: ScoreType = 'points',
    page: number = 1,
    pageSize: number = 20,
    userId?: string
  ): Promise<{
    entries: LeaderboardEntry[];
    totalPages: number;
    currentPage: number;
    totalEntries: number;
  }> {
    try {
      const offset = (page - 1) * pageSize;
      const cacheKey = this.getLeaderboardKey(period, scoreType);

      // Get total count
      const totalKey = `${cacheKey}:total`;
      let totalEntries = await RedisService.get(totalKey);

      if (!totalEntries) {
        const allRankings = await RedisService.getLeaderboard(
          cacheKey,
          0,
          -1,
          false
        );
        totalEntries = allRankings.length.toString();
        await RedisService.set(totalKey, totalEntries, 300);
      }

      const total = parseInt(totalEntries);
      const totalPages = Math.ceil(total / pageSize);

      // Get page entries
      const entries = await this.getCurrentRankings(
        period,
        scoreType,
        pageSize,
        userId
      );
      const pageEntries = entries.slice(offset, offset + pageSize);

      return {
        entries: pageEntries,
        totalPages,
        currentPage: page,
        totalEntries: total,
      };
    } catch (error) {
      logger.error('Error getting leaderboard page:', error);
      throw createError.internal('Failed to get leaderboard page');
    }
  }

  // Get historical rankings
  static async getHistoricalRankings(
    userId: string,
    period: LeaderboardPeriod,
    scoreType: ScoreType = 'points',
    limit: number = 30
  ): Promise<Array<{ date: Date; rank: number; score: number }>> {
    try {
      const entries = await prisma.leaderboardEntry.findMany({
        where: {
          userId,
          periodType: period,
          scoreType,
        },
        orderBy: { periodStart: 'desc' },
        take: limit,
      });

      return entries.map(entry => ({
        date: entry.periodStart,
        rank: entry.manualRank || entry.rank || 0,
        score: entry.score,
      }));
    } catch (error) {
      logger.error('Error getting historical rankings:', error);
      throw createError.internal('Failed to get historical rankings');
    }
  }

  // Private helper methods

  private static getLeaderboardKey(
    period: LeaderboardPeriod,
    scoreType: ScoreType
  ): string {
    const periodKey = this.getPeriodKey(period);
    return `leaderboard:${period}:${scoreType}:${periodKey}`;
  }

  private static getPeriodKey(period: LeaderboardPeriod): string {
    const now = new Date();

    switch (period) {
      case 'daily':
        return now.toISOString().split('T')[0]; // YYYY-MM-DD
      case 'weekly':
        const weekStart = this.getWeekStart(now);
        return weekStart.toISOString().split('T')[0];
      case 'monthly':
        return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      case 'all-time':
        return 'all';
      default:
        return 'all';
    }
  }

  private static getPeriodStart(period: LeaderboardPeriod): Date {
    const now = new Date();

    switch (period) {
      case 'daily':
        const daily = new Date(now);
        daily.setHours(0, 0, 0, 0);
        return daily;
      case 'weekly':
        return this.getWeekStart(now);
      case 'monthly':
        const monthly = new Date(now.getFullYear(), now.getMonth(), 1);
        return monthly;
      case 'all-time':
        return new Date('2024-01-01'); // Platform start date
      default:
        return new Date();
    }
  }

  private static getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  private static async getPreviousPeriodRankings(
    period: LeaderboardPeriod,
    scoreType: ScoreType,
    userIds: string[]
  ): Promise<Map<string, number>> {
    try {
      const previousPeriodStart = this.getPreviousPeriodStart(period);

      const entries = await prisma.leaderboardEntry.findMany({
        where: {
          userId: { in: userIds },
          periodType: period,
          periodStart: previousPeriodStart,
          scoreType,
        },
      });

      return new Map(entries.map(entry => [entry.userId, entry.rank || 0]));
    } catch (error) {
      logger.error('Error getting previous period rankings:', error);
      return new Map();
    }
  }

  private static getPreviousPeriodStart(period: LeaderboardPeriod): Date {
    const now = new Date();

    switch (period) {
      case 'daily':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        return yesterday;
      case 'weekly':
        const lastWeek = new Date(now);
        lastWeek.setDate(lastWeek.getDate() - 7);
        return this.getWeekStart(lastWeek);
      case 'monthly':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return lastMonth;
      case 'all-time':
        return new Date('2024-01-01');
      default:
        return new Date();
    }
  }

  private static async buildLeaderboardFromDatabase(
    period: LeaderboardPeriod,
    scoreType: ScoreType,
    limit: number,
    userId?: string
  ): Promise<LeaderboardEntry[]> {
    try {
      const periodStart = this.getPeriodStart(period);

      const entries = await prisma.leaderboardEntry.findMany({
        where: {
          periodType: period,
          periodStart,
          scoreType,
        },
        include: {
          user: {
            select: {
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [{ manualRank: 'asc' }, { score: 'desc' }],
        take: limit,
      });

      return entries.map((entry, index) => ({
        rank: entry.manualRank || index + 1,
        userId: entry.userId,
        displayName: entry.user.displayName,
        avatar: entry.user.avatarUrl || undefined,
        score: entry.score,
        change: 0, // Would need previous period data
        isCurrentUser: userId === entry.userId,
      }));
    } catch (error) {
      logger.error('Error building leaderboard from database:', error);
      return [];
    }
  }

  private static async getUserRankFromDatabase(
    userId: string,
    period: LeaderboardPeriod,
    scoreType: ScoreType
  ): Promise<UserRank | null> {
    try {
      const periodStart = this.getPeriodStart(period);

      const entry = await prisma.leaderboardEntry.findUnique({
        where: {
          userId_periodType_periodStart_scoreType: {
            userId,
            periodType: period,
            periodStart,
            scoreType,
          },
        },
      });

      if (!entry) {
        return null;
      }

      const totalParticipants = await prisma.leaderboardEntry.count({
        where: {
          periodType: period,
          periodStart,
          scoreType,
        },
      });

      const rank = entry.manualRank || entry.rank || 0;
      const percentile = Math.round(
        ((totalParticipants - rank + 1) / totalParticipants) * 100
      );

      return {
        userId,
        rank,
        score: entry.score,
        totalParticipants,
        percentile,
      };
    } catch (error) {
      logger.error('Error getting user rank from database:', error);
      return null;
    }
  }

  private static async updateDatabaseLeaderboardEntry(
    userId: string,
    period: LeaderboardPeriod,
    scoreType: ScoreType,
    score: number
  ): Promise<void> {
    try {
      const periodStart = this.getPeriodStart(period);

      await prisma.leaderboardEntry.upsert({
        where: {
          userId_periodType_periodStart_scoreType: {
            userId,
            periodType: period,
            periodStart,
            scoreType,
          },
        },
        update: {
          score,
          updatedAt: new Date(),
        },
        create: {
          userId,
          periodType: period,
          periodStart,
          scoreType,
          score,
        },
      });
    } catch (error) {
      logger.error('Error updating database leaderboard entry:', error);
    }
  }

  private static async archiveLeaderboardPeriod(
    period: LeaderboardPeriod,
    scoreType: ScoreType
  ): Promise<void> {
    // Implementation would archive the current period data
    // For now, we'll just log it
    logger.info(`Archiving leaderboard period: ${period} ${scoreType}`);
  }

  private static async initializeNewPeriod(
    period: LeaderboardPeriod,
    scoreType: ScoreType
  ): Promise<void> {
    // Implementation would initialize a new period
    // For now, we'll just log it
    logger.info(`Initializing new leaderboard period: ${period} ${scoreType}`);
  }

  private static async rebuildLeaderboard(
    period: LeaderboardPeriod,
    scoreType: ScoreType
  ): Promise<void> {
    try {
      const cacheKey = this.getLeaderboardKey(period, scoreType);

      // Clear Redis cache
      await RedisService.del(cacheKey);

      // Rebuild from database
      const periodStart = this.getPeriodStart(period);
      const entries = await prisma.leaderboardEntry.findMany({
        where: {
          periodType: period,
          periodStart,
          scoreType,
        },
        orderBy: [{ manualRank: 'asc' }, { score: 'desc' }],
      });

      // Populate Redis
      for (const entry of entries) {
        await RedisService.addToLeaderboard(
          cacheKey,
          entry.score,
          entry.userId
        );
      }

      logger.info(`Leaderboard rebuilt: ${period} ${scoreType}`);
    } catch (error) {
      logger.error('Error rebuilding leaderboard:', error);
    }
  }
}
