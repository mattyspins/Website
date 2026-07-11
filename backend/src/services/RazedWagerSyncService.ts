import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { RazedService } from '@/services/RazedService';
import { WagerLeaderboardService } from '@/services/WagerLeaderboardService';

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Gap between per-day Razed API calls in a backfill loop, so a multi-day walk doesn't itself trip Razed's rate limiting. */
const DAY_SYNC_DELAY_MS = 1500;

export interface SyncResult {
  syncedDays: number;
  failedDays: string[];
}

export class RazedWagerSyncService {
  /**
   * Syncs one calendar day's wagers for every verified Razed user, incrementing totalWagered by the observed delta.
   *
   * Razed's `/referrals/leaderboard` endpoint returns unreliable, near-empty results when queried with
   * `from === to` (a single day) — confirmed by direct testing against their API. Real multi-day ranges
   * are accurate, so we always fetch a 2-day window `[yesterday, date]` and derive `date`'s own amount by
   * subtracting yesterday's already-recorded amount from that window's total.
   */
  static async syncDay(date: Date): Promise<void> {
    if (!RazedService.isConfigured()) return;

    const dayStart = startOfDayUTC(date);
    const prevDayStart = new Date(dayStart);
    prevDayStart.setUTCDate(prevDayStart.getUTCDate() - 1);

    const windowMap = await RazedService.fetchAllReferrals(toDateStr(prevDayStart), toDateStr(dayStart));
    if (windowMap.size === 0) return;

    const users = await prisma.user.findMany({
      where: { rainbetUsername: { not: null } },
      select: { id: true, rainbetUsername: true },
    });
    const linkedUsernames = new Set(users.map((u) => u.rainbetUsername!.toLowerCase()));
    const userIds = users.map((u) => u.id);

    // Read every row this sync could touch up front (instead of one round trip per user)
    // so the writes below can go out as a couple of bulk statements. Each user's delta only
    // depends on their own previous rows, never another user's, so batching the reads changes
    // nothing about the result — it's the same computation, just without N sequential round trips.
    const [prevLinkedRows, existingDayRows] = await Promise.all([
      prisma.razedDailyWager.findMany({ where: { date: prevDayStart, userId: { in: userIds } } }),
      prisma.razedDailyWager.findMany({ where: { date: dayStart, userId: { in: userIds } } }),
    ]);
    const prevLinkedMap = new Map(prevLinkedRows.map((r) => [r.userId, Number(r.amount)]));
    const existingDayMap = new Map(existingDayRows.map((r) => [r.userId, Number(r.amount)]));

    const now = new Date();
    const dailyWagerRows: Prisma.Sql[] = [];
    const totalWageredDeltaRows: Prisma.Sql[] = [];

    for (const user of users) {
      const windowTotal = windowMap.get(user.rainbetUsername!.toLowerCase());
      if (windowTotal === undefined) continue;

      const prevDayAmount = prevLinkedMap.get(user.id) ?? 0;
      const wagered = Math.max(0, windowTotal - prevDayAmount);

      const previous = existingDayMap.get(user.id) ?? 0;
      const delta = wagered - previous;

      dailyWagerRows.push(Prisma.sql`(${randomUUID()}::text, ${user.id}::text, ${dayStart}::date, ${wagered}::numeric, ${now}::timestamp)`);
      if (delta !== 0) {
        totalWageredDeltaRows.push(Prisma.sql`(${user.id}::text, ${delta}::numeric)`);
      }
    }

    if (dailyWagerRows.length > 0) {
      await prisma.$executeRaw`
        INSERT INTO razed_daily_wagers (id, user_id, date, amount, updated_at)
        VALUES ${Prisma.join(dailyWagerRows)}
        ON CONFLICT (user_id, date) DO UPDATE SET amount = EXCLUDED.amount, updated_at = EXCLUDED.updated_at
      `;
    }

    if (totalWageredDeltaRows.length > 0) {
      await prisma.$executeRaw`
        UPDATE users AS u
        SET total_wagered = u.total_wagered + v.delta
        FROM (VALUES ${Prisma.join(totalWageredDeltaRows)}) AS v(id, delta)
        WHERE u.id = v.id
      `;
    }

    // Persist every other referred wagerer under our code too, even though they haven't
    // linked a site account yet, so admins can see who's wagering under our affiliate code.
    const prevUnlinkedRows = await prisma.razedUnlinkedWager.findMany({ where: { date: prevDayStart } });
    const prevUnlinkedMap = new Map(prevUnlinkedRows.map((r) => [r.razedUsername, Number(r.amount)]));

    const unlinkedWagerRows: Prisma.Sql[] = [];
    for (const [username, windowTotal] of windowMap) {
      if (linkedUsernames.has(username)) continue;

      const prevDayAmount = prevUnlinkedMap.get(username) ?? 0;
      const wagered = Math.max(0, windowTotal - prevDayAmount);

      unlinkedWagerRows.push(Prisma.sql`(${randomUUID()}::text, ${username}::text, ${dayStart}::date, ${wagered}::numeric, ${now}::timestamp)`);
    }

    if (unlinkedWagerRows.length > 0) {
      await prisma.$executeRaw`
        INSERT INTO razed_unlinked_wagers (id, razed_username, date, amount, updated_at)
        VALUES ${Prisma.join(unlinkedWagerRows)}
        ON CONFLICT (razed_username, date) DO UPDATE SET amount = EXCLUDED.amount, updated_at = EXCLUDED.updated_at
      `;
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
  static async syncRecentDays(daysBack = 2): Promise<SyncResult> {
    if (!RazedService.isConfigured()) {
      logger.warn('RazedWagerSyncService: RAZED_REFERRAL_KEY not set — skipping sync');
      return { syncedDays: 0, failedDays: [] };
    }

    const now = new Date();
    const failedDays: string[] = [];
    // Oldest day first — each day's amount is derived from the day before it, so that
    // dependency must already be recorded before we can compute the next one correctly.
    for (let i = daysBack; i >= 0; i--) {
      const day = new Date(now);
      day.setUTCDate(day.getUTCDate() - i);
      try {
        await RazedWagerSyncService.syncDay(day);
      } catch (err) {
        logger.error(`RazedWagerSyncService: failed to sync ${toDateStr(day)}`, { error: (err as Error).message });
        failedDays.push(toDateStr(day));
      }
      if (i > 0) await sleep(DAY_SYNC_DELAY_MS);
    }

    await RazedWagerSyncService.recomputeRollingStats();
    await RazedWagerSyncService.processRacePayoutsIfDue();
    return { syncedDays: daysBack + 1 - failedDays.length, failedDays };
  }

  /** First day the Razed referral code went live — the manual resync walks back to here. */
  static readonly TRACKING_START = new Date(Date.UTC(2026, 5, 26));

  /**
   * Syncs every day since `TRACKING_START` through today. The recurring cron only looks back
   * 2 days to stay cheap, which means anyone who wagered under our code earlier never gets
   * picked up — this is for the manual "Resync" action, so an admin can pull in everyone who's
   * wagered under the code at any point since launch, on demand.
   */
  static async syncSinceLaunch(): Promise<SyncResult> {
    if (!RazedService.isConfigured()) {
      logger.warn('RazedWagerSyncService: RAZED_REFERRAL_KEY not set — skipping sync');
      return { syncedDays: 0, failedDays: [] };
    }

    const now = new Date();
    const daysSinceLaunch = Math.floor((startOfDayUTC(now).getTime() - RazedWagerSyncService.TRACKING_START.getTime()) / 86400000);
    const failedDays: string[] = [];
    // Oldest day first — see the comment in syncRecentDays for why order matters here.
    for (let i = daysSinceLaunch; i >= 0; i--) {
      const day = new Date(now);
      day.setUTCDate(day.getUTCDate() - i);
      try {
        await RazedWagerSyncService.syncDay(day);
      } catch (err) {
        logger.error(`RazedWagerSyncService: failed to sync ${toDateStr(day)}`, { error: (err as Error).message });
        failedDays.push(toDateStr(day));
      }
      if (i > 0) await sleep(DAY_SYNC_DELAY_MS);
    }

    await RazedWagerSyncService.recomputeRollingStats();
    await RazedWagerSyncService.processRacePayoutsIfDue();
    return { syncedDays: daysSinceLaunch + 1 - failedDays.length, failedDays };
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
    if (trackedUserIds.length === 0) return;

    const [weeklySums, monthlySums] = await Promise.all([
      prisma.razedDailyWager.groupBy({ by: ['userId'], where: { date: { gte: weekStart } }, _sum: { amount: true } }),
      prisma.razedDailyWager.groupBy({ by: ['userId'], where: { date: { gte: monthStart } }, _sum: { amount: true } }),
    ]);
    const weeklyMap = new Map(weeklySums.map((r) => [r.userId, Number(r._sum.amount ?? 0)]));
    const monthlyMap = new Map(monthlySums.map((r) => [r.userId, Number(r._sum.amount ?? 0)]));

    const rows = trackedUserIds.map(({ userId }) =>
      Prisma.sql`(${userId}::text, ${weeklyMap.get(userId) ?? 0}::numeric, ${monthlyMap.get(userId) ?? 0}::numeric)`
    );

    await prisma.$executeRaw`
      UPDATE users AS u
      SET weekly_wagered = v.weekly, monthly_wagered = v.monthly
      FROM (VALUES ${Prisma.join(rows)}) AS v(id, weekly, monthly)
      WHERE u.id = v.id
    `;
  }

  /**
   * Records the winners of any admin-created race whose end date has passed and hasn't been
   * paid out yet. This is real money, not site currency, so it does NOT auto-credit anything —
   * it only creates the payout history rows so admins know who's owed what and can pay them out
   * manually, then marks the race "ended". Safe to call repeatedly — the per-race/per-user
   * unique payout rows guard against double-recording even if interrupted mid-run. Only linked
   * site accounts can be paid out (a payout must be attributed to a real user), so unlinked
   * Razed wagerers who'd otherwise place in the money are skipped.
   */
  static async processRacePayoutsIfDue(): Promise<void> {
    // Races now carry an exact end time (e.g. 18:30 BST) rather than a whole UTC day, so
    // "due" is judged against the precise instant, not day-truncated — otherwise a race
    // ending mid-day wouldn't pay out until the next UTC midnight.
    const now = new Date();

    const dueRaces = await prisma.wagerRace.findMany({
      where: { status: 'active', endDate: { lt: now } },
      include: { prizes: { orderBy: { position: 'asc' } } },
    });

    for (const race of dueRaces) {
      const standings = await WagerLeaderboardService.computeStandings(
        race.startDate,
        race.endDate,
        race.prizes,
        race.prizes.length
      );

      for (const row of standings) {
        if (!row.userId || row.prizeAmount === null) continue;

        const existingPayout = await prisma.wagerRacePayout.findUnique({
          where: { raceId_userId: { raceId: race.id, userId: row.userId } },
        });
        if (existingPayout) continue;

        await prisma.wagerRacePayout.create({
          data: {
            raceId: race.id,
            userId: row.userId,
            position: row.position,
            wagered: Number(row.wagered),
            prizeAmount: row.prizeAmount,
          },
        });

        logger.info(`RazedWagerSyncService: recorded $${row.prizeAmount} owed to user ${row.userId} for #${row.position} in race ${race.id} (pay out manually)`);
      }

      await prisma.wagerRace.update({ where: { id: race.id }, data: { status: 'ended' } });
      logger.info(`RazedWagerSyncService: race ${race.id} ended and payouts recorded`);
    }
  }
}
