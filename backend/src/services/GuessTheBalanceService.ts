import { PrismaClient, GuessTheBalanceStatus, Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { NotificationService } from '@/services/NotificationService';
import {
  CreateGameDTO,
  CompleteGameDTO,
  GameResponse,
  GameWithWinnerResponse,
  GuessResponse,
  GuessWithUserResponse,
  WinnerInfo,
  GameFilters,
} from '@/types/guessTheBalance';

const prisma = new PrismaClient();

export class GuessTheBalanceService {
  // ==================== ADMIN METHODS ====================

  /**
   * Create a new Guess the Balance game
   */
  static async createGame(
    data: CreateGameDTO,
    adminId: string
  ): Promise<GameResponse> {
    try {
      const game = await prisma.guessTheBalance.create({
        data: {
          title: data.title,
          description: data.description,
          startingBalance: new Prisma.Decimal(data.startingBalance),
          numberOfBonuses: data.numberOfBonuses,
          breakEvenMultiplier: new Prisma.Decimal(data.breakEvenMultiplier),
          createdBy: adminId,
          status: GuessTheBalanceStatus.DRAFT,
        },
      });

      logger.info(`Game created: ${game.id} by admin ${adminId}`);

      return this.formatGameResponse(game);
    } catch (error) {
      logger.error('Error creating game:', error);
      throw createError.internal('Failed to create game');
    }
  }

  /**
   * Open guessing for a game
   */
  static async openGuessing(gameId: string): Promise<GameResponse> {
    try {
      // Validate game exists and is in DRAFT status
      const game = await prisma.guessTheBalance.findUnique({
        where: { id: gameId },
      });

      if (!game) {
        throw createError.notFound('Game not found');
      }

      if (game.status !== GuessTheBalanceStatus.DRAFT) {
        throw createError.badRequest(
          `Cannot open guessing for game in ${game.status} status`
        );
      }

      // Update status to OPEN
      const updatedGame = await prisma.guessTheBalance.update({
        where: { id: gameId },
        data: {
          status: GuessTheBalanceStatus.OPEN,
          openedAt: new Date(),
        },
      });

      logger.info(`Game ${gameId} opened for guessing`);

      return this.formatGameResponse(updatedGame);
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      logger.error('Error opening guessing:', error);
      throw createError.internal('Failed to open guessing');
    }
  }

  /**
   * Close guessing for a game
   */
  static async closeGuessing(gameId: string): Promise<GameResponse> {
    try {
      // Validate game exists and is in OPEN status
      const game = await prisma.guessTheBalance.findUnique({
        where: { id: gameId },
        include: {
          guesses: true,
        },
      });

      if (!game) {
        throw createError.notFound('Game not found');
      }

      if (game.status !== GuessTheBalanceStatus.OPEN) {
        throw createError.badRequest(
          `Cannot close guessing for game in ${game.status} status`
        );
      }

      // Update status to CLOSED
      const updatedGame = await prisma.guessTheBalance.update({
        where: { id: gameId },
        data: {
          status: GuessTheBalanceStatus.CLOSED,
          closedAt: new Date(),
        },
      });

      logger.info(
        `Game ${gameId} closed for guessing with ${game.guesses.length} total guesses`
      );

      const response = this.formatGameResponse(updatedGame);
      response.totalGuesses = game.guesses.length;

      return response;
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      logger.error('Error closing guessing:', error);
      throw createError.internal('Failed to close guessing');
    }
  }

  /**
   * Complete game - enter final balance and calculate winner
   */
  static async completeGame(
    gameId: string,
    data: CompleteGameDTO
  ): Promise<GameWithWinnerResponse> {
    try {
      // Validate game exists and is in CLOSED status
      const game = await prisma.guessTheBalance.findUnique({
        where: { id: gameId },
      });

      if (!game) {
        throw createError.notFound('Game not found');
      }

      if (game.status !== GuessTheBalanceStatus.CLOSED) {
        throw createError.badRequest(
          `Cannot complete game in ${game.status} status. Game must be CLOSED first.`
        );
      }

      // Calculate winner (excluding disqualified users)
      const winner = await this.calculateWinner(gameId, data.finalBalance);

      // Update game with final balance and winner
      const updatedGame = await prisma.guessTheBalance.update({
        where: { id: gameId },
        data: {
          finalBalance: new Prisma.Decimal(data.finalBalance),
          status: GuessTheBalanceStatus.COMPLETED,
          completedAt: new Date(),
          winnerId: winner?.userId,
          winnerGuess: winner ? new Prisma.Decimal(winner.guessAmount) : null,
          winnerReward: data.winnerReward || 0,
        },
        include: {
          winner: true,
        },
      });

      // Award points to winner if specified
      if (winner && data.winnerReward && data.winnerReward > 0) {
        await this.awardPoints(
          winner.userId,
          data.winnerReward,
          `Won Guess the Balance game: ${game.title || gameId}`
        );

        // Send win notification to user
        await NotificationService.notifyGameWin(
          winner.userId,
          game.title || 'Guess the Balance',
          data.winnerReward,
          gameId
        );
      }

      logger.info(
        `Game ${gameId} completed. Winner: ${winner?.userId || 'none'}, Reward: ${data.winnerReward || 0}`
      );

      return this.formatGameWithWinnerResponse(
        updatedGame,
        winner,
        data.finalBalance
      );
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      logger.error('Error completing game:', error);
      throw createError.internal('Failed to complete game');
    }
  }

  /**
   * Disqualify current winner and select next closest guess
   */
  static async disqualifyWinner(
    gameId: string,
    reason: string
  ): Promise<GameWithWinnerResponse> {
    try {
      // Validate game exists and is COMPLETED
      const game = await prisma.guessTheBalance.findUnique({
        where: { id: gameId },
      });

      if (!game) {
        throw createError.notFound('Game not found');
      }

      if (game.status !== GuessTheBalanceStatus.COMPLETED) {
        throw createError.badRequest(
          'Can only disqualify winner from completed games'
        );
      }

      if (!game.winnerId || !game.finalBalance) {
        throw createError.badRequest('Game has no winner to disqualify');
      }

      const previousWinnerId = game.winnerId;
      const previousReward = game.winnerReward || 0;

      // Add previous winner to disqualified list
      const disqualifiedUsers = (game.metadata as any)?.disqualifiedUsers || [];
      disqualifiedUsers.push({
        userId: previousWinnerId,
        reason,
        disqualifiedAt: new Date().toISOString(),
      });

      // Calculate new winner (excluding disqualified users)
      const newWinner = await this.calculateWinner(
        gameId,
        game.finalBalance.toNumber(),
        disqualifiedUsers.map((d: any) => d.userId)
      );

      if (!newWinner) {
        throw createError.badRequest(
          'No eligible winner found after disqualification'
        );
      }

      // Refund points from previous winner if they were awarded
      if (previousReward > 0) {
        await this.refundPoints(
          previousWinnerId,
          previousReward,
          `Disqualified from Guess the Balance: ${reason}`
        );
      }

      // Update game with new winner
      const updatedGame = await prisma.guessTheBalance.update({
        where: { id: gameId },
        data: {
          winnerId: newWinner.userId,
          winnerGuess: new Prisma.Decimal(newWinner.guessAmount),
          metadata: {
            ...(game.metadata as any),
            disqualifiedUsers,
          },
        },
        include: {
          winner: true,
        },
      });

      // Award points to new winner
      if (previousReward > 0) {
        await this.awardPoints(
          newWinner.userId,
          previousReward,
          `Won Guess the Balance game: ${game.title || gameId}`
        );

        // Send win notification to new winner
        await NotificationService.notifyGameWin(
          newWinner.userId,
          game.title || 'Guess the Balance',
          previousReward,
          gameId
        );
      }

      logger.info(
        `Game ${gameId} winner disqualified. Previous: ${previousWinnerId}, New: ${newWinner.userId}, Reason: ${reason}`
      );

      return this.formatGameWithWinnerResponse(
        updatedGame,
        newWinner,
        game.finalBalance.toNumber()
      );
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      logger.error('Error disqualifying winner:', error);
      throw createError.internal('Failed to disqualify winner');
    }
  }

  /**
   * Get all guesses for a game (admin only)
   */
  static async getAllGuesses(gameId: string): Promise<GuessWithUserResponse[]> {
    try {
      const guesses = await prisma.guessSubmission.findMany({
        where: { gameId },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          submittedAt: 'asc',
        },
      });

      return guesses.map(guess => ({
        id: guess.id,
        gameId: guess.gameId,
        userId: guess.userId,
        guessAmount: guess.guessAmount.toNumber(),
        submittedAt: guess.submittedAt,
        updatedAt: guess.updatedAt,
        user: {
          id: guess.user.id,
          displayName: guess.user.displayName,
          avatar: guess.user.avatarUrl || undefined,
        },
      }));
    } catch (error) {
      logger.error('Error fetching guesses:', error);
      throw createError.internal('Failed to fetch guesses');
    }
  }

  /**
   * Delete a game (DRAFT games or COMPLETED games)
   */
  static async deleteGame(gameId: string): Promise<void> {
    try {
      const game = await prisma.guessTheBalance.findUnique({
        where: { id: gameId },
        include: {
          guesses: true,
        },
      });

      if (!game) {
        throw createError.notFound('Game not found');
      }

      // Allow deletion of DRAFT games (no guesses) or COMPLETED games
      if (game.status === GuessTheBalanceStatus.DRAFT) {
        if (game.guesses.length > 0) {
          throw createError.badRequest(
            'Cannot delete draft game with existing guesses'
          );
        }
      } else if (game.status !== GuessTheBalanceStatus.COMPLETED) {
        throw createError.badRequest(
          'Can only delete games in DRAFT or COMPLETED status'
        );
      }

      // Delete all guesses first (cascade delete)
      await prisma.guessSubmission.deleteMany({
        where: { gameId: gameId },
      });

      // Delete the game
      await prisma.guessTheBalance.delete({
        where: { id: gameId },
      });

      logger.info(`Game ${gameId} deleted (status: ${game.status})`);
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      logger.error('Error deleting game:', error);
      throw createError.internal('Failed to delete game');
    }
  }

  /**
   * Get all games with filters (admin)
   */
  static async getAllGames(filters: GameFilters): Promise<GameResponse[]> {
    try {
      const where: any = {};

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.createdBy) {
        where.createdBy = filters.createdBy;
      }

      const games = await prisma.guessTheBalance.findMany({
        where,
        include: {
          guesses: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      });

      return games.map(game => {
        const response = this.formatGameResponse(game);
        response.totalGuesses = game.guesses.length;
        return response;
      });
    } catch (error) {
      logger.error('Error fetching games:', error);
      throw createError.internal('Failed to fetch games');
    }
  }

  // ==================== USER METHODS ====================

  /**
   * Get active games (status: OPEN)
   */
  static async getActiveGames(userId?: string): Promise<GameResponse[]> {
    try {
      const games = await prisma.guessTheBalance.findMany({
        where: {
          status: GuessTheBalanceStatus.OPEN,
        },
        include: {
          guesses: userId
            ? {
                where: {
                  userId,
                },
                select: {
                  id: true,
                },
              }
            : {
                select: {
                  id: true,
                },
              },
        },
        orderBy: {
          openedAt: 'desc',
        },
      });

      return games.map(game => {
        const response = this.formatGameResponse(game);
        response.totalGuesses = game.guesses.length;
        if (userId) {
          response.userHasGuessed = game.guesses.length > 0;
        }
        return response;
      });
    } catch (error) {
      logger.error('Error fetching active games:', error);
      throw createError.internal('Failed to fetch active games');
    }
  }

  /**
   * Get game details
   */
  static async getGameDetails(
    gameId: string,
    userId?: string
  ): Promise<GameResponse> {
    try {
      const game = await prisma.guessTheBalance.findUnique({
        where: { id: gameId },
        include: {
          guesses: userId
            ? {
                where: {
                  userId,
                },
                select: {
                  id: true,
                },
              }
            : {
                select: {
                  id: true,
                },
              },
        },
      });

      if (!game) {
        throw createError.notFound('Game not found');
      }

      const response = this.formatGameResponse(game);
      response.totalGuesses = game.guesses.length;
      if (userId) {
        response.userHasGuessed = game.guesses.length > 0;
      }

      return response;
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      logger.error('Error fetching game details:', error);
      throw createError.internal('Failed to fetch game details');
    }
  }

  /**
   * Submit or update a guess
   */
  static async submitGuess(
    gameId: string,
    userId: string,
    guessAmount: number
  ): Promise<GuessResponse> {
    try {
      // Validate game exists and is OPEN
      const game = await prisma.guessTheBalance.findUnique({
        where: { id: gameId },
      });

      if (!game) {
        throw createError.notFound('Game not found');
      }

      if (game.status !== GuessTheBalanceStatus.OPEN) {
        throw createError.badRequest('Guessing is not open for this game');
      }

      // Validate guess amount
      if (guessAmount <= 0) {
        throw createError.badRequest('Guess amount must be positive');
      }

      // Upsert guess (create or update)
      const guess = await prisma.guessSubmission.upsert({
        where: {
          gameId_userId: {
            gameId,
            userId,
          },
        },
        create: {
          gameId,
          userId,
          guessAmount: new Prisma.Decimal(guessAmount),
        },
        update: {
          guessAmount: new Prisma.Decimal(guessAmount),
          updatedAt: new Date(),
        },
      });

      logger.info(
        `User ${userId} ${guess.submittedAt === guess.updatedAt ? 'submitted' : 'updated'} guess for game ${gameId}: ${guessAmount}`
      );

      return {
        id: guess.id,
        gameId: guess.gameId,
        userId: guess.userId,
        guessAmount: guess.guessAmount.toNumber(),
        submittedAt: guess.submittedAt,
        updatedAt: guess.updatedAt,
      };
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      logger.error('Error submitting guess:', error);
      throw createError.internal('Failed to submit guess');
    }
  }

  /**
   * Get user's guess for a game
   */
  static async getUserGuess(
    gameId: string,
    userId: string
  ): Promise<GuessResponse | null> {
    try {
      const guess = await prisma.guessSubmission.findUnique({
        where: {
          gameId_userId: {
            gameId,
            userId,
          },
        },
      });

      if (!guess) {
        return null;
      }

      return {
        id: guess.id,
        gameId: guess.gameId,
        userId: guess.userId,
        guessAmount: guess.guessAmount.toNumber(),
        submittedAt: guess.submittedAt,
        updatedAt: guess.updatedAt,
      };
    } catch (error) {
      logger.error('Error fetching user guess:', error);
      throw createError.internal('Failed to fetch guess');
    }
  }

  /**
   * Get completed games with winners
   */
  static async getCompletedGames(): Promise<GameWithWinnerResponse[]> {
    try {
      const games = await prisma.guessTheBalance.findMany({
        where: {
          status: GuessTheBalanceStatus.COMPLETED,
        },
        include: {
          winner: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          completedAt: 'desc',
        },
        take: 20,
      });

      return games.map(game => {
        const response = this.formatGameResponse(
          game
        ) as GameWithWinnerResponse;

        if (game.winner && game.winnerGuess && game.finalBalance) {
          const difference = Math.abs(
            game.finalBalance.toNumber() - game.winnerGuess.toNumber()
          );

          response.winner = {
            id: game.winner.id,
            displayName: game.winner.displayName,
            avatar: game.winner.avatarUrl || undefined,
            guessAmount: game.winnerGuess.toNumber(),
            difference,
            reward: game.winnerReward || 0,
          };
        }

        return response;
      });
    } catch (error) {
      logger.error('Error fetching completed games:', error);
      throw createError.internal('Failed to fetch completed games');
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Calculate winner - finds the closest guess to final balance
   */
  private static async calculateWinner(
    gameId: string,
    finalBalance: number,
    excludedUserIds: string[] = []
  ): Promise<WinnerInfo | null> {
    try {
      const guesses = await prisma.guessSubmission.findMany({
        where: {
          gameId,
          userId: {
            notIn: excludedUserIds,
          },
        },
        orderBy: {
          submittedAt: 'asc', // First submission wins in case of tie
        },
      });

      if (guesses.length === 0) {
        logger.info(
          `No eligible guesses for game ${gameId}, no winner (excluded: ${excludedUserIds.length})`
        );
        return null;
      }

      // Find closest guess
      let closestGuess = guesses[0];
      let smallestDifference = Math.abs(
        closestGuess.guessAmount.toNumber() - finalBalance
      );

      for (const guess of guesses) {
        const difference = Math.abs(
          guess.guessAmount.toNumber() - finalBalance
        );
        if (difference < smallestDifference) {
          smallestDifference = difference;
          closestGuess = guess;
        }
      }

      return {
        userId: closestGuess.userId,
        guessAmount: closestGuess.guessAmount.toNumber(),
        difference: smallestDifference,
        isPerfect: smallestDifference === 0,
      };
    } catch (error) {
      logger.error('Error calculating winner:', error);
      throw error;
    }
  }

  /**
   * Refund points from a user
   */
  private static async refundPoints(
    userId: string,
    points: number,
    reason: string
  ): Promise<void> {
    try {
      await prisma.$transaction([
        // Deduct points from user
        prisma.user.update({
          where: { id: userId },
          data: {
            points: { decrement: points },
            totalEarned: { decrement: points },
          },
        }),
        // Create point transaction record
        prisma.pointTransaction.create({
          data: {
            userId,
            amount: -points,
            transactionType: 'REFUND',
            reason,
            referenceType: 'GUESS_THE_BALANCE',
          },
        }),
      ]);

      logger.info(`Refunded ${points} points from user ${userId}: ${reason}`);
    } catch (error) {
      logger.error('Error refunding points:', error);
      throw error;
    }
  }

  /**
   * Award points to a user
   */
  private static async awardPoints(
    userId: string,
    points: number,
    reason: string
  ): Promise<void> {
    try {
      await prisma.$transaction([
        // Update user points
        prisma.user.update({
          where: { id: userId },
          data: {
            points: {
              increment: points,
            },
            totalEarned: {
              increment: points,
            },
          },
        }),
        // Create point transaction record
        prisma.pointTransaction.create({
          data: {
            userId,
            amount: points,
            transactionType: 'EARN',
            reason,
            referenceType: 'GUESS_THE_BALANCE',
          },
        }),
      ]);

      logger.info(`Awarded ${points} points to user ${userId}: ${reason}`);
    } catch (error) {
      logger.error('Error awarding points:', error);
      throw error;
    }
  }

  /**
   * Format game response
   */
  private static formatGameResponse(game: any): GameResponse {
    return {
      id: game.id,
      title: game.title || undefined,
      description: game.description || undefined,
      startingBalance: game.startingBalance.toNumber(),
      numberOfBonuses: game.numberOfBonuses,
      breakEvenMultiplier: game.breakEvenMultiplier.toNumber(),
      finalBalance: game.finalBalance?.toNumber(),
      status: game.status,
      winnerId: game.winnerId || undefined,
      winnerGuess: game.winnerGuess?.toNumber(),
      winnerReward: game.winnerReward || undefined,
      createdBy: game.createdBy,
      createdAt: game.createdAt,
      openedAt: game.openedAt || undefined,
      closedAt: game.closedAt || undefined,
      completedAt: game.completedAt || undefined,
    };
  }

  /**
   * Format game with winner response
   */
  private static formatGameWithWinnerResponse(
    game: any,
    winner: WinnerInfo | null,
    finalBalance: number
  ): GameWithWinnerResponse {
    const response = this.formatGameResponse(game) as GameWithWinnerResponse;

    if (winner && game.winner) {
      response.winner = {
        id: game.winner.id,
        displayName: game.winner.displayName,
        avatar: game.winner.avatarUrl || undefined,
        guessAmount: winner.guessAmount,
        difference: winner.difference,
        reward: game.winnerReward || 0,
      };
    }

    return response;
  }
}
