import { prisma } from '@/config/database';
import { RedisService } from '@/config/redis';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { UserStatistics } from '@/services/UserService';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement: any;
  points?: number;
  earnedAt?: Date;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActivity: Date;
  streakType: 'daily' | 'weekly';
}

export interface UserEngagementMetrics {
  totalViewingTime: number;
  averageSessionLength: number;
  totalSessions: number;
  favoriteStreamingHours: number[];
  engagementScore: number;
  activityLevel: 'low' | 'medium' | 'high' | 'very_high';
}

export class StatisticsService {
  // Update viewing time statistics
  static async updateViewingTime(
    userId: string,
    minutes: number,
    streamId?: string
  ): Promise<void> {
    try {
      await prisma.$transaction(async tx => {
        // Update user statistics
        const stats = await tx.userStatistics.upsert({
          where: { userId },
          update: {
            totalViewingTime: { increment: minutes },
            lastStreamWatched: new Date(),
            updatedAt: new Date(),
          },
          create: {
            userId,
            totalViewingTime: minutes,
            lastStreamWatched: new Date(),
          },
        });

        // Update current streak
        await this.updateViewingStreak(userId, tx);

        // Check for viewing time achievements
        await this.checkViewingTimeAchievements(
          userId,
          stats.totalViewingTime,
          tx
        );
      });

      // Clear cache
      await RedisService.del(`user:profile:${userId}`);

      logger.info(`Viewing time updated: ${userId} +${minutes} minutes`);
    } catch (error) {
      logger.error('Error updating viewing time:', error);
      throw createError.internal('Failed to update viewing time');
    }
  }

  // Update purchase statistics
  static async updatePurchaseStats(
    userId: string,
    purchaseAmount: number
  ): Promise<void> {
    try {
      await prisma.userStatistics.upsert({
        where: { userId },
        update: {
          totalPurchases: { increment: 1 },
          updatedAt: new Date(),
        },
        create: {
          userId,
          totalPurchases: 1,
        },
      });

      // Clear cache
      await RedisService.del(`user:profile:${userId}`);

      // Check for purchase achievements
      await this.checkPurchaseAchievements(userId, purchaseAmount);

      logger.info(`Purchase stats updated: ${userId}`);
    } catch (error) {
      logger.error('Error updating purchase stats:', error);
      throw createError.internal('Failed to update purchase stats');
    }
  }

