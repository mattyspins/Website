import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { AdminService } from '@/services/AdminService';
import { LeaderboardService } from '@/services/LeaderboardService';
import { RaffleService } from '@/services/RaffleService';
import { StoreService } from '@/services/StoreService';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { DiscordService } from '@/services/DiscordService';
import { validateEnv } from '@/config/env';

export class AdminController {
  // Dashboard Statistics
  static getDashboardStats = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      try {
        const stats = await AdminService.getDashboardStats();

        res.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        logger.error('Error getting dashboard stats:', error);
        throw createError.internal('Failed to get dashboard statistics');
      }
    }
  );

  static getUserGrowth = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }
      const days = Math.min(Math.max(parseInt((req.query.days as string) || '30', 10), 1), 180);
      const data = await AdminService.getUserGrowthTimeseries(days);
      res.json({ success: true, data });
    }
  );

  static getActiveUsersTimeseries = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }
      const days = Math.min(Math.max(parseInt((req.query.days as string) || '30', 10), 1), 180);
      const data = await AdminService.getActiveUsersTimeseries(days);
      res.json({ success: true, data });
    }
  );

  static exportUsers = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }
      const { query, isAdmin, isSuspended, isVip, isDepositor, isModerator, rainbetVerified, kickVerified } = req.query;
      const filters: any = {};
      if (isAdmin !== undefined) filters.isAdmin = isAdmin === 'true';
      if (isModerator !== undefined) filters.isModerator = isModerator === 'true';
      if (isVip !== undefined) filters.isVip = isVip === 'true';
      if (isDepositor !== undefined) filters.isDepositor = isDepositor === 'true';
      if (isSuspended !== undefined) filters.isSuspended = isSuspended === 'true';
      if (kickVerified !== undefined) filters.kickVerified = kickVerified === 'true';
      if (rainbetVerified !== undefined) filters.rainbetVerified = rainbetVerified === 'true';

      const csv = await AdminService.exportUsersCsv(query as string, filters);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="users-${Date.now()}.csv"`);
      res.send(csv);
    }
  );

  static getUserSessions = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }
      const { userId } = req.params;
      if (!userId) throw createError.badRequest('User ID is required');
      const sessions = await AdminService.getUserSessions(userId);
      res.json({ success: true, data: { sessions } });
    }
  );

  // User Management

  static getUserPointsRanks = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }
      const ranks = await AdminService.getUserPointsRanks();
      res.json({ success: true, data: { ranks } });
    }
  );

  static searchUsers = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const {
        query,
        isAdmin,
        isModerator,
        isVip,
        isDepositor,
        isSuspended,
        kickVerified,
        rainbetVerified,
        minPoints,
        maxPoints,
        limit = '50',
        offset = '0',
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const filters: any = {};
      if (isAdmin !== undefined) filters.isAdmin = isAdmin === 'true';
      if (isModerator !== undefined) filters.isModerator = isModerator === 'true';
      if (isVip !== undefined) filters.isVip = isVip === 'true';
      if (isDepositor !== undefined) filters.isDepositor = isDepositor === 'true';
      if (isSuspended !== undefined)
        filters.isSuspended = isSuspended === 'true';
      if (kickVerified !== undefined) filters.kickVerified = kickVerified === 'true';
      if (rainbetVerified !== undefined) filters.rainbetVerified = rainbetVerified === 'true';
      if (minPoints) filters.minPoints = parseInt(minPoints as string);
      if (maxPoints) filters.maxPoints = parseInt(maxPoints as string);

      const limitNum = Math.min(parseInt(limit as string) || 50, 100);
      const offsetNum = Math.max(parseInt(offset as string) || 0, 0);
      const allowedSort = ['createdAt', 'lastActiveAt', 'points', 'displayName', 'totalWagered'];
      const sortByValue = allowedSort.includes(sortBy as string) ? (sortBy as any) : 'createdAt';
      const sortOrderValue = sortOrder === 'asc' ? 'asc' : 'desc';

      try {
        const result = await AdminService.searchUsers(
          query as string,
          filters,
          limitNum,
          offsetNum,
          sortByValue,
          sortOrderValue
        );

        res.json({
          success: true,
          data: {
            users: result.users,
            pagination: {
              limit: limitNum,
              offset: offsetNum,
              total: result.total,
              hasMore: offsetNum + limitNum < result.total,
            },
          },
        });
      } catch (error) {
        logger.error('Error searching users:', error);
        throw createError.internal('Failed to search users');
      }
    }
  );

  static getUserDetails = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { userId } = req.params;

      if (!userId) {
        throw createError.badRequest('User ID is required');
      }

      try {
        const user = await AdminService.getUserDetails(userId);

        res.json({
          success: true,
          data: user,
        });
      } catch (error) {
        logger.error('Error getting user details:', error);
        throw error;
      }
    }
  );

  static adjustUserPoints = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { userId } = req.params;
      const { amount, reason } = req.body;

      if (!userId) {
        throw createError.badRequest('User ID is required');
      }

      if (amount === undefined || !reason) {
        throw createError.badRequest('Amount and reason are required');
      }

      try {
        await AdminService.adjustUserPoints(
          userId,
          parseInt(amount),
          reason,
          req.user.id
        );

        logger.info(
          `Admin ${req.user.id} adjusted points for user ${userId}: ${amount}`
        );

        res.json({
          success: true,
          message: 'Points adjusted successfully',
          data: {
            userId,
            amount: parseInt(amount),
            reason,
            adjustedBy: req.user.id,
            adjustedAt: new Date(),
          },
        });
      } catch (error) {
        logger.error('Error adjusting user points:', error);
        throw error;
      }
    }
  );

  static bulkAdjustPoints = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { userIds, amount, reason } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw createError.badRequest('User IDs array is required');
      }

      if (amount === undefined || !reason) {
        throw createError.badRequest('Amount and reason are required');
      }

      try {
        const result = await AdminService.bulkAdjustPoints(
          userIds,
          parseInt(amount),
          reason,
          req.user.id
        );

        logger.info(
          `Admin ${req.user.id} bulk adjusted points: ${result.success} success, ${result.failed} failed`
        );

        res.json({
          success: true,
          message: 'Bulk points adjustment completed',
          data: result,
        });
      } catch (error) {
        logger.error('Error bulk adjusting points:', error);
        throw error;
      }
    }
  );

  static suspendUser = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { userId } = req.params;
      const { reason, durationHours } = req.body;

      if (!userId) {
        throw createError.badRequest('User ID is required');
      }

      if (!reason) {
        throw createError.badRequest('Reason is required');
      }

      try {
        await AdminService.suspendUser(
          userId,
          reason,
          req.user.id,
          durationHours !== undefined && durationHours !== null && durationHours !== ''
            ? Number(durationHours)
            : undefined
        );

        logger.info(`Admin ${req.user.id} suspended user ${userId}`);

        res.json({
          success: true,
          message: 'User suspended successfully',
          data: {
            userId,
            reason,
            suspendedBy: req.user.id,
            suspendedAt: new Date(),
          },
        });
      } catch (error) {
        logger.error('Error suspending user:', error);
        throw error;
      }
    }
  );

  static unsuspendUser = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { userId } = req.params;

      if (!userId) {
        throw createError.badRequest('User ID is required');
      }

      try {
        await AdminService.unsuspendUser(userId, req.user.id);

        logger.info(`Admin ${req.user.id} unsuspended user ${userId}`);

        res.json({
          success: true,
          message: 'User unsuspended successfully',
          data: {
            userId,
            unsuspendedBy: req.user.id,
            unsuspendedAt: new Date(),
          },
        });
      } catch (error) {
        logger.error('Error unsuspending user:', error);
        throw error;
      }
    }
  );

  static verifyKickUsername = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { userId } = req.params;
      const { verified } = req.body;

      if (!userId) {
        throw createError.badRequest('User ID is required');
      }

      try {
        await AdminService.verifyKickUsername(
          userId,
          verified !== false,
          req.user.id
        );

        logger.info(
          `Admin ${req.user.id} verified Kick username for user ${userId}`
        );

        res.json({
          success: true,
          message: 'Kick username verified successfully',
          data: {
            userId,
            verified: verified !== false,
            verifiedBy: req.user.id,
            verifiedAt: new Date(),
          },
        });
      } catch (error) {
        logger.error('Error verifying Kick username:', error);
        throw error;
      }
    }
  );

  static editKickUsername = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { userId } = req.params;
      const { kickUsername } = req.body;

      if (!userId) {
        throw createError.badRequest('User ID is required');
      }

      try {
        await AdminService.editKickUsername(
          userId,
          kickUsername || null,
          req.user.id
        );

        logger.info(
          `Admin ${req.user.id} edited Kick username for user ${userId}`
        );

        res.json({
          success: true,
          message: 'Kick username updated successfully',
          data: {
            userId,
            kickUsername: kickUsername || null,
            updatedBy: req.user.id,
            updatedAt: new Date(),
          },
        });
      } catch (error) {
        logger.error('Error editing Kick username:', error);
        throw error;
      }
    }
  );

  static editRainbetUsername = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { userId } = req.params;
      const { rainbetUsername } = req.body;

      if (!userId) {
        throw createError.badRequest('User ID is required');
      }

      try {
        await AdminService.editRainbetUsername(
          userId,
          rainbetUsername || null,
          req.user.id
        );

        logger.info(
          `Admin ${req.user.id} edited Rainbet username for user ${userId}`
        );

        res.json({
          success: true,
          message: 'Razed username updated successfully',
          data: {
            userId,
            rainbetUsername: rainbetUsername || null,
            updatedBy: req.user.id,
            updatedAt: new Date(),
          },
        });
      } catch (error) {
        logger.error('Error editing Rainbet username:', error);
        throw error;
      }
    }
  );

  static verifyRainbetUsername = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { userId } = req.params;
      const { verified } = req.body;

      if (!userId) {
        throw createError.badRequest('User ID is required');
      }

      try {
        await AdminService.verifyRainbetUsername(
          userId,
          verified !== false,
          req.user.id
        );

        logger.info(
          `Admin ${req.user.id} verified Rainbet username for user ${userId}`
        );

        res.json({
          success: true,
          message: 'Razed username verified successfully',
          data: {
            userId,
            verified: verified !== false,
            verifiedBy: req.user.id,
            verifiedAt: new Date(),
          },
        });
      } catch (error) {
        logger.error('Error verifying Rainbet username:', error);
        throw error;
      }
    }
  );

  static recheckRazedVerification = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { userId } = req.params;
      if (!userId) {
        throw createError.badRequest('User ID is required');
      }

      try {
        const { verified } = await AdminService.recheckRazedVerification(userId, req.user.id);

        res.json({
          success: true,
          message: verified ? 'Verified via Razed API' : 'Not found under our Razed code — marked unverified',
          data: { userId, verified },
        });
      } catch (error) {
        logger.error('Error rechecking Razed verification:', error);
        throw error;
      }
    }
  );

  static deleteUser = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { userId } = req.params;
      const { reason } = req.body;

      if (!userId) {
        throw createError.badRequest('User ID is required');
      }

      if (!reason) {
        throw createError.badRequest('Reason is required');
      }

      try {
        await AdminService.deleteUser(userId, reason, req.user.id);

        logger.info(`Admin ${req.user.id} deleted user ${userId}`);

        res.json({
          success: true,
          message: 'User deleted successfully',
          data: {
            userId,
            reason,
            deletedBy: req.user.id,
            deletedAt: new Date(),
          },
        });
      } catch (error) {
        logger.error('Error deleting user:', error);
        throw error;
      }
    }
  );

  static updateUserProfile = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { userId } = req.params;
      const updates = req.body;

      if (!userId) {
        throw createError.badRequest('User ID is required');
      }

      try {
        await AdminService.updateUserProfile(userId, updates, req.user.id);

        logger.info(`Admin ${req.user.id} updated user profile ${userId}`);

        res.json({
          success: true,
          message: 'User profile updated successfully',
          data: {
            userId,
            updates,
            updatedBy: req.user.id,
            updatedAt: new Date(),
          },
        });
      } catch (error) {
        logger.error('Error updating user profile:', error);
        throw error;
      }
    }
  );

  static toggleModeratorStatus = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { userId } = req.params;
      const { isModerator } = req.body;

      if (!userId) {
        throw createError.badRequest('User ID is required');
      }

      if (typeof isModerator !== 'boolean') {
        throw createError.badRequest('isModerator must be a boolean');
      }

      try {
        await AdminService.toggleModeratorStatus(
          userId,
          isModerator,
          req.user.id
        );

        const action = isModerator ? 'promoted to' : 'demoted from';
        logger.info(`Admin ${req.user.id} ${action} moderator: ${userId}`);

        res.json({
          success: true,
          message: `User ${action} moderator successfully`,
          data: {
            userId,
            isModerator,
            updatedBy: req.user.id,
            updatedAt: new Date(),
          },
        });
      } catch (error) {
        logger.error('Error toggling moderator status:', error);
        throw error;
      }
    }
  );

  static toggleVipStatus = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) throw createError.forbidden('Admin access required');
      const { userId } = req.params;
      const { isVip } = req.body;
      if (typeof isVip !== 'boolean') throw createError.badRequest('isVip must be a boolean');
      const user = await prisma.user.update({ where: { id: userId }, data: { isVip }, select: { discordId: true } });
      logger.info(`Admin ${req.user.id} set VIP=${isVip} for user ${userId}`);

      // Sync Discord role if configured
      const env = validateEnv();
      if (env.DISCORD_BOT_TOKEN && env.DISCORD_GUILD_ID && env.DISCORD_VIP_ROLE_ID && user.discordId) {
        if (isVip) {
          await DiscordService.assignRole(env.DISCORD_GUILD_ID, user.discordId, env.DISCORD_VIP_ROLE_ID);
        } else {
          await DiscordService.removeRole(env.DISCORD_GUILD_ID, user.discordId, env.DISCORD_VIP_ROLE_ID);
        }
      } else {
        logger.warn('Discord role sync skipped — DISCORD_GUILD_ID or DISCORD_VIP_ROLE_ID not configured');
      }

      res.json({ success: true, userId, isVip });
    }
  );

  static toggleDepositorStatus = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) throw createError.forbidden('Admin access required');
      const { userId } = req.params;
      const { isDepositor } = req.body;
      if (typeof isDepositor !== 'boolean') throw createError.badRequest('isDepositor must be a boolean');
      const user = await prisma.user.update({ where: { id: userId }, data: { isDepositor }, select: { discordId: true } });
      logger.info(`Admin ${req.user.id} set Depositor=${isDepositor} for user ${userId}`);

      // Sync Discord role if configured
      const env = validateEnv();
      if (env.DISCORD_BOT_TOKEN && env.DISCORD_GUILD_ID && env.DISCORD_DEPOSITOR_ROLE_ID && user.discordId) {
        if (isDepositor) {
          await DiscordService.assignRole(env.DISCORD_GUILD_ID, user.discordId, env.DISCORD_DEPOSITOR_ROLE_ID);
        } else {
          await DiscordService.removeRole(env.DISCORD_GUILD_ID, user.discordId, env.DISCORD_DEPOSITOR_ROLE_ID);
        }
      } else {
        logger.warn('Discord role sync skipped — DISCORD_GUILD_ID or DISCORD_DEPOSITOR_ROLE_ID not configured');
      }

      res.json({ success: true, userId, isDepositor });
    }
  );

  // Transaction Management

  static getUserTransactionHistory = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { userId } = req.params;
      const { limit = '100', offset = '0' } = req.query;

      if (!userId) {
        throw createError.badRequest('User ID is required');
      }

      const limitNum = Math.min(parseInt(limit as string) || 100, 500);
      const offsetNum = Math.max(parseInt(offset as string) || 0, 0);

      try {
        const result = await AdminService.getUserTransactionHistory(
          userId,
          limitNum,
          offsetNum
        );

        res.json({
          success: true,
          data: {
            transactions: result.transactions,
            pagination: {
              limit: limitNum,
              offset: offsetNum,
              total: result.total,
              hasMore: offsetNum + limitNum < result.total,
            },
          },
        });
      } catch (error) {
        logger.error('Error getting transaction history:', error);
        throw createError.internal('Failed to get transaction history');
      }
    }
  );

  // Global activity feed (point transactions + store purchases)
  static getActivityFeed = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) throw createError.forbidden('Admin access required');

      const { page = '1', limit = '50', type = 'all', search = '' } = req.query;
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, parseInt(limit as string) || 50);
      const skip = (pageNum - 1) * limitNum;

      const { prisma } = await import('@/config/database');

      const userWhere = search
        ? { user: { displayName: { contains: search as string, mode: 'insensitive' as const } } }
        : {};

      const [pointTxs, storePurchases, pointTotal, storeTotal] = await Promise.all([
        type === 'store' ? [] : prisma.pointTransaction.findMany({
          where: userWhere,
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
            admin: { select: { id: true, displayName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: type === 'all' ? limitNum * 2 : limitNum,
          skip: type === 'all' ? 0 : skip,
        }),
        type === 'points' ? [] : prisma.storePurchase.findMany({
          where: {
            ...( search ? { user: { displayName: { contains: search as string, mode: 'insensitive' as const } } } : {} ),
          },
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
            item: { select: { name: true, category: true } },
          },
          orderBy: { purchasedAt: 'desc' },
          take: type === 'all' ? limitNum * 2 : limitNum,
          skip: type === 'all' ? 0 : skip,
        }),
        type === 'store' ? 0 : prisma.pointTransaction.count({ where: userWhere }),
        type === 'points' ? 0 : prisma.storePurchase.count({ where: search ? { user: { displayName: { contains: search as string, mode: 'insensitive' as const } } } : {} }),
      ]);

      // Merge and sort by date
      const merged = [
        ...pointTxs.map((t: any) => ({
          id: t.id,
          type: 'points' as const,
          user: t.user,
          admin: t.admin ?? null,
          amount: t.amount,
          transactionType: t.transactionType,
          reason: t.reason,
          referenceType: t.referenceType,
          createdAt: t.createdAt,
        })),
        ...storePurchases.map((p: any) => ({
          id: p.id,
          type: 'store' as const,
          user: p.user,
          admin: null,
          itemName: p.item?.name,
          itemCategory: p.item?.category,
          quantity: p.quantity,
          totalPrice: p.totalPrice,
          status: p.status,
          createdAt: p.purchasedAt,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
       .slice(0, limitNum);

      res.json({
        success: true,
        data: {
          items: merged,
          pagination: {
            page: pageNum,
            limit: limitNum,
            totalPoints: pointTotal,
            totalStore: storeTotal,
            total: pointTotal + storeTotal,
            totalPages: Math.ceil((pointTotal + storeTotal) / limitNum),
          },
        },
      });
    }
  );

  // Audit Logs

  static getAuditLogs = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const {
        adminId,
        action,
        targetType,
        startDate,
        endDate,
        limit = '100',
        offset = '0',
      } = req.query;

      const filters: any = {};
      if (adminId) filters.adminId = adminId as string;
      if (action) filters.action = action as string;
      if (targetType) filters.targetType = targetType as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const limitNum = Math.min(parseInt(limit as string) || 100, 500);
      const offsetNum = Math.max(parseInt(offset as string) || 0, 0);

      try {
        const result = await AdminService.getAuditLogs(
          filters,
          limitNum,
          offsetNum
        );

        res.json({
          success: true,
          data: {
            logs: result.logs,
            pagination: {
              limit: limitNum,
              offset: offsetNum,
              total: result.total,
              hasMore: offsetNum + limitNum < result.total,
            },
          },
        });
      } catch (error) {
        logger.error('Error getting audit logs:', error);
        throw createError.internal('Failed to get audit logs');
      }
    }
  );

  // System Configuration

  static getSystemConfig = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      try {
        const config = await AdminService.getSystemConfig();

        res.json({
          success: true,
          data: config,
        });
      } catch (error) {
        logger.error('Error getting system config:', error);
        throw createError.internal('Failed to get system configuration');
      }
    }
  );

  static updateSystemConfig = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { key, value } = req.body;

      if (!key || value === undefined) {
        throw createError.badRequest('Key and value are required');
      }

      try {
        await AdminService.updateSystemConfig(key, value, req.user.id);

        logger.info(`Admin ${req.user.id} updated system config: ${key}`);

        res.json({
          success: true,
          message: 'System configuration updated successfully',
          data: {
            key,
            value,
            updatedBy: req.user.id,
            updatedAt: new Date(),
          },
        });
      } catch (error) {
        logger.error('Error updating system config:', error);
        throw createError.internal('Failed to update system configuration');
      }
    }
  );

  // Leaderboard Management (delegated to LeaderboardController but accessible via admin routes)
  // Store Management (delegated to StoreController but accessible via admin routes)
  // Raffle Management (delegated to RaffleController but accessible via admin routes)
}
