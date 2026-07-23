import { randomInt } from 'crypto';
import { prisma } from '@/config/database';
import { Server as SocketIOServer } from 'socket.io';
import { createError } from '@/middleware/errorHandler';
import { BountyHunter, BountyHunterStatus, BountyHunterEntryStatus, Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';
import { PointsService } from '@/services/PointsService';
import { KickChatService } from '@/services/KickChatService';

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
} satisfies Prisma.BountyHunterInclude;

type HuntWithRelations = Prisma.BountyHunterGetPayload<{ include: typeof INCLUDE }>;
type EntryWithUser = HuntWithRelations['entries'][number];
type RoundWithUser = HuntWithRelations['rounds'][number];

const ROLLOVER_POT_MULT = 1.5;
const ROLLOVER_BAND_ADD = 20;

// Registration stays a toggle (unlike Boss Raid's one-way close) — a single bounty can
// run through several rollovers across a whole stream, so admins need to reopen the
// keyword window for latecomers ahead of a later rollover round.
const OPEN_STATUSES: BountyHunterStatus[] = [BountyHunterStatus.REGISTRATION, BountyHunterStatus.ACTIVE];

function entryUserShape(entry: EntryWithUser) {
  if (entry.user) return { ...entry.user, displayName: entry.kickUsername };
  return { id: entry.kickUsername, displayName: entry.kickUsername, kickUsername: entry.kickUsername, avatarUrl: null };
}

function roundUserShape(round: RoundWithUser) {
  if (round.user) return { ...round.user, displayName: round.entry.kickUsername };
  return { id: round.entry.kickUsername, displayName: round.entry.kickUsername, kickUsername: round.entry.kickUsername, avatarUrl: null };
}

function entryIdentity(entry: { userId: string | null; kickUsername: string }) {
  return entry.userId ?? entry.kickUsername;
}

// Qualitative heat bucket so proximity is visible on stream without leaking the exact
// secret target — never expose the raw numeric distance on any public-facing response.
function heatOf(distance: number, claimZone: number): { label: string; tier: number } {
  if (distance === 0) return { label: 'BULLSEYE', tier: 5 };
  if (distance <= claimZone * 0.25) return { label: 'SCORCHING', tier: 4 };
  if (distance <= claimZone * 0.6) return { label: 'RED HOT', tier: 3 };
  if (distance <= claimZone) return { label: 'IN THE ZONE', tier: 2 };
  if (distance <= claimZone * 2.5) return { label: 'COLD', tier: 1 };
  return { label: 'ICE COLD', tier: 0 };
}

function baseRoundShape(r: RoundWithUser) {
  return {
    id: r.id,
    huntId: r.huntId,
    entryId: r.entryId,
    userId: r.userId ?? r.entry.kickUsername,
    epoch: r.epoch,
    slotName: r.slotName,
    multiplier: r.multiplier,
    qualifies: r.qualifies,
    skipped: r.skipped,
    drawnAt: r.drawnAt,
    slotCalledAt: r.slotCalledAt,
    playedAt: r.playedAt,
    user: roundUserShape(r),
  };
}

function toAdminResponse(hunt: HuntWithRelations) {
  return {
    id: hunt.id,
    keyword: hunt.keyword,
    status: hunt.status,
    registrationOpen: hunt.registrationOpen,
    target: hunt.target,
    targetMin: hunt.targetMin,
    targetMax: hunt.targetMax,
    claimZone: hunt.claimZone,
    pot: hunt.pot,
    rolloverCount: hunt.rolloverCount,
    epoch: hunt.epoch,
    winnerEntryId: hunt.winnerEntryId,
    createdAt: hunt.createdAt,
    closedAt: hunt.closedAt,
    entries: hunt.entries.map((e) => ({
      id: e.id,
      huntId: e.huntId,
      userId: entryIdentity(e),
      slotName: e.slotName,
      status: e.status,
      joinedAt: e.joinedAt,
      drawnAt: e.drawnAt,
      user: entryUserShape(e),
    })),
    rounds: hunt.rounds.map((r) => ({
      ...baseRoundShape(r),
      betAmount: r.betAmount,
      payoutAmount: r.payoutAmount,
      distance: r.distance,
      heat: r.distance !== null ? heatOf(r.distance, hunt.claimZone).label : null,
    })),
  };
}

