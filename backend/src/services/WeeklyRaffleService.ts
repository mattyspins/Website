import crypto from 'crypto';
import { Server as SocketIOServer } from 'socket.io';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/database';
import { createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

// Extensible eligibility-requirement union — add new "type" values here and
// teach evaluateRequirement() how to check them, no schema migration needed.
export type WeeklyRaffleRequirement = { type: 'MIN_WEEKLY_WAGER'; value: number };

interface EligibleUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  wagered: number;
}

const USER_SUMMARY_SELECT = { id: true, displayName: true, avatarUrl: true } as const;

export class WeeklyRaffleService {
  // Monday 00:00 UTC of the week containing `referenceDate`, through the following Monday.
  static getCurrentWeekBounds(referenceDate: Date = new Date()): { weekStart: Date; weekEnd: Date } {
    const d = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));
    const day = d.getUTCDay(); // 0 = Sunday ... 6 = Saturday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diffToMonday);
    const weekEnd = new Date(d);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    return { weekStart: d, weekEnd };
  }

  static async createForCurrentWeek(requirements: WeeklyRaffleRequirement[], adminId: string) {
    const { weekStart, weekEnd } = this.getCurrentWeekBounds();
    const existing = await prisma.weeklyRaffle.findUnique({ where: { weekStart } });
    if (existing) {
      throw createError.conflict('A weekly raffle for this week already exists');
    }
    return prisma.weeklyRaffle.create({
      data: {
        weekStart,
        weekEnd,
        requirements: requirements as unknown as Prisma.InputJsonValue,
        createdBy: adminId,
      },
    });
  }

  static async getCurrent() {
    const { weekStart } = this.getCurrentWeekBounds();
    return prisma.weeklyRaffle.findUnique({
      where: { weekStart },
      include: { winner: { select: USER_SUMMARY_SELECT } },
    });
  }

  static async getById(id: string) {
    const raffle = await prisma.weeklyRaffle.findUnique({
      where: { id },
      include: { winner: { select: USER_SUMMARY_SELECT } },
    });
    if (!raffle) throw createError.notFound('Weekly raffle not found');
    return raffle;
  }

  static async getHistory(limit = 20) {
    return prisma.weeklyRaffle.findMany({
      where: { status: 'DRAWN' },
      orderBy: { weekStart: 'desc' },
      take: limit,
      include: { winner: { select: USER_SUMMARY_SELECT } },
    });
  }

  static async getEligibleParticipants(raffleId: string): Promise<EligibleUser[]> {
    const raffle = await this.getById(raffleId);
    const requirements = (raffle.requirements as unknown as WeeklyRaffleRequirement[]) ?? [];
    return this.computeEligibleUsers(prisma, raffle.weekStart, raffle.weekEnd, requirements);
  }

  static async getUserEligibility(raffleId: string, userId: string) {
    const raffle = await this.getById(raffleId);
    const requirements = (raffle.requirements as unknown as WeeklyRaffleRequirement[]) ?? [];

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { rainbetVerified: true, isSuspended: true },
    });

    const wagerSum = await prisma.razedDailyWager.aggregate({
      where: { userId, date: { gte: raffle.weekStart, lt: raffle.weekEnd } },
      _sum: { amount: true },
    });
    const wagered = Number(wagerSum._sum.amount ?? 0);

    const reasons: string[] = [];
    if (!user) {
      reasons.push('Account not found');
    } else {
      if (!user.rainbetVerified) reasons.push('Connect and verify your Razed account');
      if (user.isSuspended) reasons.push('Your account is currently suspended');
    }
    for (const req of requirements) {
      if (req.type === 'MIN_WEEKLY_WAGER' && wagered < req.value) {
        reasons.push(`Wager at least $${req.value.toLocaleString()} this week (current: $${wagered.toLocaleString()})`);
      }
    }

    return { eligible: reasons.length === 0, reasons, wagered, requirements };
  }

  // Draws the winner: builds the eligible pool, shuffles it with a CSPRNG, and
  // persists the result (winner + full elimination order) in one transaction
  // BEFORE returning — the reveal animation only ever replays this stored,
  // already-committed outcome, never influences it.
  static async draw(raffleId: string, adminId: string, io?: SocketIOServer) {
    const payload = await prisma.$transaction(async (tx) => {
      const raffle = await tx.weeklyRaffle.findUnique({ where: { id: raffleId } });
      if (!raffle) throw createError.notFound('Weekly raffle not found');
      if (raffle.status === 'DRAWN') {
        throw createError.conflict('This raffle has already been drawn');
      }

      const requirements = (raffle.requirements as unknown as WeeklyRaffleRequirement[]) ?? [];
      const eligible = await this.computeEligibleUsers(tx, raffle.weekStart, raffle.weekEnd, requirements);
      if (eligible.length === 0) {
        throw createError.badRequest('No eligible participants to draw from');
      }

      // Fisher-Yates shuffle with a CSPRNG — the last element of a uniformly
      // random permutation is itself a uniformly random winner.
      const shuffled = [...eligible];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const eliminationOrder = shuffled.map((u) => u.id);
      const winner = shuffled[shuffled.length - 1];

      const updated = await tx.weeklyRaffle.update({
        where: { id: raffleId },
        data: {
          status: 'DRAWN',
          winnerUserId: winner.id,
          eliminationOrder,
          eligibleCount: eligible.length,
          drawnAt: new Date(),
          drawnBy: adminId,
        },
        include: { winner: { select: USER_SUMMARY_SELECT } },
      });

      return { raffle: updated, eliminationOrder, participants: shuffled };
    });

    logger.info(`Weekly raffle ${raffleId} drawn by admin ${adminId}, winner ${payload.raffle.winnerUserId}`);
    io?.to(`weeklyRaffle:${raffleId}`).emit('weeklyRaffle:drawn', payload);
    io?.emit('weeklyRaffle:drawn', payload);
    return payload;
  }

  private static async computeEligibleUsers(
    db: Prisma.TransactionClient,
    weekStart: Date,
    weekEnd: Date,
    requirements: WeeklyRaffleRequirement[]
  ): Promise<EligibleUser[]> {
    const verifiedUsers = await db.user.findMany({
      where: { rainbetVerified: true, isSuspended: false },
      select: USER_SUMMARY_SELECT,
    });
    if (verifiedUsers.length === 0) return [];

    const wagerSums = await db.razedDailyWager.groupBy({
      by: ['userId'],
      where: { userId: { in: verifiedUsers.map((u) => u.id) }, date: { gte: weekStart, lt: weekEnd } },
      _sum: { amount: true },
    });
    const wagerMap = new Map(wagerSums.map((w) => [w.userId, Number(w._sum.amount ?? 0)]));

    const minWagerReq = requirements.find((r) => r.type === 'MIN_WEEKLY_WAGER');
    const minWager = minWagerReq?.value ?? 0;

    return verifiedUsers
      .map((u) => ({ ...u, wagered: wagerMap.get(u.id) ?? 0 }))
      .filter((u) => u.wagered >= minWager);
  }
}