  // Update raffle statistics
  static async updateRaffleStats(
    userId: string,
    ticketCount: number,
    won: boolean = false
  ): Promise<void> {
    try {
      const updateData: any = {
        totalRaffleTickets: { increment: ticketCount },
        updatedAt: new Date(),
      };

      if (won) {
        updateData.totalWins = { increment: 1 };
      }

      await prisma.userStatistics.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          totalRaffleTickets: ticketCount,
          totalWins: won ? 1 : 0,
        },
      });

      // Clear cache
      await RedisService.del(`user:profile:${userId}`);

      // Check for raffle achievements
      if (won) {
        await this.checkWinAchievements(userId);
      }

      logger.info(
        `Raffle stats updated: ${userId} - ${ticketCount} tickets${won ? ', won' : ''}`
      );
    } catch (error) {
      logger.error('Error updating raffle stats:', error);
      throw createError.internal('Failed to update raffle stats');
    }
  }

  // Get user engagement metrics
  static async getUserEngagementMetrics(
    userId: string
  ): Promise<UserEngagementMetrics> {
    try {
      const [stats, sessions] = await Promise.all([
        prisma.userStatistics.findUnique({
          where: { userId },
        }),
        prisma.viewingSession.findMany({
          where: { userId, validated: true },
          orderBy: { startedAt: 'desc' },
          take: 100, // Last 100 sessions for analysis
        }),
      ]);

      if (!stats) {
        return {
          totalViewingTime: 0,
          averageSessionLength: 0,
          totalSessions: 0,
          favoriteStreamingHours: [],
          engagementScore: 0,
          activityLevel: 'low',
        };
      }

      // Calculate metrics
      const totalSessions = sessions.length;
      const averageSessionLength =
        totalSessions > 0
          ? Math.round(stats.totalViewingTime / totalSessions)
          : 0;

      // Calculate favorite streaming hours
      const hourCounts: { [hour: number]: number } = {};
      sessions.forEach(session => {
        const hour = new Date(session.startedAt).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      const favoriteStreamingHours = Object.entries(hourCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => parseInt(hour));

      // Calculate engagement score (0-100)
      const engagementScore = this.calculateEngagementScore(stats, sessions);

      // Determine activity level
      const activityLevel = this.determineActivityLevel(
        stats.totalViewingTime,
        totalSessions
      );

      return {
        totalViewingTime: stats.totalViewingTime,
        averageSessionLength,
        totalSessions,
        favoriteStreamingHours,
        engagementScore,
        activityLevel,
      };
    } catch (error) {
      logger.error('Error getting user engagement metrics:', error);
      throw createError.internal('Failed to get user engagement metrics');
    }
  }

  // Get user streak information
  static async getUserStreak(userId: string): Promise<StreakInfo> {
    try {
      const stats = await prisma.userStatistics.findUnique({
        where: { userId },
      });

      if (!stats) {
        return {
          currentStreak: 0,
          longestStreak: 0,
          lastActivity: new Date(),
          streakType: 'daily',
        };
      }

      return {
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        lastActivity: stats.lastStreamWatched || new Date(),
        streakType: 'daily',
      };
    } catch (error) {
      logger.error('Error getting user streak:', error);
      throw createError.internal('Failed to get user streak');
    }
  }

  // Update viewing streak
  private static async updateViewingStreak(
    userId: string,
    tx: any
  ): Promise<void> {
    try {
      const stats = await tx.userStatistics.findUnique({
        where: { userId },
      });

      if (!stats) {
        return;
      }

      const now = new Date();
      const lastActivity = stats.lastStreamWatched;

      if (!lastActivity) {
        // First activity
        await tx.userStatistics.update({
          where: { userId },
          data: {
            currentStreak: 1,
            longestStreak: Math.max(1, stats.longestStreak),
          },
        });
        return;
      }

      const daysDiff = Math.floor(
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 0) {
        // Same day, no streak change
        return;
      } else if (daysDiff === 1) {
        // Consecutive day, increment streak
        const newStreak = stats.currentStreak + 1;
        await tx.userStatistics.update({
          where: { userId },
          data: {
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, stats.longestStreak),
          },
        });
      } else {
        // Streak broken, reset to 1
        await tx.userStatistics.update({
          where: { userId },
          data: {
            currentStreak: 1,
            longestStreak: Math.max(1, stats.longestStreak),
          },
        });
      }
    } catch (error) {
      logger.error('Error updating viewing streak:', error);
    }
  }

  // Check and award viewing time achievements
  private static async checkViewingTimeAchievements(
    userId: string,
    totalMinutes: number,
    tx: any
  ): Promise<void> {
    const achievements = [
      { id: 'first_hour', name: 'First Hour', threshold: 60, points: 50 },
      {
        id: 'dedicated_viewer',
        name: 'Dedicated Viewer',
        threshold: 600,
        points: 100,
      }, // 10 hours
      { id: 'super_fan', name: 'Super Fan', threshold: 3000, points: 250 }, // 50 hours
      {
        id: 'ultimate_supporter',
        name: 'Ultimate Supporter',
        threshold: 6000,
        points: 500,
      }, // 100 hours
    ];

    for (const achievement of achievements) {
      if (totalMinutes >= achievement.threshold) {
        await this.awardAchievement(userId, achievement, tx);
      }
    }
  }

  // Check and award purchase achievements
  private static async checkPurchaseAchievements(
    userId: string,
    purchaseAmount: number
  ): Promise<void> {
    try {
      const stats = await prisma.userStatistics.findUnique({
        where: { userId },
      });

      if (!stats) {
        return;
      }

      const achievements = [
        {
          id: 'first_purchase',
          name: 'First Purchase',
          threshold: 1,
          points: 25,
        },
        {
          id: 'frequent_buyer',
          name: 'Frequent Buyer',
          threshold: 10,
          points: 100,
        },
        { id: 'big_spender', name: 'Big Spender', threshold: 50, points: 250 },
      ];

      for (const achievement of achievements) {
        if (stats.totalPurchases >= achievement.threshold) {
          await this.awardAchievement(userId, achievement);
        }
      }
    } catch (error) {
      logger.error('Error checking purchase achievements:', error);
    }
  }

  // Check and award win achievements
  private static async checkWinAchievements(userId: string): Promise<void> {
    try {
      const stats = await prisma.userStatistics.findUnique({
        where: { userId },
      });

      if (!stats) {
        return;
      }

      const achievements = [
        { id: 'first_win', name: 'First Win', threshold: 1, points: 50 },
        { id: 'lucky_winner', name: 'Lucky Winner', threshold: 5, points: 150 },
        {
          id: 'jackpot_master',
          name: 'Jackpot Master',
          threshold: 20,
          points: 500,
        },
      ];

      for (const achievement of achievements) {
        if (stats.totalWins >= achievement.threshold) {
          await this.awardAchievement(userId, achievement);
        }
      }
    } catch (error) {
      logger.error('Error checking win achievements:', error);
    }
  }

  // Award achievement to user
  private static async awardAchievement(
    userId: string,
    achievement: any,
    tx?: any
  ): Promise<void> {
    try {
      const dbTx = tx || prisma;

      const stats = await dbTx.userStatistics.findUnique({
        where: { userId },
      });

      if (!stats) {
        return;
      }

      const achievements = stats.achievements as Achievement[];

      // Check if achievement already exists
      const existingAchievement = achievements.find(
        a => a.id === achievement.id
      );
      if (existingAchievement) {
        return;
      }

      // Add new achievement
      const newAchievement: Achievement = {
        id: achievement.id,
        name: achievement.name,
        description:
          achievement.description ||
          `Earned by reaching ${achievement.threshold} milestone`,
        icon: achievement.icon || '🏆',
        category: achievement.category || 'general',
        requirement: achievement.threshold,
        points: achievement.points,
        earnedAt: new Date(),
      };

      achievements.push(newAchievement);

      await dbTx.userStatistics.update({
        where: { userId },
        data: {
          achievements,
          updatedAt: new Date(),
        },
      });

      // Award points if specified
      if (achievement.points && !tx) {
        // Only award points if not in a transaction (to avoid circular dependencies)
        const PointsService = require('@/services/PointsService').PointsService;
        await PointsService.addPoints({
          userId,
          amount: achievement.points,
          reason: `Achievement: ${achievement.name}`,
          referenceType: 'achievement',
          metadata: { achievementId: achievement.id },
        });
      }

      logger.info(`Achievement awarded: ${userId} -> ${achievement.name}`);
    } catch (error) {
      logger.error('Error awarding achievement:', error);
    }
  }

  // Calculate engagement score (0-100)
  private static calculateEngagementScore(stats: any, sessions: any[]): number {
    let score = 0;

    // Viewing time component (40 points max)
    const viewingHours = stats.totalViewingTime / 60;
    score += Math.min(40, viewingHours * 0.5);

    // Session frequency component (30 points max)
    const sessionCount = sessions.length;
    score += Math.min(30, sessionCount * 0.3);

    // Purchase activity component (20 points max)
    score += Math.min(20, stats.totalPurchases * 2);

    // Win rate component (10 points max)
    if (stats.totalRaffleTickets > 0) {
      const winRate = stats.totalWins / stats.totalRaffleTickets;
      score += Math.min(10, winRate * 100);
    }

    return Math.round(Math.min(100, score));
  }

  // Determine activity level
  private static determineActivityLevel(
    totalViewingTime: number,
    totalSessions: number
  ): 'low' | 'medium' | 'high' | 'very_high' {
    const viewingHours = totalViewingTime / 60;

    if (viewingHours >= 100 && totalSessions >= 50) {
      return 'very_high';
    } else if (viewingHours >= 50 && totalSessions >= 25) {
      return 'high';
    } else if (viewingHours >= 20 && totalSessions >= 10) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  // Get platform-wide statistics
  static async getPlatformStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalViewingTime: number;
    totalPurchases: number;
    totalRaffleTickets: number;
    averageEngagementScore: number;
  }> {
    try {
      const [userCount, activeUserCount, aggregateStats] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: {
            lastActiveAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        }),
        prisma.userStatistics.aggregate({
          _sum: {
            totalViewingTime: true,
            totalPurchases: true,
            totalRaffleTickets: true,
          },
        }),
      ]);

      // Calculate average engagement score (simplified)
      const averageEngagementScore = 65; // This would be calculated from all users

      return {
        totalUsers: userCount,
        activeUsers: activeUserCount,
        totalViewingTime: aggregateStats._sum.totalViewingTime || 0,
        totalPurchases: aggregateStats._sum.totalPurchases || 0,
        totalRaffleTickets: aggregateStats._sum.totalRaffleTickets || 0,
        averageEngagementScore,
      };
    } catch (error) {
      logger.error('Error getting platform statistics:', error);
      throw createError.internal('Failed to get platform statistics');
    }
  }

  // Reset user statistics (admin function)
  static async resetUserStatistics(userId: string): Promise<void> {
    try {
      await prisma.userStatistics.update({
        where: { userId },
        data: {
          totalViewingTime: 0,
          totalPurchases: 0,
          totalRaffleTickets: 0,
          totalWins: 0,
          longestStreak: 0,
          currentStreak: 0,
          lastStreamWatched: null,
          achievements: [],
          updatedAt: new Date(),
        },
      });

      // Clear cache
      await RedisService.del(`user:profile:${userId}`);

      logger.info(`User statistics reset: ${userId}`);
    } catch (error) {
      logger.error('Error resetting user statistics:', error);
      throw createError.internal('Failed to reset user statistics');
    }
  }
}
