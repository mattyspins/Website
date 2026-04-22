import { prisma } from '@/config/database';
import { RedisService } from '@/config/redis';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { PointTransaction } from '@/services/UserService';

export interface PointsTransactionRequest {
  userId: string;
  amount: number;
  reason: string;
  referenceId?: string;
  referenceType?: string;
  adminId?: string;
  metadata?: any;
}

export interface PointsBalance {
  userId: string;
  currentPoints: number;
  totalEarned: number;
  totalSpent: number;
  lastTransaction?: PointTransaction;
}

export class PointsService {
  // Add points to user account
  static async addPoints(
    request: PointsTransactionRequest
  ): Promise<PointTransaction> {
    if (request.amount <= 0) {
      throw createError.badRequest('Amount must be positive for adding points');
    }

    return await this.executePointsTransaction({
      ...request,
      transactionType: request.adminId ? 'admin_add' : 'earned',
    });
  }

  // Deduct points from user account
  static async deductPoints(
    request: PointsTransactionRequest
  ): Promise<PointTransaction> {
    if (request.amount <= 0) {
      throw createError.badRequest(
        'Amount must be positive for deducting points'
      );
    }

    // Check if user has sufficient balance
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
    });

    if (!user) {
      throw createError.notFound('User not found');
    }

    if (user.points < request.amount) {
      throw createError.badRequest('Insufficient points balance');
    }

    return await this.executePointsTransaction({
      ...request,
      amount: -request.amount, // Make negative for deduction
      transactionType: request.adminId ? 'admin_subtract' : 'spent',
    });
  }

  // Execute atomic points transaction
  private static async executePointsTransaction(
    request: PointsTransactionRequest & { transactionType: string }
  ): Promise<PointTransaction> {
    try {
      const result = await prisma.$transaction(async tx => {
        // Get current user data
        const user = await tx.user.findUnique({
          where: { id: request.userId },
        });

        if (!user) {
          throw createError.notFound('User not found');
        }

        // Check for negative balance (only for deductions)
        const newBalance = user.points + request.amount;
        if (newBalance < 0) {
          throw createError.badRequest(
            'Transaction would result in negative balance'
          );
        }

        // Create transaction record
        const transaction = await tx.pointTransaction.create({
          data: {
            userId: request.userId,
            amount: request.amount,
            transactionType: request.transactionType,
            reason: request.reason,
            referenceId: request.referenceId,
            referenceType: request.referenceType,
            adminId: request.adminId,
            metadata: request.metadata,
          },
        });

        // Update user balance and totals
        const updateData: any = {
          points: newBalance,
          updatedAt: new Date(),
        };

        if (request.amount > 0) {
          updateData.totalEarned = user.totalEarned + request.amount;
        } else {
          updateData.totalSpent = user.totalSpent + Math.abs(request.amount);
        }

        await tx.user.update({
          where: { id: request.userId },
          data: updateData,
        });

        return transaction;
      });

      // Clear user cache
      await RedisService.del(`user:profile:${request.userId}`);

      // Update leaderboard if points changed
      if (
        request.transactionType === 'earned' ||
        request.transactionType === 'admin_add'
      ) {
        await this.updateLeaderboardScore(request.userId);
      }

      logger.info(
        `Points transaction completed: ${request.userId} ${request.amount > 0 ? '+' : ''}${request.amount} (${request.reason})`
      );

      return {
        id: result.id,
        userId: result.userId,
        amount: result.amount,
        transactionType: result.transactionType as any,
        reason: result.reason,
        referenceId: result.referenceId || undefined,
        referenceType: result.referenceType || undefined,
        adminId: result.adminId || undefined,
        createdAt: result.createdAt,
        metadata: result.metadata,
      };
    } catch (error) {
      logger.error('Points transaction failed:', error);
      throw error;
    }
  }

  // Get user points balance
  static async getPointsBalance(userId: string): Promise<PointsBalance> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw createError.notFound('User not found');
      }

      // Get last transaction
      const lastTransaction = await prisma.pointTransaction.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return {
        userId: user.id,
        currentPoints: user.points,
        totalEarned: user.totalEarned,
        totalSpent: user.totalSpent,
        lastTransaction: lastTransaction
          ? {
              id: lastTransaction.id,
              userId: lastTransaction.userId,
              amount: lastTransaction.amount,
              transactionType: lastTransaction.transactionType as any,
              reason: lastTransaction.reason,
              referenceId: lastTransaction.referenceId || undefined,
              referenceType: lastTransaction.referenceType || undefined,
              adminId: lastTransaction.adminId || undefined,
              createdAt: lastTransaction.createdAt,
              metadata: lastTransaction.metadata,
            }
          : undefined,
      };
    } catch (error) {
      logger.error('Error getting points balance:', error);
      throw createError.internal('Failed to get points balance');
    }
  }

  // Get transaction history
  static async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    transactionType?: string
  ): Promise<{ transactions: PointTransaction[]; total: number }> {
    try {
      const where: any = { userId };

      if (transactionType) {
        where.transactionType = transactionType;
      }

      const [transactions, total] = await Promise.all([
        prisma.pointTransaction.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.pointTransaction.count({ where }),
      ]);

      return {
        transactions: transactions.map(t => ({
          id: t.id,
          userId: t.userId,
          amount: t.amount,
          transactionType: t.transactionType as any,
          reason: t.reason,
          referenceId: t.referenceId || undefined,
          referenceType: t.referenceType || undefined,
          adminId: t.adminId || undefined,
          createdAt: t.createdAt,
          metadata: t.metadata,
        })),
        total,
      };
    } catch (error) {
      logger.error('Error getting transaction history:', error);
      throw createError.internal('Failed to get transaction history');
    }
  }

  // Refund transaction
  static async refundTransaction(
    transactionId: string,
    reason: string,
    adminId: string
  ): Promise<PointTransaction> {
    try {
      const originalTransaction = await prisma.pointTransaction.findUnique({
        where: { id: transactionId },
      });

      if (!originalTransaction) {
        throw createError.notFound('Transaction not found');
      }

      // Create refund transaction (opposite amount)
      const refundAmount = -originalTransaction.amount;

      return await this.executePointsTransaction({
        userId: originalTransaction.userId,
        amount: refundAmount,
        reason: `Refund: ${reason}`,
        referenceId: transactionId,
        referenceType: 'refund',
        adminId,
        transactionType: 'refund',
        metadata: {
          originalTransactionId: transactionId,
          originalAmount: originalTransaction.amount,
          refundReason: reason,
        },
      });
    } catch (error) {
      logger.error('Error processing refund:', error);
      throw createError.internal('Failed to process refund');
    }
  }

  // Bulk points operation (for admin use)
  static async bulkPointsOperation(
    userIds: string[],
    amount: number,
    reason: string,
    adminId: string,
    operation: 'add' | 'subtract'
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      try {
        if (operation === 'add') {
          await this.addPoints({
            userId,
            amount,
            reason,
            adminId,
          });
        } else {
          await this.deductPoints({
            userId,
            amount,
            reason,
            adminId,
          });
        }
        successful++;
      } catch (error) {
        failed++;
        errors.push(
          `User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    logger.info(
      `Bulk points operation completed: ${successful} successful, ${failed} failed`
    );

    return { successful, failed, errors };
  }

  // Award viewing time points
  static async awardViewingPoints(
    userId: string,
    minutes: number,
    streamId?: string
  ): Promise<PointTransaction | null> {
    if (minutes < 1) {
      return null; // Minimum 1 minute to earn points
    }

    const pointsPerMinute = 1; // This could be configurable
    const totalPoints = minutes * pointsPerMinute;

    return await this.addPoints({
      userId,
      amount: totalPoints,
      reason: `Viewing time reward: ${minutes} minutes`,
      referenceId: streamId,
      referenceType: 'viewing_time',
      metadata: {
        minutes,
        pointsPerMinute,
        streamId,
      },
    });
  }

  // Award engagement bonus points
  static async awardEngagementBonus(
    userId: string,
    engagementType: string,
    multiplier: number = 1
  ): Promise<PointTransaction> {
    const basePoints = 10; // Base engagement points
    const bonusPoints = Math.floor(basePoints * multiplier);

    return await this.addPoints({
      userId,
      amount: bonusPoints,
      reason: `Engagement bonus: ${engagementType}`,
      referenceType: 'engagement',
      metadata: {
        engagementType,
        basePoints,
        multiplier,
      },
    });
  }

  // Update leaderboard score (helper method)
  private static async updateLeaderboardScore(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return;
      }

      // Update Redis leaderboard
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyKey = `leaderboard:daily:${today.toISOString().split('T')[0]}`;
      const weeklyKey = `leaderboard:weekly:${this.getWeekStart(today).toISOString().split('T')[0]}`;
      const monthlyKey = `leaderboard:monthly:${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
      const allTimeKey = 'leaderboard:all-time';

      await Promise.all([
        RedisService.addToLeaderboard(dailyKey, user.points, userId),
        RedisService.addToLeaderboard(weeklyKey, user.points, userId),
        RedisService.addToLeaderboard(monthlyKey, user.points, userId),
        RedisService.addToLeaderboard(allTimeKey, user.points, userId),
      ]);
    } catch (error) {
      logger.error('Error updating leaderboard score:', error);
      // Don't throw error as this is not critical
    }
  }

  // Helper method to get week start date
  private static getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  // Get points statistics
  static async getPointsStatistics(): Promise<{
    totalPointsInCirculation: number;
    totalPointsEarned: number;
    totalPointsSpent: number;
    averageUserBalance: number;
    topEarners: Array<{
      userId: string;
      displayName: string;
      totalEarned: number;
    }>;
  }> {
    try {
      const [stats, topEarners] = await Promise.all([
        prisma.user.aggregate({
          _sum: {
            points: true,
            totalEarned: true,
            totalSpent: true,
          },
          _avg: {
            points: true,
          },
        }),
        prisma.user.findMany({
          orderBy: { totalEarned: 'desc' },
          take: 10,
          select: {
            id: true,
            displayName: true,
            totalEarned: true,
          },
        }),
      ]);

      return {
        totalPointsInCirculation: stats._sum.points || 0,
        totalPointsEarned: stats._sum.totalEarned || 0,
        totalPointsSpent: stats._sum.totalSpent || 0,
        averageUserBalance: Math.round(stats._avg.points || 0),
        topEarners: topEarners.map(user => ({
          userId: user.id,
          displayName: user.displayName,
          totalEarned: user.totalEarned,
        })),
      };
    } catch (error) {
      logger.error('Error getting points statistics:', error);
      throw createError.internal('Failed to get points statistics');
    }
  }
}
