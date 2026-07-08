// @ts-nocheck
import { prisma } from '@/config/database';
import { RedisService } from '@/config/redis';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { PointsService } from '@/services/PointsService';
import { RazedService } from '@/services/RazedService';
import { RazedWagerSyncService } from '@/services/RazedWagerSyncService';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalPoints: number;
  totalCoinsSpent: number;
  totalTransactions: number;
  totalRaffles: number;
  totalStoreItems: number;
  totalSessions: number;
  recentSignups: number;
  suspendedUsers: number;
  verifiedReferrals: number;
  pendingReferrals: number;
  unlinkedReferralWagerers: number;
}

export interface UserManagement {
  id: string;
  discordId: string;
  kickUsername?: string;
  kickVerified: boolean;
  rainbetUsername?: string;
  rainbetVerified: boolean;
  weeklyWagered: string;
  monthlyWagered: string;
  totalWagered: string;
  displayName: string;
  avatar?: string;
  points: number;
  totalEarned: number;
  totalSpent: number;
  isAdmin: boolean;
  isModerator: boolean;
  isVip: boolean;
  isDepositor: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  suspensionExpiresAt?: Date;
  createdAt: Date;
  lastActive?: Date;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  changes: any;
  reason?: string;
  timestamp: Date;
}

export class AdminService {
  // Get dashboard statistics
  static async getDashboardStats(): Promise<AdminStats> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        activeUsers,
        pointsAggregate,
        spentAggregate,
        totalTransactions,
        totalRaffles,
        totalStoreItems,
        totalSessions,
        recentSignups,
        suspendedUsers,
        verifiedReferrals,
        pendingReferrals,
        unlinkedReferralWagerers,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: {
            lastActiveAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.user.aggregate({ _sum: { points: true } }),
        prisma.user.aggregate({ _sum: { totalSpent: true } }),
        prisma.pointTransaction.count(),
        prisma.raffle.count(),
        prisma.storeItem.count(),
        prisma.userSession.count({
          where: { expiresAt: { gt: new Date() } },
        }),
        prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.user.count({ where: { isSuspended: true } }),
        prisma.user.count({ where: { rainbetVerified: true } }),
        prisma.user.count({ where: { rainbetUsername: { not: null }, rainbetVerified: false } }),
        prisma.razedUnlinkedWager.groupBy({ by: ['razedUsername'] }),
      ]);

      return {
        totalUsers,
        activeUsers,
        totalPoints: pointsAggregate._sum.points || 0,
        totalCoinsSpent: spentAggregate._sum.totalSpent || 0,
        totalTransactions,
        totalRaffles,
        totalStoreItems,
        totalSessions,
        recentSignups,
        suspendedUsers,
        verifiedReferrals,
        pendingReferrals,
        unlinkedReferralWagerers: unlinkedReferralWagerers.length,
      };
    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      throw createError.internal('Failed to get dashboard statistics');
    }
  }

  // Daily-bucketed registrations + running total for the dashboard growth chart.
  static async getUserGrowthTimeseries(
    days: number = 30
  ): Promise<Array<{ date: string; newUsers: number; totalUsers: number }>> {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const [usersInRange, usersBefore] = await Promise.all([
      prisma.user.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      prisma.user.count({ where: { createdAt: { lt: since } } }),
    ]);

    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setUTCDate(d.getUTCDate() + i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const u of usersInRange) {
      const key = u.createdAt.toISOString().slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
    }

    let running = usersBefore;
    const result: Array<{ date: string; newUsers: number; totalUsers: number }> = [];
    for (const [date, newUsers] of buckets) {
      running += newUsers;
      result.push({ date, newUsers, totalUsers: running });
    }
    return result;
  }

  // Daily-bucketed active-user counts for the dashboard activity chart.
  //
  // Caveat: `User.lastActiveAt` is a single mutable field, not an activity log, so
  // this reflects "users whose *most recent* active day falls on X" rather than a
  // true historical daily-active-users count — a user active on many past days but
  // not since will only show up on their latest day. This is the closest signal
  // derivable without a new activity-log table, which is out of scope for this phase.
  static async getActiveUsersTimeseries(
    days: number = 30
  ): Promise<Array<{ date: string; activeUsers: number }>> {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const users = await prisma.user.findMany({
      where: { lastActiveAt: { gte: since } },
      select: { lastActiveAt: true },
    });

    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setUTCDate(d.getUTCDate() + i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const u of users) {
      const key = u.lastActiveAt.toISOString().slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
    }

    return Array.from(buckets.entries()).map(([date, activeUsers]) => ({ date, activeUsers }));
  }

  // User Management

  // Search and filter users
  static async searchUsers(
    query?: string,
    filters?: {
      isAdmin?: boolean;
      isModerator?: boolean;
      isVip?: boolean;
      isDepositor?: boolean;
      isSuspended?: boolean;
      kickVerified?: boolean;
      rainbetVerified?: boolean;
      minPoints?: number;
      maxPoints?: number;
    },
    limit: number = 50,
    offset: number = 0,
    sortBy: 'createdAt' | 'lastActiveAt' | 'points' | 'displayName' | 'totalWagered' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ users: UserManagement[]; total: number }> {
    try {
      const where: any = {};

      if (query && query.trim()) {
        where.OR = [
          { displayName: { contains: query, mode: 'insensitive' } },
          { discordId: { contains: query } },
          { kickUsername: { contains: query, mode: 'insensitive' } },
          { rainbetUsername: { contains: query, mode: 'insensitive' } },
        ];
      }

      if (filters) {
        if (filters.isAdmin !== undefined) {
          where.isAdmin = filters.isAdmin;
        }
        if (filters.isModerator !== undefined) {
          where.isModerator = filters.isModerator;
        }
        if (filters.isVip !== undefined) {
          where.isVip = filters.isVip;
        }
        if (filters.isDepositor !== undefined) {
          where.isDepositor = filters.isDepositor;
        }
        if (filters.isSuspended !== undefined) {
          where.isSuspended = filters.isSuspended;
        }
        if (filters.kickVerified !== undefined) {
          where.kickVerified = filters.kickVerified;
        }
        if (filters.rainbetVerified !== undefined) {
          where.rainbetVerified = filters.rainbetVerified;
        }
        if (filters.minPoints !== undefined) {
          where.points = { ...where.points, gte: filters.minPoints };
        }
        if (filters.maxPoints !== undefined) {
          where.points = { ...where.points, lte: filters.maxPoints };
        }
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            discordId: true,
            kickUsername: true,
            kickVerified: true,
            rainbetUsername: true,
            rainbetVerified: true,
            weeklyWagered: true,
            monthlyWagered: true,
            totalWagered: true,
            displayName: true,
            avatarUrl: true,
            points: true,
            totalEarned: true,
            totalSpent: true,
            isAdmin: true,
            isModerator: true,
            isVip: true,
            isDepositor: true,
            isSuspended: true,
            suspensionReason: true,
            suspensionExpiresAt: true,
            createdAt: true,
            lastActiveAt: true,
          },
          orderBy: { [sortBy]: sortOrder },
          take: limit,
          skip: offset,
        }),
        prisma.user.count({ where }),
      ]);

      return {
        users: users.map(u => ({
          id: u.id,
          discordId: u.discordId,
          kickUsername: u.kickUsername || undefined,
          kickVerified: u.kickVerified,
          rainbetUsername: u.rainbetUsername || undefined,
          rainbetVerified: u.rainbetVerified,
          weeklyWagered: u.weeklyWagered.toString(),
          monthlyWagered: u.monthlyWagered.toString(),
          totalWagered: u.totalWagered.toString(),
          displayName: u.displayName,
          avatar: u.avatarUrl || undefined,
          points: u.points,
          totalEarned: u.totalEarned,
          totalSpent: u.totalSpent,
          isAdmin: u.isAdmin,
          isModerator: u.isModerator,
          isVip: u.isVip,
          isDepositor: u.isDepositor,
          isSuspended: u.isSuspended,
          suspensionReason: u.suspensionReason || undefined,
          suspensionExpiresAt: u.suspensionExpiresAt || undefined,
          createdAt: u.createdAt,
          lastActive: u.lastActiveAt || undefined,
        })),
        total,
      };
    } catch (error) {
      logger.error('Error searching users:', error);
      throw createError.internal('Failed to search users');
    }
  }

  // Points-ordinal rank for every user (1 = most points), for the Users table's
  // "community rank" column. One cheap id+points query, no window-function SQL
  // needed at this data scale.
  static async getUserPointsRanks(): Promise<Array<{ id: string; rank: number }>> {
    const users = await prisma.user.findMany({
      select: { id: true },
      orderBy: { points: 'desc' },
    });
    return users.map((u, i) => ({ id: u.id, rank: i + 1 }));
  }

  private static csvEscape(value: unknown): string {
    if (value === null || value === undefined) return '';
    const s = String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  // Builds a properly-escaped CSV of the current Users filter/search results
  // (unlike the manual-leaderboard export, which joins strings with no escaping).
  static async exportUsersCsv(
    query?: string,
    filters?: Parameters<typeof AdminService.searchUsers>[1]
  ): Promise<string> {
    const { users } = await this.searchUsers(query, filters, 5000, 0, 'createdAt', 'desc');

    const headers = [
      'Display Name', 'Discord ID', 'Kick Username', 'Kick Verified',
      'Razed Username', 'Razed Verified', 'Points', 'Total Earned', 'Total Spent',
      'Total Wagered', 'Is Admin', 'Is Moderator', 'Is VIP', 'Is Depositor',
      'Is Suspended', 'Created At', 'Last Active',
    ];

    const rows = users.map((u) => [
      u.displayName, u.discordId, u.kickUsername ?? '', u.kickVerified,
      u.rainbetUsername ?? '', u.rainbetVerified, u.points, u.totalEarned, u.totalSpent,
      u.totalWagered, u.isAdmin, u.isModerator, u.isVip, u.isDepositor,
      u.isSuspended, u.createdAt.toISOString(), u.lastActive ? new Date(u.lastActive).toISOString() : '',
    ].map((v) => this.csvEscape(v)).join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  // Login/session history for a user's admin profile page.
  static async getUserSessions(userId: string) {
    return prisma.userSession.findMany({
      where: { userId },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
      take: 25,
    });
  }

  // Get user details with full information
  static async getUserDetails(userId: string): Promise<any> {
    try {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const [user, watchTimeResult, firstSession, todayWager] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          // Explicit select (not `include`) so OAuth secrets (kickAccessToken/
          // kickRefreshToken/kickTokenExpiresAt) never reach the admin frontend.
          select: {
            id: true,
            discordId: true,
            kickId: true,
            kickUsername: true,
            kickVerified: true,
            displayName: true,
            avatarUrl: true,
            points: true,
            totalEarned: true,
            totalSpent: true,
            isAdmin: true,
            isModerator: true,
            isVip: true,
            isDepositor: true,
            isSuspended: true,
            suspensionReason: true,
            suspensionExpiresAt: true,
            createdAt: true,
            updatedAt: true,
            lastActiveAt: true,
            lastDailyCheckIn: true,
            rainbetUsername: true,
            rainbetVerified: true,
            totalWagered: true,
            weeklyWagered: true,
            monthlyWagered: true,
            totalDeposited: true,
            statistics: true,
            pointTransactions: {
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        }),
        prisma.viewingSession.aggregate({
          where: { userId },
          _sum: { durationMinutes: true },
        }),
        prisma.viewingSession.findFirst({
          where: { userId },
          orderBy: { startedAt: 'asc' },
          select: { startedAt: true },
        }),
        prisma.razedDailyWager.findUnique({
          where: { userId_date: { userId, date: todayStart } },
        }),
      ]);

      if (!user) {
        throw createError.notFound('User not found');
      }

      return {
        ...user,
        totalWatchMinutes: watchTimeResult._sum.durationMinutes ?? 0,
        firstWatchedAt: firstSession?.startedAt ?? null,
        todayWagered: (todayWager?.amount ?? 0).toString(),
      };
    } catch (error) {
      logger.error('Error getting user details:', error);
      throw error;
    }
  }

  // Manually adjust user points
  static async adjustUserPoints(
    userId: string,
    amount: number,
    reason: string,
    adminId: string
  ): Promise<void> {
    if (amount === 0) {
      throw createError.badRequest('Amount cannot be zero');
    }

    if (!reason || reason.trim().length === 0) {
      throw createError.badRequest('Reason is required');
    }

    try {
      await prisma.$transaction(async tx => {
        // Get user (for the 404 check and the audit log's "before" snapshot)
        const user = await tx.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw createError.notFound('User not found');
        }

        if (amount < 0) {
          // WHERE + decrement in one statement, same pattern as PointsService —
          // prevents two concurrent admin deductions from both passing a
          // stale balance check and driving the user's points negative.
          const deductAmount = Math.abs(amount);
          const updated = await tx.user.updateMany({
            where: { id: userId, points: { gte: deductAmount } },
            data: { points: { decrement: deductAmount } },
          });
          if (updated.count === 0) {
            throw createError.badRequest(
              'Insufficient points. User only has ' + user.points + ' points.'
            );
          }
        } else {
          await tx.user.update({
            where: { id: userId },
            data: { points: { increment: amount } },
          });
        }

        const updatedUser = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { points: true },
        });

        // Create transaction record
        await tx.pointTransaction.create({
          data: {
            userId,
            amount,
            transactionType: amount > 0 ? 'admin_add' : 'admin_subtract',
            reason: `Admin adjustment: ${reason}`,
            adminId,
            metadata: {
              adminAction: true,
              reason,
            },
          },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            adminId,
            action: amount > 0 ? 'ADD_POINTS' : 'SUBTRACT_POINTS',
            targetType: 'user',
            targetId: userId,
            oldValues: {
              points: user.points,
            },
            newValues: {
              points: updatedUser.points,
              amount,
              reason,
            },
          },
        });
      });

      // Bust cached session so next /api/auth/me returns the updated balance
      await RedisService.set(`invalidate:${userId}`, '1', 120);

      logger.info(
        `Admin ${adminId} adjusted points for user ${userId}: ${amount} (${reason})`
      );
    } catch (error) {
      logger.error('Error adjusting user points:', error);
      throw error;
    }
  }

  // Bulk points adjustment
  static async bulkAdjustPoints(
    userIds: string[],
    amount: number,
    reason: string,
    adminId: string
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    if (userIds.length === 0) {
      throw createError.badRequest('No users specified');
    }

    if (userIds.length > 100) {
      throw createError.badRequest('Maximum 100 users per bulk operation');
    }

    let success = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const userId of userIds) {
      try {
        await this.adjustUserPoints(userId, amount, reason, adminId);
        success++;
      } catch (error: any) {
        failed++;
        errors.push({
          userId,
          error: error.message,
        });
      }
    }

    logger.info(
      `Bulk points adjustment by admin ${adminId}: ${success} success, ${failed} failed`
    );

    return { success, failed, errors };
  }

  // Suspend user account
  static async suspendUser(
    userId: string,
    reason: string,
    adminId: string,
    durationHours?: number
  ): Promise<void> {
    try {
      const suspensionExpiresAt = durationHours
        ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
        : null;

      await prisma.$transaction(async tx => {
        const user = await tx.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw createError.notFound('User not found');
        }

        if (user.isAdmin) {
          throw createError.badRequest('Cannot suspend admin users');
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            isSuspended: true,
            suspensionReason: reason,
            suspensionExpiresAt,
          },
        });

        // Invalidate all user sessions
        await tx.userSession.deleteMany({
          where: { userId },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            adminId,
            action: 'SUSPEND_USER',
            targetType: 'user',
            targetId: userId,
            oldValues: {
              isSuspended: user.isSuspended,
            },
            newValues: {
              isSuspended: true,
              reason,
              suspensionExpiresAt,
              suspendedAt: new Date(),
            },
          },
        });
      });

      // Make the suspension take effect on this user's very next request
      // instead of waiting for authMiddleware's suspended-status cache to expire.
      await RedisService.set(`suspended:${userId}`, '1', 3600);

      logger.info(`Admin ${adminId} suspended user ${userId}: ${reason}`);
    } catch (error) {
      logger.error('Error suspending user:', error);
      throw error;
    }
  }

  // Unsuspend user account
  static async unsuspendUser(userId: string, adminId: string): Promise<void> {
    try {
      await prisma.$transaction(async tx => {
        const user = await tx.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw createError.notFound('User not found');
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            isSuspended: false,
            suspensionReason: null,
            suspensionExpiresAt: null,
          },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            adminId,
            action: 'UNSUSPEND_USER',
            targetType: 'user',
            targetId: userId,
            oldValues: {
              isSuspended: user.isSuspended,
            },
            newValues: {
              isSuspended: false,
              unsuspendedAt: new Date(),
            },
          },
        });
      });

      await RedisService.set(`suspended:${userId}`, '0', 3600);

      logger.info(`Admin ${adminId} unsuspended user ${userId}`);
    } catch (error) {
      logger.error('Error unsuspending user:', error);
      throw error;
    }
  }

  // Verify Kick username
  static async verifyKickUsername(
    userId: string,
    verified: boolean,
    adminId: string
  ): Promise<void> {
    try {
      await prisma.$transaction(async tx => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { kickUsername: true, kickVerified: true },
        });

        if (!user) {
          throw createError.notFound('User not found');
        }

        if (!user.kickUsername) {
          throw createError.badRequest('User has no Kick username to verify');
        }

        // Update the kickVerified field
        await tx.user.update({
          where: { id: userId },
          data: {
            kickVerified: verified,
            updatedAt: new Date(),
          },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            adminId,
            action: verified
              ? 'VERIFY_KICK_USERNAME'
              : 'UNVERIFY_KICK_USERNAME',
            targetType: 'user',
            targetId: userId,
            oldValues: {
              kickVerified: user.kickVerified,
            },
            newValues: {
              kickUsername: user.kickUsername,
              kickVerified: verified,
              verifiedAt: new Date(),
            },
          },
        });
      });

      logger.info(
        `Admin ${adminId} ${verified ? 'verified' : 'unverified'} Kick username for user ${userId}`
      );
    } catch (error) {
      logger.error('Error verifying Kick username:', error);
      throw error;
    }
  }

  // Edit user's Kick username
  static async editKickUsername(
    userId: string,
    newKickUsername: string | null,
    adminId: string
  ): Promise<void> {
    try {
      await prisma.$transaction(async tx => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { kickUsername: true },
        });

        if (!user) {
          throw createError.notFound('User not found');
        }

        // Check if the new username is already taken (if not null)
        if (newKickUsername) {
          const existingUser = await tx.user.findUnique({
            where: { kickUsername: newKickUsername },
          });

          if (existingUser && existingUser.id !== userId) {
            throw createError.conflict('Kick username is already taken');
          }
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            kickUsername: newKickUsername,
            // Reset verification status when username is changed
            kickVerified: newKickUsername ? false : false,
            updatedAt: new Date(),
          },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            adminId,
            action: 'EDIT_KICK_USERNAME',
            targetType: 'user',
            targetId: userId,
            oldValues: {
              kickUsername: user.kickUsername,
            },
            newValues: {
              kickUsername: newKickUsername,
              updatedAt: new Date(),
            },
          },
        });
      });

      logger.info(
        `Admin ${adminId} edited Kick username for user ${userId}: ${newKickUsername}`
      );
    } catch (error) {
      logger.error('Error editing Kick username:', error);
      throw error;
    }
  }

  // Edit user's Rainbet username
  static async editRainbetUsername(
    userId: string,
    newRainbetUsername: string | null,
    adminId: string
  ): Promise<void> {
    try {
      await prisma.$transaction(async tx => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { rainbetUsername: true, rainbetVerified: true },
        });

        if (!user) {
          throw createError.notFound('User not found');
        }

        // Check if the new username is already taken (if not null)
        if (newRainbetUsername) {
          const existingUser = await tx.user.findUnique({
            where: { rainbetUsername: newRainbetUsername },
          });

          if (existingUser && existingUser.id !== userId) {
            throw createError.conflict('Razed username is already taken');
          }
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            rainbetUsername: newRainbetUsername,
            // Reset verification status when username is changed
            rainbetVerified: newRainbetUsername ? false : false,
            updatedAt: new Date(),
          },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            adminId,
            action: 'EDIT_RAINBET_USERNAME',
            targetType: 'user',
            targetId: userId,
            oldValues: {
              rainbetUsername: user.rainbetUsername,
              rainbetVerified: user.rainbetVerified,
            },
            newValues: {
              rainbetUsername: newRainbetUsername,
              rainbetVerified: false,
              updatedAt: new Date(),
            },
          },
        });
      });

      logger.info(
        `Admin ${adminId} edited Rainbet username for user ${userId}: ${newRainbetUsername}`
      );
    } catch (error) {
      logger.error('Error editing Rainbet username:', error);
      throw error;
    }
  }

  // Verify Rainbet username
  static async verifyRainbetUsername(
    userId: string,
    verified: boolean,
    adminId: string
  ): Promise<void> {
    try {
      await prisma.$transaction(async tx => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { rainbetUsername: true },
        });

        if (!user) {
          throw createError.notFound('User not found');
        }

        if (!user.rainbetUsername) {
          throw createError.badRequest(
            'User has no Razed username to verify'
          );
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            rainbetVerified: verified,
            updatedAt: new Date(),
          },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            adminId,
            action: verified
              ? 'VERIFY_RAINBET_USERNAME'
              : 'UNVERIFY_RAINBET_USERNAME',
            targetType: 'user',
            targetId: userId,
            oldValues: {
              rainbetVerified: !verified,
            },
            newValues: {
              rainbetUsername: user.rainbetUsername,
              rainbetVerified: verified,
              verifiedAt: new Date(),
            },
          },
        });
      });

      logger.info(
        `Admin ${adminId} ${verified ? 'verified' : 'unverified'} Rainbet username for user ${userId}`
      );
    } catch (error) {
      logger.error('Error verifying Rainbet username:', error);
      throw error;
    }
  }

  // Re-check a user's linked Razed username directly against the Razed API and
  // set verified accordingly. Useful for re-validating stale (e.g. AceBet-era) links.
  static async recheckRazedVerification(
    userId: string,
    adminId: string
  ): Promise<{ verified: boolean }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { rainbetUsername: true, rainbetVerified: true },
      });

      if (!user) {
        throw createError.notFound('User not found');
      }
      if (!user.rainbetUsername) {
        throw createError.badRequest('User has no Razed username to check');
      }
      if (!RazedService.isConfigured()) {
        throw createError.badRequest('Razed API is not configured');
      }

      const verified = await RazedService.isValidReferral(user.rainbetUsername);

      await prisma.$transaction(async tx => {
        await tx.user.update({
          where: { id: userId },
          data: { rainbetVerified: verified, updatedAt: new Date() },
        });

        await tx.auditLog.create({
          data: {
            adminId,
            action: verified ? 'VERIFY_RAINBET_USERNAME' : 'UNVERIFY_RAINBET_USERNAME',
            targetType: 'user',
            targetId: userId,
            oldValues: { rainbetVerified: user.rainbetVerified },
            newValues: { rainbetUsername: user.rainbetUsername, rainbetVerified: verified, checkedViaApi: true },
          },
        });
      });

      if (verified) {
        await RazedWagerSyncService.migrateUnlinkedWagersToUser(userId, user.rainbetUsername).catch((err) =>
          logger.error('Failed to migrate orphaned Razed wagers on recheck:', err)
        );
      }

      logger.info(
        `Admin ${adminId} rechecked Razed verification for user ${userId} via API: verified=${verified}`
      );

      return { verified };
    } catch (error) {
      logger.error('Error rechecking Razed verification:', error);
      throw error;
    }
  }

  // Delete user account
  static async deleteUser(
    userId: string,
    reason: string,
    adminId: string
  ): Promise<void> {
    try {
      await prisma.$transaction(async tx => {
        const user = await tx.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw createError.notFound('User not found');
        }

        if (user.isAdmin) {
          throw createError.badRequest('Cannot delete admin users');
        }

        // Create audit log before deletion
        await tx.auditLog.create({
          data: {
            adminId,
            action: 'DELETE_USER',
            targetType: 'user',
            targetId: userId,
            oldValues: {
              discordId: user.discordId,
              displayName: user.displayName,
              points: user.points,
            },
            newValues: {
              deleted: true,
              reason,
              deletedAt: new Date(),
            },
          },
        });

        // Delete user (cascade will handle related records)
        await tx.user.delete({
          where: { id: userId },
        });
      });

      logger.info(`Admin ${adminId} deleted user ${userId}: ${reason}`);
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  // Update user profile
  static async updateUserProfile(
    userId: string,
    updates: {
      displayName?: string;
      isAdmin?: boolean;
    },
    adminId: string
  ): Promise<void> {
    try {
      await prisma.$transaction(async tx => {
        const user = await tx.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw createError.notFound('User not found');
        }

        await tx.user.update({
          where: { id: userId },
          data: updates,
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            adminId,
            action: 'UPDATE_USER_PROFILE',
            targetType: 'user',
            targetId: userId,
            oldValues: {
              displayName: user.displayName,
              isAdmin: user.isAdmin,
            },
            newValues: updates,
          },
        });
      });

      logger.info(`Admin ${adminId} updated user profile ${userId}`);
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Toggle moderator status
  static async toggleModeratorStatus(
    userId: string,
    isModerator: boolean,
    adminId: string
  ): Promise<void> {
    try {
      await prisma.$transaction(async tx => {
        const user = await tx.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw createError.notFound('User not found');
        }

        if (user.isAdmin) {
          throw createError.badRequest(
            'Cannot change moderator status for admin users'
          );
        }

        await tx.user.update({
          where: { id: userId },
          data: { isModerator },
        });

        // Invalidate all user sessions to force re-login with new role
        await tx.userSession.deleteMany({
          where: { userId },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            adminId,
            action: isModerator
              ? 'PROMOTE_TO_MODERATOR'
              : 'DEMOTE_FROM_MODERATOR',
            targetType: 'user',
            targetId: userId,
            oldValues: {
              isModerator: user.isModerator,
            },
            newValues: {
              isModerator,
              updatedAt: new Date(),
            },
          },
        });
      });

      const action = isModerator ? 'promoted to' : 'demoted from';
      logger.info(`Admin ${adminId} ${action} moderator: ${userId}`);
    } catch (error) {
      logger.error('Error toggling moderator status:', error);
      throw error;
    }
  }

  // Get audit logs
  static async getAuditLogs(
    filters?: {
      adminId?: string;
      action?: string;
      targetType?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100,
    offset: number = 0
  ): Promise<{ logs: AuditLogEntry[]; total: number }> {
    try {
      const where: any = {};

      if (filters) {
        if (filters.adminId) where.adminId = filters.adminId;
        if (filters.action) where.action = filters.action;
        if (filters.targetType) where.targetType = filters.targetType;
        if (filters.startDate || filters.endDate) {
          where.createdAt = {};
          if (filters.startDate) where.createdAt.gte = filters.startDate;
          if (filters.endDate) where.createdAt.lte = filters.endDate;
        }
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            admin: {
              select: {
                displayName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.auditLog.count({ where }),
      ]);

      return {
        logs: logs.map(log => ({
          id: log.id,
          adminId: log.adminId,
          adminName: log.admin?.displayName || 'System',
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          changes: { oldValues: log.oldValues, newValues: log.newValues },
          reason: log.reason || undefined,
          timestamp: log.createdAt,
        })),
        total,
      };
    } catch (error) {
      logger.error('Error getting audit logs:', error);
      throw createError.internal('Failed to get audit logs');
    }
  }

  // Get transaction history for a user
  static async getUserTransactionHistory(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ transactions: any[]; total: number }> {
    try {
      const [transactions, total] = await Promise.all([
        prisma.pointTransaction.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.pointTransaction.count({
          where: { userId },
        }),
      ]);

      return { transactions, total };
    } catch (error) {
      logger.error('Error getting user transaction history:', error);
      throw createError.internal('Failed to get transaction history');
    }
  }

  // System configuration management
  static async getSystemConfig(): Promise<any> {
    try {
      const configs = await prisma.systemConfig.findMany();

      const configMap: any = {};
      for (const config of configs) {
        configMap[config.key] = config.value;
      }

      return configMap;
    } catch (error) {
      logger.error('Error getting system config:', error);
      throw createError.internal('Failed to get system configuration');
    }
  }

  static async updateSystemConfig(
    key: string,
    value: any,
    adminId: string
  ): Promise<void> {
    try {
      await prisma.$transaction(async tx => {
        const existing = await tx.systemConfig.findUnique({
          where: { key },
        });

        await tx.systemConfig.upsert({
          where: { key },
          create: {
            key,
            value,
          },
          update: {
            value,
            updatedAt: new Date(),
          },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            adminId,
            action: 'UPDATE_SYSTEM_CONFIG',
            targetType: 'system_config',
            targetId: key,
            oldValues: existing?.value ? { value: existing.value } : null,
            newValues: {
              key,
              value,
            },
          },
        });
      });

      // Clear config cache
      await RedisService.del('system:config');

      logger.info(`Admin ${adminId} updated system config: ${key}`);
    } catch (error) {
      logger.error('Error updating system config:', error);
      throw createError.internal('Failed to update system configuration');
    }
  }
}
