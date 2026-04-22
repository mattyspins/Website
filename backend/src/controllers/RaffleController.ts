import { Request, Response } from 'express';
import { RaffleService, RaffleConfig } from '@/services/RaffleService';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { logger } from '@/utils/logger';

export class RaffleController {
  // Get active raffles
  static getActiveRaffles = asyncHandler(
    async (req: Request, res: Response) => {
      const { featured } = req.query;

      try {
        const featuredFilter =
          featured === 'true' ? true : featured === 'false' ? false : undefined;
        const raffles = await RaffleService.getActiveRaffles(featuredFilter);

        res.json({
          success: true,
          data: {
            raffles,
            total: raffles.length,
            featured: featuredFilter,
          },
        });
      } catch (error) {
        logger.error('Error getting active raffles:', error);
        throw createError.internal('Failed to get active raffles');
      }
    }
  );

  // Get raffle details
  static getRaffleDetails = asyncHandler(
    async (req: Request, res: Response) => {
      const { raffleId } = req.params;

      if (!raffleId) {
        throw createError.badRequest('Raffle ID is required');
      }

      try {
        const raffle = await RaffleService.getRaffleDetails(raffleId);

        if (!raffle) {
          throw createError.notFound('Raffle not found');
        }

        res.json({
          success: true,
          data: { raffle },
        });
      } catch (error) {
        logger.error('Error getting raffle details:', error);
        throw createError.internal('Failed to get raffle details');
      }
    }
  );

  // Purchase raffle tickets
  static purchaseTickets = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { raffleId } = req.params;
      const { quantity = 1 } = req.body;

      if (!raffleId) {
        throw createError.badRequest('Raffle ID is required');
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw createError.badRequest('Quantity must be a positive integer');
      }

