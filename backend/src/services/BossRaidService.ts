import { randomInt } from 'crypto';
import { prisma } from '@/config/database';
import { Server as SocketIOServer } from 'socket.io';
import { createError } from '@/middleware/errorHandler';
import { BossRaid, BossRaidStatus, BossRaidEntryStatus, Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';
import { PointsService } from '@/services/PointsService';
import {
  BOSS_ROSTER,
  BossKey,
  isBossKey,
  initialPassiveState,
  resolveRound,
  resolveDeadBonus,
  BossPassiveState,
} from '@/services/BossPassiveEngine';

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
} satisfies Prisma.BossRaidInclude;

type RaidWithRelations = Prisma.BossRaidGetPayload<{ include: typeof INCLUDE }>;
type EntryWithUser = RaidWithRelations['entries'][number];
type RoundWithUser = RaidWithRelations['rounds'][number];

const REWARD_COINS = [250, 125, 125];

// Drawing/playing a turn no longer requires registration to be closed first —
// admins can draw and resolve players while viewers keep joining via keyword.
// Only a COMPLETED raid blocks these actions.
const OPEN_STATUSES: BossRaidStatus[] = [BossRaidStatus.REGISTRATION, BossRaidStatus.ACTIVE];

// Boss Raid entries are keyed by Kick chat activity, so always display the Kick username
// captured on the entry itself — not a linked site account's Discord displayName — even
// when the player has also linked a site account (which keeps their avatar).
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

function passiveStateOf(raid: BossRaid): BossPassiveState {
  return {
    currentHp: raid.currentHp,
    maxHp: raid.maxHp,
    phase: raid.phase,
    rage: raid.rage,
    roundCount: raid.roundCount,
    consecutiveBucket: raid.consecutiveBucket,
    consecutiveCount: raid.consecutiveCount,
    legendaryBuffRounds: raid.legendaryBuffRounds,
    soulShields: raid.soulShields,
    voidModifier: raid.voidModifier,
    voidModifierRoundsLeft: raid.voidModifierRoundsLeft,
  };
}

function toRaidResponse(raid: RaidWithRelations) {
  const boss = BOSS_ROSTER[raid.bossKey as BossKey];
  return {
    id: raid.id,
    bossKey: raid.bossKey,
    boss,
    keyword: raid.keyword,
    status: raid.status,
    maxHp: raid.maxHp,
    currentHp: raid.currentHp,
    phase: raid.phase,
    rage: raid.rage,
    roundCount: raid.roundCount,
    consecutiveBucket: raid.consecutiveBucket,
    consecutiveCount: raid.consecutiveCount,
    soulShields: raid.soulShields,
    voidModifier: raid.voidModifier,
    defeated: raid.defeated,
    createdAt: raid.createdAt,
    closedAt: raid.closedAt,
    entries: raid.entries.map((e) => ({
      id: e.id,
      raidId: e.raidId,
      userId: entryIdentity(e),
      status: e.status,
      joinedAt: e.joinedAt,
      drawnAt: e.drawnAt,
      user: entryUserShape(e),
    })),
    rounds: raid.rounds.map((r) => ({
      id: r.id,
      raidId: r.raidId,
      entryId: r.entryId,
      userId: r.userId ?? r.entry.kickUsername,
      slotName: r.slotName,
      betAmount: r.betAmount,
      payoutAmount: r.payoutAmount,
      multiplier: r.multiplier,
      damageDealt: r.damageDealt,
      healApplied: r.healApplied,
      isDeadBonus: r.isDeadBonus,
      isRetrigger: r.isRetrigger,
      isCrit: r.isCrit,
      isLegendary: r.isLegendary,
      skipped: r.skipped,
      drawnAt: r.drawnAt,
      slotCalledAt: r.slotCalledAt,
      playedAt: r.playedAt,
      user: roundUserShape(r),
    })),
  };
}

export type BossRaidResponse = ReturnType<typeof toRaidResponse>;

export class BossRaidService {
  static getRoster() {
    return Object.values(BOSS_ROSTER);
  }

