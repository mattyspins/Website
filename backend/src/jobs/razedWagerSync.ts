import cron from 'node-cron';
import { RazedWagerSyncService } from '@/services/RazedWagerSyncService';
import { RazedService } from '@/services/RazedService';
import { logger } from '@/utils/logger';

/**
 * Razed Wager Sync Background Job
 * Runs every 5 minutes: syncs recent days' wagers, refreshes weekly/monthly rolling
 * stats, and pays out the monthly leaderboard if a new calendar month has started.
 */
export class RazedWagerSyncJob {
  private static job: cron.ScheduledTask | null = null;

  static start(): void {
    if (this.job) {
      logger.warn('Razed wager sync job is already running');
      return;
    }

    if (!RazedService.isConfigured()) {
      logger.warn('RazedWagerSyncJob: RAZED_REFERRAL_KEY not set — job disabled');
      return;
    }

    this.job = cron.schedule('*/5 * * * *', async () => {
      try {
        logger.debug('Running Razed wager sync');
        await RazedWagerSyncService.syncRecentDays(2);
      } catch (error) {
        logger.error('Error in Razed wager sync job:', error);
      }
    });

    // Run once at startup so data isn't stale for up to 5 minutes after a deploy.
    RazedWagerSyncService.syncRecentDays(2).catch((error) =>
      logger.error('Error in initial Razed wager sync:', error)
    );

    logger.info('Razed wager sync job started (runs every 5 minutes)');
  }

  static stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info('Razed wager sync job stopped');
    }
  }

  static isRunning(): boolean {
    return this.job !== null;
  }
}
