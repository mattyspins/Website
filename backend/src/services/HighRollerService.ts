import { randomInt } from 'crypto';
import { prisma } from '@/config/database';
import { Server as SocketIOServer } from 'socket.io';
import { createError } from '@/middleware/errorHandler';
import { HighRollerStatus, HighRollerPrediction, Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';

const STREAK_MILESTONES = [5, 10, 15, 20, 25] as const;

const USER_SELECT = { id: true, displayName: true, kickUsername: true, avatarUrl: true } as const;

const INCLUDE = {
  players: {
    include: { user: { select: USER_SELECT } },
  },
  rounds: {
    orderBy: { roundNumber: 'asc' as const },
  },
} satisfies Prisma.HighRollerInclude;

type SessionWithRelations = Prisma.HighRollerGetPayload<{ include: typeof INCLUDE }>;
type PlayerWithUser = SessionWithRelations['players'][number];

// A viewer who hasn't linked Kick or registered on the site has no `user` row — fall back
// to the raw kick_username captured from chat so they can still play and be displayed.
function playerUserShape(player: PlayerWithUser) {
  if (player.user) return player.user;
  return { id: player.kickUsername, displayName: player.kickUsername, kickUsername: player.kickUsername, avatarUrl: null };
}

// Stable per-session identity for a player, usable for exclusion/dedup whether or not
// the player has a linked site account.
function playerIdentity(player: { userId: string | null; kickUsername: string }) {
  return player.userId ?? player.kickUsername;
}

function accuracyOf(player: { correctCount: number; roundsPlayed: number }) {
  if (player.roundsPlayed === 0) return 0;
  return Math.round((player.correctCount / player.roundsPlayed) * 1000) / 10;
}

// Leaderboard sort: current streak, then best streak, then accuracy, then join order —
// exactly the ordering the spec calls for.
function sortPlayers(players: PlayerWithUser[]) {
  return [...players].sort((a, b) => {
    if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
    if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
    const accDiff = accuracyOf(b) - accuracyOf(a);
    if (accDiff !== 0) return accDiff;
    return a.joinedAt.getTime() - b.joinedAt.getTime();
  });
}

function toSessionResponse(session: SessionWithRelations) {
  return {
    id: session.id,
    title: session.title,
    threshold: session.threshold,
    status: session.status,
    paused: session.paused,
    roundLocked: session.roundLocked,
    roundNumber: session.roundNumber,
    finalRound: session.finalRound,
    treatMissedAsWrong: session.treatMissedAsWrong,
    joinKeyword: session.joinKeyword,
    leaveKeyword: session.leaveKeyword,
    overKeyword: session.overKeyword,
    underKeyword: session.underKeyword,
    suggestKeyword: session.suggestKeyword,
    createdAt: session.createdAt,
    closedAt: session.closedAt,
    players: sortPlayers(session.players).map((p) => ({
      id: p.id,
      sessionId: p.sessionId,
      userId: playerIdentity(p),
      kickUsername: p.kickUsername,
      currentStreak: p.currentStreak,
      bestStreak: p.bestStreak,
      roundsPlayed: p.roundsPlayed,
      correctCount: p.correctCount,
      accuracy: accuracyOf(p),
      currentPrediction: p.currentPrediction,
      active: p.leftAt === null,
      joinedAt: p.joinedAt,
      leftAt: p.leftAt,
      user: playerUserShape(p),
    })),
    rounds: session.rounds.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      roundNumber: r.roundNumber,
      threshold: r.threshold,
      slotResult: r.slotResult,
      winningSide: r.winningSide,
      numberOver: r.numberOver,
      numberUnder: r.numberUnder,
      resolvedAt: r.resolvedAt,
    })),
  };
}

