import { PrismaClient } from '@prisma/client';
import createError from 'http-errors';
import { Server as SocketIOServer } from 'socket.io';
import {
  TournamentStatus,
  MatchStatus,
  CreateTournamentDTO,
  TournamentResponse,
  ParticipantResponse,
  MatchResponse,
} from '@/types/tournament';

const prisma = new PrismaClient();

export class TournamentService {
  // ─── Helpers ───────────────────────────────────────────────────────────────

  private static formatParticipant(p: any): ParticipantResponse {
    return {
      id: p.id,
      userId: p.userId,
      displayName: p.user?.kickUsername ?? p.user?.displayName ?? '',
      avatarUrl: p.user?.avatarUrl ?? null,
      seed: p.seed,
      currentSlot: p.currentSlot,
      slotConfirmed: p.slotConfirmed,
      slotDeadline: p.slotDeadline?.toISOString() ?? null,
      eliminated: p.eliminated,
      finalPosition: p.finalPosition,
    };
  }

  private static formatMatch(m: any): MatchResponse {
    return {
      id: m.id,
      round: m.round,
      matchNumber: m.matchNumber,
      status: m.status as MatchStatus,
      winnerId: m.winnerId,
      nextMatchId: m.nextMatchId,
      slotDeadline: m.slotDeadline?.toISOString() ?? null,
      participants: (m.participants ?? []).map((mp: any) => ({
        id: mp.id,
        participantId: mp.participantId,
        userId: mp.participant?.userId ?? '',
        displayName: mp.participant?.user?.kickUsername ?? mp.participant?.user?.displayName ?? '',
        avatarUrl: mp.participant?.user?.avatarUrl ?? null,
        slotCall: mp.slotCall,
        slotConfirmed: mp.slotConfirmed,
      })),
    };
  }

