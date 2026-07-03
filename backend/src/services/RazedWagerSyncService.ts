import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { RazedService } from '@/services/RazedService';
import { PointsService } from '@/services/PointsService';

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export class RazedWagerSyncService {
  /** Syncs one calendar day's wagers for every verified Razed user, incrementing totalWagered by the observed delta. */
  static async syncDay(date: Date): Promise<void> {
    if (!RazedService.isConfigured()) return;

    const dateStr = toDateStr(date);
    const dayStart = startOfDayUTC(date);

    const wagerMap = await RazedService.fetchAllReferrals(dateStr, dateStr);
    if (wagerMap.size === 0) return;

    const users = await prisma.user.findMany({
      where: { rainbetUsername: { not: null } },
      select: { id: true, rainbetUsername: true },
    });
    const linkedUsernames = new Set(users.map((u) => u.rainbetUsername!.toLowerCase()));

    for (const user of users) {
      const wagered = wagerMap.get(user.rainbetUsername!.toLowerCase());
      if (wagered === undefined) continue;

      const existing = await prisma.razedDailyWager.findUnique({
        where: { userId_date: { userId: user.id, date: dayStart } },
      });
      const previous = existing ? Number(existing.amount) : 0;
      const delta = wagered - previous;

      await prisma.razedDailyWager.upsert({
        where: { userId_date: { userId: user.id, date: dayStart } },
        create: { userId: user.id, date: dayStart, amount: wagered },
        update: { amount: wagered },
      });

      if (delta !== 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: { totalWagered: { increment: delta } },
        });
      }
    }

    // Persist every other referred wagerer under our code too, even though they haven't
    // linked a site account yet, so admins can see who's wagering under our affiliate code.
    for (const [username, wagered] of wagerMap) {
      if (linkedUsernames.has(username)) continue;

      await prisma.razedUnlinkedWager.upsert({
        where: { razedUsername_date: { razedUsername: username, date: dayStart } },
        create: { razedUsername: username, date: dayStart, amount: wagered },
        update: { amount: wagered },
      });
    }
  }

  /**
   * Moves any wagers captured under `razedUsername` while it wasn't linked to a site account
   * (e.g. before this user linked, or while they had a stale/wrong username saved) into this
   * user's own daily wager rows, then removes the now-claimed orphaned rows. Call this right
   * after a username is verified so historical activity isn't silently lost.
   */
  static async migrateUnlinkedWagersToUser(userId: string, razedUsername: string): Promise<void> {
    const username = razedUsername.toLowerCase();
    const orphaned = await prisma.razedUnlinkedWager.findMany({ where: { razedUsername: username } });
    if (orphaned.length === 0) return;

    let totalDelta = 0;
    for (const row of orphaned) {
      const existing = await prisma.razedDailyWager.findUnique({
        where: { userId_date: { userId, date: row.date } },
      });
      const previous = existing ? Number(existing.amount) : 0;
      const amount = Number(row.amount);

      await prisma.razedDailyWager.upsert({
        where: { userId_date: { userId, date: row.date } },
        create: { userId, date: row.date, amount },
        update: { amount },
      });
      totalDelta += amount - previous;
    }

    if (totalDelta !== 0) {
      await prisma.user.update({ where: { id: userId }, data: { totalWagered: { increment: totalDelta } } });
    }

    await prisma.razedUnlinkedWager.deleteMany({ where: { razedUsername: username } });
    await RazedWagerSyncService.recomputeRollingStats();

    logger.info(`RazedWagerSyncService: migrated ${orphaned.length} orphaned day(s) of wagers to user ${userId} (${razedUsername})`);
  }

  /** Syncs today plus the last `daysBack` days (catches late corrections from Razed), then refreshes rolling stats. */
  static async syncRecentDays(daysBack = 2): Promise<void> {
    if (!RazedService.isConfigured()) {
      logger.warn('RazedWagerSyncService: RAZED_REFERRAL_KEY not set — skipping sync');
      return;
    }

    const now = new Date();
    for (let i = 0; i <= daysBack; i++) {
      const day = new Date(now);
      day.setUTCDate(day.getUTCDate() - i);
      try {
        await RazedWagerSyncService.syncDay(day);
      } catch (err) {
        logger.error(`RazedWagerSyncService: failed to sync ${toDateStr(day)}`, { error: (err as Error).message });
      }
    }

    await RazedWagerSyncService.recomputeRollingStats();
    await RazedWagerSyncService.processMonthlyPayoutIfDue();
  }

  /** First day the Razed referral code went live — the manual resync walks back to here. */
  static readonly TRACKING_START = new Date(Date.UTC(2026, 5, 26));

  /**
   * Syncs every day since `TRACKING_START` through today. The recurring cron only looks back
   * 2 days to stay cheap, which means anyone who wagered under our code earlier never gets
   * picked up — this is for the manual "Resync" action, so an admin can pull in everyone who's
   * wagered under the code at any point since launch, on demand.
   */
  static async syncSinceLaunch(): Promise<void> {
    if (!RazedService.isConfigured()) {
      logger.warn('RazedWagerSyncService: RAZED_REFERRAL_KEY not set — skipping sync');
      return;
    }

    const now = new Date();
    const daysSinceLaunch = Math.floor((startOfDayUTC(now).getTime() - RazedWagerSyncService.TRACKING_START.getTime()) / 86400000);
    for (let i = 0; i <= daysSinceLaunch; i++) {
      const day = new Date(now);
      day.setUTCDate(day.getUTCDate() - i);
      try {
        await RazedWagerSyncService.syncDay(day);
      } catch (err) {
        logger.error(`RazedWagerSyncService: failed to sync ${toDateStr(day)}`, { error: (err as Error).message });
      }
    }

    await RazedWagerSyncService.recomputeRollingStats();
    await RazedWagerSyncService.processMonthlyPayoutIfDue();
  }

  /** Recomputes weeklyWagered (trailing 7 days) and monthlyWagered (current calendar month) for every tracked user. */
  static async recomputeRollingStats(): Promise<void> {
    const now = new Date();
    const weekStart = startOfDayUTC(now);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);
    const monthStart = startOfMonthUTC(now);

    const trackedUserIds = await prisma.razedDailyWager.findMany({
      distinct: ['userId'],
      select: { userId: true },
    });

    const [weeklySums, monthlySums] = await Promise.all([
      prisma.razedDailyWager.groupBy({ by: ['userId'], where: { date: { gte: weekStart } }, _sum: { amount: true } }),
      prisma.razedDailyWager.groupBy({ by: ['userId'], where: { date: { gte: monthStart } }, _sum: { amount: true } }),
    ]);
    const weeklyMap = new Map(weeklySums.map((r) => [r.userId, Number(r._sum.amount ?? 0)]));
    const monthlyMap = new Map(monthlySums.map((r) => [r.userId, Number(r._sum.amount ?? 0)]));

    for (const { userId } of trackedUserIds) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          weeklyWagered: weeklyMap.get(userId) ?? 0,
          monthlyWagered: monthlyMap.get(userId) ?? 0,
        },
      });
    }
  }

  /**
   * Pays out the fixed points-prize table to the top finishers of the most recently completed
   * calendar month, if that month hasn't been fully paid out yet. Safe to call repeatedly —
   * per-user payout rows guard against double-awarding even if interrupted mid-run.
   */
  static async processMonthlyPayoutIfDue(): Promise<void> {
    const now = new Date();
    const currentMonthStart = startOfMonthUTC(now);
    const previousMonthStart = new Date(Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth() - 1, 1));

    const prizes = await prisma.monthlyLeaderboardPrize.findMany({ orderBy: { position: 'asc' } });
    if (prizes.length === 0) return;

    const alreadyPaidCount = await prisma.monthlyLeaderboardPayout.count({ where: { monthStart: previousMonthStart } });
    if (alreadyPaidCount >= prizes.length) return;

    const standings = await prisma.razedDailyWager.groupBy({
      by: ['userId'],
      where: { date: { gte: previousMonthStart, lt: currentMonthStart } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: prizes.length,
    });

    const monthLabel = previousMonthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    for (let i = 0; i < standings.length; i++) {
      const position = i + 1;
      const prize = prizes.find((p) => p.position === position);
      if (!prize) continue;

      const { userId } = standings[i];
      const wagered = Number(standings[i]._sum.amount ?? 0);

      const existingPayout = await prisma.monthlyLeaderboardPayout.findUnique({
        where: { monthStart_userId: { monthStart: previousMonthStart, userId } },
      });
      if (existingPayout) continue;

      await PointsService.addPoints({
        userId,
        amount: prize.points,
        reason: `Monthly wager leaderboard — ${monthLabel} (#${position})`,
        referenceType: 'monthly_wager_leaderboard',
      });

      await prisma.monthlyLeaderboardPayout.create({
        data: { monthStart: previousMonthStart, userId, position, wagered, pointsAwarded: prize.points },
      });

      logger.info(`RazedWagerSyncService: paid ${prize.points} points to user ${userId} for #${position} in ${monthLabel}`);
    }
  }
}
