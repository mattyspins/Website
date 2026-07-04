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

export class WagerLeaderboardService {
  /** Ranks every wagerer under our Razed code within [startDate, endDate] — linked site accounts and unlinked Razed usernames alike. */
  static async computeStandings(startDate: Date, endDate: Date, prizes: RacePrize[], limit = 50) {
    const [linkedSums, allLinkedUsers, unlinkedSums] = await Promise.all([
      prisma.razedDailyWager.groupBy({
        by: ['userId'],
        where: { date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
      }),
      prisma.user.findMany({
        where: { rainbetUsername: { not: null } },
        select: { ...USER_SELECT, rainbetUsername: true },
      }),
      prisma.razedUnlinkedWager.groupBy({
        by: ['razedUsername'],
        where: { date: { gte: startDate, lte: endDate } },
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
      startDate: race.startDate.toISOString().slice(0, 10),
      endDate: race.endDate.toISOString().slice(0, 10),
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
      startDate: race.startDate.toISOString().slice(0, 10),
      endDate: race.endDate.toISOString().slice(0, 10),
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
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [linkedUsers, unlinkedTotals, unlinkedWeekly, unlinkedMonthly] = await Promise.all([
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
      prisma.razedUnlinkedWager.groupBy({ by: ['razedUsername'], _sum: { amount: true } }),
      prisma.razedUnlinkedWager.groupBy({ by: ['razedUsername'], where: { date: { gte: weekStart } }, _sum: { amount: true } }),
      prisma.razedUnlinkedWager.groupBy({ by: ['razedUsername'], where: { date: { gte: monthStart } }, _sum: { amount: true } }),
    ]);

    const linkedUsernames = new Set(linkedUsers.map((u) => u.rainbetUsername!.toLowerCase()));
    const weeklyMap = new Map(unlinkedWeekly.map((r) => [r.razedUsername, Number(r._sum.amount ?? 0)]));
    const monthlyMap = new Map(unlinkedMonthly.map((r) => [r.razedUsername, Number(r._sum.amount ?? 0)]));

    const linked = linkedUsers.map((u) => ({
      razedUsername: u.rainbetUsername!,
      linked: true as const,
      userId: u.id,
      displayName: u.displayName,
      kickUsername: u.kickUsername,
      verified: u.rainbetVerified,
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
        weeklyWagered: (weeklyMap.get(r.razedUsername) ?? 0).toString(),
        monthlyWagered: (monthlyMap.get(r.razedUsername) ?? 0).toString(),
        totalWagered: (r._sum.amount ?? 0).toString(),
      }));

    return [...linked, ...unlinked].sort((a, b) => Number(b.totalWagered) - Number(a.totalWagered));
  }

  // ── Admin: race management ──────────────────────────────────────────────

  static async listRaces() {
    const races = await prisma.wagerRace.findMany({
      include: { prizes: { orderBy: { position: 'asc' } } },
      orderBy: { startDate: 'desc' },
    });
    return races.map((r) => ({
      id: r.id,
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate.toISOString().slice(0, 10),
      status: r.status,
      prizes: r.prizes.map((p) => ({ position: p.position, amount: p.amount })),
    }));
  }

  private static validatePrizes(prizes: RacePrize[]) {
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
  }

  static async createRace(input: { startDate: string; endDate: string; prizes: RacePrize[] }) {
    const startDate = toDateOnly(new Date(input.startDate));
    const endDate = toDateOnly(new Date(input.endDate));
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid start or end date');
    }
    if (endDate.getTime() < startDate.getTime()) {
      throw new Error('End date must be on or after the start date');
    }
    WagerLeaderboardService.validatePrizes(input.prizes);

    const existingActive = await prisma.wagerRace.findFirst({ where: { status: 'active' } });
    if (existingActive) {
      throw new Error('A race is already active. End or delete it before creating a new one.');
    }

    const race = await prisma.wagerRace.create({
      data: {
        startDate,
        endDate,
        prizes: { create: input.prizes.map((p) => ({ position: p.position, amount: p.amount })) },
      },
      include: { prizes: { orderBy: { position: 'asc' } } },
    });

    return {
      id: race.id,
      startDate: race.startDate.toISOString().slice(0, 10),
      endDate: race.endDate.toISOString().slice(0, 10),
      status: race.status,
      prizes: race.prizes.map((p) => ({ position: p.position, amount: p.amount })),
    };
  }

  static async updateRace(raceId: string, input: { startDate?: string; endDate?: string; prizes?: RacePrize[] }) {
    const race = await prisma.wagerRace.findUnique({ where: { id: raceId } });
    if (!race) throw new Error('Race not found');
    if (race.status !== 'active') throw new Error('Cannot edit a race that has already ended and been paid out');

    const startDate = input.startDate ? toDateOnly(new Date(input.startDate)) : race.startDate;
    const endDate = input.endDate ? toDateOnly(new Date(input.endDate)) : race.endDate;
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid start or end date');
    }
    if (endDate.getTime() < startDate.getTime()) {
      throw new Error('End date must be on or after the start date');
    }
    if (input.prizes) WagerLeaderboardService.validatePrizes(input.prizes);

    await prisma.$transaction(async (tx) => {
      await tx.wagerRace.update({ where: { id: raceId }, data: { startDate, endDate } });
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
      startDate: race.startDate.toISOString().slice(0, 10),
      endDate: race.endDate.toISOString().slice(0, 10),
      status: race.status,
      prizes: race.prizes.map((p) => ({ position: p.position, amount: p.amount })),
    };
  }

  static async deleteRace(raceId: string) {
    const payoutCount = await prisma.wagerRacePayout.count({ where: { raceId } });
    if (payoutCount > 0) throw new Error('Cannot delete a race that has already been paid out');
    await prisma.wagerRace.delete({ where: { id: raceId } });
  }
}
