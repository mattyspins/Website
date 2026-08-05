import { randomInt } from 'crypto';
import { prisma } from '@/config/database';
import { Server as SocketIOServer } from 'socket.io';
import { createError } from '@/middleware/errorHandler';
import { LiftStatus, LiftRoundType } from '@prisma/client';
import { logger } from '@/utils/logger';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Phase durations (ms). Round-driven phases (lobby → decision → lock → pause →
// resolve) are timer-authoritative once the admin hits "Start" — see schedule().
const LOBBY_MS = 18_000;
const CHOICE_DECISION_MS = 25_000;
const SYNC_STABILIZE_MS = 20_000; // required occupancy must hold this long, uninterrupted
const SYNC_MAX_MS = 90_000; // hard cap so chat churn can't stall a round forever
const LOCK_MS = 3_000;
const PAUSE_MS = 5_000;
const RESOLVE_MS = 5_500;
const FINALE_MS = 8_000;
const MAX_ROUNDS = 15; // safety valve — forces the AI-lottery finale if nobody's won by then

function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }

function elevatorCountFor(survivors: number) {
  return clamp(Math.round(survivors / 8), 3, 6);
}

// Splits `n` as evenly as possible across `k` elevators, in random order, summing to n.
function splitRequired(n: number, k: number): number[] {
  const base = Math.floor(n / k);
  let rem = n - base * k;
  const counts = new Array(k).fill(base);
  const order = [...Array(k).keys()].sort(() => Math.random() - 0.5);
  for (let i = 0; i < rem; i++) counts[order[i]]++;
  return counts;
}

const USER_SELECT = { id: true, displayName: true, kickUsername: true, avatarUrl: true } as const;

async function buildSnapshot(sessionId: string) {
  const session = await prisma.liftSession.findUnique({
    where: { id: sessionId },
    include: {
      players: { orderBy: { kickUsername: 'asc' } },
      rounds: {
        where: { roundNumber: { gt: 0 } },
        orderBy: { roundNumber: 'desc' },
        take: 1,
        include: { elevators: { orderBy: { letter: 'asc' } } },
      },
    },
  });
  if (!session) return null;

  const currentRound = session.rounds[0] ?? null;
  const alivePlayers = session.players.filter((p) => p.alive);

  const elevators = (currentRound?.elevators ?? []).map((e) => ({
    letter: e.letter,
    current: alivePlayers.filter((p) => p.currentElevator === e.letter).length,
    required: e.requiredCount,
    status: e.status,
  }));

  return {
    id: session.id,
    label: session.label,
    status: session.status,
    round: session.round,
    roundType: currentRound?.type ?? null,
    joinKeyword: session.joinKeyword,
    readyKeyword: session.readyKeyword,
    phaseEndsAt: session.phaseEndsAt,
    caption: session.caption,
    captionSub: session.captionSub,
    survivors: alivePlayers.length,
    createdAt: session.createdAt,
    endedAt: session.endedAt,
    players: session.players.map((p) => ({
      kickUsername: p.kickUsername,
      avatarUrl: p.avatarUrl,
      avatarSeed: p.avatarSeed,
      alive: p.alive,
      ready: !!p.readyAt,
      currentElevator: p.currentElevator,
    })),
    elevators,
  };
}

export type LiftSnapshot = NonNullable<Awaited<ReturnType<typeof buildSnapshot>>>;

export class LiftService {
  // In-memory phase clock — mirrors setKothIO's module-level state. Lost on restart,
  // which just means an in-flight session stalls until an admin cancels/restarts it;
  // acceptable for this scope (no other game in this codebase persists scheduled jobs).
  private static timers = new Map<string, ReturnType<typeof setTimeout>>();
  private static syncCapAt = new Map<string, number>();

  private static clearTimer(sessionId: string) {
    const t = this.timers.get(sessionId);
    if (t) clearTimeout(t);
    this.timers.delete(sessionId);
  }

  private static schedule(sessionId: string, delayMs: number, fn: () => void | Promise<void>) {
    this.clearTimer(sessionId);
    const t = setTimeout(() => {
      Promise.resolve(fn()).catch((e) =>
        logger.error(`LiftService: scheduled phase transition failed for ${sessionId}`, { error: (e as Error).message })
      );
    }, Math.max(0, delayMs));
    this.timers.set(sessionId, t);
  }

