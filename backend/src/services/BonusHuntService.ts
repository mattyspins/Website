// @ts-nocheck
import { prisma } from '@/config/database';
import { RedisService } from '@/config/redis';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { PointsService } from '@/services/PointsService';

export interface BonusHuntSession {
  id: string;
  userId: string;
  sessionName?: string;
  startingBalance: number;
  currentBalance: number;
  targetBalance?: number;
  status: 'active' | 'completed' | 'abandoned';
  startedAt: Date;
  endedAt?: Date;
  totalBonuses: number;
  totalSpent: number;
  totalWon: number;
  profitLoss?: number;
}

export interface BonusBuy {
  id: string;
  sessionId: string;
  gameName: string;
  buyAmount: number;
  payout: number;
  multiplier: number;
  purchasedAt: Date;
  metadata?: any;
}

export interface BonusHuntPrediction {
  id: string;
  sessionId: string;
  userId: string;
  predictedBalance: number;
  pointsWagered: number;
  createdAt: Date;
  resolvedAt?: Date;
  won?: boolean;
  pointsWon: number;
}

export interface CreateSessionRequest {
  userId: string;
  sessionName?: string;
  startingBalance: number;
  targetBalance?: number;
}

export interface AddBonusBuyRequest {
  sessionId: string;
  gameName: string;
  buyAmount: number;
  payout: number;
  metadata?: any;
}

export interface CreatePredictionRequest {
  sessionId: string;
  userId: string;
  predictedBalance: number;
  pointsWagered: number;
}

export class BonusHuntService {
  // Create new bonus hunt session
  static async createSession(
    request: CreateSessionRequest
  ): Promise<BonusHuntSession> {
    const { userId, sessionName, startingBalance, targetBalance } = request;

    if (startingBalance <= 0) {
      throw createError.badRequest('Starting balance must be positive');
    }

    if (targetBalance && targetBalance <= startingBalance) {
      throw createError.badRequest(
        'Target balance must be greater than starting balance'
      );
    }

    try {
      const session = await prisma.bonusHuntSession.create({
        data: {
          userId,
          sessionName,
          startingBalance,
          currentBalance: startingBalance,
          targetBalance,
          status: 'active',
        },
      });

      logger.info(
        `Bonus hunt session created: ${session.id} by user ${userId}`
      );

      return this.mapSessionToInterface(session);
    } catch (error) {
      logger.error('Error creating bonus hunt session:', error);
      throw createError.internal('Failed to create bonus hunt session');
    }
  }

  // Get session by ID
  static async getSession(sessionId: string): Promise<BonusHuntSession | null> {
    try {
      const session = await prisma.bonusHuntSession.findUnique({
        where: { id: sessionId },
        include: {
          bonusBuys: true,
        },
      });

      if (!session) {
        return null;
      }

      return this.mapSessionToInterface(session);
    } catch (error) {
      logger.error('Error getting bonus hunt session:', error);
      throw createError.internal('Failed to get bonus hunt session');
    }
  }