export class HighRollerService {
  static async createGame(
    params: {
      title?: string;
      threshold: number;
      joinKeyword?: string;
      leaveKeyword?: string;
      overKeyword?: string;
      underKeyword?: string;
      suggestKeyword?: string;
      treatMissedAsWrong?: boolean;
    },
    io?: SocketIOServer
  ) {
    if (!(params.threshold > 0)) throw createError.badRequest('Threshold must be greater than 0');

    // Only one High Roller game runs at a time, same convention as every other stream game.
    await prisma.highRoller.updateMany({
      where: { status: HighRollerStatus.OPEN },
      data: { status: HighRollerStatus.CLOSED, closedAt: new Date() },
    });

    const session = await prisma.highRoller.create({
      data: {
        title: params.title?.trim() || null,
        threshold: params.threshold,
        joinKeyword: params.joinKeyword?.trim() || undefined,
        leaveKeyword: params.leaveKeyword?.trim() || undefined,
        overKeyword: params.overKeyword?.trim() || undefined,
        underKeyword: params.underKeyword?.trim() || undefined,
        suggestKeyword: params.suggestKeyword?.trim() || undefined,
        treatMissedAsWrong: params.treatMissedAsWrong ?? true,
      },
      include: INCLUDE,
    });

    const response = toSessionResponse(session);
    io?.emit('highroller:updated', response);
    logger.info(`HighRoller created: id=${session.id} threshold=${session.threshold}`);
    return response;
  }

  static async getActive() {
    const session = await prisma.highRoller.findFirst({
      where: { status: HighRollerStatus.OPEN },
      include: INCLUDE,
    });
    return session ? toSessionResponse(session) : null;
  }