      try {
        const result = await RaffleService.purchaseTickets(
          raffleId,
          req.user.id,
          quantity
        );

        logger.info(
          `Tickets purchased: ${req.user.id} -> ${quantity} tickets for raffle ${raffleId}`
        );

        res.json({
          success: true,
          message: `Successfully purchased ${quantity} ticket${quantity > 1 ? 's' : ''}`,
          data: {
            tickets: result.tickets,
            totalCost: result.totalCost,
            remainingBalance: result.remainingBalance,
            transaction: result.transaction
              ? {
                  id: result.transaction.id,
                  amount: result.transaction.amount,
                  reason: result.transaction.reason,
                }
              : null,
          },
        });
      } catch (error) {
        logger.error('Error purchasing tickets:', error);
        throw error; // Re-throw to preserve specific error messages
      }
    }
  );

  // Get user's tickets for a raffle
  static getUserTickets = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { raffleId } = req.params;
      const { userId } = req.query;

      if (!raffleId) {
        throw createError.badRequest('Raffle ID is required');
      }

      // Check if user can access these tickets
      const targetUserId = (userId as string) || req.user.id;
      if (targetUserId !== req.user.id && !req.user.isAdmin) {
        throw createError.forbidden('Cannot access other user tickets');
      }

      try {
        const tickets = await RaffleService.getUserTickets(
          raffleId,
          targetUserId
        );

        res.json({
          success: true,
          data: {
            raffleId,
            userId: targetUserId,
            tickets,
            totalTickets: tickets.length,
          },
        });
      } catch (error) {
        logger.error('Error getting user tickets:', error);
        throw createError.internal('Failed to get user tickets');
      }
    }
  );

  // Get raffle winners
  static getRaffleWinners = asyncHandler(
    async (req: Request, res: Response) => {
      const { raffleId } = req.params;

      if (!raffleId) {
        throw createError.badRequest('Raffle ID is required');
      }

      try {
        const winners = await RaffleService.getRaffleWinners(raffleId);

        res.json({
          success: true,
          data: {
            raffleId,
            winners,
            totalWinners: winners.length,
          },
        });
      } catch (error) {
        logger.error('Error getting raffle winners:', error);
        throw createError.internal('Failed to get raffle winners');
      }
    }
  );

  // Get raffle statistics
  static getRaffleStats = asyncHandler(async (req: Request, res: Response) => {
    try {
      const stats = await RaffleService.getRaffleStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error getting raffle statistics:', error);
      throw createError.internal('Failed to get raffle statistics');
    }
  });

  // Admin: Create raffle
  static createRaffle = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const {
        title,
        description,
        prize,
        ticketPrice,
        maxTickets,
        maxEntriesPerUser = -1,
        numberOfWinners = 1,
        endDate,
        category,
        featured = false,
        metadata,
      } = req.body;

      if (!title || !prize || !ticketPrice || !maxTickets || !endDate) {
        throw createError.badRequest(
          'Title, prize, ticketPrice, maxTickets, and endDate are required'
        );
      }

      try {
        const config: RaffleConfig = {
          title,
          description,
          prize,
          ticketPrice: parseInt(ticketPrice),
          maxTickets: parseInt(maxTickets),
          maxEntriesPerUser: parseInt(maxEntriesPerUser),
          numberOfWinners: parseInt(numberOfWinners),
          endDate: new Date(endDate),
          category,
          featured: Boolean(featured),
          createdBy: req.user.id,
          metadata,
        };

        const raffle = await RaffleService.createRaffle(config);

        logger.info(`Raffle created by admin ${req.user.id}: ${raffle.title}`);

        res.status(201).json({
          success: true,
          message: 'Raffle created successfully',
          data: { raffle },
        });
      } catch (error) {
        logger.error('Error creating raffle:', error);
        throw createError.internal('Failed to create raffle');
      }
    }
  );

  // Admin: Select winners
  static selectWinners = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { raffleId } = req.params;
      const { winnerCount } = req.body;

      if (!raffleId) {
        throw createError.badRequest('Raffle ID is required');
      }

      // winnerCount is optional - will use raffle's numberOfWinners if not provided
      if (
        winnerCount !== undefined &&
        (!Number.isInteger(winnerCount) || winnerCount <= 0)
      ) {
        throw createError.badRequest('Winner count must be a positive integer');
      }

      try {
        const winners = await RaffleService.selectWinners(
          raffleId,
          winnerCount
        );

        logger.info(
          `Winners selected by admin ${req.user.id} for raffle ${raffleId}: ${winners.length} winners`
        );

        res.json({
          success: true,
          message: `Successfully selected ${winners.length} winner${winners.length > 1 ? 's' : ''}`,
          data: {
            raffleId,
            winners,
            winnerCount: winners.length,
            selectedAt: new Date(),
            selectedBy: req.user.id,
          },
        });
      } catch (error) {
        logger.error('Error selecting winners:', error);
        throw error;
      }
    }
  );

  // Admin: Cancel raffle
  static cancelRaffle = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { raffleId } = req.params;
      const { reason } = req.body;

      if (!raffleId) {
        throw createError.badRequest('Raffle ID is required');
      }

      if (!reason) {
        throw createError.badRequest('Cancellation reason is required');
      }

      try {
        await RaffleService.cancelRaffle(raffleId, reason);

        logger.info(
          `Raffle cancelled by admin ${req.user.id}: ${raffleId} - ${reason}`
        );

        res.json({
          success: true,
          message: 'Raffle cancelled successfully',
          data: {
            raffleId,
            reason,
            cancelledAt: new Date(),
            cancelledBy: req.user.id,
          },
        });
      } catch (error) {
        logger.error('Error cancelling raffle:', error);
        throw createError.internal('Failed to cancel raffle');
      }
    }
  );

  // Admin: Update raffle
  static updateRaffle = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { raffleId } = req.params;
      const updates = req.body;

      if (!raffleId) {
        throw createError.badRequest('Raffle ID is required');
      }

      try {
        // This would be implemented to update raffle details
        // For now, return a placeholder response
        res.json({
          success: true,
          message: 'Raffle update functionality coming soon',
          data: {
            raffleId,
            updates,
            updatedBy: req.user.id,
          },
        });
      } catch (error) {
        logger.error('Error updating raffle:', error);
        throw createError.internal('Failed to update raffle');
      }
    }
  );

  // Admin: Get all raffles (including inactive)
  static getAllRaffles = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { page = 1, limit = 20, status, category } = req.query;

      const pageNum = Math.max(parseInt(page as string) || 1, 1);
      const limitNum = Math.min(parseInt(limit as string) || 20, 100);

      try {
        // This would be implemented to get all raffles with filters
        // For now, return active raffles
        const raffles = await RaffleService.getActiveRaffles();

        res.json({
          success: true,
          data: {
            raffles,
            pagination: {
              currentPage: pageNum,
              totalPages: Math.ceil(raffles.length / limitNum),
              totalRaffles: raffles.length,
              pageSize: limitNum,
            },
            filters: {
              status,
              category,
            },
          },
        });
      } catch (error) {
        logger.error('Error getting all raffles:', error);
        throw createError.internal('Failed to get all raffles');
      }
    }
  );
}