  static async create(bossKey: string, keyword: string, maxHp: number | undefined, createdById: string, io?: SocketIOServer) {
    if (!isBossKey(bossKey)) throw createError.badRequest('Unknown boss');
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) throw createError.badRequest('Entry keyword is required');

    await prisma.bossRaid.updateMany({
      where: { status: { in: [BossRaidStatus.REGISTRATION, BossRaidStatus.ACTIVE] } },
      data: { status: BossRaidStatus.COMPLETED, closedAt: new Date() },
    });

    const hp = maxHp && maxHp > 0 ? Math.round(maxHp) : 10000;
    const initial = initialPassiveState(bossKey, hp);

    const raid = await prisma.bossRaid.create({
      data: {
        bossKey,
        keyword: trimmedKeyword,
        maxHp: hp,
        currentHp: initial.currentHp,
        soulShields: initial.soulShields,
        voidModifier: initial.voidModifier,
        voidModifierRoundsLeft: initial.voidModifierRoundsLeft,
        createdById,
      },
      include: INCLUDE,
    });

    const response = toRaidResponse(raid);
    io?.emit('bossraid:updated', response);
    logger.info(`BossRaid created: id=${raid.id} boss=${bossKey}`);
    return response;
  }

  static async getActive() {
    const raid = await prisma.bossRaid.findFirst({
      where: { status: { in: [BossRaidStatus.REGISTRATION, BossRaidStatus.ACTIVE] } },
      include: INCLUDE,
    });
    return raid ? toRaidResponse(raid) : null;
  }

  static async getAll() {
    const raids = await prisma.bossRaid.findMany({
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return raids.map(toRaidResponse);
  }

  static async delete(id: string) {
    await prisma.bossRaid.delete({ where: { id } });
  }

  private static async emitRaid(id: string, io?: SocketIOServer) {
    const updated = await prisma.bossRaid.findUnique({ where: { id }, include: INCLUDE });
    const response = toRaidResponse(updated!);
    io?.to(`bossraid:${id}`).emit('bossraid:updated', response);
    io?.emit('bossraid:updated', response);
    return response;
  }

  static async closeRegistration(id: string, io?: SocketIOServer) {
    const raid = await prisma.bossRaid.findUnique({ where: { id } });
    if (!raid) throw createError.notFound('Raid not found');
    if (raid.status !== BossRaidStatus.REGISTRATION) throw createError.badRequest('Registration is not open');

    await prisma.bossRaid.update({ where: { id }, data: { status: BossRaidStatus.ACTIVE } });
    logger.info(`BossRaid ${id}: registration closed`);
    return this.emitRaid(id, io);
  }

  // Called from KickChatService when a chatter's message matches this raid's own
  // entry keyword — identical "identify by raw kick username" convention as every
  // other keyword-join feature, so linking/verifying an account is never required.
  static async handleKeyword(kickUsername: string, message: string, io?: SocketIOServer): Promise<boolean> {
    const raid = await prisma.bossRaid.findFirst({ where: { status: BossRaidStatus.REGISTRATION } });
    if (!raid) return false;

    const trimmed = message.trim().toLowerCase();
    if (trimmed !== raid.keyword.toLowerCase()) return false;

    const normalized = kickUsername.trim().toLowerCase();
    const existing = await prisma.bossRaidEntry.findUnique({
      where: { raidId_kickUsername: { raidId: raid.id, kickUsername: normalized } },
    });
    if (existing) return false;

    const user = await prisma.user.findFirst({
      where: { kickUsername: { equals: normalized, mode: 'insensitive' } },
      select: { id: true },
    });

    await prisma.bossRaidEntry.create({
      data: { raidId: raid.id, kickUsername: normalized, userId: user?.id ?? null },
    });
    await this.emitRaid(raid.id, io);

    logger.info(`BossRaid ${raid.id}: ${kickUsername} joined via keyword${user ? '' : ' (unlinked)'}`);
    return true;
  }

  static async addEntryByUsername(id: string, kickUsername: string, io?: SocketIOServer) {
    const raid = await prisma.bossRaid.findUnique({ where: { id } });
    if (!raid) throw createError.notFound('Raid not found');
    if (raid.status !== BossRaidStatus.REGISTRATION) throw createError.badRequest('Registration is not open');

    const trimmed = kickUsername.trim();
    const normalized = trimmed.toLowerCase();

    const existing = await prisma.bossRaidEntry.findUnique({
      where: { raidId_kickUsername: { raidId: id, kickUsername: normalized } },
    });
    if (existing) throw createError.badRequest(`${trimmed} is already in the pool`);

    const user = await prisma.user.findFirst({
      where: { kickUsername: { equals: normalized, mode: 'insensitive' } },
      select: { id: true },
    });

    await prisma.bossRaidEntry.create({
      data: { raidId: id, kickUsername: normalized, userId: user?.id ?? null },
    });

    logger.info(`BossRaid ${id}: manually added ${trimmed}${user ? '' : ' (unlinked)'}`);
    return this.emitRaid(id, io);
  }

  static async removeEntry(entryId: string, io?: SocketIOServer) {
    const entry = await prisma.bossRaidEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw createError.notFound('Entry not found');
    if (entry.status !== BossRaidEntryStatus.WAITING) throw createError.badRequest('Can only remove waiting entries');

    await prisma.bossRaidEntry.delete({ where: { id: entryId } });
    return this.emitRaid(entry.raidId, io);
  }

  static async draw(raidId: string, io?: SocketIOServer) {
    const raid = await prisma.bossRaid.findUnique({ where: { id: raidId }, include: INCLUDE });
    if (!raid) throw createError.notFound('Raid not found');
    if (!OPEN_STATUSES.includes(raid.status)) throw createError.badRequest('Raid has already ended');

    if (raid.entries.some((e) => e.status === BossRaidEntryStatus.DRAWN)) {
      throw createError.badRequest('A viewer is already drawn — resolve or skip that turn first');
    }

    const pool = raid.entries.filter((e) => e.status === BossRaidEntryStatus.WAITING);
    if (pool.length === 0) throw createError.badRequest('No eligible viewers left — everyone has had a turn');

    const pick = pool[randomInt(0, pool.length)];

    await prisma.$transaction([
      prisma.bossRaidEntry.update({
        where: { id: pick.id },
        data: { status: BossRaidEntryStatus.DRAWN, drawnAt: new Date() },
      }),
      prisma.bossRaidRound.create({
        data: { raidId, entryId: pick.id, userId: pick.userId },
      }),
    ]);

    logger.info(`BossRaid ${raidId}: drew ${entryIdentity(pick)}`);
    return this.emitRaid(raidId, io);
  }

  private static async pendingRoundFor(entryId: string) {
    return prisma.bossRaidRound.findFirst({ where: { entryId, playedAt: null }, orderBy: { drawnAt: 'desc' } });
  }

  // Called from KickChatService on "!slot <name>" match — shared global command,
  // only accepted if this kickUsername currently has a pending Boss Raid turn.
  static async submitSlotCall(kickUsername: string, slotName: string, io?: SocketIOServer): Promise<boolean> {
    const normalized = kickUsername.trim().toLowerCase();
    const entry = await prisma.bossRaidEntry.findFirst({
      where: { kickUsername: normalized, status: BossRaidEntryStatus.DRAWN, raid: { status: { in: OPEN_STATUSES } } },
    });
    if (!entry) return false;

    const round = await this.pendingRoundFor(entry.id);
    if (!round || round.slotName) return false;

    await prisma.bossRaidRound.update({
      where: { id: round.id },
      data: { slotName: slotName.slice(0, 100), slotCalledAt: new Date() },
    });

    await this.emitRaid(entry.raidId, io);
    logger.info(`BossRaid: ${kickUsername} called slot "${slotName}" via !slot`);
    return true;
  }

  // Admin-set slot name — used for "Auto-pick Random Slot" (frontend supplies a random
  // catalog name) as well as a manual override, bypassing the chat-capture path.
  static async setSlotByAdmin(entryId: string, slotName: string, io?: SocketIOServer) {
    const entry = await prisma.bossRaidEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw createError.notFound('Entry not found');
    if (entry.status !== BossRaidEntryStatus.DRAWN) throw createError.badRequest('Entry is not currently drawn');

    const round = await this.pendingRoundFor(entryId);
    if (!round) throw createError.notFound('No pending round for this entry');

    await prisma.bossRaidRound.update({
      where: { id: round.id },
      data: { slotName: slotName.trim().slice(0, 100), slotCalledAt: new Date() },
    });

    return this.emitRaid(entry.raidId, io);
  }

  static async skipPlayer(entryId: string, io?: SocketIOServer) {
    const entry = await prisma.bossRaidEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw createError.notFound('Entry not found');
    if (entry.status !== BossRaidEntryStatus.DRAWN) throw createError.badRequest('Entry is not currently drawn');

    const round = await this.pendingRoundFor(entryId);

    await prisma.$transaction([
      prisma.bossRaidEntry.update({ where: { id: entryId }, data: { status: BossRaidEntryStatus.DONE } }),
      ...(round ? [prisma.bossRaidRound.update({ where: { id: round.id }, data: { skipped: true, playedAt: new Date() } })] : []),
    ]);

    logger.info(`BossRaid ${entry.raidId}: skipped entry ${entryId}`);
    return this.emitRaid(entry.raidId, io);
  }

  // Standalone special event — no bet/win, applies a flat (boss-overridable) heal
  // straight to the boss, and ends the entrant's turn (they don't get a second shot).
  static async submitDeadBonus(entryId: string, io?: SocketIOServer) {
    const entry = await prisma.bossRaidEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw createError.notFound('Entry not found');
    if (entry.status !== BossRaidEntryStatus.DRAWN) throw createError.badRequest('Entry is not currently drawn');

    const raid = await prisma.bossRaid.findUnique({ where: { id: entry.raidId } });
    if (!raid) throw createError.notFound('Raid not found');
    if (!OPEN_STATUSES.includes(raid.status)) throw createError.badRequest('Raid has already ended');

    const round = await this.pendingRoundFor(entryId);
    if (!round) throw createError.notFound('No pending round for this entry');

    const result = resolveDeadBonus(raid.bossKey as BossKey, passiveStateOf(raid));

    await prisma.$transaction([
      prisma.bossRaid.update({ where: { id: raid.id }, data: result.updatedState as Prisma.BossRaidUpdateInput }),
      prisma.bossRaidRound.update({
        where: { id: round.id },
        data: { isDeadBonus: true, healApplied: result.healApplied, playedAt: new Date() },
      }),
      prisma.bossRaidEntry.update({ where: { id: entryId }, data: { status: BossRaidEntryStatus.DONE } }),
    ]);

    logger.info(`BossRaid ${raid.id}: dead bonus, healed ${result.healApplied} HP`);
    const response = await this.emitRaid(raid.id, io);
    return { raid: response, healApplied: result.healApplied, bannerText: result.bannerText };
  }

  static async submitRound(
    entryId: string,
    betAmount: number,
    payoutAmount: number,
    isRetrigger: boolean,
    io?: SocketIOServer
  ) {
    if (!(betAmount > 0)) throw createError.badRequest('Bet amount must be greater than 0');
    if (payoutAmount < 0) throw createError.badRequest('Payout amount cannot be negative');

    const entry = await prisma.bossRaidEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw createError.notFound('Entry not found');
    if (entry.status !== BossRaidEntryStatus.DRAWN) throw createError.badRequest('Entry is not currently drawn');

    const raid = await prisma.bossRaid.findUnique({ where: { id: entry.raidId } });
    if (!raid) throw createError.notFound('Raid not found');
    if (!OPEN_STATUSES.includes(raid.status)) throw createError.badRequest('Raid has already ended');

    const round = await this.pendingRoundFor(entryId);
    if (!round) throw createError.notFound('No pending round for this entry');

    const multiplier = Math.round((payoutAmount / betAmount) * 100) / 100;
    const state = passiveStateOf(raid);
    const result = resolveRound(raid.bossKey as BossKey, state, { multiplier, isRetrigger });
    const defeated = result.newHp <= 0;

    await prisma.$transaction([
      prisma.bossRaid.update({
        where: { id: raid.id },
        data: {
          ...(result.updatedState as Prisma.BossRaidUpdateInput),
          ...(defeated ? { status: BossRaidStatus.COMPLETED, defeated: true, closedAt: new Date() } : {}),
        },
      }),
      prisma.bossRaidRound.update({
        where: { id: round.id },
        data: {
          betAmount,
          payoutAmount,
          multiplier,
          damageDealt: result.damageDealt,
          isRetrigger: result.isRetriggerApplied,
          isCrit: result.isStunThreshold,
          isLegendary: result.isLegendary,
          playedAt: new Date(),
        },
      }),
      prisma.bossRaidEntry.update({ where: { id: entryId }, data: { status: BossRaidEntryStatus.DONE } }),
    ]);

    logger.info(`BossRaid ${raid.id}: entry ${entryId} dealt ${result.damageDealt} damage (${multiplier}x)`);

    if (defeated) {
      await this.distributeRewards(raid.id);
    }

    const response = await this.emitRaid(raid.id, io);
    return {
      raid: response,
      damageDealt: result.damageDealt,
      multiplier,
      isStunThreshold: result.isStunThreshold,
      isLegendary: result.isLegendary,
      isRetriggerApplied: result.isRetriggerApplied,
      frozenThisRound: result.frozenThisRound,
      infernoArmorShed: result.infernoArmorShed,
      phaseChanged: result.phaseChanged,
      bannerText: result.bannerText,
      defeated,
    };
  }

  // Admin-triggered conclusion — whether the boss was defeated or the stream segment
  // just needs to wrap up, the raid is archived and current top-3 contributors are
  // still rewarded (matches "when the raid ends, reward the top contributors").
  static async endRaid(raidId: string, io?: SocketIOServer) {
    const raid = await prisma.bossRaid.findUnique({ where: { id: raidId } });
    if (!raid) throw createError.notFound('Raid not found');
    if (raid.status === BossRaidStatus.COMPLETED) throw createError.badRequest('Raid has already ended');

    await prisma.bossRaid.update({ where: { id: raidId }, data: { status: BossRaidStatus.COMPLETED, closedAt: new Date() } });
    await this.distributeRewards(raidId);

    logger.info(`BossRaid ${raidId}: ended by admin`);
    return this.emitRaid(raidId, io);
  }

  // Independent per-finisher point grants (not one outer transaction) — matches the
  // established convention elsewhere in the codebase, so one failure never blocks
  // crediting the others. Unlinked kick-only entrants have no User row to credit and
  // are silently skipped (still shown on the leaderboard/victory screen either way).
  private static async distributeRewards(raidId: string) {
    const rounds = await prisma.bossRaidRound.findMany({
      where: { raidId },
      select: { entryId: true, damageDealt: true, entry: { select: { userId: true, kickUsername: true } } },
    });

    const totals = new Map<string, { userId: string | null; kickUsername: string; damage: number }>();
    for (const r of rounds) {
      const existing = totals.get(r.entryId);
      if (existing) existing.damage += r.damageDealt;
      else totals.set(r.entryId, { userId: r.entry.userId, kickUsername: r.entry.kickUsername, damage: r.damageDealt });
    }

    const top3 = Array.from(totals.values())
      .sort((a, b) => b.damage - a.damage)
      .slice(0, 3);

    const ordinals = ['1st', '2nd', '3rd'];
    for (let i = 0; i < top3.length; i++) {
      const finisher = top3[i];
      if (!finisher.userId) {
        logger.warn(`BossRaid ${raidId}: ${finisher.kickUsername} placed ${ordinals[i]} but has no linked account — skipping coin reward`);
        continue;
      }
      try {
        await PointsService.addPoints({
          userId: finisher.userId,
          amount: REWARD_COINS[i],
          reason: `Boss Raid reward: ${ordinals[i]} place, ${finisher.damage.toLocaleString()} damage dealt`,
          referenceId: raidId,
          referenceType: 'boss_raid',
        });
      } catch (err) {
        logger.error(`BossRaid ${raidId}: failed to reward ${finisher.kickUsername}`, { error: (err as Error).message });
      }
    }
  }
}