  private static async emit(sessionId: string, io?: SocketIOServer) {
    const snapshot = await buildSnapshot(sessionId);
    if (!snapshot) return null;
    io?.to(`lift:${sessionId}`).emit('lift:updated', snapshot);
    io?.emit('lift:updated', snapshot);
    return snapshot;
  }

  static async getActive() {
    const session = await prisma.liftSession.findFirst({
      where: { status: { notIn: [LiftStatus.ENDED, LiftStatus.CANCELLED] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    return session ? buildSnapshot(session.id) : null;
  }

  static async getById(id: string) {
    const snapshot = await buildSnapshot(id);
    if (!snapshot) throw createError.notFound('Session not found');
    return snapshot;
  }

  static async create(label: string | undefined, io?: SocketIOServer) {
    const active = await prisma.liftSession.findFirst({
      where: { status: { notIn: [LiftStatus.ENDED, LiftStatus.CANCELLED] } },
    });
    if (active) throw createError.badRequest('A Lift session is already active — cancel it before starting a new one');

    const session = await prisma.liftSession.create({ data: { label: label?.trim() || null } });
    logger.info(`Lift session created: id=${session.id}`);
    return this.emit(session.id, io);
  }

  // ─── Chat commands ────────────────────────────────────────────────────────

  // "!join" (session.joinKeyword) — only accepted while the session is in the JOIN phase.
  static async handleJoin(kickUsername: string, content: string, io?: SocketIOServer): Promise<boolean> {
    const session = await prisma.liftSession.findFirst({ where: { status: LiftStatus.JOIN } });
    if (!session) return false;
    if (content.trim().toLowerCase() !== session.joinKeyword.toLowerCase()) return false;

    const normalized = kickUsername.trim().toLowerCase();
    const existing = await prisma.liftPlayer.findUnique({
      where: { sessionId_kickUsername: { sessionId: session.id, kickUsername: normalized } },
    });
    if (existing) return false;

    const user = await prisma.user.findFirst({
      where: { kickUsername: { equals: normalized, mode: 'insensitive' } },
      select: { id: true, avatarUrl: true },
    });

    await prisma.liftPlayer.create({
      data: {
        sessionId: session.id,
        kickUsername: normalized,
        userId: user?.id ?? null,
        avatarUrl: user?.avatarUrl ?? null,
        avatarSeed: randomInt(0, 1_000_000),
      },
    });
    await this.emit(session.id, io);
    logger.info(`Lift ${session.id}: ${normalized} joined via ${session.joinKeyword}${user ? '' : ' (unlinked)'}`);
    return true;
  }

  // "!ready" (session.readyKeyword) — only accepted while the session is in the READY phase,
  // and only from players who actually joined.
  static async handleReady(kickUsername: string, content: string, io?: SocketIOServer): Promise<boolean> {
    const session = await prisma.liftSession.findFirst({ where: { status: LiftStatus.READY } });
    if (!session) return false;
    if (content.trim().toLowerCase() !== session.readyKeyword.toLowerCase()) return false;

    const normalized = kickUsername.trim().toLowerCase();
    const player = await prisma.liftPlayer.findUnique({
      where: { sessionId_kickUsername: { sessionId: session.id, kickUsername: normalized } },
    });
    if (!player || player.readyAt) return false;

    await prisma.liftPlayer.update({ where: { id: player.id }, data: { readyAt: new Date() } });
    await this.emit(session.id, io);
    return true;
  }

  // "!a".."!f" — only accepted during an active round's decision phase, from alive players.
  static async handlePick(kickUsername: string, letter: string, io?: SocketIOServer): Promise<boolean> {
    const session = await prisma.liftSession.findFirst({ where: { status: LiftStatus.ROUND_DECISION } });
    if (!session) return false;

    const round = await prisma.liftRound.findUnique({
      where: { sessionId_roundNumber: { sessionId: session.id, roundNumber: session.round } },
      include: { elevators: true },
    });
    if (!round || !round.elevators.some((e) => e.letter === letter)) return false;

    const normalized = kickUsername.trim().toLowerCase();
    const player = await prisma.liftPlayer.findUnique({
      where: { sessionId_kickUsername: { sessionId: session.id, kickUsername: normalized } },
    });
    if (!player || !player.alive) return false;

    await prisma.liftPlayer.update({ where: { id: player.id }, data: { currentElevator: letter } });
    await this.emit(session.id, io);

    // SYNC rounds reset their stabilize window on every change — capped so it can't stall forever.
    if (round.type === LiftRoundType.SYNC) {
      const capAt = this.syncCapAt.get(session.id) ?? Date.now() + SYNC_MAX_MS;
      const nextFire = Math.min(Date.now() + SYNC_STABILIZE_MS, capAt);
      this.schedule(session.id, nextFire - Date.now(), () => this.advanceToLock(session.id, io));
    }
    return true;
  }

  // ─── Admin controls ───────────────────────────────────────────────────────

  static async advanceToReady(sessionId: string, io?: SocketIOServer) {
    const session = await prisma.liftSession.findUnique({ where: { id: sessionId } });
    if (!session) throw createError.notFound('Session not found');
    if (session.status !== LiftStatus.JOIN) throw createError.badRequest('Session is not accepting joins');

    const count = await prisma.liftPlayer.count({ where: { sessionId } });
    if (count === 0) throw createError.badRequest('No one has joined yet');

    await prisma.liftSession.update({
      where: { id: sessionId },
      data: { status: LiftStatus.READY, caption: 'SURVIVAL PROTOCOL ACTIVATED', captionSub: `TYPE ${session.readyKeyword.toUpperCase()} TO CONFIRM PARTICIPATION` },
    });
    return this.emit(sessionId, io);
  }

  static async start(sessionId: string, io?: SocketIOServer) {
    const session = await prisma.liftSession.findUnique({ where: { id: sessionId } });
    if (!session) throw createError.notFound('Session not found');
    if (session.status !== LiftStatus.READY) throw createError.badRequest('Session is not in the ready phase');

    // Only players who confirmed !ready carry over into the game.
    const notReady = await prisma.liftPlayer.findMany({ where: { sessionId, readyAt: null }, select: { id: true } });
    if (notReady.length) {
      await prisma.liftPlayer.updateMany({ where: { id: { in: notReady.map((p) => p.id) } }, data: { alive: false, eliminatedRound: 0 } });
    }

    const survivors = await prisma.liftPlayer.count({ where: { sessionId, alive: true } });
    if (survivors === 0) throw createError.badRequest('No one confirmed !ready');

    await this.beginRoundLobby(sessionId, 1, io);
    return buildSnapshot(sessionId);
  }

  static async cancel(sessionId: string, io?: SocketIOServer) {
    this.clearTimer(sessionId);
    this.syncCapAt.delete(sessionId);
    const session = await prisma.liftSession.findUnique({ where: { id: sessionId } });
    if (!session) throw createError.notFound('Session not found');

    await prisma.liftSession.update({
      where: { id: sessionId },
      data: { status: LiftStatus.CANCELLED, endedAt: new Date(), caption: 'FACILITY SHUTDOWN — SESSION CANCELLED', captionSub: '' },
    });
    return this.emit(sessionId, io);
  }

  // ─── Autonomous phase chain (round 1 onward) ─────────────────────────────

  private static async beginRoundLobby(sessionId: string, roundNumber: number, io?: SocketIOServer) {
    const survivors = await prisma.liftPlayer.count({ where: { sessionId, alive: true } });

    if (survivors <= 1 || roundNumber > MAX_ROUNDS) {
      await this.beginFinale(sessionId, io);
      return;
    }

    // Fresh round: everyone's elevator choice resets, doors are closed again.
    await prisma.liftPlayer.updateMany({ where: { sessionId, alive: true }, data: { currentElevator: null } });

    const type: LiftRoundType = roundNumber <= 2 ? LiftRoundType.CHOICE : LiftRoundType.SYNC;
    const count = elevatorCountFor(survivors);
    const letters = LETTERS.slice(0, count);

    let doomedLetter: string | null = null;
    let required: number[] = [];
    if (type === LiftRoundType.CHOICE) {
      doomedLetter = letters[randomInt(0, letters.length)];
    } else {
      required = splitRequired(survivors, letters.length);
    }

    await prisma.liftRound.create({
      data: {
        sessionId,
        roundNumber,
        type,
        elevators: {
          create: letters.map((letter, i) => ({
            letter,
            doomed: letter === doomedLetter,
            requiredCount: type === LiftRoundType.SYNC ? required[i] : null,
          })),
        },
      },
    });

    await prisma.liftSession.update({
      where: { id: sessionId },
      data: {
        round: roundNumber,
        status: LiftStatus.ROUND_LOBBY,
        caption: `ROUND ${roundNumber} INITIATING`,
        captionSub: type === LiftRoundType.CHOICE ? 'THE CHOICE' : 'SYNCHRONIZATION PROTOCOL',
        phaseEndsAt: new Date(Date.now() + LOBBY_MS),
      },
    });
    await this.emit(sessionId, io);

    this.schedule(sessionId, LOBBY_MS, () => this.beginDecision(sessionId, io));
  }

  private static async beginDecision(sessionId: string, io?: SocketIOServer) {
    const session = await prisma.liftSession.findUnique({ where: { id: sessionId } });
    if (!session) return;
    const round = await prisma.liftRound.findUnique({
      where: { sessionId_roundNumber: { sessionId, roundNumber: session.round } },
      include: { elevators: true },
    });
    if (!round) return;

    const letters = round.elevators.map((e) => e.letter).join(' / !');
    const isSync = round.type === LiftRoundType.SYNC;

    await prisma.liftSession.update({
      where: { id: sessionId },
      data: {
        status: LiftStatus.ROUND_DECISION,
        caption: isSync ? 'MATCH THE REQUIRED OCCUPANCY' : 'ELEVATOR DOORS OPEN',
        captionSub: `TYPE !${letters} ${isSync ? 'TO SWITCH LIFTS — COUNTS MUST BE EXACT' : 'IN CHAT TO CHOOSE YOUR LIFT'}`,
        phaseEndsAt: new Date(Date.now() + (isSync ? SYNC_STABILIZE_MS : CHOICE_DECISION_MS)),
      },
    });
    await this.emit(sessionId, io);

    if (isSync) {
      this.syncCapAt.set(sessionId, Date.now() + SYNC_MAX_MS);
      this.schedule(sessionId, SYNC_STABILIZE_MS, () => this.advanceToLock(sessionId, io));
    } else {
      this.schedule(sessionId, CHOICE_DECISION_MS, () => this.advanceToLock(sessionId, io));
    }
  }

  private static async advanceToLock(sessionId: string, io?: SocketIOServer) {
    this.syncCapAt.delete(sessionId);
    await prisma.liftSession.update({
      where: { id: sessionId },
      data: { status: LiftStatus.ROUND_LOCK, caption: 'DOORS LOCKING', captionSub: '', phaseEndsAt: new Date(Date.now() + LOCK_MS) },
    });
    await this.emit(sessionId, io);
    this.schedule(sessionId, LOCK_MS, () => this.advanceToPause(sessionId, io));
  }

  private static async advanceToPause(sessionId: string, io?: SocketIOServer) {
    await prisma.liftSession.update({
      where: { id: sessionId },
      data: { status: LiftStatus.ROUND_PAUSE, caption: 'PROCESSING', captionSub: '', phaseEndsAt: new Date(Date.now() + PAUSE_MS) },
    });
    await this.emit(sessionId, io);
    this.schedule(sessionId, PAUSE_MS, () => this.resolveRound(sessionId, io));
  }

  private static async resolveRound(sessionId: string, io?: SocketIOServer) {
    const session = await prisma.liftSession.findUnique({ where: { id: sessionId } });
    if (!session) return;
    const round = await prisma.liftRound.findUnique({
      where: { sessionId_roundNumber: { sessionId, roundNumber: session.round } },
      include: { elevators: true },
    });
    if (!round) return;

    const alivePlayers = await prisma.liftPlayer.findMany({ where: { sessionId, alive: true } });
    const noChoice = alivePlayers.filter((p) => !p.currentElevator);

    let caption: string;
    let captionSub: string;
    const toEliminate = new Set<string>(noChoice.map((p) => p.id));

    if (round.type === LiftRoundType.CHOICE) {
      const dead = round.elevators.find((e) => e.doomed)!;
      const deadOccupants = alivePlayers.filter((p) => p.currentElevator === dead.letter);
      deadOccupants.forEach((p) => toEliminate.add(p.id));

      await Promise.all(round.elevators.map((e) =>
        prisma.liftElevator.update({
          where: { id: e.id },
          data: {
            status: e.id === dead.id ? 'dead' : 'idle',
            finalCount: alivePlayers.filter((p) => p.currentElevator === e.letter).length,
          },
        })
      ));

      caption = `LIFT ${dead.letter} HAS BEEN TERMINATED`;
      captionSub = noChoice.length
        ? `${deadOccupants.length} LOST — ${noChoice.length} ELIMINATED FOR NOT SELECTING A LIFT`
        : `${deadOccupants.length} LOST`;
    } else {
      let failCount = 0;
      let failedTotal = 0;
      await Promise.all(round.elevators.map(async (e) => {
        const occupants = alivePlayers.filter((p) => p.currentElevator === e.letter);
        const ok = occupants.length === (e.requiredCount ?? 0);
        if (!ok) {
          failCount++;
          failedTotal += occupants.length;
          occupants.forEach((p) => toEliminate.add(p.id));
        }
        await prisma.liftElevator.update({ where: { id: e.id }, data: { status: ok ? 'idle' : 'dead', finalCount: occupants.length } });
      }));

      const extra = noChoice.length ? ` + ${noChoice.length} FOR NOT SELECTING A LIFT` : '';
      if (failCount === 0) {
        caption = 'ALL LIFTS STABILIZED';
        captionSub = noChoice.length ? `PROTOCOL COMPLETE${extra}` : 'PROTOCOL COMPLETE';
      } else {
        caption = failCount === 1 ? 'SYNCHRONIZATION FAILED ON ONE LIFT' : `SYNCHRONIZATION FAILED ON ${failCount} LIFTS`;
        captionSub = `${failedTotal} LOST${extra}`;
      }
    }

    if (toEliminate.size) {
      await prisma.liftPlayer.updateMany({
        where: { id: { in: [...toEliminate] } },
        data: { alive: false, eliminatedRound: session.round },
      });
    }

    await prisma.liftSession.update({
      where: { id: sessionId },
      data: { status: LiftStatus.ROUND_RESOLVE, caption, captionSub, phaseEndsAt: new Date(Date.now() + RESOLVE_MS) },
    });
    await this.emit(sessionId, io);

    this.schedule(sessionId, RESOLVE_MS, () => this.beginRoundLobby(sessionId, session.round + 1, io));
  }

  private static async beginFinale(sessionId: string, io?: SocketIOServer) {
    const survivors = await prisma.liftPlayer.findMany({ where: { sessionId, alive: true } });

    let caption: string;
    let captionSub: string;
    if (survivors.length === 0) {
      caption = 'NO SURVIVORS REMAIN';
      captionSub = 'FACILITY ENTERING PERMANENT SHUTDOWN';
    } else if (survivors.length === 1) {
      caption = 'SURVIVOR CONFIRMED';
      captionSub = 'EVACUATION AUTHORIZED';
    } else {
      // Safety-valve ending — MAX_ROUNDS was hit with more than one survivor left.
      const winner = survivors[randomInt(0, survivors.length)];
      const losers = survivors.filter((p) => p.id !== winner.id);
      await prisma.liftPlayer.updateMany({ where: { id: { in: losers.map((p) => p.id) } }, data: { alive: false } });
      caption = 'MULTIPLE SURVIVORS DETECTED';
      captionSub = 'EMERGENCY AI SELECTING ONE PASSENGER — EVACUATION AUTHORIZED';
    }

    await prisma.liftSession.update({
      where: { id: sessionId },
      data: { status: LiftStatus.FINALE, caption, captionSub, phaseEndsAt: new Date(Date.now() + FINALE_MS) },
    });
    await this.emit(sessionId, io);

    this.schedule(sessionId, FINALE_MS, () => this.end(sessionId, io));
  }

  private static async end(sessionId: string, io?: SocketIOServer) {
    this.clearTimer(sessionId);
    await prisma.liftSession.update({
      where: { id: sessionId },
      data: {
        status: LiftStatus.ENDED,
        endedAt: new Date(),
        caption: 'EVACUATION COMPLETE',
        captionSub: 'FACILITY ENTERING PERMANENT SHUTDOWN',
      },
    });
    await this.emit(sessionId, io);
  }
}
