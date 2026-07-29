import { randomBytes, createHash } from 'crypto';
import { prisma } from '@/config/database';
import createError from 'http-errors';
import { Server as SocketIOServer } from 'socket.io';
import { KickChatService } from '@/services/KickChatService';
import {
  TournamentStatus,
  MatchStatus,
  TournamentEntrySource,
  CreateTournamentDTO,
  UpdateTournamentDTO,
  TournamentResponse,
  ParticipantResponse,
  MatchResponse,
  TournamentEntryResponse,
  DrawStatusResponse,
  ReserveResponse,
} from '@/types/tournament';

interface DrawResult {
  selectedEntryIds: string[];
  reserveEntryIds: string[];
}

export class TournamentService {
  // ─── Helpers ───────────────────────────────────────────────────────────────

  private static formatParticipant(p: any): ParticipantResponse {
    return {
      id: p.id,
      userId: p.userId ?? null,
      kickUsername: p.user?.kickUsername ?? p.kickUsername ?? null,
      displayName: p.user?.kickUsername ?? p.user?.displayName ?? p.kickUsername ?? 'Unknown',
      avatarUrl: p.user?.avatarUrl ?? null,
      seed: p.seed,
      currentSlot: p.currentSlot,
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
      participants: (m.participants ?? []).map((mp: any) => ({
        id: mp.id,
        participantId: mp.participantId,
        userId: mp.participant?.userId ?? null,
        kickUsername: mp.participant?.user?.kickUsername ?? mp.participant?.kickUsername ?? null,
        displayName: mp.participant?.user?.kickUsername ?? mp.participant?.user?.displayName ?? mp.participant?.kickUsername ?? 'Unknown',
        avatarUrl: mp.participant?.user?.avatarUrl ?? null,
        slotCall: mp.slotCall,
        resultText: mp.resultText,
      })),
    };
  }

