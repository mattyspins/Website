import { randomInt } from 'crypto';
import { prisma } from '@/config/database';
import { Server as SocketIOServer } from 'socket.io';
import { createError } from '@/middleware/errorHandler';
import { KingOfTheHillStatus, KothEntryStatus, Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';

const USER_SELECT = { id: true, displayName: true, kickUsername: true, avatarUrl: true } as const;

const INCLUDE = {
  entries: {
    include: { user: { select: USER_SELECT } },
    orderBy: { joinedAt: 'asc' as const },
  },
  rounds: {
    include: {
      user: { select: USER_SELECT },
      entry: { select: { kickUsername: true } },
    },
    orderBy: { drawnAt: 'asc' as const },
  },
} satisfies Prisma.KingOfTheHillInclude;

type SessionWithRelations = Prisma.KingOfTheHillGetPayload<{ include: typeof INCLUDE }>;
type EntryWithUser = SessionWithRelations['entries'][number];
type RoundWithUser = SessionWithRelations['rounds'][number];

// A viewer who hasn't linked Kick or registered on the site has no `user` row — fall back
// to the raw kick_username captured from chat so they can still join and be displayed.
function entryUserShape(entry: EntryWithUser) {
  if (entry.user) return entry.user;
  return { id: entry.kickUsername, displayName: entry.kickUsername, kickUsername: entry.kickUsername, avatarUrl: null };
}

function roundUserShape(round: RoundWithUser) {
  if (round.user) return round.user;
  return { id: round.entry.kickUsername, displayName: round.entry.kickUsername, kickUsername: round.entry.kickUsername, avatarUrl: null };
}

// Stable per-session identity for an entry, usable for exclusion/dedup whether or not
// the entrant has a linked site account.
function entryIdentity(entry: { userId: string | null; kickUsername: string }) {
  return entry.userId ?? entry.kickUsername;
}

function toSessionResponse(session: SessionWithRelations) {
  return {
    id: session.id,
    label: session.label,
    status: session.status,
    createdAt: session.createdAt,
    closedAt: session.closedAt,
    entries: session.entries.map((e) => ({
      id: e.id,
      sessionId: e.sessionId,
      userId: entryIdentity(e),
      status: e.status,
      joinedAt: e.joinedAt,
      drawnAt: e.drawnAt,
      user: entryUserShape(e),
    })),
    rounds: session.rounds.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      entryId: r.entryId,
      userId: r.userId ?? r.entry.kickUsername,
      slotName: r.slotName,
      betAmount: r.betAmount,
      payoutAmount: r.payoutAmount,
      multiplier: r.multiplier,
      isKing: r.isKing,
      drawnAt: r.drawnAt,
      slotCalledAt: r.slotCalledAt,
      playedAt: r.playedAt,
      dethronedAt: r.dethronedAt,
      user: roundUserShape(r),
    })),
  };
}

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

    const response = toSessionResponse(session);
    io?.emit('koth:updated', response);
    logger.info(`KingOfTheHill created: id=${session.id}`);
    return response;
  }

  static async getActive() {
    const session = await prisma.kingOfTheHill.findFirst({
      where: { status: KingOfTheHillStatus.OPEN },
      include: INCLUDE,
    });
    return session ? toSessionResponse(session) : null;
  }

  static async getAll() {
    const sessions = await prisma.kingOfTheHill.findMany({
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return sessions.map(toSessionResponse);
  }

  static async getById(id: string) {
    const session = await prisma.kingOfTheHill.findUnique({ where: { id }, include: INCLUDE });
    if (!session) throw createError.notFound('Session not found');
    return toSessionResponse(session);
  }

  static async close(id: string, io?: SocketIOServer) {
    const session = await prisma.kingOfTheHill.findUnique({ where: { id } });
    if (!session) throw createError.notFound('Session not found');

    const updated = await prisma.kingOfTheHill.update({
      where: { id },
      data: { status: KingOfTheHillStatus.CLOSED, closedAt: new Date() },
      include: INCLUDE,
    });

    const response = toSessionResponse(updated);
    io?.to(`koth:${id}`).emit('koth:updated', response);
    io?.emit('koth:updated', response);
    return response;
  }

  static async delete(id: string) {
    await prisma.kingOfTheHill.delete({ where: { id } });
  }

  private static async emitSession(id: string, io?: SocketIOServer) {
    const updated = await prisma.kingOfTheHill.findUnique({ where: { id }, include: INCLUDE });
    const response = toSessionResponse(updated!);
    io?.to(`koth:${id}`).emit('koth:updated', response);
    io?.emit('koth:updated', response);
    return response;
  }

  // Called from KickChatService on exact "!king" match. The chatter is identified by their
  // Kick username directly from the chat event, so joining never depends on having linked
  // Kick or registered on the site.
  static async joinByKeyword(kickUsername: string, io?: SocketIOServer): Promise<boolean> {
    const session = await prisma.kingOfTheHill.findFirst({ where: { status: KingOfTheHillStatus.OPEN } });
    if (!session) return false;

    const normalized = kickUsername.trim().toLowerCase();

    const existing = await prisma.kingOfTheHillEntry.findUnique({
      where: { sessionId_kickUsername: { sessionId: session.id, kickUsername: normalized } },
    });
    if (existing) return false;

    // Optional bonus link — entry is valid either way, since it's keyed on kickUsername.
    const user = await prisma.user.findFirst({
      where: { kickUsername: { equals: normalized, mode: 'insensitive' } },
      select: { id: true },
    });

    await prisma.kingOfTheHillEntry.create({
      data: { sessionId: session.id, kickUsername: normalized, userId: user?.id ?? null },
    });
    await this.emitSession(session.id, io);

    logger.info(`KingOfTheHill ${session.id}: ${kickUsername} joined via !king${user ? '' : ' (unlinked)'}`);
    return true;
  }

  static async addEntryByUsername(id: string, kickUsername: string, io?: SocketIOServer) {
    const session = await prisma.kingOfTheHill.findUnique({ where: { id } });
    if (!session) throw createError.notFound('Session not found');
    if (session.status !== KingOfTheHillStatus.OPEN) throw createError.badRequest('Session is not open');

    const trimmed = kickUsername.trim();
    const normalized = trimmed.toLowerCase();

    const existing = await prisma.kingOfTheHillEntry.findUnique({
      where: { sessionId_kickUsername: { sessionId: id, kickUsername: normalized } },
    });
    if (existing) throw createError.badRequest(`${trimmed} is already in the pool`);

    // Optional bonus link — entry is valid either way, since it's keyed on kickUsername.
    const user = await prisma.user.findFirst({
      where: { kickUsername: { equals: normalized, mode: 'insensitive' } },
      select: { id: true },
    });

    await prisma.kingOfTheHillEntry.create({
      data: { sessionId: id, kickUsername: normalized, userId: user?.id ?? null },
    });

    logger.info(`KingOfTheHill ${id}: manually added ${trimmed}${user ? '' : ' (unlinked)'}`);
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

    // Prefer viewers who haven't had a turn yet this session, so everyone gets a shot
    // before anyone can be drawn a second time. Once every waiting viewer has already
    // had at least one turn, the cycle resets and repeats become fair game again.
    const everDrawnEntryIds = new Set(session.rounds.map((r) => r.entryId));
    const neverDrawn = pool.filter((e) => !everDrawnEntryIds.has(e.id));
    const drawPool = neverDrawn.length > 0 ? neverDrawn : pool;

    const pick = drawPool[randomInt(0, drawPool.length)];

    await prisma.$transaction([
      prisma.kingOfTheHillEntry.update({
        where: { id: pick.id },
        data: { status: KothEntryStatus.DRAWN, drawnAt: new Date() },
      }),
      prisma.kingOfTheHillRound.create({
        data: { sessionId, entryId: pick.id, userId: pick.userId },
      }),
    ]);

    logger.info(`KingOfTheHill ${sessionId}: drew ${entryIdentity(pick)}`);
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

  // Called from KickChatService on "!slot <name>" match. Matched on kickUsername directly
  // so an unlinked entrant can still call their slot and be scored.
  static async submitSlotCall(kickUsername: string, slotName: string, io?: SocketIOServer): Promise<boolean> {
    const normalized = kickUsername.trim().toLowerCase();

    const entry = await prisma.kingOfTheHillEntry.findFirst({
      where: { kickUsername: normalized, status: KothEntryStatus.DRAWN, session: { status: KingOfTheHillStatus.OPEN } },
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

  // Admin-set slot name — lets the admin dashboard override or supply the slot when
  // chat's "!slot <name>" doesn't land, mirroring BossRaidService.setSlotByAdmin.
  static async setSlotByAdmin(entryId: string, slotName: string, io?: SocketIOServer) {
    const entry = await prisma.kingOfTheHillEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw createError.notFound('Entry not found');
    if (entry.status !== KothEntryStatus.DRAWN) throw createError.badRequest('Entry is not currently drawn');

    const round = await prisma.kingOfTheHillRound.findFirst({
      where: { entryId, playedAt: null },
      orderBy: { drawnAt: 'desc' },
    });
    if (!round) throw createError.notFound('No pending round for this entry');

    await prisma.kingOfTheHillRound.update({
      where: { id: round.id },
      data: { slotName: slotName.trim().slice(0, 100), slotCalledAt: new Date() },
    });

    return this.emitSession(entry.sessionId, io);
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