function toPublicResponse(hunt: HuntWithRelations) {
  const settled = hunt.status === BountyHunterStatus.SETTLED;
  return {
    id: hunt.id,
    keyword: hunt.keyword,
    status: hunt.status,
    registrationOpen: hunt.registrationOpen,
    claimZone: hunt.claimZone,
    pot: hunt.pot,
    rolloverCount: hunt.rolloverCount,
    epoch: hunt.epoch,
    winnerEntryId: hunt.winnerEntryId,
    createdAt: hunt.createdAt,
    closedAt: hunt.closedAt,
    // The secret target only ever appears in the public payload once the bounty is
    // settled — the game is over at that point, so revealing it is safe (and expected,
    // for the claim/reveal overlay).
    ...(settled ? { target: hunt.target } : {}),
    entries: hunt.entries.map((e) => ({
      id: e.id,
      huntId: e.huntId,
      userId: entryIdentity(e),
      slotName: e.slotName,
      status: e.status,
      joinedAt: e.joinedAt,
      drawnAt: e.drawnAt,
      user: entryUserShape(e),
    })),
    rounds: hunt.rounds.map((r) => ({
      ...baseRoundShape(r),
      heat: r.distance !== null ? heatOf(r.distance, hunt.claimZone).label : null,
      ...(settled ? { distance: r.distance } : {}),
    })),
  };
}

export type BountyHunterAdminResponse = ReturnType<typeof toAdminResponse>;
export type BountyHunterPublicResponse = ReturnType<typeof toPublicResponse>;

export class BountyHunterService {
  private static randTarget(min: number, max: number) {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return randomInt(lo, hi + 1);
  }

  static async create(
    keyword: string,
    targetMin: number,
    targetMax: number,
    claimZone: number,
    pot: number,
    createdById: string,
    io?: SocketIOServer
  ) {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) throw createError.badRequest('Entry keyword is required');
    if (!(claimZone > 0)) throw createError.badRequest('Claim zone must be greater than 0');
    if (!(pot > 0)) throw createError.badRequest('Reward pot must be greater than 0');

    await prisma.bountyHunter.updateMany({
      where: { status: { in: OPEN_STATUSES } },
      data: { status: BountyHunterStatus.SETTLED, closedAt: new Date() },
    });

    const lo = Math.round(Math.min(targetMin, targetMax));
    const hi = Math.round(Math.max(targetMin, targetMax));
    const target = this.randTarget(lo, hi);

    const hunt = await prisma.bountyHunter.create({
      data: { keyword: trimmedKeyword, target, targetMin: lo, targetMax: hi, claimZone: Math.round(claimZone), pot: Math.round(pot), createdById },
      include: INCLUDE,
    });

