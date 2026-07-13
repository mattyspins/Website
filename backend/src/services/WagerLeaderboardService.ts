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

interface RacePrize {
  position: number;
  amount: number;
}

type RacePhase = 'upcoming' | 'active' | 'ended';

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
    // race's exact [startDate, endDate) window overlaps.
    const queryStart = toDateOnly(startDate);
    const queryEnd = toDateOnly(endDate);

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

  /** The single currently-running race (admin ensures only one is active at a time), with live standings. */
  static async getActiveRace() {
    const race = await prisma.wagerRace.findFirst({
      where: { status: 'active' },
      include: { prizes: { orderBy: { position: 'asc' } } },
      orderBy: { startDate: 'desc' },
    });
    if (!race) return null;

    const standings = await WagerLeaderboardService.computeStandings(race.startDate, race.endDate, race.prizes, 50);
    return {
      id: race.id,
      startDate: race.startDate.toISOString(),
      endDate: race.endDate.toISOString(),
      totalPrizePool: race.totalPrizePool,
      phase: getPhase(race.startDate, race.endDate, race.status),
      prizes: race.prizes.map((p) => ({ position: p.position, amount: p.amount })),
      standings,
    };
  }

  static async getRaceHistory(limit = 10) {
    const races = await prisma.wagerRace.findMany({
      where: { status: 'ended' },
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
      startDate: race.startDate.toISOString(),
      endDate: race.endDate.toISOString(),
      totalPrizePool: race.totalPrizePool,
      winners: race.payouts.map((p) => ({
        position: p.position,
        userId: p.userId,
        displayName: p.user.displayName,
        kickUsername: p.user.kickUsername,
        avatarUrl: p.user.avatarUrl,
        wagered: p.wagered.toString(),
        prizeAmount: p.prizeAmount,
      })),
    }));
  }

  static async getAdminWagerList() {
    const users = await prisma.user.findMany({
      where: { rainbetUsername: { not: null } },
      select: {
        id: true,
        displayName: true,
        kickUsername: true,
        rainbetUsername: true,
        rainbetVerified: true,
        weeklyWagered: true,
        monthlyWagered: true,
        totalWagered: true,
      },
      orderBy: { totalWagered: 'desc' },
    });

    return users.map((u) => ({
      ...u,
      weeklyWagered: u.weeklyWagered.toString(),
      monthlyWagered: u.monthlyWagered.toString(),
      totalWagered: u.totalWagered.toString(),
    }));
  }

  /** Every player who has wagered under our Razed affiliate code, whether or not they've linked a site account. */
  static async getAllWagerers() {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    // Unlike weekly/monthly, there's no precomputed "today" column on User (those are
    // refreshed every 5 min by the sync job) — today's figure is cheap enough to sum live
    // for both linked and unlinked wagerers from the same daily ledger tables.
    const [linkedUsers, linkedToday, unlinkedTotals, unlinkedToday, unlinkedWeekly, unlinkedMonthly] = await Promise.all([
      prisma.user.findMany({
        where: { rainbetUsername: { not: null } },
        select: {
          id: true,
          displayName: true,
          kickUsername: true,
          rainbetUsername: true,
          rainbetVerified: true,
          weeklyWagered: true,
          monthlyWagered: true,
          totalWagered: true,
        },
      }),
      prisma.razedDailyWager.groupBy({ by: ['userId'], where: { date: { gte: todayStart } }, _sum: { amount: true } }),
      prisma.razedUnlinkedWager.groupBy({ by: ['razedUsername'], _sum: { amount: true } }),
      prisma.razedUnlinkedWager.groupBy({ by: ['razedUsername'], where: { date: { gte: todayStart } }, _sum: { amount: true } }),
      prisma.razedUnlinkedWager.groupBy({ by: ['razedUsername'], where: { date: { gte: weekStart } }, _sum: { amount: true } }),
      prisma.razedUnlinkedWager.groupBy({ by: ['razedUsername'], where: { date: { gte: monthStart } }, _sum: { amount: true } }),
    ]);

    const linkedUsernames = new Set(linkedUsers.map((u) => u.rainbetUsername!.toLowerCase()));
    const linkedTodayMap = new Map(linkedToday.map((r) => [r.userId, Number(r._sum.amount ?? 0)]));
    const todayMap = new Map(unlinkedToday.map((r) => [r.razedUsername, Number(r._sum.amount ?? 0)]));
    const weeklyMap = new Map(unlinkedWeekly.map((r) => [r.razedUsername, Number(r._sum.amount ?? 0)]));
    const monthlyMap = new Map(unlinkedMonthly.map((r) => [r.razedUsername, Number(r._sum.amount ?? 0)]));

    const linked = linkedUsers.map((u) => ({
      razedUsername: u.rainbetUsername!,
      linked: true as const,
      userId: u.id,
      displayName: u.displayName,
      kickUsername: u.kickUsername,
      verified: u.rainbetVerified,
      todayWagered: (linkedTodayMap.get(u.id) ?? 0).toString(),
      weeklyWagered: u.weeklyWagered.toString(),
      monthlyWagered: u.monthlyWagered.toString(),
      totalWagered: u.totalWagered.toString(),
    }));

    const unlinked = unlinkedTotals
      .filter((r) => !linkedUsernames.has(r.razedUsername))
      .map((r) => ({
        razedUsername: r.razedUsername,
        linked: false as const,
        userId: null,
        displayName: null,
        kickUsername: null,
        verified: false,
        todayWagered: (todayMap.get(r.razedUsername) ?? 0).toString(),
        weeklyWagered: (weeklyMap.get(r.razedUsername) ?? 0).toString(),
        monthlyWagered: (monthlyMap.get(r.razedUsername) ?? 0).toString(),
        totalWagered: (r._sum.amount ?? 0).toString(),
      }));

    return [...linked, ...unlinked].sort((a, b) => Number(b.totalWagered) - Number(a.totalWagered));
  }

  /** Combined wagered total across every wagerer under our Razed code — today / this week / this month / all-time. */
  static async getWagerTotals() {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const weekStart = new Date(todayStart);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [linkedUsers, linkedAgg, linkedTodayAgg, unlinkedToday, unlinkedWeekly, unlinkedMonthly, unlinkedAllTime] = await Promise.all([
      prisma.user.findMany({ where: { rainbetUsername: { not: null } }, select: { rainbetUsername: true } }),
      prisma.user.aggregate({
        where: { rainbetUsername: { not: null } },
        _sum: { weeklyWagered: true, monthlyWagered: true, totalWagered: true },
      }),
      prisma.razedDailyWager.aggregate({ where: { date: { gte: todayStart } }, _sum: { amount: true } }),
      prisma.razedUnlinkedWager.groupBy({ by: ['razedUsername'], where: { date: { gte: todayStart } }, _sum: { amount: true } }),
      prisma.razedUnlinkedWager.groupBy({ by: ['razedUsername'], where: { date: { gte: weekStart } }, _sum: { amount: true } }),
      prisma.razedUnlinkedWager.groupBy({ by: ['razedUsername'], where: { date: { gte: monthStart } }, _sum: { amount: true } }),
      prisma.razedUnlinkedWager.groupBy({ by: ['razedUsername'], _sum: { amount: true } }),
    ]);

    // Same dedup rule as getAllWagerers() — once a razedUsername is linked to a site account
    // it's excluded from the unlinked side, whether or not its history has been migrated yet.
    const linkedUsernames = new Set(linkedUsers.map((u) => u.rainbetUsername!.toLowerCase()));
    const sumUnlinked = (rows: { razedUsername: string; _sum: { amount: unknown } }[]) =>
      rows
        .filter((r) => !linkedUsernames.has(r.razedUsername))
        .reduce((sum, r) => sum + Number(r._sum.amount ?? 0), 0);

    const today = Number(linkedTodayAgg._sum.amount ?? 0) + sumUnlinked(unlinkedToday);
    const weekly = Number(linkedAgg._sum.weeklyWagered ?? 0) + sumUnlinked(unlinkedWeekly);
    const monthly = Number(linkedAgg._sum.monthlyWagered ?? 0) + sumUnlinked(unlinkedMonthly);
    const allTime = Number(linkedAgg._sum.totalWagered ?? 0) + sumUnlinked(unlinkedAllTime);

    return {
      today: today.toString(),
      weekly: weekly.toString(),
      monthly: monthly.toString(),
      allTime: allTime.toString(),
    };
  }

  // ── Admin: race management ──────────────────────────────────────────────

  static async listRaces() {
    const races = await prisma.wagerRace.findMany({
      include: { prizes: { orderBy: { position: 'asc' } } },
      orderBy: { startDate: 'desc' },
    });
    return races.map((r) => ({
      id: r.id,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate.toISOString(),
      totalPrizePool: r.totalPrizePool,
      status: r.status,
      phase: getPhase(r.startDate, r.endDate, r.status),
      prizes: r.prizes.map((p) => ({ position: p.position, amount: p.amount })),
    }));
  }

  private static validatePrizes(prizes: RacePrize[], totalPrizePool: number) {
    if (!Array.isArray(prizes) || prizes.length === 0) {
      throw new Error('At least one prize position is required');
    }
    const positions = prizes.map((p) => p.position);
    if (new Set(positions).size !== positions.length) {
      throw new Error('Prize positions must be unique');
    }
    for (const p of prizes) {
      if (!Number.isInteger(p.position) || p.position < 1) {
        throw new Error('Prize positions must be positive whole numbers');
      }
      if (!Number.isFinite(p.amount) || p.amount < 0) {
        throw new Error('Prize amounts must be zero or greater');
      }
    }
    if (!Number.isFinite(totalPrizePool) || totalPrizePool < 0) {
      throw new Error('Total prize pool must be zero or greater');
    }
    const sum = prizes.reduce((s, p) => s + p.amount, 0);
    if (sum !== totalPrizePool) {
      throw new Error(`Prize positions sum to ${sum}, which doesn't match the total prize pool of ${totalPrizePool}`);
    }
  }

  static async createRace(input: { startDate: string; endDate: string; totalPrizePool: number; prizes: RacePrize[] }) {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid start or end date');
    }
    if (endDate.getTime() <= startDate.getTime()) {
      throw new Error('End date must be after the start date');
    }
    WagerLeaderboardService.validatePrizes(input.prizes, input.totalPrizePool);

    const existingActive = await prisma.wagerRace.findFirst({ where: { status: 'active' } });
    if (existingActive) {
      throw new Error('A race is already active. End or delete it before creating a new one.');
    }

    const race = await prisma.wagerRace.create({
      data: {
        startDate,
        endDate,
        totalPrizePool: input.totalPrizePool,
        prizes: { create: input.prizes.map((p) => ({ position: p.position, amount: p.amount })) },
      },
      include: { prizes: { orderBy: { position: 'asc' } } },
    });

    return {
      id: race.id,
      startDate: race.startDate.toISOString(),
      endDate: race.endDate.toISOString(),
      totalPrizePool: race.totalPrizePool,
      status: race.status,
      phase: getPhase(race.startDate, race.endDate, race.status),
      prizes: race.prizes.map((p) => ({ position: p.position, amount: p.amount })),
    };
  }

  static async updateRace(raceId: string, input: { startDate?: string; endDate?: string; totalPrizePool?: number; prizes?: RacePrize[] }) {
    const race = await prisma.wagerRace.findUnique({ where: { id: raceId } });
    if (!race) throw new Error('Race not found');
    if (race.status !== 'active') throw new Error('Cannot edit a race that has already ended and been paid out');

    const startDate = input.startDate ? new Date(input.startDate) : race.startDate;
    const endDate = input.endDate ? new Date(input.endDate) : race.endDate;
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid start or end date');
    }
    if (endDate.getTime() <= startDate.getTime()) {
      throw new Error('End date must be after the start date');
    }
    const totalPrizePool = input.totalPrizePool ?? race.totalPrizePool;
    if (input.prizes) {
      WagerLeaderboardService.validatePrizes(input.prizes, totalPrizePool);
    } else if (input.totalPrizePool !== undefined) {
      // totalPrizePool changed without new prizes — re-validate against the existing ones.
      const existingPrizes = await prisma.wagerRacePrize.findMany({ where: { raceId } });
      WagerLeaderboardService.validatePrizes(existingPrizes, totalPrizePool);
    }

    await prisma.$transaction(async (tx) => {
      await tx.wagerRace.update({ where: { id: raceId }, data: { startDate, endDate, totalPrizePool } });
      if (input.prizes) {
        await tx.wagerRacePrize.deleteMany({ where: { raceId } });
        await tx.wagerRacePrize.createMany({
          data: input.prizes.map((p) => ({ raceId, position: p.position, amount: p.amount })),
        });
      }
    });

    return WagerLeaderboardService.getRace(raceId);
  }

  static async getRace(raceId: string) {
    const race = await prisma.wagerRace.findUnique({
      where: { id: raceId },
      include: { prizes: { orderBy: { position: 'asc' } } },
    });
    if (!race) throw new Error('Race not found');
    return {
      id: race.id,
      startDate: race.startDate.toISOString(),
      endDate: race.endDate.toISOString(),
      totalPrizePool: race.totalPrizePool,
      status: race.status,
      phase: getPhase(race.startDate, race.endDate, race.status),
      prizes: race.prizes.map((p) => ({ position: p.position, amount: p.amount })),
    };
  }

  static async deleteRace(raceId: string) {
    const payoutCount = await prisma.wagerRacePayout.count({ where: { raceId } });
    if (payoutCount > 0) throw new Error('Cannot delete a race that has already been paid out');
    await prisma.wagerRace.delete({ where: { id: raceId } });
  }
}
