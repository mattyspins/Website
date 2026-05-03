import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';

export interface ScheduleDay {
  day: string;
  streaming: boolean;
  startTime: string;
  endTime: string;
  activity?: string;
  note?: string;
}

export interface StreamSchedule {
  id: string;
  schedule: ScheduleDay[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ScheduleService {
  // Get current schedule
  static async getCurrentSchedule(): Promise<ScheduleDay[]> {
    try {
      const schedule = await prisma.systemConfig.findUnique({
        where: { key: 'stream_schedule' },
      });

      if (schedule && schedule.value) {
        return schedule.value as ScheduleDay[];
      }

      // Return default schedule if none exists
      return this.getDefaultSchedule();
    } catch (error) {
      logger.error('Error getting current schedule:', error);
      throw createError.internal('Failed to get schedule');
    }
  }

  // Update schedule (admin only)
  static async updateSchedule(
    schedule: ScheduleDay[],
    adminId: string
  ): Promise<void> {
    try {
      // Validate schedule data
      this.validateSchedule(schedule);

      await prisma.$transaction(async tx => {
        // Update or create schedule in system config
        await tx.systemConfig.upsert({
          where: { key: 'stream_schedule' },
          create: {
            key: 'stream_schedule',
            value: schedule,
            description: 'Weekly stream schedule',
            updatedBy: adminId,
          },
          update: {
            value: schedule,
            updatedBy: adminId,
            updatedAt: new Date(),
          },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            adminId,
            action: 'UPDATE_STREAM_SCHEDULE',
            targetType: 'system_config',
            targetId: null, // No specific target user for system config
            oldValues: null, // Could store previous schedule if needed
            newValues: {
              configKey: 'stream_schedule',
              schedule,
              updatedAt: new Date(),
            },
          },
        });
      });

      logger.info(`Admin ${adminId} updated stream schedule`);
    } catch (error) {
      logger.error('Error updating schedule:', error);
      throw error;
    }
  }

  // Get default schedule
  private static getDefaultSchedule(): ScheduleDay[] {
    return [
      {
        day: 'Monday',
        streaming: false,
        startTime: '',
        endTime: '',
        note: 'Schedule not set',
      },
      {
        day: 'Tuesday',
        streaming: false,
        startTime: '',
        endTime: '',
        note: 'Schedule not set',
      },
      {
        day: 'Wednesday',
        streaming: false,
        startTime: '',
        endTime: '',
        note: 'Schedule not set',
      },
      {
        day: 'Thursday',
        streaming: false,
        startTime: '',
        endTime: '',
        note: 'Schedule not set',
      },
      {
        day: 'Friday',
        streaming: false,
        startTime: '',
        endTime: '',
        note: 'Schedule not set',
      },
      {
        day: 'Saturday',
        streaming: false,
        startTime: '',
        endTime: '',
        note: 'Schedule not set',
      },
      {
        day: 'Sunday',
        streaming: false,
        startTime: '',
        endTime: '',
        note: 'Schedule not set',
      },
    ];
  }

  // Validate schedule data
  private static validateSchedule(schedule: ScheduleDay[]): void {
    if (!Array.isArray(schedule) || schedule.length !== 7) {
      throw createError.badRequest('Schedule must contain exactly 7 days');
    }

    const validDays = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];

    for (const day of schedule) {
      if (!validDays.includes(day.day)) {
        throw createError.badRequest(`Invalid day: ${day.day}`);
      }

      if (typeof day.streaming !== 'boolean') {
        throw createError.badRequest(
          `Invalid streaming value for ${day.day}: must be boolean`
        );
      }

      if (day.streaming) {
        if (!day.startTime || !day.endTime) {
          throw createError.badRequest(
            `Start time and end time required for streaming day: ${day.day}`
          );
        }

        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(day.startTime) || !timeRegex.test(day.endTime)) {
          throw createError.badRequest(
            `Invalid time format for ${day.day}: use HH:MM format`
          );
        }
      }
    }

    // Check for duplicate days
    const dayNames = schedule.map(d => d.day);
    const uniqueDays = new Set(dayNames);
    if (uniqueDays.size !== dayNames.length) {
      throw createError.badRequest('Duplicate days found in schedule');
    }
  }

  // Get today's schedule
  static async getTodaySchedule(): Promise<ScheduleDay | null> {
    try {
      const schedule = await this.getCurrentSchedule();
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

      return schedule.find(day => day.day === today) || null;
    } catch (error) {
      logger.error('Error getting today schedule:', error);
      throw createError.internal('Failed to get today schedule');
    }
  }

  // Check if streaming is live now
  static async isStreamingNow(): Promise<boolean> {
    try {
      const todaySchedule = await this.getTodaySchedule();

      if (!todaySchedule || !todaySchedule.streaming) {
        return false;
      }

      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

      return (
        currentTime >= todaySchedule.startTime &&
        currentTime <= todaySchedule.endTime
      );
    } catch (error) {
      logger.error('Error checking if streaming now:', error);
      return false;
    }
  }
}