  static async formatTournament(t: any): Promise<TournamentResponse> {
    // Use pre-fetched _count if available (avoids N+1 when called from getAll)
    const entryCount = t._count?.entries ??
      await prisma.tournamentEntry.count({ where: { tournamentId: t.id, invalidated: false } });
    const drawResult = (t.drawResult ?? null) as DrawResult | null;
    const reserves = drawResult ? await TournamentService.buildReserveList(drawResult.reserveEntryIds) : [];
    return {
      id: t.id,
      title: t.title,
      status: t.status as TournamentStatus,
      keyword: t.keyword,
      maxPlayers: t.maxPlayers,
      currentRound: t.currentRound,
      allowDuplicateSlots: t.allowDuplicateSlots,
      betAmountPerSpin: t.betAmountPerSpin?.toString() ?? null,
      prizePoolDisplay: t.prizePoolDisplay,
      seedCommitmentHash: t.seedCommitmentHash,
      // Raw seed only ever goes out once the reveal step (drawExecutedAt) has
      // happened — that's the point of a commit-reveal scheme.
      drawSeed: t.drawExecutedAt ? t.drawSeed : null,
      drawExecutedAt: t.drawExecutedAt?.toISOString() ?? null,
      entryCount,
      reserveCount: drawResult?.reserveEntryIds.length ?? 0,
      reserves,
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
        _count: { select: { entries: { where: { invalidated: false } } } },
      },
    });
  }

  // ─── Draw math ────────────────────────────────────────────────────────────

  private static totalRounds(n: number): number {
    return Math.ceil(Math.log2(n));
  }

  /**
   * Deterministic Fisher-Yates: the "random" stream is repeated SHA-256
   * re-hashing of the seed, so the exact same seed always produces the exact
   * same order — anyone can re-run this algorithm against the revealed seed
   * to verify a draw wasn't tampered with. (The tiny modulo bias this
   * introduces vs. true uniform randomness is negligible at tournament pool
   * sizes and isn't worth rejection-sampling for.)
   */
  private static seededShuffle<T>(seed: string, arr: T[]): T[] {
    const a = [...arr];
    let state = seed;
    const nextInt = (max: number): number => {
      state = createHash('sha256').update(state).digest('hex');
      return parseInt(state.slice(0, 8), 16) % max;
    };
    for (let i = a.length - 1; i > 0; i--) {
      const j = nextInt(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private static async getEligibleEntries(tournamentId: string) {
    const bans = await prisma.tournamentBan.findMany({ where: { tournamentId }, select: { userId: true, kickUsername: true } });
    const bannedUserIds = new Set(bans.map((b) => b.userId).filter((x): x is string => !!x));
    const bannedKickUsernames = new Set(bans.map((b) => b.kickUsername).filter((x): x is string => !!x));
    const entries = await prisma.tournamentEntry.findMany({
      where: { tournamentId, invalidated: false },
      orderBy: { enteredAt: 'asc' },
    });
    return entries.filter(
      (e) => !(e.userId && bannedUserIds.has(e.userId)) && !(e.kickUsername && bannedKickUsernames.has(e.kickUsername))
    );
  }

  private static async buildReserveList(reserveEntryIds: string[]): Promise<ReserveResponse[]> {
    if (reserveEntryIds.length === 0) return [];
    const entries = await prisma.tournamentEntry.findMany({
      where: { id: { in: reserveEntryIds } },
      include: { user: { select: { displayName: true, kickUsername: true, avatarUrl: true } } },
    });
    const entryById = new Map(entries.map((e) => [e.id, e]));
    return reserveEntryIds
      .map((id, i) => {
        const e = entryById.get(id);
        if (!e) return null;
        return {
          rank: i + 1,
          entryId: e.id,
          userId: e.userId,
          kickUsername: e.user?.kickUsername ?? e.kickUsername ?? null,
          displayName: e.user?.kickUsername ?? e.user?.displayName ?? e.kickUsername ?? 'Unknown',
          avatarUrl: e.user?.avatarUrl ?? null,
          slot: e.slot,
        };
      })
      .filter((r): r is ReserveResponse => r !== null);
  }

  private static async computeDraw(tournamentId: string): Promise<DrawResult> {
    const t = await prisma.tournament.findUniqueOrThrow({ where: { id: tournamentId } });
    if (!t.drawSeed) throw createError(400, 'No draw seed set — lock registration first');

    const eligible = await TournamentService.getEligibleEntries(tournamentId);
    const shuffled = TournamentService.seededShuffle(t.drawSeed, eligible);
    const selected = shuffled.slice(0, t.maxPlayers);
    const reserves = shuffled.slice(t.maxPlayers);

    return {
      selectedEntryIds: selected.map((e) => e.id),
      reserveEntryIds: reserves.map((e) => e.id),
    };
  }

  // ─── ADMIN: Create ─────────────────────────────────────────────────────────

  static async create(dto: CreateTournamentDTO, adminId: string): Promise<TournamentResponse> {
    if (dto.maxPlayers < 2 || dto.maxPlayers > 64) {
      throw createError(400, 'maxPlayers must be between 2 and 64');
    }

    const tournament = await prisma.tournament.create({
      data: {
        title: dto.title,
        keyword: dto.keyword?.trim() || '!jointourney',
        maxPlayers: dto.maxPlayers,
        createdById: adminId,
      },
      include: {
        participants: { include: { user: true } },
        matches: { include: { participants: { include: { participant: { include: { user: true } } } } } },
        _count: { select: { entries: { where: { invalidated: false } } } },
      },
    });
    return TournamentService.formatTournament(tournament);
  }

  // ─── ADMIN: Update setup ────────────────────────────────────────────────────

  static async updateTournament(
    id: string,
    dto: UpdateTournamentDTO,
    adminId: string,
    io?: SocketIOServer
  ): Promise<TournamentResponse> {
    const t = await prisma.tournament.findUnique({ where: { id } });
    if (!t) throw createError(404, 'Tournament not found');

    const slotConfigLocked = t.status !== TournamentStatus.DRAFT && t.status !== TournamentStatus.REGISTRATION;
    if (slotConfigLocked && dto.allowDuplicateSlots !== undefined) {
      throw createError(400, 'Duplicate-slot policy can only be changed before registration locks');
    }
    if (dto.maxPlayers !== undefined && (dto.maxPlayers < 2 || dto.maxPlayers > 64)) {
      throw createError(400, 'maxPlayers must be between 2 and 64');
    }

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.keyword !== undefined) data.keyword = dto.keyword.trim() || '!jointourney';
    if (dto.maxPlayers !== undefined) data.maxPlayers = dto.maxPlayers;
    if (dto.allowDuplicateSlots !== undefined) data.allowDuplicateSlots = dto.allowDuplicateSlots;
    if (dto.betAmountPerSpin !== undefined) data.betAmountPerSpin = dto.betAmountPerSpin;
    if (dto.prizePoolDisplay !== undefined) data.prizePoolDisplay = dto.prizePoolDisplay?.trim() || null;

    await prisma.tournament.update({ where: { id }, data });

    const updated = await TournamentService.getTournamentWithRelations(id);
    const response = await TournamentService.formatTournament(updated);
    io?.to(`tournament:${id}`).emit('tournament:updated', response);
    return response;
  }

  // ─── ADMIN: Open registration ──────────────────────────────────────────────

  static async openRegistration(id: string, adminId: string, io?: SocketIOServer): Promise<TournamentResponse> {
    const t = await prisma.tournament.findUnique({ where: { id } });
    if (!t) throw createError(404, 'Tournament not found');
    if (t.status !== TournamentStatus.DRAFT) throw createError(400, 'Tournament must be in DRAFT to open registration');

    await prisma.tournament.update({ where: { id }, data: { status: TournamentStatus.REGISTRATION } });

    const updated = await TournamentService.getTournamentWithRelations(id);
    const response = await TournamentService.formatTournament(updated);
    io?.to(`tournament:${id}`).emit('tournament:updated', response);
    return response;
  }

  // ─── VIEWER: Enter raffle ──────────────────────────────────────────────────

  /**
   * identity.userId is set for the authenticated website "Enter" form;
   * identity.kickUsername is set (and userId optionally resolved) for the
   * "!jointourney <slot>" Kick chat command — anyone typing the keyword joins
   * the draw even without ever verifying a site account, mirroring
   * BingoBoardService.join's userId?/kickUsername? identity split.
   */
  static async enterRaffle(
    tournamentId: string,
    identity: { userId?: string | null; kickUsername?: string | null },
    slot: string,
    source: TournamentEntrySource,
    io?: SocketIOServer
  ): Promise<{ message: string }> {
    const userId = identity.userId ?? null;
    const kickUsername = identity.kickUsername ? identity.kickUsername.trim().toLowerCase() : null;
    if (!userId && !kickUsername) throw createError(400, 'No identity to enter with');

    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw createError(404, 'Tournament not found');
    if (t.status !== TournamentStatus.REGISTRATION) throw createError(400, 'Registration is not open');

    const trimmedSlot = slot.trim();
    if (!trimmedSlot) throw createError(400, 'A slot is required to enter');

    const banned = await prisma.tournamentBan.findFirst({
      where: { tournamentId, OR: [...(userId ? [{ userId }] : []), ...(kickUsername ? [{ kickUsername }] : [])] },
    });
    if (banned) throw createError(403, 'You are banned from this tournament');

    const existing = await prisma.tournamentEntry.findFirst({
      where: { tournamentId, OR: [...(userId ? [{ userId }] : []), ...(kickUsername ? [{ kickUsername }] : [])] },
    });
    if (existing) throw createError(409, 'Already entered');

    if (!t.allowDuplicateSlots) {
      const slotTaken = await prisma.tournamentEntry.findFirst({
        where: { tournamentId, invalidated: false, slot: { equals: trimmedSlot, mode: 'insensitive' } },
      });
      if (slotTaken) throw createError(409, 'That slot has already been taken by another entrant');
    }

    await prisma.tournamentEntry.create({ data: { tournamentId, userId, kickUsername, slot: trimmedSlot, source } });

    // The "!jointourney" chat path announces its own, differently-worded
    // confirmation from KickChatService.processTournamentJoin — announcing
    // here too would double-post for every chat entry.
    if (source === TournamentEntrySource.WEB) {
      const enteredUser = userId
        ? await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true, kickUsername: true } })
        : null;
      void KickChatService.sendChatMessage(
        `🎟️ ${enteredUser?.kickUsername ? `@${enteredUser.kickUsername}` : enteredUser?.displayName ?? 'A viewer'} entered the "${t.title}" tournament with ${trimmedSlot}!`
      );
    }

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

  static async getEntries(tournamentId: string): Promise<TournamentEntryResponse[]> {
    const entries = await prisma.tournamentEntry.findMany({
      where: { tournamentId },
      orderBy: { enteredAt: 'asc' },
    });

    const userIds = entries.map((e) => e.userId).filter((id): id is string => !!id);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, kickUsername: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const bans = await prisma.tournamentBan.findMany({ where: { tournamentId }, select: { userId: true, kickUsername: true } });
    const bannedUserIds = new Set(bans.map((b) => b.userId).filter((x): x is string => !!x));
    const bannedKickUsernames = new Set(bans.map((b) => b.kickUsername).filter((x): x is string => !!x));

    return entries.map((e) => {
      const u = e.userId ? userMap.get(e.userId) : undefined;
      return {
        id: e.id,
        userId: e.userId,
        kickUsername: u?.kickUsername ?? e.kickUsername ?? null,
        displayName: u?.kickUsername ?? u?.displayName ?? e.kickUsername ?? 'Unknown',
        avatarUrl: u?.avatarUrl ?? null,
        slot: e.slot,
        source: e.source as TournamentEntrySource,
        invalidated: e.invalidated,
        banned: !!(e.userId && bannedUserIds.has(e.userId)) || !!(e.kickUsername && bannedKickUsernames.has(e.kickUsername)),
        enteredAt: e.enteredAt.toISOString(),
      };
    });
  }

  // ─── ADMIN: Invalidate / restore an entry ──────────────────────────────────

  static async invalidateEntry(tournamentId: string, entryId: string, adminId: string, io?: SocketIOServer): Promise<TournamentResponse> {
    const entry = await prisma.tournamentEntry.findFirst({ where: { id: entryId, tournamentId } });
    if (!entry) throw createError(404, 'Entry not found');

    await prisma.tournamentEntry.update({ where: { id: entryId }, data: { invalidated: true } });

    const updated = await TournamentService.getTournamentWithRelations(tournamentId);
    const response = await TournamentService.formatTournament(updated);
    io?.to(`tournament:${tournamentId}`).emit('tournament:updated', response);
    return response;
  }

  static async restoreEntry(tournamentId: string, entryId: string, adminId: string, io?: SocketIOServer): Promise<TournamentResponse> {
    const entry = await prisma.tournamentEntry.findFirst({ where: { id: entryId, tournamentId } });
    if (!entry) throw createError(404, 'Entry not found');

    await prisma.tournamentEntry.update({ where: { id: entryId }, data: { invalidated: false } });

    const updated = await TournamentService.getTournamentWithRelations(tournamentId);
    const response = await TournamentService.formatTournament(updated);
    io?.to(`tournament:${tournamentId}`).emit('tournament:updated', response);
    return response;
  }

  // ─── ADMIN: Ban / unban (tournament-scoped) ────────────────────────────────

  /** target identifies either a linked entrant (userId) or an unlinked chat-only one (kickUsername). */
  static async banUser(
    tournamentId: string,
    target: { userId?: string | null; kickUsername?: string | null },
    adminId: string,
    reason: string | undefined,
    io?: SocketIOServer
  ): Promise<TournamentResponse> {
    const userId = target.userId ?? null;
    const kickUsername = target.kickUsername ? target.kickUsername.trim().toLowerCase() : null;
    if (!userId && !kickUsername) throw createError(400, 'No identity to ban');

    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw createError(404, 'Tournament not found');

    const existingBan = await prisma.tournamentBan.findFirst({
      where: { tournamentId, OR: [...(userId ? [{ userId }] : []), ...(kickUsername ? [{ kickUsername }] : [])] },
    });
    if (existingBan) {
      await prisma.tournamentBan.update({ where: { id: existingBan.id }, data: { reason, bannedById: adminId } });
    } else {
      await prisma.tournamentBan.create({ data: { tournamentId, userId, kickUsername, bannedById: adminId, reason } });
    }
    await prisma.tournamentEntry.updateMany({
      where: { tournamentId, invalidated: false, OR: [...(userId ? [{ userId }] : []), ...(kickUsername ? [{ kickUsername }] : [])] },
      data: { invalidated: true },
    });

    const updated = await TournamentService.getTournamentWithRelations(tournamentId);
    const response = await TournamentService.formatTournament(updated);
    io?.to(`tournament:${tournamentId}`).emit('tournament:updated', response);
    return response;
  }

  /** identifier is either a userId or a kickUsername — whichever the entrant was banned under. */
  static async unbanUser(tournamentId: string, identifier: string, adminId: string, io?: SocketIOServer): Promise<TournamentResponse> {
    await prisma.tournamentBan.deleteMany({
      where: { tournamentId, OR: [{ userId: identifier }, { kickUsername: identifier.toLowerCase() }] },
    });

    const updated = await TournamentService.getTournamentWithRelations(tournamentId);
    const response = await TournamentService.formatTournament(updated);
    io?.to(`tournament:${tournamentId}`).emit('tournament:updated', response);
    return response;
  }

  // ─── ADMIN: Lock registration (publish the draw-seed commitment) ──────────

  static async lockRegistration(id: string, adminId: string, io?: SocketIOServer): Promise<TournamentResponse> {
    const t = await prisma.tournament.findUnique({ where: { id } });
    if (!t) throw createError(404, 'Tournament not found');
    if (t.status !== TournamentStatus.REGISTRATION) throw createError(400, 'Tournament must be in REGISTRATION to lock');

    const seed = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(seed).digest('hex');

    await prisma.tournament.update({
      where: { id },
      data: { status: TournamentStatus.LOCKED, drawSeed: seed, seedCommitmentHash: hash },
    });

    const updated = await TournamentService.getTournamentWithRelations(id);
    const response = await TournamentService.formatTournament(updated);
    io?.to(`tournament:${id}`).emit('tournament:updated', response);
    return response;
  }

  // ─── ADMIN: Draw status (for the live draw-animation page) ────────────────

  static async getDrawStatus(tournamentId: string): Promise<DrawStatusResponse> {
    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw createError(404, 'Tournament not found');

    if (t.drawExecutedAt && t.drawResult) {
      const drawResult = t.drawResult as unknown as DrawResult;
      const allIds = [...drawResult.selectedEntryIds, ...drawResult.reserveEntryIds];
      const entries = await prisma.tournamentEntry.findMany({
        where: { id: { in: allIds } },
        include: { user: { select: { displayName: true, kickUsername: true, avatarUrl: true } } },
      });
      const entryById = new Map(entries.map((e) => [e.id, e]));
      const display = (entryId: string) => {
        const e = entryById.get(entryId)!;
        return {
          entryId: e.id,
          userId: e.userId,
          kickUsername: e.user?.kickUsername ?? e.kickUsername ?? null,
          displayName: e.user?.kickUsername ?? e.user?.displayName ?? e.kickUsername ?? 'Unknown',
          avatarUrl: e.user?.avatarUrl ?? null,
          slot: e.slot,
        };
      };

      return {
        phase: 'complete',
        seedCommitmentHash: t.seedCommitmentHash,
        drawSeed: t.drawSeed,
        targetCount: t.maxPlayers,
        eligiblePool: [],
        selected: drawResult.selectedEntryIds.map((id, i) => ({ ...display(id), seed: i + 1 })),
        reserves: drawResult.reserveEntryIds.map((id, i) => ({ ...display(id), rank: i + 1 })),
      };
    }

    if (t.status !== TournamentStatus.LOCKED) {
      return {
        phase: 'not_locked',
        seedCommitmentHash: t.seedCommitmentHash,
        drawSeed: null,
        targetCount: t.maxPlayers,
        eligiblePool: [],
        selected: [],
        reserves: [],
      };
    }

    const eligible = await TournamentService.getEligibleEntries(tournamentId);
    const userIds = eligible.map((e) => e.userId).filter((id): id is string => !!id);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, kickUsername: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      phase: 'ready',
      seedCommitmentHash: t.seedCommitmentHash,
      drawSeed: null,
      targetCount: t.maxPlayers,
      eligiblePool: eligible.map((e) => {
        const u = e.userId ? userMap.get(e.userId) : undefined;
        return {
          entryId: e.id,
          userId: e.userId,
          kickUsername: u?.kickUsername ?? e.kickUsername ?? null,
          displayName: u?.kickUsername ?? u?.displayName ?? e.kickUsername ?? 'Unknown',
          avatarUrl: u?.avatarUrl ?? null,
          slot: e.slot,
        };
      }),
      selected: [],
      reserves: [],
    };
  }

  // ─── ADMIN: Run the draw ────────────────────────────────────────────────────

  static async runDraw(tournamentId: string, adminId: string, io?: SocketIOServer): Promise<TournamentResponse> {
    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw createError(404, 'Tournament not found');
    if (t.status !== TournamentStatus.LOCKED) throw createError(400, 'Tournament must be LOCKED to run the draw');
    if (t.drawExecutedAt) throw createError(400, 'Draw has already run for this tournament');

    const { selectedEntryIds, reserveEntryIds } = await TournamentService.computeDraw(tournamentId);
    if (selectedEntryIds.length < 2) throw createError(400, 'Not enough eligible entries to run the draw (need at least 2)');

    const selectedEntries = await prisma.tournamentEntry.findMany({ where: { id: { in: selectedEntryIds } } });
    const entryById = new Map(selectedEntries.map((e) => [e.id, e]));

    await prisma.$transaction([
      prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          status: TournamentStatus.DRAWN,
          maxPlayers: selectedEntryIds.length,
          drawExecutedAt: new Date(),
          drawResult: { selectedEntryIds, reserveEntryIds } as any,
        },
      }),
      ...selectedEntryIds.map((entryId, i) => {
        const e = entryById.get(entryId)!;
        return prisma.tournamentParticipant.create({
          data: { tournamentId, userId: e.userId, kickUsername: e.kickUsername, seed: i + 1, currentSlot: e.slot },
        });
      }),
    ]);

    await TournamentService.buildBracket(tournamentId);

    const updated = await TournamentService.getTournamentWithRelations(tournamentId);
    const response = await TournamentService.formatTournament(updated);
    io?.to(`tournament:${tournamentId}`).emit('tournament:updated', response);
    return response;
  }

  // ─── Build bracket ────────────────────────────────────────────────────────

  /**
   * Builds every round's match rows from participants already in `seed`
   * order (assigned once, during the draw) — no second, independent
   * shuffle. Round-1 pairing is seed1-vs-seed2, seed3-vs-seed4, etc., and
   * byes land on the last `byes` match slots deterministically. This is what
   * makes the whole bracket outcome reproducible from the one committed
   * draw seed. Round-1 real (2-participant) matches are created PENDING —
   * activation is a separate explicit step (see startTournament).
   */
  private static async buildBracket(tournamentId: string): Promise<void> {
    const participants = await prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      orderBy: { seed: 'asc' },
    });

    const n = participants.length;
    const rounds = TournamentService.totalRounds(n);
    const size = 2 ** rounds;
    const byes = size - n;

    const matchesPerRound: number[] = [];
    for (let r = 1, count = size / 2; r <= rounds; r++, count /= 2) {
      matchesPerRound.push(count);
    }

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

    const round1Matches = createdMatches.filter((m) => m.round === 1);
    let cursor = 0;
    for (let i = 0; i < round1Matches.length; i++) {
      const isByeSlot = i >= round1Matches.length - byes;
      const pA = participants[cursor++];
      const pB = isByeSlot ? undefined : participants[cursor++];

      await prisma.tournamentMatchParticipant.createMany({
        data: [
          { matchId: round1Matches[i].id, participantId: pA.id, slotCall: pA.currentSlot },
          ...(pB ? [{ matchId: round1Matches[i].id, participantId: pB.id, slotCall: pB.currentSlot }] : []),
        ],
      });

      if (!pB) {
        // Bye — auto-complete the match and advance the sole participant
        await prisma.tournamentMatch.update({
          where: { id: round1Matches[i].id },
          data: { status: MatchStatus.COMPLETED, winnerId: pA.id },
        });
        await TournamentService.advanceWinner(round1Matches[i].id, pA.id);
      }
      // else: stays PENDING — activated explicitly via startTournament
    }
  }

  // ─── ADMIN: Start tournament (go live) ─────────────────────────────────────

  static async startTournament(tournamentId: string, adminId: string, io?: SocketIOServer): Promise<TournamentResponse> {
    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw createError(404, 'Tournament not found');

    // If the admin skipped the draw-animation page entirely, run the draw
    // now so this one button reliably goes live regardless of which
    // sub-phase it's called from.
    if (t.status === TournamentStatus.LOCKED) {
      await TournamentService.runDraw(tournamentId, adminId, io);
    } else if (t.status !== TournamentStatus.DRAWN) {
      throw createError(400, 'Tournament must be LOCKED or DRAWN to start');
    }

    const round1Pending = await prisma.tournamentMatch.findMany({
      where: { tournamentId, round: 1, status: MatchStatus.PENDING },
      include: { participants: true },
    });
    const toActivate = round1Pending.filter((m) => m.participants.length === 2).map((m) => m.id);
    if (toActivate.length > 0) {
      await prisma.tournamentMatch.updateMany({ where: { id: { in: toActivate } }, data: { status: MatchStatus.ACTIVE } });
    }
    await prisma.tournament.update({ where: { id: tournamentId }, data: { status: TournamentStatus.IN_PROGRESS } });

    const updated = await TournamentService.getTournamentWithRelations(tournamentId);
    const response = await TournamentService.formatTournament(updated);
    io?.to(`tournament:${tournamentId}`).emit('tournament:updated', response);
    return response;
  }

  // ─── ADMIN: Replace a participant with the next reserve ────────────────────

  static async replaceParticipantWithReserve(tournamentId: string, participantId: string, adminId: string, io?: SocketIOServer): Promise<TournamentResponse> {
    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw createError(404, 'Tournament not found');
    if (!t.drawResult) throw createError(400, 'No draw result to pull a reserve from');

    const participant = await prisma.tournamentParticipant.findFirst({ where: { id: participantId, tournamentId } });
    if (!participant) throw createError(404, 'Participant not found');

    const hasPlayed = await prisma.tournamentMatchParticipant.findFirst({
      where: { participantId, match: { status: MatchStatus.COMPLETED } },
    });
    if (hasPlayed) throw createError(400, 'Cannot replace a participant who has already completed a match');

    const drawResult = t.drawResult as unknown as DrawResult;
    const currentParticipants = await prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      select: { userId: true, kickUsername: true },
    });
    const currentUserIds = new Set(currentParticipants.map((p) => p.userId).filter((x): x is string => !!x));
    const currentKickUsernames = new Set(currentParticipants.map((p) => p.kickUsername).filter((x): x is string => !!x));
    const reserveEntries = await prisma.tournamentEntry.findMany({
      where: { id: { in: drawResult.reserveEntryIds }, invalidated: false },
    });
    const reserveById = new Map(reserveEntries.map((e) => [e.id, e]));
    // Walk the reserve list in its fixed draw order — not random — and pick
    // the first one not already sitting in the bracket.
    const nextReserveEntry = drawResult.reserveEntryIds
      .map((id) => reserveById.get(id))
      .find(
        (e) =>
          e &&
          !(e.userId && currentUserIds.has(e.userId)) &&
          !(e.kickUsername && currentKickUsernames.has(e.kickUsername))
      );
    if (!nextReserveEntry) throw createError(400, 'No eligible reserves left');

    // A participant who hasn't played yet is in at most one still-open match.
    const matchParticipant = await prisma.tournamentMatchParticipant.findFirst({
      where: { participantId },
      include: { match: true },
    });

    await prisma.$transaction(async (tx) => {
      const replacement = await tx.tournamentParticipant.create({
        data: {
          tournamentId,
          userId: nextReserveEntry.userId,
          kickUsername: nextReserveEntry.kickUsername,
          seed: participant.seed,
          currentSlot: nextReserveEntry.slot,
        },
      });
      if (matchParticipant && matchParticipant.match.status !== MatchStatus.COMPLETED) {
        await tx.tournamentMatchParticipant.update({
          where: { id: matchParticipant.id },
          data: { participantId: replacement.id, slotCall: nextReserveEntry.slot },
        });
      }
      await tx.tournamentParticipant.delete({ where: { id: participantId } });
    });


    const updated = await TournamentService.getTournamentWithRelations(tournamentId);
    const response = await TournamentService.formatTournament(updated);
    io?.to(`tournament:${tournamentId}`).emit('tournament:updated', response);
    return response;
  }

  // ─── ADMIN: Match result / winner / pause ──────────────────────────────────

  static async setMatchResult(matchId: string, participantId: string, resultText: string, adminId: string, io?: SocketIOServer): Promise<MatchResponse> {
    const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId }, include: { participants: true } });
    if (!match) throw createError(404, 'Match not found');
    const mp = match.participants.find((p) => p.participantId === participantId);
    if (!mp) throw createError(400, 'Participant is not in this match');

    await prisma.tournamentMatchParticipant.update({ where: { id: mp.id }, data: { resultText: resultText.trim() || null } });

    const updated = await prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: { participants: { include: { participant: { include: { user: true } } } } },
    });
    const formatted = TournamentService.formatMatch(updated);
    io?.to(`tournament:${match.tournamentId}`).emit('match:updated', formatted);
    return formatted;
  }

  static async declareMatchWinner(matchId: string, winnerId: string, adminId: string, io?: SocketIOServer): Promise<TournamentResponse> {
    const match = await prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: { participants: true, tournament: true },
    });
    if (!match) throw createError(404, 'Match not found');
    if (match.status === MatchStatus.COMPLETED) throw createError(400, 'Match already completed');

    const winnerParticipant = match.participants.find((p) => p.participantId === winnerId);
    if (!winnerParticipant) throw createError(400, 'Winner must be a participant in this match');

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

    if (match.nextMatchId) {
      await TournamentService.advanceWinner(matchId, winnerId);
    }

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

      const champion = await prisma.tournamentParticipant.findUnique({
        where: { id: winnerId },
        include: { user: { select: { displayName: true, kickUsername: true } } },
      });
      void KickChatService.sendChatMessage(
        `🏆 ${champion?.user.kickUsername ? `@${champion.user.kickUsername}` : champion?.user.displayName ?? 'A viewer'} is crowned "${match.tournament.title}" Tournament Champion!`
      );
    }


    const updated = await TournamentService.getTournamentWithRelations(match.tournamentId);
    const response = await TournamentService.formatTournament(updated);
    io?.to(`tournament:${match.tournamentId}`).emit('tournament:updated', response);
    return response;
  }

  static async revertMatchWinner(matchId: string, adminId: string, io?: SocketIOServer): Promise<TournamentResponse> {
    const match = await prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: { participants: true, tournament: true },
    });
    if (!match) throw createError(404, 'Match not found');
    if (match.status !== MatchStatus.COMPLETED) throw createError(400, 'Match is not completed');

    const previousWinnerId = match.winnerId;

    if (match.nextMatchId && previousWinnerId) {
      const nextMatch = await prisma.tournamentMatch.findUnique({ where: { id: match.nextMatchId } });
      if (nextMatch && nextMatch.status !== MatchStatus.COMPLETED) {
        await prisma.tournamentMatchParticipant.deleteMany({
          where: { matchId: match.nextMatchId, participantId: previousWinnerId },
        });
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
      ...(previousWinnerId ? [prisma.tournamentParticipant.updateMany({
        where: { id: previousWinnerId },
        data: { finalPosition: null },
      })] : []),
    ]);

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

  static async pauseMatch(matchId: string, adminId: string, io?: SocketIOServer): Promise<MatchResponse> {
    const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
    if (!match) throw createError(404, 'Match not found');
    if (match.status !== MatchStatus.ACTIVE) throw createError(400, 'Only an active match can be paused');

    await prisma.tournamentMatch.update({ where: { id: matchId }, data: { status: MatchStatus.PAUSED } });

    const updated = await prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: { participants: { include: { participant: { include: { user: true } } } } },
    });
    const formatted = TournamentService.formatMatch(updated);
    io?.to(`tournament:${match.tournamentId}`).emit('match:updated', formatted);
    return formatted;
  }

  static async resumeMatch(matchId: string, adminId: string, io?: SocketIOServer): Promise<MatchResponse> {
    const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
    if (!match) throw createError(404, 'Match not found');
    if (match.status !== MatchStatus.PAUSED) throw createError(400, 'Match is not paused');

    await prisma.tournamentMatch.update({ where: { id: matchId }, data: { status: MatchStatus.ACTIVE } });

    const updated = await prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: { participants: { include: { participant: { include: { user: true } } } } },
    });
    const formatted = TournamentService.formatMatch(updated);
    io?.to(`tournament:${match.tournamentId}`).emit('match:updated', formatted);
    return formatted;
  }

  private static async advanceWinner(matchId: string, winnerId: string): Promise<void> {
    const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
    if (!match?.nextMatchId) return;

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

    // Rounds 2+ still auto-activate as soon as both participants are in —
    // only round 1's initial go-live is a deliberate, separate admin action.
    if (nextMatchParticipants + 1 === 2) {
      await prisma.tournamentMatch.update({
        where: { id: match.nextMatchId },
        data: { status: MatchStatus.ACTIVE },
      });
    }
  }

  // ─── Kick chat: !slot <name> override for the current match ───────────────

  /**
   * A participant's slotCall is pre-filled each round from currentSlot (their
   * entry-time pick), but they can override it for their upcoming/active match
   * via "!slot <name>" in chat — same shared command Boss Raid/Bounty
   * Hunter/KOTH use. Also updates currentSlot so the new pick carries forward
   * into later rounds until called again.
   */
  static async submitSlotCall(kickUsername: string, slotName: string, io?: SocketIOServer): Promise<boolean> {
    const normalized = kickUsername.trim().toLowerCase();
    const user = await prisma.user.findFirst({ where: { kickUsername: { equals: normalized, mode: 'insensitive' } } });

    // A participant can be linked (userId) or a chat-only entrant identified
    // solely by kickUsername — either can call their own slot.
    const participant = await prisma.tournamentParticipant.findFirst({
      where: {
        eliminated: false,
        tournament: { status: TournamentStatus.IN_PROGRESS },
        OR: [...(user ? [{ userId: user.id }] : []), { kickUsername: normalized }],
      },
    });
    if (!participant) return false;

    const matchParticipant = await prisma.tournamentMatchParticipant.findFirst({
      where: { participantId: participant.id, match: { status: { in: [MatchStatus.ACTIVE, MatchStatus.PENDING] } } },
    });
    if (!matchParticipant) return false;

    const trimmed = slotName.trim().slice(0, 100);
    if (!trimmed) return false;

    await prisma.$transaction([
      prisma.tournamentMatchParticipant.update({ where: { id: matchParticipant.id }, data: { slotCall: trimmed } }),
      prisma.tournamentParticipant.update({ where: { id: participant.id }, data: { currentSlot: trimmed } }),
    ]);

    const match = await prisma.tournamentMatch.findUnique({
      where: { id: matchParticipant.matchId },
      include: { participants: { include: { participant: { include: { user: true } } } } },
    });
    io?.to(`tournament:${participant.tournamentId}`).emit('match:updated', TournamentService.formatMatch(match));
    return true;
  }

  // ─── ADMIN: Cancel / delete ─────────────────────────────────────────────────

  static async cancel(tournamentId: string, adminId: string, io?: SocketIOServer): Promise<TournamentResponse> {
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

  static async deleteTournament(tournamentId: string, adminId: string): Promise<void> {
    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw createError(404, 'Tournament not found');
    // Cascade deletes participants, matches, entries, bans via FK constraints
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
        _count: { select: { entries: { where: { invalidated: false } } } },
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
    const banned = await prisma.tournamentBan.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    return {
      entered: !!entry && !entry.invalidated,
      slot: entry?.slot ?? null,
      isParticipant: !!participant,
      participant: participant ? TournamentService.formatParticipant({ ...participant, user: null }) : null,
      banned: !!banned,
    };
  }
}
