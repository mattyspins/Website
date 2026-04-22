import { prisma } from '@/config/database';
import { RedisService } from '@/config/redis';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';

export interface UserProfile {
  id: string;
  discordId: string;
  kickUsername?: string;
  displayName: string;
  avatarUrl?: string;
  points: number;
  totalEarned: number;
  totalSpent: number;
  isAdmin: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  suspensionExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  statistics?: UserStatistics;
}

export interface UserStatistics {
  totalViewingTime: number;
  totalPurchases: number;
  totalRaffleTickets: number;
  totalWins: number;
  longestStreak: number;
  currentStreak: number;
  lastStreamWatched?: Date;
  achievements: any[];
}

export interface PointTransaction {
  id: string;
  userId: string;
  amount: number;
  transactionType:
    | 'earned'
    | 'spent'
    | 'admin_add'
    | 'admin_subtract'
    | 'refund';
  reason: string;
  referenceId?: string;
  referenceType?: string;
  adminId?: string;
  createdAt: Date;
  metadata?: any;
}

export interface UserSearchFilters {
  search?: string;
  isAdmin?: boolean;
  isSuspended?: boolean;
  minPoints?: number;
  maxPoints?: number;
  sortBy?: 'displayName' | 'points' | 'createdAt' | 'lastActiveAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export class UserService {
  // Get user profile by ID
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const cacheKey = `user:profile:${userId}`;

