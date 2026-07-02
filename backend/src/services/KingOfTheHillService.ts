import { randomInt } from 'crypto';
import { prisma } from '@/config/database';
import { Server as SocketIOServer } from 'socket.io';
import { createError } from '@/middleware/errorHandler';
import { KingOfTheHillStatus, KothEntryStatus } from '@prisma/client';
import { logger } from '@/utils/logger';

const USER_SELECT = { id: true, displayName: true, kickUsername: true, avatarUrl: true };

const INCLUDE = {
  entries: {
    include: { user: { select: USER_SELECT } },
    orderBy: { joinedAt: 'asc' as const },
  },
  rounds: {
    include: { user: { select: USER_SELECT } },
    orderBy: { drawnAt: 'asc' as const },
  },
};

export class KingOfTheHillService {
  static async create(label?: string, io?: SocketIOServer) {
    await prisma.kingOfTheHill.updateMany({
      where: { status: KingOfTheHillStatus.OPEN },
      data: { status: KingOfTheHillStatus.CLOSED, closedAt: new Date() },
    });

    const session = await prisma.kingOfTheHill.create({
      data: { label: label?.trim() || null },
      include: INCLUDE,
    });

    io?.emit('koth:updated', session);
    logger.info(`KingOfTheHill created: id=${session.id}`);
    return session;
  }

  static async getActive() {
    return prisma.kingOfTheHill.findFirst({
      where: { status: KingOfTheHillStatus.OPEN },
      include: INCLUDE,
    });
  }

  static async getAll() {
    return prisma.kingOfTheHill.findMany({
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  static async getById(id: string) {
    const session = await prisma.kingOfTheHill.findUnique({ where: { id }, include: INCLUDE });
    if (!session) throw createError.notFound('Session not found');
    return session;
  }

  static async close(id: string, io?: SocketIOServer) {
    const session = await prisma.kingOfTheHill.findUnique({ where: { id } });
    if (!session) throw createError.notFound('Session not found');

    const updated = await prisma.kingOfTheHill.update({
      where: { id },
      data: { status: KingOfTheHillStatus.CLOSED, closedAt: new Date() },
      include: INCLUDE,
    });

    io?.to(`koth:${id}`).emit('koth:updated', updated);
    io?.emit('koth:updated', updated);
    return updated;
  }

  static async delete(id: string) {
    await prisma.kingOfTheHill.delete({ where: { id } });
  }

  private static async emitSession(id: string, io?: SocketIOServer) {
    const updated = await prisma.kingOfTheHill.findUnique({ where: { id }, include: INCLUDE });
    io?.to(`koth:${id}`).emit('koth:updated', updated);
    io?.emit('koth:updated', updated);
    return updated!;
  }

  // Called from KickChatService on exact "!king" match
  static async joinByKeyword(kickUsername: string, io?: SocketIOServer): Promise<boolean> {
    const session = await prisma.kingOfTheHill.findFirst({ where: { status: KingOfTheHillStatus.OPEN } });
    if (!session) return false;

    const user = await prisma.user.findFirst({
      where: { kickUsername: { equals: kickUsername, mode: 'insensitive' }, kickVerified: true },
      select: { id: true },
    });
    if (!user) return false;

    const existing = await prisma.kingOfTheHillEntry.findUnique({
      where: { sessionId_userId: { sessionId: session.id, userId: user.id } },
    });
    if (existing) return false;

    await prisma.kingOfTheHillEntry.create({ data: { sessionId: session.id, userId: user.id } });
    await this.emitSession(session.id, io);

    logger.info(`KingOfTheHill ${session.id}: ${kickUsername} joined via !king`);
    return true;
  }

  static async addEntryByUsername(id: string, kickUsername: string, io?: SocketIOServer) {
    const session = await prisma.kingOfTheHill.findUnique({ where: { id } });
    if (!session) throw createError.notFound('Session not found');
    if (session.status !== KingOfTheHillStatus.OPEN) throw createError.badRequest('Session is not open');

    const user = await prisma.user.findFirst({
      where: { kickUsername: { equals: kickUsername.trim(), mode: 'insensitive' } },
      select: { id: true, kickUsername: true, displayName: true },
    });
    if (!user) throw createError.notFound(`No user found with username "${kickUsername}"`);

    const existing = await prisma.kingOfTheHillEntry.findUnique({
      where: { sessionId_userId: { sessionId: id, userId: user.id } },
    });
    if (existing) throw createError.badRequest(`${user.kickUsername ?? user.displayName} is already in the pool`);

    await prisma.kingOfTheHillEntry.create({ data: { sessionId: id, userId: user.id } });

    logger.info(`KingOfTheHill ${id}: manually added ${kickUsername}`);
    return this.emitSession(id, io);
  }

  static async removeEntry(entryId: string, io?: SocketIOServer) {
    const entry = await prisma.kingOfTheHillEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw createError.notFound('Entry not found');
    if (entry.status !== KothEntryStatus.WAITING) throw createError.badRequest('Can only remove waiting entries');

    await prisma.kingOfTheHillEntry.delete({ where: { id: entryId } });
    return this.emitSession(entry.sessionId, io);
  }

  static async draw(sessionId: string, io?: SocketIOServer) {
    const session = await prisma.kingOfTheHill.findUnique({ where: { id: sessionId }, include: INCLUDE });
    if (!session) throw createError.notFound('Session not found');
    if (session.status !== KingOfTheHillStatus.OPEN) throw createError.badRequest('Session is not open');

    if (session.entries.some(e => e.status === KothEntryStatus.DRAWN)) {
      throw createError.badRequest('A viewer is already drawn — resolve or cancel that draw first');
    }

    const pool = session.entries.filter(e => e.status === KothEntryStatus.WAITING);
    if (pool.length === 0) throw createError.badRequest('No eligible viewers to draw from');

    const pick = pool[randomInt(0, pool.length)];

    await prisma.$transaction([
      prisma.kingOfTheHillEntry.update({
        where: { id: pick.id },
        data: { status: KothEntryStatus.DRAWN, drawnAt: new Date() },
      }),
      prisma.kingOfTheHillRound.create({
        data: { sessionId, entryId: pick.id, userId: pick.userId },
      }),
    ]);

    logger.info(`KingOfTheHill ${sessionId}: drew ${pick.userId}`);
    return this.emitSession(sessionId, io);
  }

  static async cancelDraw(sessionId: string, io?: SocketIOServer) {
    const entry = await prisma.kingOfTheHillEntry.findFirst({
      where: { sessionId, status: KothEntryStatus.DRAWN },
    });
    if (!entry) throw createError.badRequest('No pending draw to cancel');

    await prisma.$transaction([
      prisma.kingOfTheHillRound.deleteMany({ where: { entryId: entry.id, playedAt: null } }),
      prisma.kingOfTheHillEntry.update({
        where: { id: entry.id },
        data: { status: KothEntryStatus.WAITING, drawnAt: null },
      }),
    ]);

    return this.emitSession(sessionId, io);
  }

  // Called from KickChatService on "!slot <name>" match
  static async submitSlotCall(kickUsername: string, slotName: string, io?: SocketIOServer): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: { kickUsername: { equals: kickUsername, mode: 'insensitive' }, kickVerified: true },
      select: { id: true },
    });
    if (!user) return false;

    const entry = await prisma.kingOfTheHillEntry.findFirst({
      where: { userId: user.id, status: KothEntryStatus.DRAWN, session: { status: KingOfTheHillStatus.OPEN } },
    });
    if (!entry) return false;

    const round = await prisma.kingOfTheHillRound.findFirst({
      where: { entryId: entry.id, playedAt: null },
      orderBy: { drawnAt: 'desc' },
    });
    if (!round || round.slotName) return false;

    await prisma.kingOfTheHillRound.update({
      where: { id: round.id },
      data: { slotName: slotName.slice(0, 100), slotCalledAt: new Date() },
    });

    await this.emitSession(entry.sessionId, io);
    logger.info(`KingOfTheHill: ${kickUsername} called slot "${slotName}" via !slot`);
    return true;
  }