    logger.info(`BountyHunter created: id=${hunt.id} keyword=${trimmedKeyword}`);
    return this.emitAndReturn(hunt.id, io);
  }

  static async getActive() {
    const hunt = await prisma.bountyHunter.findFirst({
      where: { status: { in: OPEN_STATUSES } },
      include: INCLUDE,
    });
    return hunt ? toAdminResponse(hunt) : null;
  }

  static async getActivePublic() {
    const hunt = await prisma.bountyHunter.findFirst({
      where: { status: { in: OPEN_STATUSES } },
      include: INCLUDE,
    });
    return hunt ? toPublicResponse(hunt) : null;
  }

  static async getAll() {
    const hunts = await prisma.bountyHunter.findMany({
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return hunts.map(toAdminResponse);
  }

  static async delete(id: string) {
    await prisma.bountyHunter.delete({ where: { id } });
  }

  private static async emitAndReturn(id: string, io?: SocketIOServer) {
    const updated = await prisma.bountyHunter.findUnique({ where: { id }, include: INCLUDE });
    const hunt = updated!;
    const publicResponse = toPublicResponse(hunt);
    io?.to(`bountyhunter:${id}`).emit('bountyhunter:updated', publicResponse);
    io?.emit('bountyhunter:updated', publicResponse);
    return toAdminResponse(hunt);
  }

  static async setRegistrationOpen(id: string, open: boolean, io?: SocketIOServer) {
    const hunt = await prisma.bountyHunter.findUnique({ where: { id } });
    if (!hunt) throw createError.notFound('Bounty hunt not found');
    if (!OPEN_STATUSES.includes(hunt.status)) throw createError.badRequest('Bounty has already been settled');

    await prisma.bountyHunter.update({
      where: { id },
      data: { registrationOpen: open, status: open ? BountyHunterStatus.REGISTRATION : BountyHunterStatus.ACTIVE },
    });
    logger.info(`BountyHunter ${id}: registration ${open ? 'opened' : 'closed'}`);
    return this.emitAndReturn(id, io);
  }

  // Called from KickChatService when a chatter's message matches this hunt's own entry
  // keyword, e.g. "!bounty" or "!bounty pub kings" — the optional trailing text locks in
  // a slot at signup (any free text, same as Boss Raid/King of the Hill — not restricted
  // to a fixed catalog); it can still be overridden later via the shared "!slot <name>"
  // command or by the admin.
  static async handleKeyword(kickUsername: string, message: string, io?: SocketIOServer): Promise<boolean> {
    const hunt = await prisma.bountyHunter.findFirst({ where: { status: BountyHunterStatus.REGISTRATION, registrationOpen: true } });
    if (!hunt) return false;

    const trimmed = message.trim();
    const lowerKeyword = hunt.keyword.toLowerCase();
    const lower = trimmed.toLowerCase();
    if (lower !== lowerKeyword && !lower.startsWith(lowerKeyword + ' ')) return false;

    const rest = trimmed.slice(hunt.keyword.length).trim();
    const slotName = rest ? rest.slice(0, 100) : null;

    const normalized = kickUsername.trim().toLowerCase();
    const existing = await prisma.bountyHunterEntry.findUnique({
      where: { huntId_kickUsername: { huntId: hunt.id, kickUsername: normalized } },
    });
    if (existing) return false;

    const user = await prisma.user.findFirst({
      where: { kickUsername: { equals: normalized, mode: 'insensitive' } },
      select: { id: true },
    });

    await prisma.bountyHunterEntry.create({
      data: { huntId: hunt.id, kickUsername: normalized, userId: user?.id ?? null, slotName },
    });
    await this.emitAndReturn(hunt.id, io);

    logger.info(`BountyHunter ${hunt.id}: ${kickUsername} joined via keyword${slotName ? ` (slot: ${slotName})` : ''}`);
    return true;
  }

  static async addEntryByUsername(id: string, kickUsername: string, io?: SocketIOServer) {
    const hunt = await prisma.bountyHunter.findUnique({ where: { id } });
    if (!hunt) throw createError.notFound('Bounty hunt not found');
    if (!OPEN_STATUSES.includes(hunt.status)) throw createError.badRequest('Bounty has already been settled');

    const trimmed = kickUsername.trim();
    const normalized = trimmed.toLowerCase();

    const existing = await prisma.bountyHunterEntry.findUnique({
      where: { huntId_kickUsername: { huntId: id, kickUsername: normalized } },
    });
    if (existing) throw createError.badRequest(`${trimmed} is already in the pool`);

    const user = await prisma.user.findFirst({
      where: { kickUsername: { equals: normalized, mode: 'insensitive' } },
      select: { id: true },
    });

    await prisma.bountyHunterEntry.create({
      data: { huntId: id, kickUsername: normalized, userId: user?.id ?? null },
    });

    logger.info(`BountyHunter ${id}: manually added ${trimmed}${user ? '' : ' (unlinked)'}`);
    return this.emitAndReturn(id, io);
  }

  static async removeEntry(entryId: string, io?: SocketIOServer) {
    const entry = await prisma.bountyHunterEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw createError.notFound('Entry not found');
    if (entry.status !== BountyHunterEntryStatus.WAITING) throw createError.badRequest('Can only remove waiting entries');

    await prisma.bountyHunterEntry.delete({ where: { id: entryId } });
    return this.emitAndReturn(entry.huntId, io);
  }

  static async draw(huntId: string, io?: SocketIOServer) {
    const hunt = await prisma.bountyHunter.findUnique({ where: { id: huntId }, include: INCLUDE });
    if (!hunt) throw createError.notFound('Bounty hunt not found');
    if (!OPEN_STATUSES.includes(hunt.status)) throw createError.badRequest('Bounty has already been settled');

    if (hunt.entries.some((e) => e.status === BountyHunterEntryStatus.DRAWN)) {
      throw createError.badRequest('A hunter is already drawn — resolve or skip that turn first');
    }

    const pool = hunt.entries.filter((e) => e.status === BountyHunterEntryStatus.WAITING);
    if (pool.length === 0) throw createError.badRequest('No eligible hunters left — everyone has had a turn this round');

    const pick = pool[randomInt(0, pool.length)];

    await prisma.$transaction([
      prisma.bountyHunterEntry.update({
        where: { id: pick.id },
        data: { status: BountyHunterEntryStatus.DRAWN, drawnAt: new Date() },
      }),
      prisma.bountyHunterRound.create({
        data: { huntId, entryId: pick.id, userId: pick.userId, epoch: hunt.epoch, slotName: pick.slotName, slotCalledAt: pick.slotName ? new Date() : null },
      }),
    ]);

    logger.info(`BountyHunter ${huntId}: drew ${entryIdentity(pick)}`);
    return this.emitAndReturn(huntId, io);
  }

  private static async pendingRoundFor(entryId: string) {
    return prisma.bountyHunterRound.findFirst({ where: { entryId, playedAt: null }, orderBy: { drawnAt: 'desc' } });
  }

  // Called from KickChatService on "!slot <name>" — shared global command, only accepted
  // if this kickUsername currently has a pending Bounty Hunter turn.
  static async submitSlotCall(kickUsername: string, slotName: string, io?: SocketIOServer): Promise<boolean> {
    const normalized = kickUsername.trim().toLowerCase();
    const entry = await prisma.bountyHunterEntry.findFirst({
      where: { kickUsername: normalized, status: BountyHunterEntryStatus.DRAWN, hunt: { status: { in: OPEN_STATUSES } } },
    });
    if (!entry) return false;

    const round = await this.pendingRoundFor(entry.id);
    if (!round || round.slotName) return false;

    await prisma.bountyHunterRound.update({
      where: { id: round.id },
      data: { slotName: slotName.slice(0, 100), slotCalledAt: new Date() },
    });

    await this.emitAndReturn(entry.huntId, io);
    logger.info(`BountyHunter: ${kickUsername} called slot "${slotName}" via !slot`);
    return true;
  }

  static async setSlotByAdmin(entryId: string, slotName: string, io?: SocketIOServer) {
    const entry = await prisma.bountyHunterEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw createError.notFound('Entry not found');
    if (entry.status !== BountyHunterEntryStatus.DRAWN) throw createError.badRequest('Entry is not currently drawn');

    const round = await this.pendingRoundFor(entryId);
    if (!round) throw createError.notFound('No pending round for this entry');

    await prisma.bountyHunterRound.update({
      where: { id: round.id },
      data: { slotName: slotName.trim().slice(0, 100), slotCalledAt: new Date() },
    });

    return this.emitAndReturn(entry.huntId, io);
  }

  static async skipPlayer(entryId: string, io?: SocketIOServer) {
    const entry = await prisma.bountyHunterEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw createError.notFound('Entry not found');
    if (entry.status !== BountyHunterEntryStatus.DRAWN) throw createError.badRequest('Entry is not currently drawn');

    const round = await this.pendingRoundFor(entryId);

    await prisma.$transaction([
      prisma.bountyHunterEntry.update({ where: { id: entryId }, data: { status: BountyHunterEntryStatus.DONE } }),
      ...(round ? [prisma.bountyHunterRound.update({ where: { id: round.id }, data: { skipped: true, playedAt: new Date() } })] : []),
    ]);

    logger.info(`BountyHunter ${entry.huntId}: skipped entry ${entryId}`);
    return this.emitAndReturn(entry.huntId, io);
  }

  static async submitRound(entryId: string, betAmount: number, payoutAmount: number, io?: SocketIOServer) {
    if (!(betAmount > 0)) throw createError.badRequest('Bet amount must be greater than 0');
    if (payoutAmount < 0) throw createError.badRequest('Payout amount cannot be negative');

    const entry = await prisma.bountyHunterEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw createError.notFound('Entry not found');
    if (entry.status !== BountyHunterEntryStatus.DRAWN) throw createError.badRequest('Entry is not currently drawn');

    const hunt = await prisma.bountyHunter.findUnique({ where: { id: entry.huntId } });
    if (!hunt) throw createError.notFound('Bounty hunt not found');
    if (!OPEN_STATUSES.includes(hunt.status)) throw createError.badRequest('Bounty has already been settled');

    const round = await this.pendingRoundFor(entryId);
    if (!round) throw createError.notFound('No pending round for this entry');

    const multiplier = Math.round(payoutAmount / betAmount);
    const distance = Math.abs(multiplier - hunt.target);
    const qualifies = distance <= hunt.claimZone;
    const heat = heatOf(distance, hunt.claimZone);

    await prisma.$transaction([
      prisma.bountyHunterRound.update({
        where: { id: round.id },
        data: { betAmount, payoutAmount, multiplier, distance, qualifies, playedAt: new Date() },
      }),
      prisma.bountyHunterEntry.update({ where: { id: entryId }, data: { status: BountyHunterEntryStatus.DONE } }),
    ]);

    logger.info(`BountyHunter ${hunt.id}: entry ${entryId} landed ${multiplier}x (${heat.label})`);

    const response = await this.emitAndReturn(hunt.id, io);
    return { hunt: response, multiplier, distance, qualifies, heat: heat.label };
  }

  private static bestRoundOfEpoch(hunt: HuntWithRelations) {
    const current = hunt.rounds.filter((r) => r.epoch === hunt.epoch && r.playedAt && !r.skipped && r.distance !== null);
    return current.sort((a, b) => (a.distance! - b.distance!))[0] ?? null;
  }

  // Admin-triggered conclusion. If the closest shot this epoch qualifies (within the
  // claim zone), the bounty is claimed and the pot is paid out; otherwise it rolls over
  // automatically — mirrors the mockup's settleBounty() falling through to rollover()
  // when nothing qualifies.
  static async settleBounty(huntId: string, io?: SocketIOServer) {
    const hunt = await prisma.bountyHunter.findUnique({ where: { id: huntId }, include: INCLUDE });
    if (!hunt) throw createError.notFound('Bounty hunt not found');
    if (!OPEN_STATUSES.includes(hunt.status)) throw createError.badRequest('Bounty has already been settled');

    const best = this.bestRoundOfEpoch(hunt);
    if (!best || !best.qualifies) {
      return this.rollover(huntId, io);
    }

    await prisma.bountyHunter.update({
      where: { id: huntId },
      data: { status: BountyHunterStatus.SETTLED, winnerEntryId: best.entryId, closedAt: new Date() },
    });

    if (best.userId) {
      try {
        await PointsService.addPoints({
          userId: best.userId,
          amount: hunt.pot,
          reason: `Bounty Hunter reward: claimed the ${hunt.target}x bounty (landed ${Number(best.multiplier)}x)`,
          referenceId: huntId,
          referenceType: 'bounty_hunter',
        });
      } catch (err) {
        logger.error(`BountyHunter ${huntId}: failed to reward winner`, { error: (err as Error).message });
      }
    } else {
      logger.warn(`BountyHunter ${huntId}: winner has no linked account — skipping coin reward`);
    }

    logger.info(`BountyHunter ${huntId}: claimed by entry ${best.entryId} at ${best.multiplier}x (target ${hunt.target}x)`);

    const winnerEntry = hunt.entries.find((e) => e.id === best.entryId);
    if (winnerEntry) {
      void KickChatService.sendChatMessage(
        `🎯 @${winnerEntry.kickUsername} claimed the bounty, landing ${Number(best.multiplier)}x (target was ${hunt.target}x)!`
      );
    }

    return this.emitAndReturn(huntId, io);
  }

  // Resets the current epoch (grows the pot/claim zone, rolls a fresh target, returns
  // every non-WAITING entry back to WAITING) without settling — used both when settle
  // finds no qualifying shot and for the admin's explicit "Force Rollover" action.
  static async rollover(huntId: string, io?: SocketIOServer) {
    const hunt = await prisma.bountyHunter.findUnique({ where: { id: huntId } });
    if (!hunt) throw createError.notFound('Bounty hunt not found');
    if (!OPEN_STATUSES.includes(hunt.status)) throw createError.badRequest('Bounty has already been settled');

    const newPot = Math.round(hunt.pot * ROLLOVER_POT_MULT);
    const newClaimZone = hunt.claimZone + ROLLOVER_BAND_ADD;
    const target = this.randTarget(hunt.targetMin, hunt.targetMax);

    await prisma.$transaction([
      prisma.bountyHunter.update({
        where: { id: huntId },
        data: { pot: newPot, claimZone: newClaimZone, target, rolloverCount: hunt.rolloverCount + 1, epoch: hunt.epoch + 1 },
      }),
      prisma.bountyHunterEntry.updateMany({
        where: { huntId, status: { not: BountyHunterEntryStatus.WAITING } },
        data: { status: BountyHunterEntryStatus.WAITING, drawnAt: null },
      }),
    ]);

    logger.info(`BountyHunter ${huntId}: rolled over — pot ${newPot}, claim zone ±${newClaimZone}`);
    return this.emitAndReturn(huntId, io);
  }

  static async forceRollover(huntId: string, io?: SocketIOServer) {
    return this.rollover(huntId, io);
  }

  // Admin "New Secret Target" fix-up — clears the current epoch's shots/draws like a
  // rollover but does NOT grow the pot or claim zone (not a reward event).
  static async rerollTarget(huntId: string, io?: SocketIOServer) {
    const hunt = await prisma.bountyHunter.findUnique({ where: { id: huntId } });
    if (!hunt) throw createError.notFound('Bounty hunt not found');
    if (!OPEN_STATUSES.includes(hunt.status)) throw createError.badRequest('Bounty has already been settled');

    const target = this.randTarget(hunt.targetMin, hunt.targetMax);

    await prisma.$transaction([
      prisma.bountyHunter.update({ where: { id: huntId }, data: { target, epoch: hunt.epoch + 1 } }),
      prisma.bountyHunterEntry.updateMany({
        where: { huntId, status: { not: BountyHunterEntryStatus.WAITING } },
        data: { status: BountyHunterEntryStatus.WAITING, drawnAt: null },
      }),
    ]);

    logger.info(`BountyHunter ${huntId}: admin rerolled the secret target`);
    return this.emitAndReturn(huntId, io);
  }

  static async setTarget(huntId: string, target: number, io?: SocketIOServer) {
    if (!Number.isFinite(target) || target <= 0) throw createError.badRequest('Target must be a positive number');
    const hunt = await prisma.bountyHunter.findUnique({ where: { id: huntId } });
    if (!hunt) throw createError.notFound('Bounty hunt not found');
    if (!OPEN_STATUSES.includes(hunt.status)) throw createError.badRequest('Bounty has already been settled');

    await prisma.bountyHunter.update({ where: { id: huntId }, data: { target: Math.round(target) } });
    return this.emitAndReturn(huntId, io);
  }

  static async setClaimZone(huntId: string, claimZone: number, io?: SocketIOServer) {
    if (!Number.isFinite(claimZone) || claimZone <= 0) throw createError.badRequest('Claim zone must be a positive number');
    const hunt = await prisma.bountyHunter.findUnique({ where: { id: huntId } });
    if (!hunt) throw createError.notFound('Bounty hunt not found');
    if (!OPEN_STATUSES.includes(hunt.status)) throw createError.badRequest('Bounty has already been settled');

    await prisma.bountyHunter.update({ where: { id: huntId }, data: { claimZone: Math.round(claimZone) } });
    return this.emitAndReturn(huntId, io);
  }

  static async setPot(huntId: string, pot: number, io?: SocketIOServer) {
    if (!Number.isFinite(pot) || pot <= 0) throw createError.badRequest('Pot must be a positive number');
    const hunt = await prisma.bountyHunter.findUnique({ where: { id: huntId } });
    if (!hunt) throw createError.notFound('Bounty hunt not found');
    if (!OPEN_STATUSES.includes(hunt.status)) throw createError.badRequest('Bounty has already been settled');

    await prisma.bountyHunter.update({ where: { id: huntId }, data: { pot: Math.round(pot) } });
    return this.emitAndReturn(huntId, io);
  }
}