      // Try cache first
      const cached = await RedisService.getJSON<UserProfile>(cacheKey);
      if (cached) {
        return cached;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          statistics: true,
        },
      });

      if (!user) {
        return null;
      }

      const profile: UserProfile = {
        id: user.id,
        discordId: user.discordId,
        kickUsername: user.kickUsername || undefined,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl || undefined,
        points: user.points,
        totalEarned: user.totalEarned,
        totalSpent: user.totalSpent,
        isAdmin: user.isAdmin,
        isSuspended: user.isSuspended,
        suspensionReason: user.suspensionReason || undefined,
        suspensionExpiresAt: user.suspensionExpiresAt || undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastActiveAt: user.lastActiveAt,
        statistics: user.statistics
          ? {
              totalViewingTime: user.statistics.totalViewingTime,
              totalPurchases: user.statistics.totalPurchases,
              totalRaffleTickets: user.statistics.totalRaffleTickets,
              totalWins: user.statistics.totalWins,
              longestStreak: user.statistics.longestStreak,
              currentStreak: user.statistics.currentStreak,
              lastStreamWatched: user.statistics.lastStreamWatched || undefined,
              achievements: user.statistics.achievements as any[],
            }
          : undefined,
      };

      // Cache for 5 minutes
      await RedisService.setJSON(cacheKey, profile, 300);

      return profile;
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw createError.internal('Failed to get user profile');
    }
  }

  // Update user profile
  static async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<UserProfile> {
    try {
      // Remove fields that shouldn't be updated directly
      const {
        id,
        discordId,
        points,
        totalEarned,
        totalSpent,
        createdAt,
        statistics,
        ...allowedUpdates
      } = updates;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...allowedUpdates,
          updatedAt: new Date(),
        },
        include: {
          statistics: true,
        },
      });

      const profile: UserProfile = {
        id: updatedUser.id,
        discordId: updatedUser.discordId,
        kickUsername: updatedUser.kickUsername || undefined,
        displayName: updatedUser.displayName,
        avatarUrl: updatedUser.avatarUrl || undefined,
        points: updatedUser.points,
        totalEarned: updatedUser.totalEarned,
        totalSpent: updatedUser.totalSpent,
        isAdmin: updatedUser.isAdmin,
        isSuspended: updatedUser.isSuspended,
        suspensionReason: updatedUser.suspensionReason || undefined,
        suspensionExpiresAt: updatedUser.suspensionExpiresAt || undefined,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        lastActiveAt: updatedUser.lastActiveAt,
        statistics: updatedUser.statistics
          ? {
              totalViewingTime: updatedUser.statistics.totalViewingTime,
              totalPurchases: updatedUser.statistics.totalPurchases,
              totalRaffleTickets: updatedUser.statistics.totalRaffleTickets,
              totalWins: updatedUser.statistics.totalWins,
              longestStreak: updatedUser.statistics.longestStreak,
              currentStreak: updatedUser.statistics.currentStreak,
              lastStreamWatched:
                updatedUser.statistics.lastStreamWatched || undefined,
              achievements: updatedUser.statistics.achievements as any[],
            }
          : undefined,
      };

      // Clear cache
      await RedisService.del(`user:profile:${userId}`);

      logger.info(`User profile updated: ${userId}`);
      return profile;
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw createError.internal('Failed to update user profile');
    }
  }

  // Search users with filters
  static async searchUsers(
    filters: UserSearchFilters
  ): Promise<{ users: UserProfile[]; total: number }> {
    try {
      const {
        search,
        isAdmin,
        isSuspended,
        minPoints,
        maxPoints,
        sortBy = 'displayName',
        sortOrder = 'asc',
        limit = 20,
        offset = 0,
      } = filters;

      const where: any = {};

      if (search) {
        where.OR = [
          { displayName: { contains: search, mode: 'insensitive' } },
          { kickUsername: { contains: search, mode: 'insensitive' } },
          { discordId: { contains: search } },
        ];
      }

      if (isAdmin !== undefined) {
        where.isAdmin = isAdmin;
      }

      if (isSuspended !== undefined) {
        where.isSuspended = isSuspended;
      }

      if (minPoints !== undefined || maxPoints !== undefined) {
        where.points = {};
        if (minPoints !== undefined) where.points.gte = minPoints;
        if (maxPoints !== undefined) where.points.lte = maxPoints;
      }

      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy,
          take: limit,
          skip: offset,
          include: {
            statistics: true,
          },
        }),
        prisma.user.count({ where }),
      ]);

      const profiles: UserProfile[] = users.map(user => ({
        id: user.id,
        discordId: user.discordId,
        kickUsername: user.kickUsername || undefined,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl || undefined,
        points: user.points,
        totalEarned: user.totalEarned,
        totalSpent: user.totalSpent,
        isAdmin: user.isAdmin,
        isSuspended: user.isSuspended,
        suspensionReason: user.suspensionReason || undefined,
        suspensionExpiresAt: user.suspensionExpiresAt || undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastActiveAt: user.lastActiveAt,
        statistics: user.statistics
          ? {
              totalViewingTime: user.statistics.totalViewingTime,
              totalPurchases: user.statistics.totalPurchases,
              totalRaffleTickets: user.statistics.totalRaffleTickets,
              totalWins: user.statistics.totalWins,
              longestStreak: user.statistics.longestStreak,
              currentStreak: user.statistics.currentStreak,
              lastStreamWatched: user.statistics.lastStreamWatched || undefined,
              achievements: user.statistics.achievements as any[],
            }
          : undefined,
      }));

      return { users: profiles, total };
    } catch (error) {
      logger.error('Error searching users:', error);
      throw createError.internal('Failed to search users');
    }
  }

  // Get user statistics
  static async getUserStatistics(
    userId: string
  ): Promise<UserStatistics | null> {
    try {
      const stats = await prisma.userStatistics.findUnique({
        where: { userId },
      });

      if (!stats) {
        return null;
      }

      return {
        totalViewingTime: stats.totalViewingTime,
        totalPurchases: stats.totalPurchases,
        totalRaffleTickets: stats.totalRaffleTickets,
        totalWins: stats.totalWins,
        longestStreak: stats.longestStreak,
        currentStreak: stats.currentStreak,
        lastStreamWatched: stats.lastStreamWatched || undefined,
        achievements: stats.achievements as any[],
      };
    } catch (error) {
      logger.error('Error getting user statistics:', error);
      throw createError.internal('Failed to get user statistics');
    }
  }

  // Update user statistics
  static async updateUserStatistics(
    userId: string,
    updates: Partial<UserStatistics>
  ): Promise<UserStatistics> {
    try {
      const updatedStats = await prisma.userStatistics.upsert({
        where: { userId },
        update: {
          ...updates,
          updatedAt: new Date(),
        },
        create: {
          userId,
          ...updates,
        },
      });

      // Clear user profile cache
      await RedisService.del(`user:profile:${userId}`);

      return {
        totalViewingTime: updatedStats.totalViewingTime,
        totalPurchases: updatedStats.totalPurchases,
        totalRaffleTickets: updatedStats.totalRaffleTickets,
        totalWins: updatedStats.totalWins,
        longestStreak: updatedStats.longestStreak,
        currentStreak: updatedStats.currentStreak,
        lastStreamWatched: updatedStats.lastStreamWatched || undefined,
        achievements: updatedStats.achievements as any[],
      };
    } catch (error) {
      logger.error('Error updating user statistics:', error);
      throw createError.internal('Failed to update user statistics');
    }
  }

  // Add achievement to user
  static async addAchievement(userId: string, achievement: any): Promise<void> {
    try {
      const stats = await prisma.userStatistics.findUnique({
        where: { userId },
      });

      if (!stats) {
        throw createError.notFound('User statistics not found');
      }

      const achievements = stats.achievements as any[];

      // Check if achievement already exists
      const existingAchievement = achievements.find(
        a => a.id === achievement.id
      );
      if (existingAchievement) {
        return; // Achievement already exists
      }

      achievements.push({
        ...achievement,
        earnedAt: new Date(),
      });

      await prisma.userStatistics.update({
        where: { userId },
        data: {
          achievements,
          updatedAt: new Date(),
        },
      });

      // Clear cache
      await RedisService.del(`user:profile:${userId}`);

      logger.info(`Achievement added to user ${userId}: ${achievement.name}`);
    } catch (error) {
      logger.error('Error adding achievement:', error);
      throw createError.internal('Failed to add achievement');
    }
  }

  // Update user activity
  static async updateLastActive(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: new Date() },
      });

      // Clear cache
      await RedisService.del(`user:profile:${userId}`);
    } catch (error) {
      logger.error('Error updating last active:', error);
      // Don't throw error as this is not critical
    }
  }

  // Suspend user
  static async suspendUser(
    userId: string,
    reason: string,
    duration?: number
  ): Promise<UserProfile> {
    try {
      const expiresAt = duration
        ? new Date(Date.now() + duration * 1000)
        : undefined;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          isSuspended: true,
          suspensionReason: reason,
          suspensionExpiresAt: expiresAt,
          updatedAt: new Date(),
        },
        include: {
          statistics: true,
        },
      });

      // Clear cache
      await RedisService.del(`user:profile:${userId}`);

      logger.info(`User suspended: ${userId} - ${reason}`);

      return {
        id: updatedUser.id,
        discordId: updatedUser.discordId,
        kickUsername: updatedUser.kickUsername || undefined,
        displayName: updatedUser.displayName,
        avatarUrl: updatedUser.avatarUrl || undefined,
        points: updatedUser.points,
        totalEarned: updatedUser.totalEarned,
        totalSpent: updatedUser.totalSpent,
        isAdmin: updatedUser.isAdmin,
        isSuspended: updatedUser.isSuspended,
        suspensionReason: updatedUser.suspensionReason || undefined,
        suspensionExpiresAt: updatedUser.suspensionExpiresAt || undefined,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        lastActiveAt: updatedUser.lastActiveAt,
        statistics: updatedUser.statistics
          ? {
              totalViewingTime: updatedUser.statistics.totalViewingTime,
              totalPurchases: updatedUser.statistics.totalPurchases,
              totalRaffleTickets: updatedUser.statistics.totalRaffleTickets,
              totalWins: updatedUser.statistics.totalWins,
              longestStreak: updatedUser.statistics.longestStreak,
              currentStreak: updatedUser.statistics.currentStreak,
              lastStreamWatched:
                updatedUser.statistics.lastStreamWatched || undefined,
              achievements: updatedUser.statistics.achievements as any[],
            }
          : undefined,
      };
    } catch (error) {
      logger.error('Error suspending user:', error);
      throw createError.internal('Failed to suspend user');
    }
  }

  // Unsuspend user
  static async unsuspendUser(userId: string): Promise<UserProfile> {
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          isSuspended: false,
          suspensionReason: null,
          suspensionExpiresAt: null,
          updatedAt: new Date(),
        },
        include: {
          statistics: true,
        },
      });

      // Clear cache
      await RedisService.del(`user:profile:${userId}`);

      logger.info(`User unsuspended: ${userId}`);

      return {
        id: updatedUser.id,
        discordId: updatedUser.discordId,
        kickUsername: updatedUser.kickUsername || undefined,
        displayName: updatedUser.displayName,
        avatarUrl: updatedUser.avatarUrl || undefined,
        points: updatedUser.points,
        totalEarned: updatedUser.totalEarned,
        totalSpent: updatedUser.totalSpent,
        isAdmin: updatedUser.isAdmin,
        isSuspended: updatedUser.isSuspended,
        suspensionReason: updatedUser.suspensionReason || undefined,
        suspensionExpiresAt: updatedUser.suspensionExpiresAt || undefined,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        lastActiveAt: updatedUser.lastActiveAt,
        statistics: updatedUser.statistics
          ? {
              totalViewingTime: updatedUser.statistics.totalViewingTime,
              totalPurchases: updatedUser.statistics.totalPurchases,
              totalRaffleTickets: updatedUser.statistics.totalRaffleTickets,
              totalWins: updatedUser.statistics.totalWins,
              longestStreak: updatedUser.statistics.longestStreak,
              currentStreak: updatedUser.statistics.currentStreak,
              lastStreamWatched:
                updatedUser.statistics.lastStreamWatched || undefined,
              achievements: updatedUser.statistics.achievements as any[],
            }
          : undefined,
      };
    } catch (error) {
      logger.error('Error unsuspending user:', error);
      throw createError.internal('Failed to unsuspend user');
    }
  }

  // Delete user (soft delete by suspending permanently)
  static async deleteUser(userId: string, reason: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isSuspended: true,
          suspensionReason: `DELETED: ${reason}`,
          suspensionExpiresAt: null, // Permanent
          updatedAt: new Date(),
        },
      });

      // Clear cache
      await RedisService.del(`user:profile:${userId}`);

      logger.info(`User deleted: ${userId} - ${reason}`);
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw createError.internal('Failed to delete user');
    }
  }
}