  // Get user sessions
  static async getUserSessions(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ sessions: BonusHuntSession[]; total: number }> {
    try {
      const [sessions, total] = await Promise.all([
        prisma.bonusHuntSession.findMany({
          where: { userId },
          orderBy: { startedAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.bonusHuntSession.count({
          where: { userId },
        }),
      ]);

      return {
        sessions: sessions.map(s => this.mapSessionToInterface(s)),
        total,
      };
    } catch (error) {
      logger.error('Error getting user sessions:', error);
      throw createError.internal('Failed to get user sessions');
    }
  }

  // Add bonus buy to session
  static async addBonusBuy(request: AddBonusBuyRequest): Promise<BonusBuy> {
    const { sessionId, gameName, buyAmount, payout, metadata } = request;

    if (buyAmount <= 0) {
      throw createError.badRequest('Buy amount must be positive');
    }

    if (payout < 0) {
      throw createError.badRequest('Payout cannot be negative');
    }

    try {
      const result = await prisma.$transaction(async tx => {
        // Get session
        const session = await tx.bonusHuntSession.findUnique({
          where: { id: sessionId },
        });

        if (!session) {
          throw createError.notFound('Bonus hunt session not found');
        }

        if (session.status !== 'active') {
          throw createError.badRequest('Session is not active');
        }

        // Calculate multiplier
        const multiplier = buyAmount > 0 ? payout / buyAmount : 0;

        // Create bonus buy
        const bonusBuy = await tx.bonusBuy.create({
          data: {
            sessionId,
            gameName,
            buyAmount,
            payout,
            multiplier,
            metadata,
          },
        });

        // Update session statistics
        const newCurrentBalance =
          parseFloat(session.currentBalance.toString()) - buyAmount + payout;
        const newTotalSpent =
          parseFloat(session.totalSpent.toString()) + buyAmount;
        const newTotalWon = parseFloat(session.totalWon.toString()) + payout;

        await tx.bonusHuntSession.update({
          where: { id: sessionId },
          data: {
            currentBalance: newCurrentBalance,
            totalBonuses: { increment: 1 },
            totalSpent: newTotalSpent,
            totalWon: newTotalWon,
          },
        });

        return bonusBuy;
      });

      // Clear cache
      await this.clearSessionCache(sessionId);

      logger.info(
        `Bonus buy added to session ${sessionId}: ${gameName} - ${buyAmount} -> ${payout}`
      );

      return {
        id: result.id,
        sessionId: result.sessionId,
        gameName: result.gameName,
        buyAmount: parseFloat(result.buyAmount.toString()),
        payout: parseFloat(result.payout.toString()),
        multiplier: parseFloat(result.multiplier.toString()),
        purchasedAt: result.purchasedAt,
        metadata: result.metadata,
      };
    } catch (error) {
      logger.error('Error adding bonus buy:', error);
      throw error;
    }
  }

  // Get session bonus buys
  static async getSessionBonusBuys(sessionId: string): Promise<BonusBuy[]> {
    try {
      const bonusBuys = await prisma.bonusBuy.findMany({
        where: { sessionId },
        orderBy: { purchasedAt: 'asc' },
      });

      return bonusBuys.map(bb => ({
        id: bb.id,
        sessionId: bb.sessionId,
        gameName: bb.gameName,
        buyAmount: parseFloat(bb.buyAmount.toString()),
        payout: parseFloat(bb.payout.toString()),
        multiplier: parseFloat(bb.multiplier.toString()),
        purchasedAt: bb.purchasedAt,
        metadata: bb.metadata,
      }));
    } catch (error) {
      logger.error('Error getting session bonus buys:', error);
      throw createError.internal('Failed to get session bonus buys');
    }
  }

  // Complete session
  static async completeSession(
    sessionId: string,
    userId: string
  ): Promise<BonusHuntSession> {
    try {
      const result = await prisma.$transaction(async tx => {
        // Get session
        const session = await tx.bonusHuntSession.findUnique({
          where: { id: sessionId },
          include: {
            predictions: true,
          },
        });

        if (!session) {
          throw createError.notFound('Bonus hunt session not found');
        }

        if (session.userId !== userId) {
          throw createError.forbidden(
            'Not authorized to complete this session'
          );
        }

        if (session.status !== 'active') {
          throw createError.badRequest('Session is not active');
        }

        // Update session status
        const updatedSession = await tx.bonusHuntSession.update({
          where: { id: sessionId },
          data: {
            status: 'completed',
            endedAt: new Date(),
          },
        });

        // Resolve predictions
        await this.resolvePredictions(
          tx,
          sessionId,
          parseFloat(session.currentBalance.toString())
        );

        return updatedSession;
      });

      // Clear cache
      await this.clearSessionCache(sessionId);

      logger.info(`Bonus hunt session completed: ${sessionId}`);

      return this.mapSessionToInterface(result);
    } catch (error) {
      logger.error('Error completing session:', error);
      throw error;
    }
  }

  // Abandon session
  static async abandonSession(
    sessionId: string,
    userId: string
  ): Promise<BonusHuntSession> {
    try {
      const session = await prisma.bonusHuntSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw createError.notFound('Bonus hunt session not found');
      }

      if (session.userId !== userId) {
        throw createError.forbidden('Not authorized to abandon this session');
      }

      if (session.status !== 'active') {
        throw createError.badRequest('Session is not active');
      }

      const updatedSession = await prisma.bonusHuntSession.update({
        where: { id: sessionId },
        data: {
          status: 'abandoned',
          endedAt: new Date(),
        },
      });

      // Clear cache
      await this.clearSessionCache(sessionId);

      logger.info(`Bonus hunt session abandoned: ${sessionId}`);

      return this.mapSessionToInterface(updatedSession);
    } catch (error) {
      logger.error('Error abandoning session:', error);
      throw createError.internal('Failed to abandon session');
    }
  }

  // Create prediction
  static async createPrediction(
    request: CreatePredictionRequest
  ): Promise<BonusHuntPrediction> {
    const { sessionId, userId, predictedBalance, pointsWagered } = request;

    if (pointsWagered <= 0) {
      throw createError.badRequest('Points wagered must be positive');
    }

    if (pointsWagered > 1000) {
      throw createError.badRequest('Maximum 1000 points per prediction');
    }

    try {
      const result = await prisma.$transaction(async tx => {
        // Get session
        const session = await tx.bonusHuntSession.findUnique({
          where: { id: sessionId },
        });

        if (!session) {
          throw createError.notFound('Bonus hunt session not found');
        }

        if (session.status !== 'active') {
          throw createError.badRequest('Session is not active');
        }

        // Get user
        const user = await tx.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw createError.notFound('User not found');
        }

        if (user.points < pointsWagered) {
          throw createError.badRequest('Insufficient points');
        }

        // Check if user already has a prediction for this session
        const existingPrediction = await tx.bonusHuntPrediction.findUnique({
          where: {
            sessionId_userId: {
              sessionId,
              userId,
            },
          },
        });

        if (existingPrediction) {
          throw createError.badRequest(
            'User already has a prediction for this session'
          );
        }

        // Deduct points
        await tx.user.update({
          where: { id: userId },
          data: {
            points: { decrement: pointsWagered },
          },
        });

        // Create point transaction
        await tx.pointTransaction.create({
          data: {
            userId,
            amount: -pointsWagered,
            transactionType: 'spent',
            reason: 'Bonus hunt prediction wager',
            referenceId: sessionId,
            referenceType: 'prediction',
            metadata: {
              sessionId,
              predictedBalance,
            },
          },
        });

        // Create prediction
        const prediction = await tx.bonusHuntPrediction.create({
          data: {
            sessionId,
            userId,
            predictedBalance,
            pointsWagered,
          },
        });

        return prediction;
      });

      logger.info(
        `Prediction created: ${userId} -> ${predictedBalance} for session ${sessionId}`
      );

      return {
        id: result.id,
        sessionId: result.sessionId,
        userId: result.userId,
        predictedBalance: parseFloat(result.predictedBalance.toString()),
        pointsWagered: result.pointsWagered,
        createdAt: result.createdAt,
        resolvedAt: result.resolvedAt || undefined,
        won: result.won || undefined,
        pointsWon: result.pointsWon,
      };
    } catch (error) {
      logger.error('Error creating prediction:', error);
      throw error;
    }
  }

  // Get session predictions
  static async getSessionPredictions(
    sessionId: string
  ): Promise<BonusHuntPrediction[]> {
    try {
      const predictions = await prisma.bonusHuntPrediction.findMany({
        where: { sessionId },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return predictions.map(p => ({
        id: p.id,
        sessionId: p.sessionId,
        userId: p.userId,
        predictedBalance: parseFloat(p.predictedBalance.toString()),
        pointsWagered: p.pointsWagered,
        createdAt: p.createdAt,
        resolvedAt: p.resolvedAt || undefined,
        won: p.won || undefined,
        pointsWon: p.pointsWon,
      }));
    } catch (error) {
      logger.error('Error getting session predictions:', error);
      throw createError.internal('Failed to get session predictions');
    }
  }

  // Get user statistics
  static async getUserStatistics(userId: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    totalProfit: number;
    totalBonusBuys: number;
    averageMultiplier: number;
    winRate: number;
  }> {
    try {
      const sessions = await prisma.bonusHuntSession.findMany({
        where: { userId },
        include: {
          bonusBuys: true,
        },
      });

      const totalSessions = sessions.length;
      const activeSessions = sessions.filter(s => s.status === 'active').length;
      const completedSessions = sessions.filter(
        s => s.status === 'completed'
      ).length;

      let totalProfit = 0;
      let totalBonusBuys = 0;
      let totalMultiplier = 0;
      let winningBuys = 0;

      for (const session of sessions) {
        const profit =
          parseFloat(session.currentBalance.toString()) -
          parseFloat(session.startingBalance.toString());
        totalProfit += profit;

        for (const buy of session.bonusBuys) {
          totalBonusBuys++;
          totalMultiplier += parseFloat(buy.multiplier.toString());
          if (
            parseFloat(buy.payout.toString()) >
            parseFloat(buy.buyAmount.toString())
          ) {
            winningBuys++;
          }
        }
      }

      const averageMultiplier =
        totalBonusBuys > 0 ? totalMultiplier / totalBonusBuys : 0;
      const winRate = totalBonusBuys > 0 ? winningBuys / totalBonusBuys : 0;

      return {
        totalSessions,
        activeSessions,
        completedSessions,
        totalProfit: Math.round(totalProfit * 100) / 100,
        totalBonusBuys,
        averageMultiplier: Math.round(averageMultiplier * 100) / 100,
        winRate: Math.round(winRate * 100) / 100,
      };
    } catch (error) {
      logger.error('Error getting user statistics:', error);
      throw createError.internal('Failed to get user statistics');
    }
  }

  // Private helper methods

  private static async resolvePredictions(
    tx: any,
    sessionId: string,
    finalBalance: number
  ): Promise<void> {
    const predictions = await tx.bonusHuntPrediction.findMany({
      where: {
        sessionId,
        resolvedAt: null,
      },
    });

    for (const prediction of predictions) {
      const predictedBalance = parseFloat(
        prediction.predictedBalance.toString()
      );
      const difference = Math.abs(finalBalance - predictedBalance);
      const percentageError = (difference / finalBalance) * 100;

      // Award points based on accuracy
      // Within 5%: 3x wager
      // Within 10%: 2x wager
      // Within 20%: 1x wager
      // Otherwise: 0
      let pointsWon = 0;
      let won = false;

      if (percentageError <= 5) {
        pointsWon = prediction.pointsWagered * 3;
        won = true;
      } else if (percentageError <= 10) {
        pointsWon = prediction.pointsWagered * 2;
        won = true;
      } else if (percentageError <= 20) {
        pointsWon = prediction.pointsWagered;
        won = true;
      }

      // Update prediction
      await tx.bonusHuntPrediction.update({
        where: { id: prediction.id },
        data: {
          resolvedAt: new Date(),
          won,
          pointsWon,
        },
      });

      // Award points if won
      if (pointsWon > 0) {
        await tx.user.update({
          where: { id: prediction.userId },
          data: {
            points: { increment: pointsWon },
          },
        });

        // Create point transaction
        await tx.pointTransaction.create({
          data: {
            userId: prediction.userId,
            amount: pointsWon,
            transactionType: 'earned',
            reason: 'Bonus hunt prediction win',
            referenceId: sessionId,
            referenceType: 'prediction_win',
            metadata: {
              sessionId,
              predictedBalance,
              finalBalance,
              accuracy: 100 - percentageError,
            },
          },
        });

        logger.info(
          `Prediction resolved: ${prediction.userId} won ${pointsWon} points`
        );
      }
    }
  }

  private static mapSessionToInterface(session: any): BonusHuntSession {
    const profitLoss =
      parseFloat(session.currentBalance.toString()) -
      parseFloat(session.startingBalance.toString());

    return {
      id: session.id,
      userId: session.userId,
      sessionName: session.sessionName || undefined,
      startingBalance: parseFloat(session.startingBalance.toString()),
      currentBalance: parseFloat(session.currentBalance.toString()),
      targetBalance: session.targetBalance
        ? parseFloat(session.targetBalance.toString())
        : undefined,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt || undefined,
      totalBonuses: session.totalBonuses,
      totalSpent: parseFloat(session.totalSpent.toString()),
      totalWon: parseFloat(session.totalWon.toString()),
      profitLoss: Math.round(profitLoss * 100) / 100,
    };
  }

  private static async clearSessionCache(sessionId: string): Promise<void> {
    try {
      await RedisService.del(`bonus_hunt:session:${sessionId}`);
    } catch (error) {
      logger.error('Error clearing session cache:', error);
    }
  }
}
