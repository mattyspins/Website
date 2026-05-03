// @ts-nocheck
import { prisma } from '@/config/database';
import { RedisService } from '@/config/redis';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { PointsService } from '@/services/PointsService';
import { StatisticsService } from '@/services/StatisticsService';
import crypto from 'crypto';

export interface RaffleConfig {
  title: string;
  description?: string;
  prize: string;
  ticketPrice: number;
  maxTickets: number;
  maxEntriesPerUser?: number; // -1 for unlimited
  numberOfWinners?: number;
  endDate: Date;
  category?: string;
  featured?: boolean;
  createdBy: string;
  metadata?: any;
}

export interface Raffle {
  id: string;
  title: string;
  description?: string;
  prize: string;
  ticketPrice: number;
  maxTickets: number;
  maxEntriesPerUser: number;
  numberOfWinners: number;
  ticketsSold: number;
  status: 'active' | 'ended' | 'cancelled';
  category?: string;
  isFeatured: boolean;
  createdBy: string;
  createdAt: Date;
  endsAt: Date;
  winnerSelectedAt?: Date;
  metadata?: any;
}

export interface RaffleTicket {
  id: string;
  raffleId: string;
  userId: string;
  ticketNumber: number;
  purchasedAt: Date;
}

export interface RaffleWinner {
  id: string;
  raffleId: string;
  userId: string;
  ticketId?: string;
  position: number;
  prizeDescription?: string;
  selectedAt: Date;
  notifiedAt?: Date;
  prizeDeliveredAt?: Date;
  deliveryMethod?: string;
}

export interface TicketPurchase {
  success: boolean;
  tickets: RaffleTicket[];
  totalCost: number;
  remainingBalance: number;
  transaction?: any;
}

export class RaffleService {
  // Create new raffle
  static async createRaffle(config: RaffleConfig): Promise<Raffle> {
    try {
      // Validate config
      if (config.ticketPrice <= 0) {
        throw createError.badRequest('Ticket price must be positive');
      }

      if (config.maxTickets <= 0) {
        throw createError.badRequest('Max tickets must be positive');
      }

      if (config.endDate <= new Date()) {
        throw createError.badRequest('End date must be in the future');
      }

      const raffle = await prisma.raffle.create({
        data: {
          title: config.title,
          description: config.description,
          prize: config.prize,
          ticketPrice: config.ticketPrice,
          maxTickets: config.maxTickets,
          maxEntriesPerUser: config.maxEntriesPerUser ?? -1,
          numberOfWinners: config.numberOfWinners || 1,
          category: config.category,
          isFeatured: config.featured || false,
          createdBy: config.createdBy,
          endsAt: config.endDate,
          metadata: config.metadata,
        },
      });

      // Cache active raffle
      await this.cacheActiveRaffle(raffle);

      logger.info(`Raffle created: ${raffle.title} (${raffle.id})`);

      return {
        id: raffle.id,
        title: raffle.title,
        description: raffle.description || undefined,
        prize: raffle.prize,
        ticketPrice: raffle.ticketPrice,
        maxTickets: raffle.maxTickets,
        maxEntriesPerUser: raffle.maxEntriesPerUser,
        numberOfWinners: raffle.numberOfWinners,
        ticketsSold: raffle.ticketsSold,
        status: raffle.status as any,
        category: raffle.category || undefined,
        isFeatured: raffle.isFeatured,
        createdBy: raffle.createdBy || '',
        createdAt: raffle.createdAt,
        endsAt: raffle.endsAt,
        winnerSelectedAt: raffle.winnerSelectedAt || undefined,
        metadata: raffle.metadata,
      };
    } catch (error) {
      logger.error('Error creating raffle:', error);
      throw createError.internal('Failed to create raffle');
    }
  }

