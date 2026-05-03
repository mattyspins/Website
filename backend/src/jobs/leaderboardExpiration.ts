import cron from 'node-cron';
import { LeaderboardService } from '../services/LeaderboardService';
import { logger } from '../utils/logger';

/**
 * Leaderboard Expiration Background Job
 * Runs every 1 minute to check for expired leaderboards
 * Feature: kick-oauth-manual-leaderboard
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5
 */

export class LeaderboardExpirationJob {
  private static job: cron.ScheduledTask | null = null;

  /**
   * Start the leaderboard expiration job
   * Runs every 1 minute
   */
  static start(): void {
    if (this.job) {
      logger.warn('Leaderboard expiration job is already running');
      return;
    }

    // Schedule job to run every 1 minute
    this.job = cron.schedule('* * * * *', async () => {
      try {
        logger.debug('Running leaderboard expiration check');
        const expiredCount = await LeaderboardService.expireLeaderboards();

        if (expiredCount > 0) {
          logger.info(`Expired ${expiredCount} leaderboard(s)`);
        }
      } catch (error) {
        logger.error('Error in leaderboard expiration job:', error);
      }
    });

    logger.info('Leaderboard expiration job started (runs every 1 minute)');
  }

  /**
   * Stop the leaderboard expiration job
   */
  static stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info('Leaderboard expiration job stopped');
    }
  }

  /**
   * Check if the job is running
   */
  static isRunning(): boolean {
    return this.job !== null;
  }
}