  static async getAll() {
    const sessions = await prisma.highRoller.findMany({
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return sessions.map(toSessionResponse);
  }

  static async getById(id: string) {
    const session = await prisma.highRoller.findUnique({ where: { id }, include: INCLUDE });
    if (!session) throw createError.notFound('Session not found');
    return toSessionResponse(session);
  }

  static async delete(id: string) {
    await prisma.highRoller.delete({ where: { id } });
  }

  private static async emitSession(id: string, io?: SocketIOServer) {
    const updated = await prisma.highRoller.findUnique({ where: { id }, include: INCLUDE });
    const response = toSessionResponse(updated!);
    io?.to(`highroller:${id}`).emit('highroller:updated', response);
    io?.emit('highroller:updated', response);
    return response;
  }

  // Lightweight event so the viewer page/widget can show a "new challenger" toast —
  // the full session snapshot above doesn't tell the client *who* just joined.
  private static emitPlayerJoined(sessionId: string, kickUsername: string, io?: SocketIOServer) {
    const payload = { sessionId, kickUsername };
    io?.to(`highroller:${sessionId}`).emit('highroller:player-joined', payload);
    io?.emit('highroller:player-joined', payload);
  }

  // ─── Admin player management ─────────────────────────────────────────────

  static async addPlayerByUsername(sessionId: string, kickUsername: string, io?: SocketIOServer) {
    const session = await prisma.highRoller.findUnique({ where: { id: sessionId } });
    if (!session) throw createError.notFound('Session not found');
    if (session.status !== HighRollerStatus.OPEN) throw createError.badRequest('Session is not open');

    const trimmed = kickUsername.trim();
    const normalized = trimmed.toLowerCase();

    const existing = await prisma.highRollerPlayer.findUnique({
      where: { sessionId_kickUsername: { sessionId, kickUsername: normalized } },
    });
    if (existing && existing.leftAt === null) throw createError.badRequest(`${trimmed} is already in the game`);

    if (existing) {
      // Rejoin after having left.
      await prisma.highRollerPlayer.update({ where: { id: existing.id }, data: { leftAt: null } });
      return this.emitSession(sessionId, io);
    }

    const user = await prisma.user.findFirst({
      where: { kickUsername: { equals: normalized, mode: 'insensitive' } },
      select: { id: true },
    });

    await prisma.highRollerPlayer.create({
      data: { sessionId, kickUsername: normalized, userId: user?.id ?? null },
    });

    logger.info(`HighRoller ${sessionId}: manually added ${trimmed}${user ? '' : ' (unlinked)'}`);
    const response = await this.emitSession(sessionId, io);
    this.emitPlayerJoined(sessionId, normalized, io);
    return response;
  }

  static async removePlayer(playerId: string, io?: SocketIOServer) {
    const player = await prisma.highRollerPlayer.findUnique({ where: { id: playerId } });
    if (!player) throw createError.notFound('Player not found');

    await prisma.highRollerPlayer.delete({ where: { id: playerId } });
    return this.emitSession(player.sessionId, io);
  }

  // ─── Chat entry points (called from KickChatService) ─────────────────────

  static async joinByKeyword(kickUsername: string, io?: SocketIOServer): Promise<boolean> {
    const session = await prisma.highRoller.findFirst({ where: { status: HighRollerStatus.OPEN } });
    if (!session) return false;

    const normalized = kickUsername.trim().toLowerCase();

    const existing = await prisma.highRollerPlayer.findUnique({
      where: { sessionId_kickUsername: { sessionId: session.id, kickUsername: normalized } },
    });

    if (existing) {
      if (existing.leftAt === null) return false; // already joined
      await prisma.highRollerPlayer.update({ where: { id: existing.id }, data: { leftAt: null } });
      await this.emitSession(session.id, io);
      return true;
    }

    const user = await prisma.user.findFirst({
      where: { kickUsername: { equals: normalized, mode: 'insensitive' } },
      select: { id: true },
    });

    await prisma.highRollerPlayer.create({
      data: { sessionId: session.id, kickUsername: normalized, userId: user?.id ?? null },
    });
    await this.emitSession(session.id, io);
    this.emitPlayerJoined(session.id, normalized, io);

    logger.info(`HighRoller ${session.id}: ${kickUsername} joined via chat${user ? '' : ' (unlinked)'}`);
    return true;
  }

  static async leaveByKeyword(kickUsername: string, io?: SocketIOServer): Promise<boolean> {
    const session = await prisma.highRoller.findFirst({ where: { status: HighRollerStatus.OPEN } });
    if (!session) return false;

    const normalized = kickUsername.trim().toLowerCase();
    const player = await prisma.highRollerPlayer.findUnique({
      where: { sessionId_kickUsername: { sessionId: session.id, kickUsername: normalized } },
    });
    if (!player || player.leftAt !== null) return false;

    await prisma.highRollerPlayer.update({ where: { id: player.id }, data: { leftAt: new Date() } });
    await this.emitSession(session.id, io);
    return true;
  }

  static async submitPrediction(
    kickUsername: string,
    prediction: HighRollerPrediction,
    io?: SocketIOServer
  ): Promise<boolean> {
    const session = await prisma.highRoller.findFirst({ where: { status: HighRollerStatus.OPEN } });
    if (!session || session.paused || session.roundLocked) return false;

    const normalized = kickUsername.trim().toLowerCase();
    const player = await prisma.highRollerPlayer.findUnique({
      where: { sessionId_kickUsername: { sessionId: session.id, kickUsername: normalized } },
    });
    if (!player || player.leftAt !== null) return false;

    // Latest prediction before lock wins — a plain overwrite handles that.
    await prisma.highRollerPlayer.update({
      where: { id: player.id },
      data: { currentPrediction: prediction },
    });
    await this.emitSession(session.id, io);
    return true;
  }

  // ─── Admin round controls ─────────────────────────────────────────────────

  static async lockPredictions(sessionId: string, io?: SocketIOServer) {
    const session = await prisma.highRoller.findUnique({ where: { id: sessionId } });
    if (!session) throw createError.notFound('Session not found');
    if (session.status !== HighRollerStatus.OPEN) throw createError.badRequest('Session is not open');
    if (session.roundLocked) throw createError.badRequest('Predictions are already locked');

    await prisma.highRoller.update({ where: { id: sessionId }, data: { roundLocked: true } });
    return this.emitSession(sessionId, io);
  }

  static async resetRound(sessionId: string, io?: SocketIOServer) {
    const session = await prisma.highRoller.findUnique({ where: { id: sessionId } });
    if (!session) throw createError.notFound('Session not found');

    await prisma.$transaction([
      prisma.highRollerPlayer.updateMany({
        where: { sessionId },
        data: { currentPrediction: null },
      }),
      prisma.highRoller.update({ where: { id: sessionId }, data: { roundLocked: false } }),
    ]);

    return this.emitSession(sessionId, io);
  }

  static async changeThreshold(sessionId: string, threshold: number, io?: SocketIOServer) {
    if (!(threshold > 0)) throw createError.badRequest('Threshold must be greater than 0');

    const session = await prisma.highRoller.findUnique({ where: { id: sessionId } });
    if (!session) throw createError.notFound('Session not found');
    if (session.roundLocked) throw createError.badRequest('Cannot change the threshold while predictions are locked');

    await prisma.highRoller.update({ where: { id: sessionId }, data: { threshold } });
    return this.emitSession(sessionId, io);
  }

  static async setPaused(sessionId: string, paused: boolean, io?: SocketIOServer) {
    await prisma.highRoller.update({ where: { id: sessionId }, data: { paused } });
    return this.emitSession(sessionId, io);
  }

  static async setFinalRound(sessionId: string, finalRound: boolean, io?: SocketIOServer) {
    await prisma.highRoller.update({ where: { id: sessionId }, data: { finalRound } });
    return this.emitSession(sessionId, io);
  }

  // The core resolution: compare the admin-entered slot result against the round's
  // threshold, score every active player, and commit round history atomically.
  static async resolveRound(sessionId: string, slotResult: number, io?: SocketIOServer) {
    if (!(slotResult >= 0)) throw createError.badRequest('Slot result must be zero or greater');

    const session = await prisma.highRoller.findUnique({ where: { id: sessionId } });
    if (!session) throw createError.notFound('Session not found');
    if (session.status !== HighRollerStatus.OPEN) throw createError.badRequest('Session is not open');
    if (!session.roundLocked) throw createError.badRequest('Lock predictions before resolving the round');

    // Hitting exactly the threshold counts as clearing it (Over), matching how "Over/Under X"
    // lines are conventionally read.
    const winningSide: HighRollerPrediction =
      slotResult >= Number(session.threshold) ? HighRollerPrediction.OVER : HighRollerPrediction.UNDER;

    const result = await prisma.$transaction(async (tx) => {
      const players = await tx.highRollerPlayer.findMany({ where: { sessionId, leftAt: null } });

      const roundNumber = session.roundNumber + 1;
      let numberOver = 0;
      let numberUnder = 0;

      const milestonesHit: Array<{ playerId: string; kickUsername: string; streak: number }> = [];
      const scored: Array<{
        playerId: string;
        kickUsername: string;
        prediction: HighRollerPrediction | null;
        correct: boolean;
        streakAfter: number;
        predicted: boolean;
      }> = [];

      for (const player of players) {
        const predicted = player.currentPrediction !== null;
        if (predicted) {
          if (player.currentPrediction === HighRollerPrediction.OVER) numberOver++;
          else numberUnder++;
        }

        if (!predicted && !session.treatMissedAsWrong) {
          // Fully skipped round for this player — no stats touched, no history row.
          continue;
        }

        const correct = predicted && player.currentPrediction === winningSide;
        const newStreak = correct ? player.currentStreak + 1 : 0;
        const newBest = Math.max(player.bestStreak, newStreak);

        await tx.highRollerPlayer.update({
          where: { id: player.id },
          data: {
            currentStreak: newStreak,
            bestStreak: newBest,
            roundsPlayed: { increment: 1 },
            correctCount: correct ? { increment: 1 } : undefined,
            currentPrediction: null,
          },
        });

        if (correct && STREAK_MILESTONES.includes(newStreak as (typeof STREAK_MILESTONES)[number])) {
          milestonesHit.push({ playerId: player.id, kickUsername: player.kickUsername, streak: newStreak });
        }

        scored.push({
          playerId: player.id,
          kickUsername: player.kickUsername,
          prediction: player.currentPrediction,
          correct,
          streakAfter: newStreak,
          predicted,
        });
      }

      const round = await tx.highRollerRound.create({
        data: {
          sessionId,
          roundNumber,
          threshold: session.threshold,
          slotResult,
          winningSide,
          numberOver,
          numberUnder,
        },
      });

      for (const s of scored) {
        await tx.highRollerRoundPrediction.create({
          data: {
            roundId: round.id,
            playerId: s.playerId,
            prediction: s.prediction,
            correct: s.correct,
            streakAfter: s.streakAfter,
          },
        });
      }

      await tx.highRoller.update({
        where: { id: sessionId },
        data: { roundNumber, roundLocked: false },
      });

      return { round, scored, milestonesHit };
    });

    const predicted = result.scored.filter((s) => s.predicted);
    const perfectRound = predicted.length > 0 && predicted.every((s) => s.correct);
    const houseWins = predicted.length > 0 && predicted.every((s) => !s.correct);

    const leader = result.scored.reduce<{ kickUsername: string; streakAfter: number } | null>((best, s) => {
      if (!best || s.streakAfter > best.streakAfter) return s;
      return best;
    }, null);

    logger.info(`HighRoller ${sessionId}: round ${result.round.roundNumber} resolved — ${winningSide} (${slotResult}x)`);

    const roundResult = {
      sessionId,
      roundNumber: result.round.roundNumber,
      threshold: Number(session.threshold),
      slotResult,
      winningSide,
      numberOver: result.round.numberOver,
      numberUnder: result.round.numberUnder,
      milestonesHit: result.milestonesHit,
      newStreakLeader: leader && leader.streakAfter > 0 ? leader : null,
      perfectRound,
      houseWins,
    };

    const session2 = await this.emitSession(sessionId, io);
    // Separate event so the viewer page/widget can trigger the reveal animation —
    // the full-snapshot event above has no room for "what just happened this round".
    io?.to(`highroller:${sessionId}`).emit('highroller:round-result', roundResult);
    io?.emit('highroller:round-result', roundResult);

    return { session: session2, roundResult };
  }

  // ─── Suggestion entry + draw ───────────────────────────────────────────────

  // Called on the "!suggest" chat command — opts a chatter into the suggestion-draw pool
  // independently of whether they've joined the prediction game itself.
  static async suggestEntryByKeyword(kickUsername: string, io?: SocketIOServer): Promise<boolean> {
    const session = await prisma.highRoller.findFirst({ where: { status: HighRollerStatus.OPEN } });
    if (!session || !session.suggestKeyword) return false;

    const normalized = kickUsername.trim().toLowerCase();
    const existing = await prisma.highRollerSuggestionEntrant.findUnique({
      where: { sessionId_kickUsername: { sessionId: session.id, kickUsername: normalized } },
    });
    if (existing) return false;

    await prisma.highRollerSuggestionEntrant.create({
      data: { sessionId: session.id, kickUsername: normalized },
    });
    await this.emitSession(session.id, io);
    return true;
  }

  // `pool: 'joined'` draws only from players who joined the prediction game; `'suggested'`
  // draws from anyone who opted in via the (independent) "!suggest" command.
  static async drawSuggestion(
    sessionId: string,
    options: { pool: 'joined' | 'suggested'; excludePrevious: boolean },
    io?: SocketIOServer
  ) {
    const session = await prisma.highRoller.findUnique({ where: { id: sessionId } });
    if (!session) throw createError.notFound('Session not found');

    let candidates: Array<{ kickUsername: string; userId: string | null }> =
      options.pool === 'joined'
        ? await prisma.highRollerPlayer.findMany({ where: { sessionId, leftAt: null } })
        : (await prisma.highRollerSuggestionEntrant.findMany({ where: { sessionId } })).map((e) => ({
            kickUsername: e.kickUsername,
            userId: null,
          }));

    if (options.excludePrevious) {
      const previous = await prisma.highRollerSuggestionDraw.findMany({
        where: { sessionId },
        select: { kickUsername: true },
      });
      const drawnSet = new Set(previous.map((p) => p.kickUsername));
      const remaining = candidates.filter((p) => !drawnSet.has(p.kickUsername));
      candidates = remaining.length > 0 ? remaining : candidates; // everyone's had a turn — cycle resets
    }

    if (candidates.length === 0) throw createError.badRequest('No eligible viewers to draw from');

    const pick = candidates[randomInt(0, candidates.length)];
    await prisma.highRollerSuggestionDraw.create({
      data: { sessionId, kickUsername: pick.kickUsername },
    });

    const session2 = await this.emitSession(sessionId, io);
    logger.info(`HighRoller ${sessionId}: drew ${pick.kickUsername} for slot suggestion`);

    const winner = { kickUsername: pick.kickUsername, userId: pick.userId ?? pick.kickUsername };
    // Separate event so viewer/widget can run the cycling-names reveal animation —
    // they don't call this endpoint themselves, so they'd otherwise never know a
    // draw just happened until the next full-session poll.
    const drawPayload = { sessionId, winner };
    io?.to(`highroller:${sessionId}`).emit('highroller:suggestion-draw', drawPayload);
    io?.emit('highroller:suggestion-draw', drawPayload);

    return { session: session2, winner };
  }

  // Called on "!sr <slot name>" — lets whoever was most recently drawn to suggest the next
  // slot name it, by matching the sender against that draw's kickUsername. Ignored for
  // anyone else so a random chatter's "!sr" (the separate, general Slot Request queue)
  // doesn't get misattributed as the suggestion pick's answer.
  static async submitSuggestedSlot(kickUsername: string, slotName: string, io?: SocketIOServer): Promise<boolean> {
    const session = await prisma.highRoller.findFirst({ where: { status: HighRollerStatus.OPEN } });
    if (!session) return false;

    const normalized = kickUsername.trim().toLowerCase();
    const lastDraw = await prisma.highRollerSuggestionDraw.findFirst({
      where: { sessionId: session.id },
      orderBy: { drawnAt: 'desc' },
    });
    if (!lastDraw || lastDraw.kickUsername.toLowerCase() !== normalized) return false;

    await prisma.highRollerSuggestionDraw.update({
      where: { id: lastDraw.id },
      data: { slotName: slotName.trim(), slotCalledAt: new Date() },
    });

    const payload = { sessionId: session.id, kickUsername: lastDraw.kickUsername, slotName: slotName.trim() };
    io?.to(`highroller:${session.id}`).emit('highroller:suggestion-slot', payload);
    io?.emit('highroller:suggestion-slot', payload);

    logger.info(`HighRoller ${session.id}: ${kickUsername} called slot "${slotName}" via !sr`);
    return true;
  }

  // ─── End game / Hall of Fame ───────────────────────────────────────────────

  static async endGame(sessionId: string, io?: SocketIOServer) {
    const session = await prisma.highRoller.findUnique({ where: { id: sessionId } });
    if (!session) throw createError.notFound('Session not found');

    const players = await prisma.highRollerPlayer.findMany({ where: { sessionId } });
    const predictions = await prisma.highRollerRoundPrediction.findMany({
      where: { player: { sessionId } },
      include: { round: { select: { roundNumber: true } } },
      orderBy: { round: { roundNumber: 'asc' } },
    });

    await prisma.highRoller.update({
      where: { id: sessionId },
      data: { status: HighRollerStatus.CLOSED, closedAt: new Date() },
    });

    const withRounds = players.filter((p) => p.roundsPlayed > 0);
    const maxBestStreak = Math.max(0, ...players.map((p) => p.bestStreak));
    const champions = players.filter((p) => p.bestStreak === maxBestStreak && maxBestStreak > 0);

    const maxAccuracy = withRounds.length > 0 ? Math.max(...withRounds.map((p) => accuracyOf(p))) : 0;
    const mostAccurate = withRounds.filter((p) => accuracyOf(p) === maxAccuracy);

    const maxCorrect = Math.max(0, ...players.map((p) => p.correctCount));
    const mostCorrect = players.filter((p) => p.correctCount === maxCorrect && maxCorrect > 0);

    // "Biggest comeback": for each player, the longest correct-streak run that started
    // after an earlier reset-to-zero within this same session.
    let biggestComeback: { kickUsername: string; streak: number } | null = null;
    for (const player of players) {
      const own = predictions.filter((p) => p.playerId === player.id);
      let sawReset = false;
      let bestRun = 0;
      for (const p of own) {
        if (p.streakAfter === 0) {
          sawReset = true;
        } else if (sawReset) {
          bestRun = Math.max(bestRun, p.streakAfter);
        }
      }
      if (bestRun > 0 && (!biggestComeback || bestRun > biggestComeback.streak)) {
        biggestComeback = { kickUsername: player.kickUsername, streak: bestRun };
      }
    }

    const mvp = players.reduce<{ kickUsername: string; score: number } | null>((best, p) => {
      const score = p.bestStreak * 2 + accuracyOf(p);
      if (!best || score > best.score) return { kickUsername: p.kickUsername, score };
      return best;
    }, null);

    const response = await this.getById(sessionId);
    io?.to(`highroller:${sessionId}`).emit('highroller:updated', response);
    io?.emit('highroller:updated', response);

    const hallOfFame = {
      champions: champions.map((p) => ({ kickUsername: p.kickUsername, bestStreak: p.bestStreak })),
      longestStreak: maxBestStreak,
      mostAccurate: mostAccurate.map((p) => ({ kickUsername: p.kickUsername, accuracy: accuracyOf(p) })),
      mostCorrectPredictions: mostCorrect.map((p) => ({ kickUsername: p.kickUsername, correctCount: p.correctCount })),
      totalRoundsPlayed: session.roundNumber,
      biggestComeback,
      mvp,
    };

    // Separate event so the viewer page/widget can run the champion celebration —
    // they're not the ones calling endGame, so the Hall of Fame summary would
    // otherwise never reach them (the plain session update just says CLOSED).
    const endedPayload = { sessionId, hallOfFame };
    io?.to(`highroller:${sessionId}`).emit('highroller:game-ended', endedPayload);
    io?.emit('highroller:game-ended', endedPayload);

    return { session: response, hallOfFame };
  }
}
