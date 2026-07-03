import { prisma } from '@/config/database';

const USER_SELECT = {
  id: true,
  displayName: true,
  kickUsername: true,
  avatarUrl: true,
  monthlyWagered: true,
} as const;

export class WagerLeaderboardService {
  static async getMonthlyStandings(limit = 50) {
    const [users, prizes] = await Promise.all([
      prisma.user.findMany({
        where: { rainbetUsername: { not: null }, monthlyWagered: { gt: 0 } },
        select: USER_SELECT,
        orderBy: { monthlyWagered: 'desc' },
        take: limit,
      }),
      prisma.monthlyLeaderboardPrize.findMany({ orderBy: { position: 'asc' } }),
    ]);

    return users.map((u, i) => {
      const position = i + 1;
      const prize = prizes.find((p) => p.position === position);
      return {
        position,
        userId: u.id,
        displayName: u.displayName,
        kickUsername: u.kickUsername,
        avatarUrl: u.avatarUrl,
        wagered: u.monthlyWagered.toString(),
        points: prize?.points ?? null,
      };
    });
  }

  static async getMonthlyHistory(limit = 6) {
    const payouts = await prisma.monthlyLeaderboardPayout.findMany({
      include: { user: { select: { id: true, displayName: true, kickUsername: true, avatarUrl: true } } },
      orderBy: [{ monthStart: 'desc' }, { position: 'asc' }],
    });

    const byMonth = new Map<string, typeof payouts>();
    for (const p of payouts) {
      const key = p.monthStart.toISOString().slice(0, 10);
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(p);
    }

    return Array.from(byMonth.entries())
      .slice(0, limit)
      .map(([monthStart, winners]) => ({
        monthStart,
        winners: winners.map((w) => ({
          position: w.position,
          userId: w.userId,
          displayName: w.user.displayName,
          kickUsername: w.user.kickUsername,
          avatarUrl: w.user.avatarUrl,
          wagered: w.wagered.toString(),
          pointsAwarded: w.pointsAwarded,
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

  static async getPrizes() {
    return prisma.monthlyLeaderboardPrize.findMany({ orderBy: { position: 'asc' } });
  }

  static async setPrizes(prizes: { position: number; points: number }[]) {
    await prisma.$transaction(
      prizes.map((p) =>
        prisma.monthlyLeaderboardPrize.upsert({
          where: { position: p.position },
          create: { position: p.position, points: p.points },
          update: { points: p.points },
        })
      )
    );
    return WagerLeaderboardService.getPrizes();
  }
}
