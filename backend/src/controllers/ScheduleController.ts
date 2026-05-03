import { Request, Response } from 'express';
import { ScheduleService } from '@/services/ScheduleService';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { logger } from '@/utils/logger';

export class ScheduleController {
  // Get current schedule (public endpoint)
  static getCurrentSchedule = asyncHandler(
    async (req: Request, res: Response) => {
      try {
        const schedule = await ScheduleService.getCurrentSchedule();

        res.json({
          success: true,
          data: {
            schedule,
          },
        });
      } catch (error) {
        logger.error('Error getting current schedule:', error);
        throw createError.internal('Failed to get schedule');
      }
    }
  );

  // Update schedule (admin only)
  static updateSchedule = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { schedule } = req.body;

      if (!schedule) {
        throw createError.badRequest('Schedule data is required');
      }

      try {
        await ScheduleService.updateSchedule(schedule, req.user.id);

        logger.info(`Admin ${req.user.id} updated stream schedule`);

        res.json({
          success: true,
          message: 'Schedule updated successfully',
          data: {
            schedule,
            updatedBy: req.user.id,
            updatedAt: new Date(),
          },
        });
      } catch (error) {
        logger.error('Error updating schedule:', error);
        throw error;
      }
    }
  );

  // Get today's schedule (public endpoint)
  static getTodaySchedule = asyncHandler(
    async (req: Request, res: Response) => {
      try {
        const todaySchedule = await ScheduleService.getTodaySchedule();

        res.json({
          success: true,
          data: {
            today: todaySchedule,
          },
        });
      } catch (error) {
        logger.error('Error getting today schedule:', error);
        throw createError.internal('Failed to get today schedule');
      }
    }
  );

  // Check if streaming now (public endpoint)
  static isStreamingNow = asyncHandler(async (req: Request, res: Response) => {
    try {
      const isLive = await ScheduleService.isStreamingNow();

      res.json({
        success: true,
        data: {
          isLive,
          checkedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error checking if streaming now:', error);
      throw createError.internal('Failed to check streaming status');
    }
  });
}
