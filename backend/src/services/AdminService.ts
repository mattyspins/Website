// @ts-nocheck
import { prisma } from '@/config/database';
import { RedisService } from '@/config/redis';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { PointsService } from '@/services/PointsService';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalPoints: number;
  totalTransactions: number;
  totalRaffles: number;
  totalStoreItems: number;
  totalSessions: number;
}

export interface UserManagement {
  id: string;
  discordId: string;
  kickUsername?: string;
  kickVerified: boolean;
  rainbetUsername?: string;
  rainbetVerified: boolean;
  displayName: string;
  avatar?: string;
  points: number;
  totalEarned: number;
  totalSpent: number;
  isAdmin: boolean;
  isModerator: boolean;
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
      const [
        totalUsers,
        activeUsers,
        pointsAggregate,
        totalTransactions,
        totalRaffles,
        totalStoreItems,
        totalSessions,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: {
            lastActiveAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
        prisma.user.aggregate({
          _sum: {
            points: true,
          },
        }),
        prisma.pointTransaction.count(),
        prisma.raffle.count(),
        prisma.storeItem.count(),
        prisma.userSession.count({
          where: {
            expiresAt: {
              gt: new Date(),
            },
          },
        }),
      ]);

      return {
        totalUsers,
        activeUsers,
        totalPoints: pointsAggregate._sum.points || 0,
        totalTransactions,
        totalRaffles,
        totalStoreItems,
        totalSessions,
      };
    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      throw createError.internal('Failed to get dashboard statistics');
    }
  }

  // User Management

  // Search and filter users
  static async searchUsers(
    query?: string,
    filters?: {
      isAdmin?: boolean;
      isSuspended?: boolean;
      minPoints?: number;
      maxPoints?: number;
    },
    limit: number = 50,
    offset: number = 0
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
        if (filters.isSuspended !== undefined) {
          where.isSuspended = filters.isSuspended;
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
            displayName: true,
            avatarUrl: true,
            points: true,
            totalEarned: true,
            totalSpent: true,
            isAdmin: true,
            isModerator: true,
            isSuspended: true,
            suspensionReason: true,
            suspensionExpiresAt: true,
            createdAt: true,
            lastActiveAt: true,
          },
          orderBy: { createdAt: 'desc' },
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
          displayName: u.displayName,
          avatar: u.avatarUrl || undefined,
          points: u.points,
          totalEarned: u.totalEarned,
          totalSpent: u.totalSpent,
          isAdmin: u.isAdmin,
          isModerator: u.isModerator,
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

  // Get user details with full information
  static async getUserDetails(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          statistics: true,
          pointTransactions: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
          raffleTickets: {
            include: {
              raffle: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                },
              },
            },
          },
          storePurchases: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                },
              },
            },
            orderBy: { purchasedAt: 'desc' },
            take: 20,
          },
        },
      });

      if (!user) {
        throw createError.notFound('User not found');
      }

      return user;
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
        // Get user
        const user = await tx.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw createError.notFound('User not found');
        }

        // Check if subtraction would result in negative balance
        if (amount < 0 && user.points + amount < 0) {
          throw createError.badRequest(
            'Insufficient points. User only has ' + user.points + ' points.'
          );
        }

        // Update user points
        await tx.user.update({
          where: { id: userId },
          data: {
            points: { increment: amount },
          },
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
              points: user.points + amount,
              amount,
              reason,
            },
          },
        });
      });

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
          throw createError.badRequest('Cannot suspend admin users');
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            isSuspended: true,
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
              suspendedAt: new Date(),
            },
          },
        });
      });

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
            throw createError.conflict('Rainbet username is already taken');
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
            'User has no Rainbet username to verify'
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
          adminName: log.admin.displayName,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          changes: log.changes,
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
