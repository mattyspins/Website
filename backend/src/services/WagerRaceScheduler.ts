import cron from 'node-cron';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { currentRaceDefinitions, RaceDefinition, RacePrizeDef } from '@/config/wagerRaces';

/**
 * Keeps the `WagerRace` rows in step with the hardcoded definitions in
 * `@/config/wagerRaces`.
 *
 * The races are defined in code now that the admin CRUD is gone, but standings,
 * payout recording and past-winner history all still read from the database —
 * so rather than rewrite those three, this reconciles the config *into* the
 * existing tables. That keeps `WagerLeaderboardService.computeStandings`,
 * `RazedWagerSyncService.processRacePayoutsIfDue` and the history endpoint
 * working exactly as they did.
 *
 * The rolling weekly race means a new row appears every Monday, which also
 * gives each finished week its own payout record and history entry for free.
 */
export class WagerRaceScheduler {
  private static job: cron.ScheduledTask | null = null;

  /** Reconciles every configured race. Safe to call repeatedly. */
  static async ensureRaces(now: Date = new Date()): Promise<void> {
    for (const def of currentRaceDefinitions(now)) {
      try {
        await WagerRaceScheduler.ensureRace(def, now);
      } catch (error) {
        logger.error(`WagerRaceScheduler: failed to reconcile the ${def.type} race`, {
          error: (error as Error).message,
        });
      }
    }
  }

  private static async ensureRace(def: RaceDefinition, now: Date): Promise<void> {
    // A row already covering exactly this window is the target — including one
    // that's already 'ended'. Matching an ended race rather than creating a new
    // one is deliberate: once the fixed monthly window has been paid out it must
    // stay paid out, not be resurrected on the next tick.
    const exact = await prisma.wagerRace.findFirst({
      where: { type: def.type, startDate: def.startDate, endDate: def.endDate },
      include: { prizes: true },
    });
    if (exact) {
      await WagerRaceScheduler.reconcile(exact.id, exact.totalPrizePool, exact.prizes, def);
      return;
    }

    const actives = await prisma.wagerRace.findMany({
      where: { type: def.type, status: 'active' },
      include: { prizes: true, _count: { select: { payouts: true } } },
      orderBy: { startDate: 'desc' },
    });
    if (actives.length > 1) {
      logger.warn(`WagerRaceScheduler: found ${actives.length} active ${def.type} races, expected at most 1`);
    }

    // Only a race that is still running, unpaid, and overlapping the target may
    // be moved onto the new window. An elapsed week deliberately fails this test
    // so it keeps its own dates and can still be paid out and listed in history,
    // instead of being silently rewritten into the current week.
    const adoptable = actives.find(
      (r) =>
        r._count.payouts === 0 &&
        r.endDate.getTime() > now.getTime() &&
        r.startDate.getTime() < def.endDate.getTime() &&
        r.endDate.getTime() > def.startDate.getTime()
    );

    if (adoptable) {
      await prisma.wagerRace.update({
        where: { id: adoptable.id },
        data: { startDate: def.startDate, endDate: def.endDate, totalPrizePool: def.totalPrizePool },
      });
      await WagerRaceScheduler.reconcile(adoptable.id, def.totalPrizePool, adoptable.prizes, def);
      logger.info(
        `WagerRaceScheduler: moved the active ${def.type} race onto its configured window ` +
          `(${def.startDate.toISOString()} → ${def.endDate.toISOString()})`
      );
      return;
    }

    await prisma.wagerRace.create({
      data: {
        type: def.type,
        startDate: def.startDate,
        endDate: def.endDate,
        totalPrizePool: def.totalPrizePool,
        status: 'active',
        prizes: { create: def.prizes.map((p) => ({ position: p.position, amount: p.amount })) },
      },
    });
    logger.info(
      `WagerRaceScheduler: created the ${def.type} race ` +
        `(${def.startDate.toISOString()} → ${def.endDate.toISOString()}, $${def.totalPrizePool})`
    );
  }

  /** Rewrites pool/prizes only when they've drifted from the config, so a steady state is a no-op. */
  private static async reconcile(
    raceId: string,
    currentPool: number,
    currentPrizes: RacePrizeDef[],
    def: RaceDefinition
  ): Promise<void> {
    const poolMatches = currentPool === def.totalPrizePool;
    const prizesMatch =
      currentPrizes.length === def.prizes.length &&
      [...currentPrizes]
        .sort((a, b) => a.position - b.position)
        .every((p, i) => p.position === def.prizes[i]!.position && p.amount === def.prizes[i]!.amount);

    if (poolMatches && prizesMatch) return;

    await prisma.$transaction(async (tx) => {
      if (!poolMatches) {
        await tx.wagerRace.update({ where: { id: raceId }, data: { totalPrizePool: def.totalPrizePool } });
      }
      if (!prizesMatch) {
        await tx.wagerRacePrize.deleteMany({ where: { raceId } });
        await tx.wagerRacePrize.createMany({
          data: def.prizes.map((p) => ({ raceId, position: p.position, amount: p.amount })),
        });
      }
    });
    logger.info(`WagerRaceScheduler: realigned the ${def.type} race prizes with the configured split`);
  }

  /**
   * Reconciles immediately, then every 5 minutes. The frequent tick is what
   * rolls the weekly race over shortly after each Monday 00:00 London, and it
   * runs independently of the Razed sync job so the races still exist even when
   * `RAZED_REFERRAL_KEY` isn't configured.
   */
  static start(): void {
    if (this.job) {
      logger.warn('Wager race scheduler is already running');
      return;
    }

    this.job = cron.schedule('*/5 * * * *', () => {
      WagerRaceScheduler.ensureRaces().catch((error) =>
        logger.error('Error in wager race scheduler tick:', error)
      );
    });

    WagerRaceScheduler.ensureRaces().catch((error) =>
      logger.error('Error in initial wager race reconcile:', error)
    );

    logger.info('Wager race scheduler started (reconciles hardcoded races every 5 min)');
  }

  static stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
    }
    logger.info('Wager race scheduler stopped');
  }
}
