import cron from 'node-cron';
import { RazedWagerSyncService } from '@/services/RazedWagerSyncService';
import { RazedService } from '@/services/RazedService';
import { logger } from '@/utils/logger';

/**
 * Razed Wager Sync Background Job.
 *
 * Two separate schedules so the frequent tick stays cheap:
 * - Every 5 minutes: syncs *today only* (1 Razed API range fetch), refreshes weekly/monthly
 *   rolling stats, and records payouts for any race whose end time has passed.
 *   This is the leaderboard's staleness budget — wager figures can trail Razed by up to
 *   one interval, on top of whatever lag Razed's own API has before it reflects a bet.
 * - Every 2 hours: also re-syncs the previous 2 days, to catch late corrections Razed
 *   sometimes applies to a day's totals after the fact.
 *
 * Syncing N days back means N separate full referral-list fetches (one per day, since each
 * day needs its own Razed cumulative total), so folding the correction days into the
 * frequent tick would triple Razed API traffic every 5 minutes and risk tripping their
 * Cloudflare rate limiting — hence splitting it into its own much slower schedule instead.
 */
export class RazedWagerSyncJob {
  private static frequentJob: cron.ScheduledTask | null = null;
  private static correctionJob: cron.ScheduledTask | null = null;

  static start(): void {
    if (this.frequentJob) {
      logger.warn('Razed wager sync job is already running');
      return;
    }

    if (!RazedService.isConfigured()) {
      logger.warn('RazedWagerSyncJob: RAZED_REFERRAL_KEY not set — job disabled');
      return;
    }

    this.frequentJob = cron.schedule('*/5 * * * *', async () => {
      try {
        logger.debug('Running Razed wager sync (today)');
        await RazedWagerSyncService.syncRecentDays(0);
      } catch (error) {
        logger.error('Error in Razed wager sync job:', error);
      }
    });

    this.correctionJob = cron.schedule('0 */2 * * *', async () => {
      try {
        logger.debug('Running Razed wager sync (corrections)');
        await RazedWagerSyncService.syncRecentDays(2);
      } catch (error) {
        logger.error('Error in Razed wager correction sync job:', error);
      }
    });

    // Run once at startup so data isn't stale for up to a full interval after a deploy.
    RazedWagerSyncService.syncRecentDays(2).catch((error) =>
      logger.error('Error in initial Razed wager sync:', error)
    );

    logger.info('Razed wager sync job started (today every 5 min, corrections every 2 hours)');
  }

  static stop(): void {
    if (this.frequentJob) {
      this.frequentJob.stop();
      this.frequentJob = null;
    }
    if (this.correctionJob) {
      this.correctionJob.stop();
      this.correctionJob = null;
    }
    logger.info('Razed wager sync job stopped');
  }

  static isRunning(): boolean {
    return this.frequentJob !== null;
  }
}