  // Get active raffles
  static async getActiveRaffles(featured?: boolean): Promise<Raffle[]> {
    try {
      const cacheKey = featured ? 'raffles:featured' : 'raffles:active';

      // Try cache first
      const cached = await RedisService.getJSON<Raffle[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const where: any = {
        status: 'active',
        endsAt: { gt: new Date() },
      };

      if (featured !== undefined) {
        where.isFeatured = featured;
      }

      const raffles = await prisma.raffle.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        include: {
          creator: {
            select: {
              displayName: true,
            },
          },
        },
      });

      const result = raffles.map(raffle => ({
        id: raffle.id,
        title: raffle.title,
        description: raffle.description || undefined,
        prize: raffle.prize,
        ticketPrice: raffle.ticketPrice,
        maxTickets: raffle.maxTickets,
        maxEntriesPerUser: raffle.maxEntriesPerUser,
        numberOfWinners: raffle.numberOfWinners,
        ticketsSold: raffle.ticketsSold,
        status: raffle.status as any,
        category: raffle.category || undefined,
        isFeatured: raffle.isFeatured,
        createdBy: raffle.createdBy || '',
        createdAt: raffle.createdAt,
        endsAt: raffle.endsAt,
        winnerSelectedAt: raffle.winnerSelectedAt || undefined,
        metadata: raffle.metadata,
      }));

      // Cache for 5 minutes
      await RedisService.setJSON(cacheKey, result, 300);

      return result;
    } catch (error) {
      logger.error('Error getting active raffles:', error);
      throw createError.internal('Failed to get active raffles');
    }
  }

  // Get raffle details
  static async getRaffleDetails(raffleId: string): Promise<Raffle | null> {
    try {
      const cacheKey = `raffle:${raffleId}`;

      // Try cache first
      const cached = await RedisService.getJSON<Raffle>(cacheKey);
      if (cached) {
        return cached;
      }

      const raffle = await prisma.raffle.findUnique({
        where: { id: raffleId },
        include: {
          creator: {
            select: {
              displayName: true,
            },
          },
        },
      });

      if (!raffle) {
        return null;
      }

      const result = {
        id: raffle.id,
        title: raffle.title,
        description: raffle.description || undefined,
        prize: raffle.prize,
        ticketPrice: raffle.ticketPrice,
        maxTickets: raffle.maxTickets,
        maxEntriesPerUser: raffle.maxEntriesPerUser,
        numberOfWinners: raffle.numberOfWinners,
        ticketsSold: raffle.ticketsSold,
        status: raffle.status as any,
        category: raffle.category || undefined,
        isFeatured: raffle.isFeatured,
        createdBy: raffle.createdBy || '',
        createdAt: raffle.createdAt,
        endsAt: raffle.endsAt,
        winnerSelectedAt: raffle.winnerSelectedAt || undefined,
        metadata: raffle.metadata,
      };

      // Cache for 10 minutes
      await RedisService.setJSON(cacheKey, result, 600);

      return result;
    } catch (error) {
      logger.error('Error getting raffle details:', error);
      throw createError.internal('Failed to get raffle details');
    }
  }

  // Purchase tickets
  static async purchaseTickets(
    raffleId: string,
    userId: string,
    quantity: number
  ): Promise<TicketPurchase> {
    if (quantity <= 0) {
      throw createError.badRequest('Quantity must be positive');
    }

    try {
      const result = await prisma.$transaction(async tx => {
        // Get raffle details
        const raffle = await tx.raffle.findUnique({
          where: { id: raffleId },
        });

        if (!raffle) {
          throw createError.notFound('Raffle not found');
        }

        if (raffle.status !== 'active') {
          throw createError.badRequest('Raffle is not active');
        }

        if (raffle.endsAt <= new Date()) {
          throw createError.badRequest('Raffle has ended');
        }

        // Check per-user entry limit
        if (raffle.maxEntriesPerUser !== -1) {
          const userTicketCount = await tx.raffleTicket.count({
            where: {
              raffleId,
              userId,
            },
          });

          const remainingEntries = raffle.maxEntriesPerUser - userTicketCount;

          if (remainingEntries <= 0) {
            throw createError.badRequest(
              `You have reached the maximum of ${raffle.maxEntriesPerUser} entries for this raffle`
            );
          }

          if (quantity > remainingEntries) {
            throw createError.badRequest(
              `You can only purchase ${remainingEntries} more ticket(s) for this raffle`
            );
          }
        }

        // Check ticket availability
        const availableTickets = raffle.maxTickets - raffle.ticketsSold;
        if (quantity > availableTickets) {
          throw createError.badRequest(
            `Only ${availableTickets} tickets available`
          );
        }

        // Check user balance
        const user = await tx.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw createError.notFound('User not found');
        }

        const totalCost = quantity * raffle.ticketPrice;
        if (user.points < totalCost) {
          throw createError.badRequest('Insufficient points');
        }

        // Create tickets
        const tickets: RaffleTicket[] = [];
        for (let i = 0; i < quantity; i++) {
          const ticketNumber = raffle.ticketsSold + i + 1;

          const ticket = await tx.raffleTicket.create({
            data: {
              raffleId,
              userId,
              ticketNumber,
            },
          });

          tickets.push({
            id: ticket.id,
            raffleId: ticket.raffleId,
            userId: ticket.userId,
            ticketNumber: ticket.ticketNumber,
            purchasedAt: ticket.purchasedAt,
          });
        }

        // Update raffle ticket count
        await tx.raffle.update({
          where: { id: raffleId },
          data: {
            ticketsSold: { increment: quantity },
          },
        });

        // Deduct points from user
        await tx.user.update({
          where: { id: userId },
          data: {
            points: { decrement: totalCost },
            totalSpent: { increment: totalCost },
          },
        });

        // Create point transaction
        const transaction = await tx.pointTransaction.create({
          data: {
            userId,
            amount: -totalCost,
            transactionType: 'spent',
            reason: `Raffle tickets: ${raffle.title}`,
            referenceId: raffleId,
            referenceType: 'raffle_ticket',
            metadata: {
              raffleId,
              ticketCount: quantity,
              ticketPrice: raffle.ticketPrice,
            },
          },
        });

        return {
          tickets,
          totalCost,
          remainingBalance: user.points - totalCost,
          transaction,
        };
      });

      // Update statistics
      await StatisticsService.updateRaffleStats(userId, quantity);

      // Clear caches
      await this.clearRaffleCaches(raffleId);

      logger.info(
        `Tickets purchased: ${userId} -> ${quantity} tickets for raffle ${raffleId}`
      );

      return {
        success: true,
        tickets: result.tickets,
        totalCost: result.totalCost,
        remainingBalance: result.remainingBalance,
        transaction: result.transaction,
      };
    } catch (error) {
      logger.error('Error purchasing tickets:', error);
      throw error;
    }
  }

  // Get user tickets for a raffle
  static async getUserTickets(
    raffleId: string,
    userId: string
  ): Promise<RaffleTicket[]> {
    try {
      const tickets = await prisma.raffleTicket.findMany({
        where: {
          raffleId,
          userId,
        },
        orderBy: { ticketNumber: 'asc' },
      });

      return tickets.map(ticket => ({
        id: ticket.id,
        raffleId: ticket.raffleId,
        userId: ticket.userId,
        ticketNumber: ticket.ticketNumber,
        purchasedAt: ticket.purchasedAt,
      }));
    } catch (error) {
      logger.error('Error getting user tickets:', error);
      throw createError.internal('Failed to get user tickets');
    }
  }

  // Select winners (uses raffle's numberOfWinners if not specified)
  static async selectWinners(
    raffleId: string,
    winnerCount?: number
  ): Promise<RaffleWinner[]> {
    try {
      const result = await prisma.$transaction(async tx => {
        // Get raffle details
        const raffle = await tx.raffle.findUnique({
          where: { id: raffleId },
          include: {
            tickets: true,
          },
        });

        if (!raffle) {
          throw createError.notFound('Raffle not found');
        }

        if (raffle.status !== 'active') {
          throw createError.badRequest('Raffle is not active');
        }

        if (raffle.tickets.length === 0) {
          throw createError.badRequest('No tickets sold for this raffle');
        }

        // Use provided winnerCount or raffle's numberOfWinners
        const actualWinnerCount = winnerCount || raffle.numberOfWinners;

        if (actualWinnerCount > raffle.tickets.length) {
          throw createError.badRequest(
            `Not enough tickets sold. Only ${raffle.tickets.length} ticket(s) available, but ${actualWinnerCount} winner(s) requested.`
          );
        }

        // Simple random selection algorithm using crypto.randomInt
        const winners: RaffleWinner[] = [];
        const availableTickets = [...raffle.tickets];

        for (let position = 1; position <= actualWinnerCount; position++) {
          // Use cryptographically secure random selection
          const randomIndex = crypto.randomInt(0, availableTickets.length);
          const winningTicket = availableTickets[randomIndex];

          // Remove selected ticket from available pool to prevent duplicates
          availableTickets.splice(randomIndex, 1);

          const winner = await tx.raffleWinner.create({
            data: {
              raffleId,
              userId: winningTicket.userId,
              ticketId: winningTicket.id,
              position,
              prizeDescription:
                position === 1
                  ? raffle.prize
                  : `${position}${this.getOrdinalSuffix(position)} Place`,
            },
          });

          winners.push({
            id: winner.id,
            raffleId: winner.raffleId,
            userId: winner.userId,
            ticketId: winner.ticketId || undefined,
            position: winner.position,
            prizeDescription: winner.prizeDescription || undefined,
            selectedAt: winner.selectedAt,
            notifiedAt: winner.notifiedAt || undefined,
            prizeDeliveredAt: winner.prizeDeliveredAt || undefined,
            deliveryMethod: winner.deliveryMethod || undefined,
          });
        }

        // Update raffle status
        await tx.raffle.update({
          where: { id: raffleId },
          data: {
            status: 'ended',
            winnerSelectedAt: new Date(),
          },
        });

        return winners;
      });

      // Update winner statistics
      for (const winner of result) {
        await StatisticsService.updateRaffleStats(winner.userId, 0, true);
      }

      // Clear caches
      await this.clearRaffleCaches(raffleId);

      logger.info(
        `Winners selected for raffle ${raffleId}: ${result.length} winners`
      );

      return result;
    } catch (error) {
      logger.error('Error selecting winners:', error);
      throw error;
    }
  }

  // Get raffle winners
  static async getRaffleWinners(raffleId: string): Promise<RaffleWinner[]> {
    try {
      const winners = await prisma.raffleWinner.findMany({
        where: { raffleId },
        include: {
          user: {
            select: {
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { position: 'asc' },
      });

      return winners.map(winner => ({
        id: winner.id,
        raffleId: winner.raffleId,
        userId: winner.userId,
        ticketId: winner.ticketId || undefined,
        position: winner.position,
        prizeDescription: winner.prizeDescription || undefined,
        selectedAt: winner.selectedAt,
        notifiedAt: winner.notifiedAt || undefined,
        prizeDeliveredAt: winner.prizeDeliveredAt || undefined,
        deliveryMethod: winner.deliveryMethod || undefined,
      }));
    } catch (error) {
      logger.error('Error getting raffle winners:', error);
      throw createError.internal('Failed to get raffle winners');
    }
  }

  // Cancel raffle (admin only)
  static async cancelRaffle(raffleId: string, reason: string): Promise<void> {
    try {
      await prisma.$transaction(async tx => {
        // Get raffle with tickets
        const raffle = await tx.raffle.findUnique({
          where: { id: raffleId },
          include: {
            tickets: {
              include: {
                user: true,
              },
            },
          },
        });

        if (!raffle) {
          throw createError.notFound('Raffle not found');
        }

        if (raffle.status !== 'active') {
          throw createError.badRequest('Can only cancel active raffles');
        }

        // Refund all ticket purchases
        for (const ticket of raffle.tickets) {
          const refundAmount = raffle.ticketPrice;

          // Add points back to user
          await tx.user.update({
            where: { id: ticket.userId },
            data: {
              points: { increment: refundAmount },
              totalSpent: { decrement: refundAmount },
            },
          });

          // Create refund transaction
          await tx.pointTransaction.create({
            data: {
              userId: ticket.userId,
              amount: refundAmount,
              transactionType: 'refund',
              reason: `Raffle cancelled: ${raffle.title}`,
              referenceId: raffleId,
              referenceType: 'raffle_refund',
              metadata: {
                originalRaffleId: raffleId,
                ticketId: ticket.id,
                cancellationReason: reason,
              },
            },
          });
        }

        // Update raffle status
        await tx.raffle.update({
          where: { id: raffleId },
          data: {
            status: 'cancelled',
            metadata: {
              ...raffle.metadata,
              cancellationReason: reason,
              cancelledAt: new Date(),
            },
          },
        });
      });

      // Clear caches
      await this.clearRaffleCaches(raffleId);

      logger.info(`Raffle cancelled: ${raffleId} - ${reason}`);
    } catch (error) {
      logger.error('Error cancelling raffle:', error);
      throw createError.internal('Failed to cancel raffle');
    }
  }

  // Private helper methods

  private static async cacheActiveRaffle(raffle: any): Promise<void> {
    try {
      const cacheKey = `raffle:${raffle.id}`;
      await RedisService.setJSON(cacheKey, raffle, 600); // 10 minutes

      // Clear active raffles cache
      await RedisService.del('raffles:active');
      await RedisService.del('raffles:featured');
    } catch (error) {
      logger.error('Error caching raffle:', error);
    }
  }

  private static async clearRaffleCaches(raffleId: string): Promise<void> {
    try {
      await Promise.all([
        RedisService.del(`raffle:${raffleId}`),
        RedisService.del('raffles:active'),
        RedisService.del('raffles:featured'),
      ]);
    } catch (error) {
      logger.error('Error clearing raffle caches:', error);
    }
  }

  private static getOrdinalSuffix(num: number): string {
    const j = num % 10;
    const k = num % 100;

    if (j === 1 && k !== 11) {
      return 'st';
    }
    if (j === 2 && k !== 12) {
      return 'nd';
    }
    if (j === 3 && k !== 13) {
      return 'rd';
    }
    return 'th';
  }

  // Get raffle statistics
  static async getRaffleStatistics(): Promise<{
    totalRaffles: number;
    activeRaffles: number;
    totalTicketsSold: number;
    totalPrizeValue: number;
    averageTicketPrice: number;
  }> {
    try {
      const [totalRaffles, activeRaffles, ticketStats] = await Promise.all([
        prisma.raffle.count(),
        prisma.raffle.count({
          where: {
            status: 'active',
            endsAt: { gt: new Date() },
          },
        }),
        prisma.raffle.aggregate({
          _sum: {
            ticketsSold: true,
            ticketPrice: true,
          },
          _avg: {
            ticketPrice: true,
          },
        }),
      ]);

      return {
        totalRaffles,
        activeRaffles,
        totalTicketsSold: ticketStats._sum.ticketsSold || 0,
        totalPrizeValue: 0, // Would need to calculate from prize descriptions
        averageTicketPrice: Math.round(ticketStats._avg.ticketPrice || 0),
      };
    } catch (error) {
      logger.error('Error getting raffle statistics:', error);
      throw createError.internal('Failed to get raffle statistics');
    }
  }
}
