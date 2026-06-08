import { Response } from 'express';
import { KickService } from '@/services/KickService'; // Stub service - Kick integration disabled
import { PointsService } from '@/services/PointsService';
import { StatisticsService } from '@/services/StatisticsService';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { prisma } from '@/config/database';

export class ViewingController {
  // Start viewing session
  static startViewingSession = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { streamId } = req.body;

      if (!streamId) {
        throw createError.badRequest('Stream ID is required');
      }

      try {
        // Check if MattySpins is actually live
        const isLive = await KickService.isMattySpinsLive();

        if (!isLive) {
          throw createError.badRequest('Stream is not currently live');
        }

        // Check if user already has an active session
        const existingSession = await KickService.getActiveViewingSession(
          req.user.id,
          streamId
        );

        if (existingSession) {
          return res.json({
            success: true,
            message: 'Viewing session already active',
            data: {
              sessionId: streamId,
              userId: req.user.id,
              startTime: existingSession.startTime,
              isActive: true,
            },
          });
        }

        // Start new viewing session
        const session = await KickService.startViewingSession(
          req.user.id,
          streamId
        );

        // Create database record
        await prisma.viewingSession.create({
          data: {
            userId: req.user.id,
            streamId,
            startedAt: session.startTime,
          },
        });

        logger.info(`Viewing session started: ${req.user.id} -> ${streamId}`);

        res.json({
          success: true,
          message: 'Viewing session started',
          data: {
            sessionId: streamId,
            userId: req.user.id,
            startTime: session.startTime,
            isActive: true,
          },
        });
      } catch (error) {
        logger.error('Error starting viewing session:', error);
        throw createError.internal('Failed to start viewing session');
      }
    }
  );

  // End viewing session and award points
  static endViewingSession = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { streamId } = req.body;

      if (!streamId) {
        throw createError.badRequest('Stream ID is required');
      }

      try {
        // End viewing session and calculate points
        const result = await KickService.endViewingSession(
          req.user.id,
          streamId
        );

        if (result.durationMinutes === 0) {
          return res.json({
            success: true,
            message: 'No active viewing session found',
            data: {
              durationMinutes: 0,
              pointsEarned: 0,
            },
          });
        }

        // Update database record
        const dbSession = await prisma.viewingSession.findFirst({
          where: {
            userId: req.user.id,
            streamId,
            endedAt: null,
          },
          orderBy: { startedAt: 'desc' },
        });

        if (dbSession) {
          await prisma.viewingSession.update({
            where: { id: dbSession.id },
            data: {
              endedAt: new Date(),
              durationMinutes: result.durationMinutes,
              pointsEarned: result.pointsEarned,
              validated: true,
            },
          });
        }

        // Award points if earned
        let transaction = null;
        if (result.pointsEarned > 0) {
          transaction = await PointsService.awardViewingPoints(
            req.user.id,
            result.durationMinutes,
            streamId
          );

          // Update user statistics
          await StatisticsService.updateViewingTime(
            req.user.id,
            result.durationMinutes,
            streamId
          );
        }

        logger.info(
          `Viewing session ended: ${req.user.id} -> ${result.durationMinutes} minutes, ${result.pointsEarned} points`
        );

        res.json({
          success: true,
          message: 'Viewing session ended',
          data: {
            sessionId: streamId,
            userId: req.user.id,
            durationMinutes: result.durationMinutes,
            pointsEarned: result.pointsEarned,
            transaction: transaction
              ? {
                  id: transaction.id,
                  amount: transaction.amount,
                  reason: transaction.reason,
                }
              : null,
          },
        });
      } catch (error) {
        logger.error('Error ending viewing session:', error);
        throw createError.internal('Failed to end viewing session');
      }
    }
  );

  // Update viewing activity (heartbeat)
  static updateViewingActivity = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { streamId } = req.body;

      if (!streamId) {
        throw createError.badRequest('Stream ID is required');
      }

      try {
        // Validate user presence
        const isValid = await KickService.validateUserPresence(
          req.user.id,
          streamId
        );

        if (!isValid) {
          throw createError.badRequest('Invalid viewing session');
        }

        // Update activity
        const updated = await KickService.updateViewingActivity(
          req.user.id,
          streamId
        );

        if (!updated) {
          throw createError.notFound('No active viewing session found');
        }

        res.json({
          success: true,
          message: 'Viewing activity updated',
          data: {
            sessionId: streamId,
            userId: req.user.id,
            lastActivity: new Date(),
          },
        });
      } catch (error) {
        logger.error('Error updating viewing activity:', error);
        throw createError.internal('Failed to update viewing activity');
      }
    }
  );

  // Get active viewing session
  static getActiveSession = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { streamId } = req.params;

      if (!streamId) {
        throw createError.badRequest('Stream ID is required');
      }

      try {
        const session = await KickService.getActiveViewingSession(
          req.user.id,
          streamId
        );

        if (!session) {
          return res.json({
            success: true,
            data: {
              hasActiveSession: false,
              session: null,
            },
          });
        }

        // Calculate current duration
        const now = new Date();
        const durationMs =
          now.getTime() - new Date(session.startTime).getTime();
        const durationMinutes = Math.floor(durationMs / (1000 * 60));

        res.json({
          success: true,
          data: {
            hasActiveSession: true,
            session: {
              sessionId: streamId,
              userId: req.user.id,
              startTime: session.startTime,
              currentDuration: durationMinutes,
              isActive: session.isActive,
            },
          },
        });
      } catch (error) {
        logger.error('Error getting active session:', error);
        throw createError.internal('Failed to get active session');
      }
    }
  );

  // Get user viewing statistics
  static getViewingStats = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { userId } = req.params;
      const targetUserId = userId || req.user.id;

      // Check if user can access these stats
      if (targetUserId !== req.user.id && !req.user.isAdmin) {
        throw createError.forbidden('Cannot access other user statistics');
      }

      try {
        const [userStats, engagementMetrics, streakInfo] = await Promise.all([
          StatisticsService.getUserStatistics(targetUserId),
          StatisticsService.getUserEngagementMetrics(targetUserId),
          StatisticsService.getUserStreak(targetUserId),
        ]);

        // Get recent viewing sessions
        const recentSessions = await prisma.viewingSession.findMany({
          where: {
            userId: targetUserId,
            validated: true,
          },
          orderBy: { startedAt: 'desc' },
          take: 10,
          select: {
            streamId: true,
            startedAt: true,
            endedAt: true,
            durationMinutes: true,
            pointsEarned: true,
          },
        });

        res.json({
          success: true,
          data: {
            userId: targetUserId,
            statistics: userStats,
            engagement: engagementMetrics,
            streak: streakInfo,
            recentSessions,
          },
        });
      } catch (error) {
        logger.error('Error getting viewing stats:', error);
        throw createError.internal('Failed to get viewing statistics');
      }
    }
  );

  // Get stream status
  static getStreamStatus = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const streamInfo = await KickService.getMattySpinsStreamInfo();

        if (!streamInfo) {
          return res.json({
            success: true,
            data: {
              isLive: false,
              stream: null,
              message: 'Stream information not available',
            },
          });
        }

        res.json({
          success: true,
          data: {
            isLive: streamInfo.is_live,
            stream: {
              id: streamInfo.id,
              title: streamInfo.title,
              viewerCount: streamInfo.viewer_count,
              startedAt: streamInfo.started_at,
              thumbnail: streamInfo.thumbnail,
              category: streamInfo.category,
            },
          },
        });
      } catch (error) {
        logger.error('Error getting stream status:', error);
        throw createError.internal('Failed to get stream status');
      }
    }
  );

  // Admin: Get all viewing sessions
  static getAllViewingSessions = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { page = 1, limit = 50, userId, streamId, validated } = req.query;

      const pageNum = Math.max(parseInt(page as string) || 1, 1);
      const limitNum = Math.min(parseInt(limit as string) || 50, 100);
      const offset = (pageNum - 1) * limitNum;

      try {
        const where: any = {};

        if (userId) {
          where.userId = userId;
        }

        if (streamId) {
          where.streamId = streamId;
        }

        if (validated !== undefined) {
          where.validated = validated === 'true';
        }

        const [sessions, total] = await Promise.all([
          prisma.viewingSession.findMany({
            where,
            include: {
              user: {
                select: {
                  displayName: true,
                  discordId: true,
                },
              },
            },
            orderBy: { startedAt: 'desc' },
            take: limitNum,
            skip: offset,
          }),
          prisma.viewingSession.count({ where }),
        ]);

        res.json({
          success: true,
          data: {
            sessions: sessions.map(session => ({
              id: session.id,
              userId: session.userId,
              user: session.user,
              streamId: session.streamId,
              startedAt: session.startedAt,
              endedAt: session.endedAt,
              durationMinutes: session.durationMinutes,
              pointsEarned: session.pointsEarned,
              validated: session.validated,
            })),
            pagination: {
              currentPage: pageNum,
              totalPages: Math.ceil(total / limitNum),
              totalSessions: total,
              pageSize: limitNum,
            },
          },
        });
      } catch (error) {
        logger.error('Error getting all viewing sessions:', error);
        throw createError.internal('Failed to get viewing sessions');
      }
    }
  );
}
