import { prisma } from '@/config/database';
import { Server as SocketIOServer } from 'socket.io';
import { PointsService } from '@/services/PointsService';
import { createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { BingoStatus, CellStatus } from '@prisma/client';

const BINGO_INCLUDE = {
  cells: {
    include: { claimedBy: { select: { id: true, displayName: true, kickUsername: true, avatarUrl: true } } },
    orderBy: [{ row: 'asc' as const }, { col: 'asc' as const }],
  },
  participants: {
    include: { user: { select: { id: true, displayName: true, kickUsername: true, avatarUrl: true } } },
    orderBy: { joinedAt: 'asc' as const },
  },
  lineWins: { orderBy: { completedAt: 'asc' as const } },
  createdBy: { select: { id: true, displayName: true, kickUsername: true, avatarUrl: true } },
  currentUser: { select: { id: true, displayName: true, kickUsername: true, avatarUrl: true } },
};

export class BingoBoardService {
  static async getAll(includeAll = false) {
    return prisma.bonusBingo.findMany({
      where: includeAll ? undefined : { status: { not: BingoStatus.DRAFT } },
      include: BINGO_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getById(id: string) {
    const game = await prisma.bonusBingo.findUnique({ where: { id }, include: BINGO_INCLUDE });
    if (!game) throw createError.notFound('Bingo game not found');
    return game;
  }

  static async create(
    dto: { title: string; gridSize: number; linePoints: number },
    createdById: string,
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
    return game;
  }

  static async openRegistration(id: string, io?: SocketIOServer) {
    const game = await prisma.bonusBingo.findUnique({ where: { id } });
    if (!game) throw createError.notFound('Bingo game not found');
    if (game.status !== BingoStatus.DRAFT) throw createError.badRequest('Game must be in DRAFT to open registration');

    const updated = await prisma.bonusBingo.update({
      where: { id },
      data: { status: BingoStatus.REGISTRATION },
      include: BINGO_INCLUDE,
    });

    this.broadcast(io, id, updated);
    return updated;
  }

  static async join(gameId: string, userId: string, io?: SocketIOServer) {
    const game = await prisma.bonusBingo.findUnique({ where: { id: gameId } });
    if (!game) throw createError.notFound('Bingo game not found');
    if (game.status !== BingoStatus.REGISTRATION && game.status !== BingoStatus.ACTIVE) {
      throw createError.badRequest('Registration is not open');
    }

    const existing = await prisma.bingoParticipant.findUnique({ where: { gameId_userId: { gameId, userId } } });
    if (existing) throw createError.badRequest('Already joined');

    await prisma.bingoParticipant.create({ data: { gameId, userId } });

    const updated = await this.getById(gameId);
    this.broadcast(io, gameId, updated);
    return updated;
  }

  static async leave(gameId: string, userId: string, io?: SocketIOServer) {
    const game = await prisma.bonusBingo.findUnique({ where: { id: gameId } });
    if (!game) throw createError.notFound('Bingo game not found');
    if (game.status !== BingoStatus.REGISTRATION && game.status !== BingoStatus.ACTIVE) {
      throw createError.badRequest('Can only leave during registration or an active game');
    }

    await prisma.bingoParticipant.deleteMany({ where: { gameId, userId } });

    const updated = await this.getById(gameId);
    this.broadcast(io, gameId, updated);
    return updated;
  }

  static async startGame(id: string, io?: SocketIOServer) {
    const game = await prisma.bonusBingo.findUnique({ where: { id }, include: { participants: true } });
    if (!game) throw createError.notFound('Bingo game not found');
    if (game.status !== BingoStatus.REGISTRATION) throw createError.badRequest('Game must be in REGISTRATION to start');
    if (game.participants.length < 1) throw createError.badRequest('Need at least 1 participant to start');

    const updated = await prisma.bonusBingo.update({
      where: { id },
      data: { status: BingoStatus.ACTIVE },
      include: BINGO_INCLUDE,
    });

    this.broadcast(io, id, updated);
    return updated;
  }

  static async spinCell(id: string, io?: SocketIOServer) {
    const game = await prisma.bonusBingo.findUnique({
      where: { id },
      include: { cells: true },
    });
    if (!game) throw createError.notFound('Bingo game not found');
    if (game.status !== BingoStatus.ACTIVE) throw createError.badRequest('Game is not active');
    if (game.currentCellId) throw createError.badRequest('A cell is already selected — resolve it first');

    const emptyCells = game.cells.filter(c => c.status === CellStatus.EMPTY);
    if (emptyCells.length === 0) throw createError.badRequest('No empty cells remaining');

    const pick = emptyCells[Math.floor(Math.random() * emptyCells.length)];

    await prisma.bingoCell.update({ where: { id: pick.id }, data: { status: CellStatus.ACTIVE } });

    const updated = await prisma.bonusBingo.update({
      where: { id },
      data: { currentCellId: pick.id, currentUserId: null },
      include: BINGO_INCLUDE,
    });

    this.broadcast(io, id, updated);
    return updated;
  }

  static async drawPlayer(id: string, io?: SocketIOServer) {
    const game = await prisma.bonusBingo.findUnique({
      where: { id },
      include: { participants: true },
    });
    if (!game) throw createError.notFound('Bingo game not found');
    if (game.status !== BingoStatus.ACTIVE) throw createError.badRequest('Game is not active');
    if (!game.currentCellId) throw createError.badRequest('Spin a cell first');

    const { participants } = game;
    if (participants.length === 0) throw createError.badRequest('No participants in this game');

    // Exclude users who already have a green cell — they've claimed a spot
    const greenCells = await prisma.bingoCell.findMany({
      where: { gameId: id, status: CellStatus.GREEN },
      select: { claimedById: true },
    });
    const alreadyWon = new Set(greenCells.map(c => c.claimedById).filter(Boolean));
    const eligible = participants.filter(p => !alreadyWon.has(p.userId));
    // If everyone has won at least one cell, open the pool back up to all participants
    const pool = eligible.length > 0 ? eligible : participants;

    const pick = pool[Math.floor(Math.random() * pool.length)];

    const updated = await prisma.bonusBingo.update({
      where: { id },
      data: { currentUserId: pick.userId },
      include: BINGO_INCLUDE,
    });

    this.broadcast(io, id, updated);
    return updated;
  }

  static async setSlot(gameId: string, cellId: string, slotName: string, requesterId: string, isAdminOrMod: boolean, io?: SocketIOServer) {
    const game = await prisma.bonusBingo.findUnique({ where: { id: gameId }, include: { cells: true } });
    if (!game) throw createError.notFound('Bingo game not found');
    if (game.status !== BingoStatus.ACTIVE) throw createError.badRequest('Game is not active');
    if (game.currentCellId !== cellId) throw createError.badRequest('This cell is not the active cell');

    if (!isAdminOrMod && game.currentUserId !== requesterId) {
      throw createError.forbidden('Only the selected player can set the slot');
    }

    await prisma.bingoCell.update({ where: { id: cellId }, data: { slotName } });

    const updated = await this.getById(gameId);
    this.broadcast(io, gameId, updated);
    return updated;
  }

  static async markResult(gameId: string, won: boolean, io?: SocketIOServer) {
    const game = await prisma.bonusBingo.findUnique({
      where: { id: gameId },
      include: { cells: true, lineWins: true, participants: true },
    });
    if (!game) throw createError.notFound('Bingo game not found');
    if (game.status !== BingoStatus.ACTIVE) throw createError.badRequest('Game is not active');
    if (!game.currentCellId) throw createError.badRequest('No active cell to resolve');

    const now = new Date();
    const cellId = game.currentCellId;
    const claimerId = game.currentUserId;

    // Atomic: cell update + round clear must succeed or fail together
    await prisma.$transaction([
      won
        ? prisma.bingoCell.update({
            where: { id: cellId },
            data: { status: CellStatus.GREEN, claimedById: claimerId, claimedAt: now, playedAt: now },
          })
        : prisma.bingoCell.update({
            where: { id: cellId },
            data: { status: CellStatus.EMPTY, slotName: null, claimedById: null, claimedAt: null, playedAt: null },
          }),
      prisma.bonusBingo.update({
        where: { id: gameId },
        data: { currentCellId: null, currentUserId: null },
      }),
    ]);

    // Re-fetch cells with updated state
    const freshCells = await prisma.bingoCell.findMany({ where: { gameId } });
    const alreadyWon = new Set(game.lineWins.map(lw => `${lw.lineType}:${lw.lineIndex}`));

    // Only check for new lines if this cell turned green
    let newLineWins: Array<{ lineType: string; lineIndex: number; winners: string[] }> = [];
    if (won) {
      newLineWins = this.detectNewLines(freshCells, game.gridSize, alreadyWon);
    }

    // Award points and record line wins
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
        try {
          await PointsService.addPoints({
            userId: winnerId,
            amount: game.linePoints,
            reason: `Bonus Bingo line win (${line.lineType} ${line.lineIndex})`,
            referenceId: gameId,
            referenceType: 'bonus_bingo',
          });
          logger.info(`Bingo: awarded ${game.linePoints} pts to user ${winnerId} for line ${line.lineType}:${line.lineIndex}`);
        } catch (err) {
          logger.error(`Bingo: failed to award points to ${winnerId}`, err);
        }
      }
    }

    // Game completes only when all cells are GREEN (lost cells go back to EMPTY and can be re-spun)
    const isComplete = won && freshCells.every(c => c.status === CellStatus.GREEN || (c.id === cellId && won));

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

  static async removeParticipant(gameId: string, userId: string, io?: SocketIOServer) {
    const game = await prisma.bonusBingo.findUnique({ where: { id: gameId } });
    if (!game) throw createError.notFound('Bingo game not found');
    if (game.status === BingoStatus.COMPLETED || game.status === BingoStatus.CANCELLED) {
      throw createError.badRequest('Cannot remove participants from a finished game');
    }

    await prisma.bingoParticipant.deleteMany({ where: { gameId, userId } });

    // If this user was the currently selected player, clear them
    if (game.currentUserId === userId) {
      await prisma.bonusBingo.update({
        where: { id: gameId },
        data: { currentUserId: null },
      });
    }

    const updated = await this.getById(gameId);
    this.broadcast(io, gameId, updated);
    return updated;
  }

  static async cancel(id: string, io?: SocketIOServer) {
    const game = await prisma.bonusBingo.findUnique({ where: { id } });
    if (!game) throw createError.notFound('Bingo game not found');
    if (game.status === BingoStatus.COMPLETED || game.status === BingoStatus.CANCELLED) {
      throw createError.badRequest('Game is already finished');
    }

    const updated = await prisma.bonusBingo.update({
      where: { id },
      data: { status: BingoStatus.CANCELLED },
      include: BINGO_INCLUDE,
    });

    this.broadcast(io, id, updated);
    return updated;
  }

  static async deleteGame(id: string) {
    const game = await prisma.bonusBingo.findUnique({ where: { id } });
    if (!game) throw createError.notFound('Bingo game not found');
    await prisma.bonusBingo.delete({ where: { id } });
    logger.info(`Bingo game deleted: ${id}`);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private static detectNewLines(
    cells: { row: number; col: number; status: string; claimedById: string | null; id: string }[],
    gridSize: number,
    alreadyWon: Set<string>,
  ): Array<{ lineType: string; lineIndex: number; winners: string[] }> {
    const newLines: Array<{ lineType: string; lineIndex: number; winners: string[] }> = [];

    const green = (r: number, c: number) =>
      cells.find(cell => cell.row === r && cell.col === c && cell.status === CellStatus.GREEN);

    // Rows
    for (let r = 0; r < gridSize; r++) {
      if (alreadyWon.has(`row:${r}`)) continue;
      const rowCells = Array.from({ length: gridSize }, (_, c) => green(r, c));
      if (rowCells.every(Boolean)) {
        newLines.push({ lineType: 'row', lineIndex: r, winners: rowCells.map(c => c!.claimedById).filter((id): id is string => !!id) });
      }
    }

    // Cols
    for (let c = 0; c < gridSize; c++) {
      if (alreadyWon.has(`col:${c}`)) continue;
      const colCells = Array.from({ length: gridSize }, (_, r) => green(r, c));
      if (colCells.every(Boolean)) {
        newLines.push({ lineType: 'col', lineIndex: c, winners: colCells.map(c => c!.claimedById).filter((id): id is string => !!id) });
      }
    }

    // Main diagonal (top-left to bottom-right)
    if (!alreadyWon.has('diag:0')) {
      const diagCells = Array.from({ length: gridSize }, (_, i) => green(i, i));
      if (diagCells.every(Boolean)) {
        newLines.push({ lineType: 'diag', lineIndex: 0, winners: diagCells.map(c => c!.claimedById).filter((id): id is string => !!id) });
      }
    }

    // Anti-diagonal (top-right to bottom-left)
    if (!alreadyWon.has('diag:1')) {
      const antiDiagCells = Array.from({ length: gridSize }, (_, i) => green(i, gridSize - 1 - i));
      if (antiDiagCells.every(Boolean)) {
        newLines.push({ lineType: 'diag', lineIndex: 1, winners: antiDiagCells.map(c => c!.claimedById).filter((id): id is string => !!id) });
      }
    }

    return newLines;
  }

  private static broadcast(io: SocketIOServer | undefined, gameId: string, game: any) {
    if (!io) return;
    io.to(`bingo:${gameId}`).emit('bingo:updated', game);
  }
}
