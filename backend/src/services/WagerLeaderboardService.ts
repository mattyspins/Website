import { prisma } from '@/config/database';

const USER_SELECT = {
  id: true,
  displayName: true,
  kickUsername: true,
  avatarUrl: true,
} as const;

function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const HALF_DAY_MS = ONE_DAY_MS / 2;

/**
 * Wager data is stored per whole UTC day, but race start/end times rarely land on a UTC
 * day boundary (e.g. midnight BST). Including a boundary day outright whenever the race
 * window merely touches it would pull in a day's full wagered total for as little as an
 * hour of real overlap. Instead, a boundary day only counts if the race actually covers
 * at least half of it — the closest approximation possible without sub-day wager data.
 */
function firstIncludedDay(startDate: Date): Date {
  const dayStart = toDateOnly(startDate);
  const msIntoDay = startDate.getTime() - dayStart.getTime();
  return msIntoDay < HALF_DAY_MS ? dayStart : new Date(dayStart.getTime() + ONE_DAY_MS);
}

function lastIncludedDay(endDate: Date): Date {
  const dayStart = toDateOnly(endDate);
  const msIntoDay = endDate.getTime() - dayStart.getTime();
  return msIntoDay >= HALF_DAY_MS ? dayStart : new Date(dayStart.getTime() - ONE_DAY_MS);
}

interface RacePrize {
  position: number;
  amount: number;
}

type RacePhase = 'upcoming' | 'active' | 'ended';
export type RaceType = 'WEEKLY' | 'MONTHLY';

/**
 * `startDate`/`endDate` carry exact times (e.g. 18:30 BST) for display/countdown/status
 * purposes, but the underlying wager data (`RazedDailyWager`/`RazedUnlinkedWager`) is only
 * ever stored at whole-UTC-day granularity — so standings always aggregate by the whole
 * UTC calendar days the race's exact window overlaps, not sub-day precision.
 */
function getPhase(startDate: Date, endDate: Date, status: string): RacePhase {
  if (status === 'ended') return 'ended';
  const now = Date.now();
  if (now < startDate.getTime()) return 'upcoming';
  if (now >= endDate.getTime()) return 'ended';
  return 'active';
}

export class WagerLeaderboardService {
  /** Ranks every wagerer under our Razed code within [startDate, endDate] — linked site accounts and unlinked Razed usernames alike. */
  static async computeStandings(startDate: Date, endDate: Date, prizes: RacePrize[], limit = 50) {
    // Wager rows are date-only, so the query window snaps to whole UTC days that the
    // race's exact [startDate, endDate) window covers at least half of.
    const queryStart = firstIncludedDay(startDate);
    const queryEnd = lastIncludedDay(endDate);

    const [linkedSums, allLinkedUsers, unlinkedSums] = await Promise.all([
      prisma.razedDailyWager.groupBy({
        by: ['userId'],
        where: { date: { gte: queryStart, lte: queryEnd } },
        _sum: { amount: true },
      }),
      prisma.user.findMany({
        where: { rainbetUsername: { not: null } },
        select: { ...USER_SELECT, rainbetUsername: true },
      }),
      prisma.razedUnlinkedWager.groupBy({
        by: ['razedUsername'],
        where: { date: { gte: queryStart, lte: queryEnd } },
        _sum: { amount: true },
      }),
    ]);

    const userMap = new Map(allLinkedUsers.map((u) => [u.id, u]));
    const linkedUsernames = new Set(allLinkedUsers.map((u) => u.rainbetUsername!.toLowerCase()));

    const linkedRows = linkedSums
      .map((r) => {
        const wagered = Number(r._sum.amount ?? 0);
        const u = userMap.get(r.userId);
        if (!u || wagered <= 0) return null;
        return {
          userId: u.id as string | null,
          displayName: u.displayName,
          kickUsername: u.kickUsername,
          avatarUrl: u.avatarUrl,
          wagered,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const unlinkedRows = unlinkedSums
      .filter((r) => Number(r._sum.amount ?? 0) > 0 && !linkedUsernames.has(r.razedUsername))
      .map((r) => ({
        userId: null as string | null,
        displayName: r.razedUsername,
        kickUsername: null as string | null,
        avatarUrl: null as string | null,
        wagered: Number(r._sum.amount ?? 0),
      }));

    const combined = [...linkedRows, ...unlinkedRows]
      .sort((a, b) => b.wagered - a.wagered)
      .slice(0, limit);

    return combined.map((row, i) => {
      const position = i + 1;
      const prize = prizes.find((p) => p.position === position);
      return {
        position,
        userId: row.userId,
        displayName: row.displayName,
        kickUsername: row.kickUsername,
        avatarUrl: row.avatarUrl,
        wagered: row.wagered.toString(),
        prizeAmount: prize?.amount ?? null,
        linked: row.userId !== null,
      };
    });
  }

  /** The single currently-running race of this type (admin ensures only one is active per type at a time), with live standings. */
  static async getActiveRace(type: RaceType) {
    const race = await prisma.wagerRace.findFirst({
      where: { status: 'active', type },
      include: { prizes: { orderBy: { position: 'asc' } } },
      orderBy: { startDate: 'desc' },
    });
    if (!race) return null;

    const standings = await WagerLeaderboardService.computeStandings(race.startDate, race.endDate, race.prizes, 50);
    return {
      id: race.id,
      type: race.type as RaceType,
      startDate: race.startDate.toISOString(),
      endDate: race.endDate.toISOString(),
      totalPrizePool: race.totalPrizePool,
      phase: getPhase(race.startDate, race.endDate, race.status),
      prizes: race.prizes.map((p) => ({ position: p.position, amount: p.amount })),
      standings,
    };
  }

  static async getRaceHistory(type: RaceType, limit = 10) {
    const races = await prisma.wagerRace.findMany({
      where: { status: 'ended', type },
      include: {
        payouts: {
          include: { user: { select: { id: true, displayName: true, kickUsername: true, avatarUrl: true } } },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { endDate: 'desc' },
      take: limit,
    });

    return races.map((race) => ({
      id: race.id,
      type: race.type as RaceType,
      startDate: race.startDate.toISOString(),
      endDate: race.endDate.toISOString(),
      totalPrizePool: race.totalPrizePool,
      winners: race.payouts.map((p) => ({
        id: p.id,
        position: p.position,
        userId: p.userId,
        // Unlinked winners have no site account, so their Razed username is all we have.
        displayName: p.user?.displayName ?? p.razedUsername ?? 'Unknown',
        kickUsername: p.user?.kickUsername ?? null,
        avatarUrl: p.user?.avatarUrl ?? null,
        linked: p.userId !== null,
        wagered: p.wagered.toString(),
        prizeAmount: p.prizeAmount,
      })),
    }));
  }
}
