import { randomInt } from 'crypto';
import { prisma } from '@/config/database';
import { Server as SocketIOServer } from 'socket.io';
import { PointsService } from '@/services/PointsService';
import { RedisService } from '@/config/redis';
import { createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { BingoStatus, CellStatus, Prisma } from '@prisma/client';

const drawCycleKey = (gameId: string) => `bingo_draw_cycle:${gameId}`;

const USER_SELECT = {
  id: true,
  displayName: true,
  kickUsername: true,
  avatarUrl: true,
} as const;

const BINGO_INCLUDE = {
  cells: {
    include: { claimedBy: { select: USER_SELECT } },
    orderBy: [{ row: 'asc' as const }, { col: 'asc' as const }],
  },
  participants: {
    include: { user: { select: USER_SELECT } },
    orderBy: { joinedAt: 'asc' as const },
  },
  lineWins: { orderBy: { completedAt: 'asc' as const } },
  createdBy: { select: USER_SELECT },
  currentUser: { select: USER_SELECT },
} satisfies Prisma.BonusBingoInclude;

type GameWithRelations = Prisma.BonusBingoGetPayload<{
  include: typeof BINGO_INCLUDE;
}>;
type ParticipantWithUser = GameWithRelations['participants'][number];
type CellWithClaimer = GameWithRelations['cells'][number];

/** Identifies the acting party for join/leave/setSlot — either a real site account, a raw
 * Kick chat username, or (typically) both once a chat identity resolves to a linked account. */
export interface Identity {
  userId?: string | null;
  kickUsername?: string | null;
}

// A participant who hasn't linked Kick or registered on the site has no `user` row — fall
// back to the raw kick_username captured from chat so they can still play and be displayed.
function participantUserShape(p: ParticipantWithUser) {
  if (p.user) return p.user;
  return {
    id: p.kickUsername,
    displayName: p.kickUsername,
    kickUsername: p.kickUsername,
    avatarUrl: null,
  };
}

function participantIdentity(p: {
  userId: string | null;
  kickUsername: string | null;
}) {
  return p.userId ?? p.kickUsername ?? '';
}

function cellClaimerShape(c: CellWithClaimer) {
  if (c.claimedBy) return c.claimedBy;
  if (c.claimedByKickUsername) {
    return {
      id: c.claimedByKickUsername,
      displayName: c.claimedByKickUsername,
      kickUsername: c.claimedByKickUsername,
      avatarUrl: null,
    };
  }
  return null;
}

function cellClaimerId(c: {
  claimedById: string | null;
  claimedByKickUsername: string | null;
}) {
  return c.claimedById ?? c.claimedByKickUsername ?? null;
}

function currentUserShape(game: GameWithRelations) {
  if (game.currentUser) return game.currentUser;
  if (game.currentKickUsername) {
    return {
      id: game.currentKickUsername,
      displayName: game.currentKickUsername,
      kickUsername: game.currentKickUsername,
      avatarUrl: null,
    };
  }
  return null;
}

function toGameResponse(game: GameWithRelations) {
  return {
    ...game,
    currentUserId: game.currentUserId ?? game.currentKickUsername ?? null,
    currentUser: currentUserShape(game),
    cells: game.cells.map(c => ({
      ...c,
      claimedById: cellClaimerId(c),
      claimedBy: cellClaimerShape(c),
    })),
    participants: game.participants.map(p => ({
      ...p,
      userId: participantIdentity(p),
      user: participantUserShape(p),
    })),
  };
}

export class BingoBoardService {
  static async getAll(includeAll = false) {
    const games = await prisma.bonusBingo.findMany({
      where: includeAll ? undefined : { status: { not: BingoStatus.DRAFT } },
      include: BINGO_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return games.map(toGameResponse);
  }

  static async getById(id: string) {
    const game = await prisma.bonusBingo.findUnique({
      where: { id },
      include: BINGO_INCLUDE,
    });
    if (!game) throw createError.notFound('Bingo game not found');
    return toGameResponse(game);
  }

  static async create(
    dto: { title: string; gridSize: number; linePoints: number },
    createdById: string
  ) {
    const { title, gridSize, linePoints } = dto;
    const cells: { row: number; col: number }[] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        cells.push({ row: r, col: c });
      }
    }

    const game = await prisma.bonusBingo.create({
      data: {
        title,
        gridSize,
        linePoints,
        createdById,
        cells: { create: cells },
      },
      include: BINGO_INCLUDE,
    });

    logger.info(`Bingo game created: ${game.id} (${gridSize}x${gridSize})`);
    return toGameResponse(game);
  }

  static async openRegistration(id: string, io?: SocketIOServer) {
    const game = await prisma.bonusBingo.findUnique({ where: { id } });
    if (!game) throw createError.notFound('Bingo game not found');
    if (game.status !== BingoStatus.DRAFT)
      throw createError.badRequest(
        'Game must be in DRAFT to open registration'
      );

    const updated = await prisma.bonusBingo.update({
      where: { id },
      data: { status: BingoStatus.REGISTRATION },
      include: BINGO_INCLUDE,
    });

    return this.broadcastAndReturn(io, id, updated);
  }

  // identity.userId is set for the authenticated website "Join" button; identity.kickUsername
  // is set (and userId optionally resolved) for the "!join" Kick chat command.
  static async join(gameId: string, identity: Identity, io?: SocketIOServer) {
    const game = await prisma.bonusBingo.findUnique({ where: { id: gameId } });
    if (!game) throw createError.notFound('Bingo game not found');
    if (
      game.status !== BingoStatus.REGISTRATION &&
      game.status !== BingoStatus.ACTIVE
    ) {
      throw createError.badRequest('Registration is not open');
    }

    const userId = identity.userId ?? null;
    const kickUsername = identity.kickUsername ?? null;
    if (!userId && !kickUsername)
      throw createError.badRequest('No identity to join with');

    const existing = await prisma.bingoParticipant.findFirst({
      where: {
        gameId,
        OR: [
          ...(userId ? [{ userId }] : []),
          ...(kickUsername ? [{ kickUsername }] : []),
        ],
      },
    });
    if (existing) throw createError.badRequest('Already joined');

    await prisma.bingoParticipant.create({
      data: { gameId, userId, kickUsername },
    });

    const updated = await prisma.bonusBingo.findUnique({
      where: { id: gameId },
      include: BINGO_INCLUDE,
    });
    return this.broadcastAndReturn(io, gameId, updated!);
  }

  static async leave(gameId: string, identity: Identity, io?: SocketIOServer) {
    const game = await prisma.bonusBingo.findUnique({ where: { id: gameId } });
    if (!game) throw createError.notFound('Bingo game not found');
    if (
      game.status !== BingoStatus.REGISTRATION &&
      game.status !== BingoStatus.ACTIVE
    ) {
      throw createError.badRequest(
        'Can only leave during registration or an active game'
      );
    }

    await prisma.bingoParticipant.deleteMany({
      where: {
        gameId,
        OR: [
          ...(identity.userId ? [{ userId: identity.userId }] : []),
          ...(identity.kickUsername
            ? [{ kickUsername: identity.kickUsername }]
            : []),
        ],
      },
    });

    const updated = await prisma.bonusBingo.findUnique({
      where: { id: gameId },
      include: BINGO_INCLUDE,
    });
    return this.broadcastAndReturn(io, gameId, updated!);
  }

  static async startGame(id: string, io?: SocketIOServer) {
    const game = await prisma.bonusBingo.findUnique({
      where: { id },
      include: { participants: true },
    });
    if (!game) throw createError.notFound('Bingo game not found');
    if (game.status !== BingoStatus.REGISTRATION)
      throw createError.badRequest('Game must be in REGISTRATION to start');
    if (game.participants.length < 1)
      throw createError.badRequest('Need at least 1 participant to start');

    const updated = await prisma.bonusBingo.update({
      where: { id },
      data: { status: BingoStatus.ACTIVE },
      include: BINGO_INCLUDE,
    });

    return this.broadcastAndReturn(io, id, updated);
  }

  static async spinCell(id: string, io?: SocketIOServer) {
    const game = await prisma.bonusBingo.findUnique({
      where: { id },
      include: { cells: true },
    });
    if (!game) throw createError.notFound('Bingo game not found');
    if (game.status !== BingoStatus.ACTIVE)
      throw createError.badRequest('Game is not active');
    if (game.currentCellId)
      throw createError.badRequest(
        'A cell is already selected — resolve it first'
      );

    const emptyCells = game.cells.filter(c => c.status === CellStatus.EMPTY);
    if (emptyCells.length === 0)
      throw createError.badRequest('No empty cells remaining');

    const pick = emptyCells[randomInt(0, emptyCells.length)];

    await prisma.bingoCell.update({
      where: { id: pick.id },
      data: { status: CellStatus.ACTIVE },
    });

    const updated = await prisma.bonusBingo.update({
      where: { id },
      data: {
        currentCellId: pick.id,
        currentUserId: null,
        currentKickUsername: null,
      },
      include: BINGO_INCLUDE,
    });

    return this.broadcastAndReturn(io, id, updated);
  }

  static async drawPlayer(
    id: string,
    includeWinners: boolean,
    io?: SocketIOServer
  ) {
    const game = await prisma.bonusBingo.findUnique({
      where: { id },
      include: { participants: true },
    });
    if (!game) throw createError.notFound('Bingo game not found');
    if (game.status !== BingoStatus.ACTIVE)
      throw createError.badRequest('Game is not active');
    if (!game.currentCellId) throw createError.badRequest('Spin a cell first');

    const { participants } = game;
    if (participants.length === 0)
      throw createError.badRequest('No participants in this game');

    // Build the draw pool — optionally exclude green-cell holders
    let pool = participants;
    if (!includeWinners) {
      const greenCells = await prisma.bingoCell.findMany({
        where: { gameId: id, status: CellStatus.GREEN },
        select: { claimedById: true, claimedByKickUsername: true },
      });
      const alreadyWon = new Set(
        greenCells.map(c => cellClaimerId(c)).filter((v): v is string => !!v)
      );
      const eligible = participants.filter(
        p => !alreadyWon.has(participantIdentity(p))
      );
      // Fall back to everyone if all participants have won at least one cell
      pool = eligible.length > 0 ? eligible : participants;
    }

    // Shuffle-bag: cycle through everyone before repeating (skip when only 1 player)
    let pick: (typeof pool)[0];
    if (pool.length === 1) {
      pick = pool[0];
    } else {
      const key = drawCycleKey(id);
      const raw = await RedisService.get(key);
      let drawnThisCycle: string[] = raw ? JSON.parse(raw) : [];
      const drawnSet = new Set(drawnThisCycle);

      let available = pool.filter(p => !drawnSet.has(participantIdentity(p)));
      if (available.length === 0) {
        // Full cycle complete — reset and allow everyone again
        drawnThisCycle = [];
        available = pool;
      }

      pick = available[randomInt(0, available.length)];
      drawnThisCycle.push(participantIdentity(pick));
      await RedisService.set(key, JSON.stringify(drawnThisCycle), 86400);
    }

    const updated = await prisma.bonusBingo.update({
      where: { id },
      data: {
        currentUserId: pick.userId,
        currentKickUsername: pick.kickUsername,
      },
      include: BINGO_INCLUDE,
    });

    return this.broadcastAndReturn(io, id, updated);
  }

  // requester is null when called from a context that's already been authorized
  // (e.g. the Kick chat handler only calls this once it's confirmed the chatter is the
  // current player), and set when called from the authenticated website endpoint.
  static async setSlot(
    gameId: string,
    cellId: string,
    slotName: string,
    requester: Identity | null,
    isAdminOrMod: boolean,
    io?: SocketIOServer
  ) {
    const game = await prisma.bonusBingo.findUnique({
      where: { id: gameId },
      include: { cells: true },
    });
    if (!game) throw createError.notFound('Bingo game not found');
    if (game.status !== BingoStatus.ACTIVE)
      throw createError.badRequest('Game is not active');
    if (game.currentCellId !== cellId)
      throw createError.badRequest('This cell is not the active cell');

    if (!isAdminOrMod && requester) {
      const isCurrentPlayer =
        (!!requester.userId && requester.userId === game.currentUserId) ||
        (!!requester.kickUsername &&
          requester.kickUsername === game.currentKickUsername);
      if (!isCurrentPlayer)
        throw createError.forbidden(
          'Only the selected player can set the slot'
        );
    }

    await prisma.bingoCell.update({
      where: { id: cellId },
      data: { slotName },
    });

    const updated = await prisma.bonusBingo.findUnique({
      where: { id: gameId },
      include: BINGO_INCLUDE,
    });
    return this.broadcastAndReturn(io, gameId, updated!);
  }

  static async markResult(gameId: string, won: boolean, io?: SocketIOServer) {
    const game = await prisma.bonusBingo.findUnique({
      where: { id: gameId },
      include: { cells: true, lineWins: true, participants: true },
    });
    if (!game) throw createError.notFound('Bingo game not found');
    if (game.status !== BingoStatus.ACTIVE)
      throw createError.badRequest('Game is not active');
    if (!game.currentCellId)
      throw createError.badRequest('No active cell to resolve');

    const now = new Date();
    const cellId = game.currentCellId;
    const claimerId = game.currentUserId;
    const claimerKickUsername = game.currentKickUsername;

    // Atomic: cell update + round clear must succeed or fail together
    await prisma.$transaction([
      won
        ? prisma.bingoCell.update({
            where: { id: cellId },
            data: {
              status: CellStatus.GREEN,
              claimedById: claimerId,
              claimedByKickUsername: claimerKickUsername,
              claimedAt: now,
              playedAt: now,
            },
          })
        : prisma.bingoCell.update({
            where: { id: cellId },
            data: {
              status: CellStatus.EMPTY,
              slotName: null,
              claimedById: null,
              claimedByKickUsername: null,
              claimedAt: null,
              playedAt: null,
            },
          }),
      prisma.bonusBingo.update({
        where: { id: gameId },
        data: {
          currentCellId: null,
          currentUserId: null,
          currentKickUsername: null,
        },
      }),
    ]);

    // Re-fetch cells with updated state
    const freshCells = await prisma.bingoCell.findMany({ where: { gameId } });
    const alreadyWon = new Set(
      game.lineWins.map(lw => `${lw.lineType}:${lw.lineIndex}`)
    );

    // Only check for new lines if this cell turned green
    let newLineWins: Array<{
      lineType: string;
      lineIndex: number;
      winners: string[];
    }> = [];
    if (won) {
      newLineWins = this.detectNewLines(freshCells, game.gridSize, alreadyWon);
    }

    // Award points and record line wins. Unlinked winners (raw kick username, no site
    // account) can complete a line same as anyone, but there's no account to credit —
    // points are only awarded to winners with a real userId, mirroring how unlinked
    // wagerers can't be paid out on the wager leaderboard either.
    for (const line of newLineWins) {
      await prisma.bingoLineWin.create({
        data: {
          gameId,
          lineType: line.lineType,
          lineIndex: line.lineIndex,
          pointsEach: game.linePoints,
        },
      });

      const uniqueWinners = [...new Set(line.winners)];
      for (const winnerId of uniqueWinners) {
        const isRealUser = await prisma.user.findUnique({
          where: { id: winnerId },
          select: { id: true },
        });
        if (!isRealUser) continue;
        try {
          await PointsService.addPoints({
            userId: winnerId,
            amount: game.linePoints,
            reason: `Bonus Bingo line win (${line.lineType} ${line.lineIndex})`,
            referenceId: gameId,
            referenceType: 'bonus_bingo',
          });
          logger.info(
            `Bingo: awarded ${game.linePoints} pts to user ${winnerId} for line ${line.lineType}:${line.lineIndex}`
          );
        } catch (err) {
          logger.error(`Bingo: failed to award points to ${winnerId}`, err);
        }
      }
    }

    // Game completes only when all cells are GREEN (lost cells go back to EMPTY and can be re-spun)
    const isComplete =
      won &&
      freshCells.every(
        c => c.status === CellStatus.GREEN || (c.id === cellId && won)
      );

    if (isComplete) {
      await prisma.bonusBingo.update({
        where: { id: gameId },
        data: { status: BingoStatus.COMPLETED, completedAt: now },
      });
    }

    const updated = await this.getById(gameId);
    this.broadcast(io, gameId, updated);
    return { game: updated, newLineWins };
  }

  static async removeParticipant(
    gameId: string,
    identity: string,
    io?: SocketIOServer
  ) {
    const game = await prisma.bonusBingo.findUnique({ where: { id: gameId } });
    if (!game) throw createError.notFound('Bingo game not found');
    if (
      game.status === BingoStatus.COMPLETED ||
      game.status === BingoStatus.CANCELLED
    ) {
      throw createError.badRequest(
        'Cannot remove participants from a finished game'
      );
    }

    await prisma.bingoParticipant.deleteMany({
      where: { gameId, OR: [{ userId: identity }, { kickUsername: identity }] },
    });

    // If this identity was the currently selected player, clear them
    if (
      game.currentUserId === identity ||
      game.currentKickUsername === identity
    ) {
      await prisma.bonusBingo.update({
        where: { id: gameId },
        data: { currentUserId: null, currentKickUsername: null },
      });
    }

    // Remove this identity from the draw cycle so they don't occupy a slot after leaving
    const key = drawCycleKey(gameId);
    const raw = await RedisService.get(key);
    if (raw) {
      const cycle: string[] = JSON.parse(raw).filter(
        (v: string) => v !== identity
      );
      await RedisService.set(key, JSON.stringify(cycle), 86400);
    }

    const updated = await prisma.bonusBingo.findUnique({
      where: { id: gameId },
      include: BINGO_INCLUDE,
    });
    return this.broadcastAndReturn(io, gameId, updated!);
  }

  static async completeGame(id: string, io?: SocketIOServer) {
    const game = await prisma.bonusBingo.findUnique({
      where: { id },
      include: { cells: true },
    });
    if (!game) throw createError.notFound('Bingo game not found');
    if (
      game.status === BingoStatus.COMPLETED ||
      game.status === BingoStatus.CANCELLED
    ) {
      throw createError.badRequest('Game is already finished');
    }

    // Reset any in-progress active cell back to EMPTY
    const activeCell = game.cells.find(c => c.status === CellStatus.ACTIVE);
    if (activeCell) {
      await prisma.bingoCell.update({
        where: { id: activeCell.id },
        data: {
          status: CellStatus.EMPTY,
          slotName: null,
          claimedById: null,
          claimedByKickUsername: null,
          claimedAt: null,
          playedAt: null,
        },
      });
    }

    const updated = await prisma.bonusBingo.update({
      where: { id },
      data: {
        status: BingoStatus.COMPLETED,
        currentCellId: null,
        currentUserId: null,
        currentKickUsername: null,
        completedAt: new Date(),
      },
      include: BINGO_INCLUDE,
    });

    await RedisService.del(drawCycleKey(id));
    return this.broadcastAndReturn(io, id, updated);
  }

  static async unlive(id: string, io?: SocketIOServer) {
    const game = await prisma.bonusBingo.findUnique({
      where: { id },
      include: { cells: true },
    });
    if (!game) throw createError.notFound('Bingo game not found');
    if (game.status !== BingoStatus.ACTIVE)
      throw createError.badRequest('Game is not active');

    // Reset any ACTIVE cell back to EMPTY
    const activeCell = game.cells.find(c => c.status === CellStatus.ACTIVE);
    if (activeCell) {
      await prisma.bingoCell.update({
        where: { id: activeCell.id },
        data: {
          status: CellStatus.EMPTY,
          slotName: null,
          claimedById: null,
          claimedByKickUsername: null,
          claimedAt: null,
          playedAt: null,
        },
      });
    }

    const updated = await prisma.bonusBingo.update({
      where: { id },
      data: {
        status: BingoStatus.REGISTRATION,
        currentCellId: null,
        currentUserId: null,
        currentKickUsername: null,
      },
      include: BINGO_INCLUDE,
    });

    await RedisService.del(drawCycleKey(id));
    return this.broadcastAndReturn(io, id, updated);
  }

  static async cancel(id: string, io?: SocketIOServer) {
    const game = await prisma.bonusBingo.findUnique({ where: { id } });
    if (!game) throw createError.notFound('Bingo game not found');
    if (
      game.status === BingoStatus.COMPLETED ||
      game.status === BingoStatus.CANCELLED
    ) {
      throw createError.badRequest('Game is already finished');
    }

    const updated = await prisma.bonusBingo.update({
      where: { id },
      data: { status: BingoStatus.CANCELLED },
      include: BINGO_INCLUDE,
    });

    await RedisService.del(drawCycleKey(id));
    return this.broadcastAndReturn(io, id, updated);
  }

  static async deleteGame(id: string) {
    const game = await prisma.bonusBingo.findUnique({ where: { id } });
    if (!game) throw createError.notFound('Bingo game not found');
    await prisma.bonusBingo.delete({ where: { id } });
    logger.info(`Bingo game deleted: ${id}`);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private static detectNewLines(
    cells: {
      row: number;
      col: number;
      status: string;
      claimedById: string | null;
      claimedByKickUsername: string | null;
      id: string;
    }[],
    gridSize: number,
    alreadyWon: Set<string>
  ): Array<{ lineType: string; lineIndex: number; winners: string[] }> {
    const newLines: Array<{
      lineType: string;
      lineIndex: number;
      winners: string[];
    }> = [];

    const green = (r: number, c: number) =>
      cells.find(
        cell =>
          cell.row === r && cell.col === c && cell.status === CellStatus.GREEN
      );

    const winnerId = (cell: {
      claimedById: string | null;
      claimedByKickUsername: string | null;
    }) => cellClaimerId(cell);

    // Rows
    for (let r = 0; r < gridSize; r++) {
      if (alreadyWon.has(`row:${r}`)) continue;
      const rowCells = Array.from({ length: gridSize }, (_, c) => green(r, c));
      if (rowCells.every(Boolean)) {
        newLines.push({
          lineType: 'row',
          lineIndex: r,
          winners: rowCells
            .map(c => winnerId(c!))
            .filter((id): id is string => !!id),
        });
      }
    }

    // Cols
    for (let c = 0; c < gridSize; c++) {
      if (alreadyWon.has(`col:${c}`)) continue;
      const colCells = Array.from({ length: gridSize }, (_, r) => green(r, c));
      if (colCells.every(Boolean)) {
        newLines.push({
          lineType: 'col',
          lineIndex: c,
          winners: colCells
            .map(c => winnerId(c!))
            .filter((id): id is string => !!id),
        });
      }
    }

    // Main diagonal (top-left to bottom-right)
    if (!alreadyWon.has('diag:0')) {
      const diagCells = Array.from({ length: gridSize }, (_, i) => green(i, i));
      if (diagCells.every(Boolean)) {
        newLines.push({
          lineType: 'diag',
          lineIndex: 0,
          winners: diagCells
            .map(c => winnerId(c!))
            .filter((id): id is string => !!id),
        });
      }
    }

    // Anti-diagonal (top-right to bottom-left)
    if (!alreadyWon.has('diag:1')) {
      const antiDiagCells = Array.from({ length: gridSize }, (_, i) =>
        green(i, gridSize - 1 - i)
      );
      if (antiDiagCells.every(Boolean)) {
        newLines.push({
          lineType: 'diag',
          lineIndex: 1,
          winners: antiDiagCells
            .map(c => winnerId(c!))
            .filter((id): id is string => !!id),
        });
      }
    }

    return newLines;
  }

  private static broadcastAndReturn(
    io: SocketIOServer | undefined,
    gameId: string,
    game: GameWithRelations
  ) {
    const response = toGameResponse(game);
    this.broadcast(io, gameId, response);
    return response;
  }

  private static broadcast(
    io: SocketIOServer | undefined,
    gameId: string,
    game: unknown
  ) {
    if (!io) return;
    io.to(`bingo:${gameId}`).emit('bingo:updated', game);
  }
}