  static async submitRound(entryId: string, betAmount: number, payoutAmount: number, io?: SocketIOServer) {
    if (!(betAmount > 0)) throw createError.badRequest('Bet amount must be greater than 0');
    if (payoutAmount < 0) throw createError.badRequest('Payout amount cannot be negative');

    const entry = await prisma.kingOfTheHillEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw createError.notFound('Entry not found');
    if (entry.status !== KothEntryStatus.DRAWN) throw createError.badRequest('Entry is not currently drawn');

    const round = await prisma.kingOfTheHillRound.findFirst({
      where: { entryId, playedAt: null },
      orderBy: { drawnAt: 'desc' },
    });
    if (!round) throw createError.notFound('No pending round for this entry');

    const multiplier = Math.round((payoutAmount / betAmount) * 100) / 100;

    await prisma.$transaction(async (tx) => {
      const currentKingEntry = await tx.kingOfTheHillEntry.findFirst({
        where: { sessionId: entry.sessionId, status: KothEntryStatus.KING },
      });
      const kingRound = currentKingEntry
        ? await tx.kingOfTheHillRound.findFirst({ where: { entryId: currentKingEntry.id, isKing: true } })
        : null;

      const kingMultiplier = kingRound?.multiplier ? Number(kingRound.multiplier) : null;
      const dethrones = kingMultiplier === null || multiplier > kingMultiplier;

      await tx.kingOfTheHillRound.update({
        where: { id: round.id },
        data: { betAmount, payoutAmount, multiplier, playedAt: new Date(), isKing: dethrones },
      });

      if (dethrones) {
        if (currentKingEntry && kingRound) {
          await tx.kingOfTheHillRound.update({
            where: { id: kingRound.id },
            data: { isKing: false, dethronedAt: new Date() },
          });
          await tx.kingOfTheHillEntry.update({
            where: { id: currentKingEntry.id },
            data: { status: KothEntryStatus.WAITING, drawnAt: null },
          });
        }
        await tx.kingOfTheHillEntry.update({
          where: { id: entryId },
          data: { status: KothEntryStatus.KING, drawnAt: null },
        });
      } else {
        await tx.kingOfTheHillEntry.update({
          where: { id: entryId },
          data: { status: KothEntryStatus.WAITING, drawnAt: null },
        });
      }
    });

    logger.info(`KingOfTheHill ${entry.sessionId}: entry ${entryId} scored ${multiplier}x`);
    return this.emitSession(entry.sessionId, io);
  }
}