  static async formatTournament(t: any): Promise<TournamentResponse> {
    // Use pre-fetched _count if available (avoids N+1 when called from getAll)
    const entryCount = t._count?.entries ??
      await prisma.tournamentEntry.count({ where: { tournamentId: t.id } });
    return {
      id: t.id,
      title: t.title,
      status: t.status as TournamentStatus,
      maxPlayers: t.maxPlayers,
      slotTimerSeconds: t.slotTimerSeconds,
      currentRound: t.currentRound,
      entryCount,
      participants: (t.participants ?? []).map(TournamentService.formatParticipant),
      matches: (t.matches ?? []).map(TournamentService.formatMatch),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  private static async getTournamentWithRelations(id: string) {
    return prisma.tournament.findUnique({
      where: { id },
      include: {
        participants: {
          include: { user: true },
          orderBy: { seed: 'asc' },
        },
        matches: {
          include: {
            participants: {
              include: { participant: { include: { user: true } } },
            },
          },
          orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
        },
        _count: { select: { entries: true } },
      },
    });
  }

  // ─── Bracket builder ──────────────────────────────────────────────────────

  private static totalRounds(n: number): number {
    return Math.ceil(Math.log2(n));
  }

  /** Fisher-Yates shuffle */
  private static shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ─── ADMIN: Create ─────────────────────────────────────────────────────────

  static async create(dto: CreateTournamentDTO, adminId: string): Promise<TournamentResponse> {
    if (dto.maxPlayers < 2 || dto.maxPlayers > 64) {
      throw createError(400, 'maxPlayers must be between 2 and 64');
    }
    if (dto.slotTimerSeconds < 60 || dto.slotTimerSeconds > 600) {
      throw createError(400, 'slotTimerSeconds must be between 60 and 600');
    }

    const tournament = await prisma.tournament.create({
      data: {
        title: dto.title,
        maxPlayers: dto.maxPlayers,
        slotTimerSeconds: dto.slotTimerSeconds,
        createdById: adminId,
      },
      include: { participants: { include: { user: true } }, matches: { include: { participants: { include: { participant: { include: { user: true } } } } } }, _count: { select: { entries: true } } },
    });
    return TournamentService.formatTournament(tournament);
  }

  // ─── ADMIN: Open registration ──────────────────────────────────────────────

  static async openRegistration(id: string): Promise<TournamentResponse> {
    const t = await prisma.tournament.findUnique({ where: { id } });
    if (!t) throw createError(404, 'Tournament not found');
    if (t.status !== TournamentStatus.DRAFT) throw createError(400, 'Tournament must be in DRAFT to open registration');

    await prisma.tournament.update({ where: { id }, data: { status: TournamentStatus.REGISTRATION } });
    const updated = await TournamentService.getTournamentWithRelations(id);
    return TournamentService.formatTournament(updated);
  }

  // ─── VIEWER: Enter raffle ──────────────────────────────────────────────────

  static async enterRaffle(tournamentId: string, userId: string, io?: SocketIOServer): Promise<{ message: string }> {
    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw createError(404, 'Tournament not found');
    if (t.status !== TournamentStatus.REGISTRATION) throw createError(400, 'Registration is not open');

    const existing = await prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (existing) throw createError(409, 'Already entered');

    await prisma.tournamentEntry.create({ data: { tournamentId, userId } });

    const updated = await TournamentService.getTournamentWithRelations(tournamentId);
    const response = await TournamentService.formatTournament(updated);
    io?.to(`tournament:${tournamentId}`).emit('tournament:updated', response);

    return { message: 'Entered successfully' };
  }

  static async leaveRaffle(tournamentId: string, userId: string, io?: SocketIOServer): Promise<{ message: string }> {
    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw createError(404, 'Tournament not found');
    if (t.status !== TournamentStatus.REGISTRATION) throw createError(400, 'Registration is not open');

    await prisma.tournamentEntry.deleteMany({ where: { tournamentId, userId } });

    const updated = await TournamentService.getTournamentWithRelations(tournamentId);
    const response = await TournamentService.formatTournament(updated);
    io?.to(`tournament:${tournamentId}`).emit('tournament:updated', response);

    return { message: 'Left successfully' };
  }

  // ─── ADMIN: Get all entries ────────────────────────────────────────────────

  static async getEntries(tournamentId: string) {
    const entries = await prisma.tournamentEntry.findMany({
      where: { tournamentId },
      orderBy: { enteredAt: 'asc' },
    });

    const users = await prisma.user.findMany({
      where: { id: { in: entries.map((e) => e.userId) } },
      select: { id: true, displayName: true, kickUsername: true, avatarUrl: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    return entries.map((e) => ({
      id: e.id,
      userId: e.userId,
      displayName: userMap[e.userId]?.kickUsername ?? userMap[e.userId]?.displayName ?? e.userId,
      avatarUrl: userMap[e.userId]?.avatarUrl ?? null,
      enteredAt: e.enteredAt.toISOString(),
    }));
  }

  // ─── ADMIN: Draw winners ───────────────────────────────────────────────────

  static async drawWinners(
    tournamentId: string,
    count: number,
    guaranteedUserIds: string[] = [],
    io?: SocketIOServer
  ): Promise<TournamentResponse> {
    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw createError(404, 'Tournament not found');
    if (t.status !== TournamentStatus.REGISTRATION) throw createError(400, 'Must be in REGISTRATION phase');
    if (count < 1 || count > t.maxPlayers) throw createError(400, `count must be between 1 and ${t.maxPlayers}`);

    const entries = await prisma.tournamentEntry.findMany({ where: { tournamentId } });
    if (entries.length < count) throw createError(400, `Not enough entries (${entries.length}) to draw ${count} players`);

    // Validate guaranteed picks are actual entrants
    const entrantUserIds = new Set(entries.map((e) => e.userId));
    const validGuaranteed = guaranteedUserIds.filter((id) => entrantUserIds.has(id));
    if (validGuaranteed.length > count) throw createError(400, 'More guaranteed picks than total spots');

    // Remaining entries not in guaranteed list
    const remaining = entries.filter((e) => !validGuaranteed.includes(e.userId));
    const randomSpotsNeeded = count - validGuaranteed.length;
    const randomPicks = [...remaining].sort(() => Math.random() - 0.5).slice(0, randomSpotsNeeded);

    // Combine: guaranteed first, then random fills
    const guaranteed = entries.filter((e) => validGuaranteed.includes(e.userId));
    const allPicked = [...guaranteed, ...randomPicks];

    const deadline = new Date(Date.now() + t.slotTimerSeconds * 1000);

    await prisma.$transaction([
      prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: TournamentStatus.SLOT_SELECTION, maxPlayers: count },
      }),
      ...allPicked.map((e, i) =>
        prisma.tournamentParticipant.create({
          data: { tournamentId, userId: e.userId, seed: i + 1, slotDeadline: deadline },
        })
      ),
    ]);

    const updated = await TournamentService.getTournamentWithRelations(tournamentId);
    const response = await TournamentService.formatTournament(updated);
    io?.to(`tournament:${tournamentId}`).emit('tournament:updated', response);
    return response;
  }

  // ─── PARTICIPANT: Set initial slot ────────────────────────────────────────

  static async setInitialSlot(tournamentId: string, userId: string, slotCall: string, io?: SocketIOServer): Promise<TournamentResponse> {
    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw createError(404, 'Tournament not found');
    if (t.status !== TournamentStatus.SLOT_SELECTION && t.status !== TournamentStatus.IN_PROGRESS) {
      throw createError(400, 'Not in slot selection phase');
    }

    const participant = await prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (!participant) throw createError(403, 'You are not a participant');
    if (participant.slotConfirmed) throw createError(400, 'Slot already confirmed');

    // Check uniqueness within tournament
    const conflict = await prisma.tournamentParticipant.findFirst({
      where: { tournamentId, currentSlot: slotCall, id: { not: participant.id } },
    });
    if (conflict) throw createError(409, 'That slot is already taken by another participant');

    await prisma.tournamentParticipant.update({
      where: { id: participant.id },
      data: { currentSlot: slotCall, slotConfirmed: true },
    });

    // Check if all participants have confirmed → start tournament
    const unconfirmed = await prisma.tournamentParticipant.count({
      where: { tournamentId, slotConfirmed: false },
    });

    if (unconfirmed === 0) {
      await TournamentService.buildBracket(tournamentId);
    }

    const updated = await TournamentService.getTournamentWithRelations(tournamentId);
    const response = await TournamentService.formatTournament(updated);
    io?.to(`tournament:${tournamentId}`).emit('tournament:updated', response);
    return response;
  }

  // ─── ADMIN: Reroll participant ─────────────────────────────────────────────

  static async rerollParticipant(tournamentId: string, participantId: string, io?: SocketIOServer): Promise<TournamentResponse> {
    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw createError(404, 'Tournament not found');
    if (t.status !== TournamentStatus.SLOT_SELECTION) throw createError(400, 'Not in slot selection phase');

    const participant = await prisma.tournamentParticipant.findFirst({
      where: { id: participantId, tournamentId },
    });
    if (!participant) throw createError(404, 'Participant not found');
    if (participant.slotConfirmed) throw createError(400, 'Participant already confirmed their slot');

    // Pick a random replacement from remaining entries
    const existingUserIds = (
      await prisma.tournamentParticipant.findMany({ where: { tournamentId }, select: { userId: true } })
    ).map((p) => p.userId);

    const candidates = await prisma.tournamentEntry.findMany({
      where: { tournamentId, userId: { notIn: existingUserIds } },
    });

    if (candidates.length === 0) {
      // No replacement available — just remove participant and leave spot empty
      await prisma.tournamentParticipant.delete({ where: { id: participantId } });
    } else {
      const replacement = candidates[Math.floor(Math.random() * candidates.length)];
      const deadline = new Date(Date.now() + t.slotTimerSeconds * 1000);
      await prisma.$transaction([
        prisma.tournamentParticipant.delete({ where: { id: participantId } }),
        prisma.tournamentParticipant.create({
          data: {
            tournamentId,
            userId: replacement.userId,
            seed: participant.seed,
            slotDeadline: deadline,
          },
        }),
      ]);
    }

    const updated = await TournamentService.getTournamentWithRelations(tournamentId);
    const response = await TournamentService.formatTournament(updated);
    io?.to(`tournament:${tournamentId}`).emit('tournament:updated', response);
    return response;
  }

  // ─── Build bracket ────────────────────────────────────────────────────────

  private static async buildBracket(tournamentId: string) {
    const participants = await prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      orderBy: { seed: 'asc' },
    });

    const n = participants.length;
    const rounds = TournamentService.totalRounds(n);

    // Randomly shuffle all participants — slot calls already set, matchups are pure luck
    const shuffled = TournamentService.shuffle(participants);

    // Create all match shells first (for nextMatchId links)
    // Round 1 has ceil(n/2) matches, subsequent rounds halve each time
    const matchesPerRound: number[] = [];
    let remaining = n;
    for (let r = 1; r <= rounds; r++) {
      remaining = Math.ceil(remaining / 2);
      matchesPerRound.push(remaining);
    }
    // R1 = n/2 matches
    matchesPerRound[0] = Math.floor(n / 2);

    const createdMatches: any[] = [];
    for (let r = 1; r <= rounds; r++) {
      const count = matchesPerRound[r - 1];
      for (let m = 1; m <= count; m++) {
        const match = await prisma.tournamentMatch.create({
          data: { tournamentId, round: r, matchNumber: m },
        });
        createdMatches.push(match);
      }
    }

    // Link nextMatchId: winner of round r match m goes to round r+1 match ceil(m/2)
    for (const match of createdMatches) {
      const nextRoundMatches = createdMatches.filter(
        (m) => m.round === match.round + 1 && m.matchNumber === Math.ceil(match.matchNumber / 2)
      );
      if (nextRoundMatches.length > 0) {
        await prisma.tournamentMatch.update({
          where: { id: match.id },
          data: { nextMatchId: nextRoundMatches[0].id },
        });
      }
    }

    // Pair shuffled participants sequentially: [0,1], [2,3], [4,5] ...
    const round1Matches = createdMatches.filter((m) => m.round === 1);
    for (let i = 0; i < round1Matches.length; i++) {
      const pA = shuffled[i * 2];
      const pB = shuffled[i * 2 + 1];
      await prisma.tournamentMatchParticipant.createMany({
        data: [
          { matchId: round1Matches[i].id, participantId: pA.id, slotCall: pA.currentSlot },
          ...(pB ? [{ matchId: round1Matches[i].id, participantId: pB.id, slotCall: pB.currentSlot }] : []),
        ],
      });

      // If only 1 participant (bye), auto-complete the match
      if (!pB) {
        await prisma.tournamentMatch.update({
          where: { id: round1Matches[i].id },
          data: { status: 'COMPLETED', winnerId: pA.id },
        });
        await TournamentService.advanceWinner(round1Matches[i].id, pA.id);
      } else {
        // Slots are locked from initial selection — go straight to ACTIVE
        await prisma.tournamentMatch.update({
          where: { id: round1Matches[i].id },
          data: { status: 'ACTIVE' },
        });
      }
    }

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.IN_PROGRESS, currentRound: 1 },
    });
  }

  // ─── ADMIN: Force-start tournament (skip slot selection) ──────────────────

  static async startTournament(tournamentId: string, io?: SocketIOServer): Promise<TournamentResponse> {
    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw createError(404, 'Tournament not found');
    if (t.status !== TournamentStatus.SLOT_SELECTION) throw createError(400, 'Must be in SLOT_SELECTION phase');

    await TournamentService.buildBracket(tournamentId);

    const updated = await TournamentService.getTournamentWithRelations(tournamentId);
    const response = await TournamentService.formatTournament(updated);
    io?.to(`tournament:${tournamentId}`).emit('tournament:updated', response);
    return response;
  }

  // ─── PARTICIPANT: Set match slot ───────────────────────────────────────────

  static async setMatchSlot(matchId: string, userId: string, slotCall: string, io?: SocketIOServer): Promise<MatchResponse> {
    const match = await prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: { participants: { include: { participant: true } }, tournament: true },
    });
    if (!match) throw createError(404, 'Match not found');
    if (match.status !== MatchStatus.SLOT_SELECTION) throw createError(400, 'Match is not in slot selection phase');

    const participant = await prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId: match.tournamentId, userId } },
    });
    if (!participant) throw createError(403, 'You are not a participant in this tournament');

    const mp = match.participants.find((p) => p.participantId === participant.id);
    if (!mp) throw createError(403, 'You are not in this match');
    if (mp.slotConfirmed) throw createError(400, 'You have already confirmed your slot for this match');

    if (match.slotDeadline && new Date() > match.slotDeadline) {
      throw createError(400, 'Slot timer has expired');
    }

    // Check uniqueness within this match
    const conflict = match.participants.find(
      (p) => p.slotCall === slotCall && p.participantId !== participant.id
    );
    if (conflict) throw createError(409, 'That slot is already taken in this match');

    await prisma.tournamentMatchParticipant.update({
      where: { id: mp.id },
      data: { slotCall },
    });

    const updated = await prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: { participants: { include: { participant: { include: { user: true } } } } },
    });

    const formatted = TournamentService.formatMatch(updated);
    io?.to(`tournament:${match.tournamentId}`).emit('match:updated', formatted);
    return formatted;
  }

  // ─── PARTICIPANT: Confirm match slot ──────────────────────────────────────

  static async confirmMatchSlot(matchId: string, userId: string, io?: SocketIOServer): Promise<MatchResponse> {
    const match = await prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: { participants: { include: { participant: true } }, tournament: true },
    });
    if (!match) throw createError(404, 'Match not found');
    if (match.status !== MatchStatus.SLOT_SELECTION) throw createError(400, 'Match is not in slot selection phase');

    const participant = await prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId: match.tournamentId, userId } },
    });
    if (!participant) throw createError(403, 'Not a participant');

    const mp = match.participants.find((p) => p.participantId === participant.id);
    if (!mp) throw createError(403, 'Not in this match');
    if (!mp.slotCall) throw createError(400, 'Set a slot call before confirming');
    if (mp.slotConfirmed) throw createError(400, 'Already confirmed');

    await prisma.tournamentMatchParticipant.update({
      where: { id: mp.id },
      data: { slotConfirmed: true, slotConfirmedAt: new Date() },
    });

    // If both confirmed → activate match
    const allConfirmed = await prisma.tournamentMatchParticipant.count({
      where: { matchId, slotConfirmed: false },
    });
    if (allConfirmed === 0) {
      await prisma.tournamentMatch.update({
        where: { id: matchId },
        data: { status: MatchStatus.ACTIVE },
      });
    }

    const updated = await prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: { participants: { include: { participant: { include: { user: true } } } } },
    });

    const formatted = TournamentService.formatMatch(updated);
    io?.to(`tournament:${match.tournamentId}`).emit('match:updated', formatted);
    return formatted;
  }

  // ─── ADMIN: Declare match winner ──────────────────────────────────────────

  static async declareMatchWinner(matchId: string, winnerId: string, io?: SocketIOServer): Promise<TournamentResponse> {
    const match = await prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: { participants: true, tournament: true },
    });
    if (!match) throw createError(404, 'Match not found');
    if (match.status === MatchStatus.COMPLETED) throw createError(400, 'Match already completed');

    const winnerParticipant = match.participants.find((p) => p.participantId === winnerId);
    if (!winnerParticipant) throw createError(400, 'Winner must be a participant in this match');

    // Mark loser eliminated
    const loserIds = match.participants
      .filter((p) => p.participantId !== winnerId)
      .map((p) => p.participantId);

    await prisma.$transaction([
      prisma.tournamentMatch.update({
        where: { id: matchId },
        data: { status: MatchStatus.COMPLETED, winnerId },
      }),
      prisma.tournamentParticipant.updateMany({
        where: { id: { in: loserIds } },
        data: { eliminated: true },
      }),
    ]);

    // Advance winner to next match
    if (match.nextMatchId) {
      await TournamentService.advanceWinner(matchId, winnerId);
    }

    // Check if tournament is over
    const incompleteMatches = await prisma.tournamentMatch.count({
      where: { tournamentId: match.tournamentId, status: { not: MatchStatus.COMPLETED } },
    });

    if (incompleteMatches === 0) {
      await prisma.$transaction([
        prisma.tournament.update({
          where: { id: match.tournamentId },
          data: { status: TournamentStatus.COMPLETED },
        }),
        prisma.tournamentParticipant.update({
          where: { id: winnerId },
          data: { finalPosition: 1 },
        }),
      ]);
    }

    const updated = await TournamentService.getTournamentWithRelations(match.tournamentId);
    const response = await TournamentService.formatTournament(updated);
    io?.to(`tournament:${match.tournamentId}`).emit('tournament:updated', response);
    return response;
  }

  // ─── ADMIN: Revert match winner ───────────────────────────────────────────

  static async revertMatchWinner(matchId: string, io?: SocketIOServer): Promise<TournamentResponse> {
    const match = await prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: { participants: true, tournament: true },
    });
    if (!match) throw createError(404, 'Match not found');
    if (match.status !== MatchStatus.COMPLETED) throw createError(400, 'Match is not completed');

    const previousWinnerId = match.winnerId;

    // If winner was advanced to next match, remove them from it (only if that match isn't completed)
    if (match.nextMatchId && previousWinnerId) {
      const nextMatch = await prisma.tournamentMatch.findUnique({ where: { id: match.nextMatchId } });
      if (nextMatch && nextMatch.status !== MatchStatus.COMPLETED) {
        await prisma.tournamentMatchParticipant.deleteMany({
          where: { matchId: match.nextMatchId, participantId: previousWinnerId },
        });
        // Reset next match back to PENDING if it now has fewer than 2 participants
        const remainingInNext = await prisma.tournamentMatchParticipant.count({ where: { matchId: match.nextMatchId } });
        if (remainingInNext < 2) {
          await prisma.tournamentMatch.update({
            where: { id: match.nextMatchId },
            data: { status: MatchStatus.PENDING, winnerId: null },
          });
        }
      } else if (nextMatch?.status === MatchStatus.COMPLETED) {
        throw createError(400, 'Cannot revert — the next match has already been completed');
      }
    }

    // Restore the match and un-eliminate the loser
    const loserIds = match.participants
      .filter((p) => p.participantId !== previousWinnerId)
      .map((p) => p.participantId);

    await prisma.$transaction([
      prisma.tournamentMatch.update({
        where: { id: matchId },
        data: { status: MatchStatus.ACTIVE, winnerId: null },
      }),
      prisma.tournamentParticipant.updateMany({
        where: { id: { in: loserIds } },
        data: { eliminated: false },
      }),
      // Clear finalPosition if tournament was marked complete
      ...(previousWinnerId ? [prisma.tournamentParticipant.updateMany({
        where: { id: previousWinnerId },
        data: { finalPosition: null },
      })] : []),
    ]);

    // If tournament was marked COMPLETED, revert it to IN_PROGRESS
    if (match.tournament.status === TournamentStatus.COMPLETED) {
      await prisma.tournament.update({
        where: { id: match.tournamentId },
        data: { status: TournamentStatus.IN_PROGRESS },
      });
    }

    const updated = await TournamentService.getTournamentWithRelations(match.tournamentId);
    const response = await TournamentService.formatTournament(updated);
    io?.to(`tournament:${match.tournamentId}`).emit('tournament:updated', response);
    return response;
  }

  private static async advanceWinner(matchId: string, winnerId: string) {
    const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
    if (!match?.nextMatchId) return;

    // Check how many participants are already in the next match
    const nextMatchParticipants = await prisma.tournamentMatchParticipant.count({
      where: { matchId: match.nextMatchId },
    });

    const winner = await prisma.tournamentParticipant.findUnique({ where: { id: winnerId } });

    await prisma.tournamentMatchParticipant.create({
      data: {
        matchId: match.nextMatchId,
        participantId: winnerId,
        slotCall: winner?.currentSlot ?? null,
      },
    });

    // If next match now has 2 participants → go straight to ACTIVE (slots locked from initial pick)
    if (nextMatchParticipants + 1 === 2) {
      await prisma.tournamentMatch.update({
        where: { id: match.nextMatchId },
        data: { status: MatchStatus.ACTIVE },
      });
    }
  }

  // ─── ADMIN: Cancel ────────────────────────────────────────────────────────

  static async cancel(tournamentId: string, io?: SocketIOServer): Promise<TournamentResponse> {
    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw createError(404, 'Tournament not found');
    if (t.status === TournamentStatus.COMPLETED) throw createError(400, 'Tournament already completed');

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.CANCELLED },
    });

    const updated = await TournamentService.getTournamentWithRelations(tournamentId);
    const response = await TournamentService.formatTournament(updated);
    io?.to(`tournament:${tournamentId}`).emit('tournament:updated', response);
    return response;
  }

  // ─── ADMIN: Delete ───────────────────────────────────────────────────────

  static async deleteTournament(tournamentId: string): Promise<void> {
    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw createError(404, 'Tournament not found');
    // Cascade deletes participants, matches, entries via FK constraints
    await prisma.tournament.delete({ where: { id: tournamentId } });
  }

  // ─── PUBLIC: Get all ──────────────────────────────────────────────────────

  static async getAll(): Promise<TournamentResponse[]> {
    const tournaments = await prisma.tournament.findMany({
      include: {
        participants: { include: { user: true }, orderBy: { seed: 'asc' } },
        matches: {
          include: { participants: { include: { participant: { include: { user: true } } } } },
          orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
        },
        _count: { select: { entries: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(tournaments.map(TournamentService.formatTournament));
  }

  static async getById(id: string): Promise<TournamentResponse> {
    const t = await TournamentService.getTournamentWithRelations(id);
    if (!t) throw createError(404, 'Tournament not found');
    return TournamentService.formatTournament(t);
  }

  // ─── Check if user has entered ────────────────────────────────────────────

  static async getMyEntry(tournamentId: string, userId: string) {
    const entry = await prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    const participant = await prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    return { entered: !!entry, isParticipant: !!participant, participant: participant ? TournamentService.formatParticipant({ ...participant, user: null }) : null };
  }
}
