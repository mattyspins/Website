import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { BingoBoardService } from '@/services/BingoBoardService';
import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedRequest } from '@/middleware/auth';

let _io: SocketIOServer | undefined;
export const setBingoIO = (io: SocketIOServer) => { _io = io; };

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

const createSchema = z.object({
  title: z.string().min(1).max(100),
  gridSize: z.number().int().refine(n => [3, 4, 5].includes(n), 'gridSize must be 3, 4, or 5').default(5),
  linePoints: z.number().int().min(1).max(100000).default(500),
});

const slotSchema = z.object({ slotName: z.string().min(1).max(100) });
const resultSchema = z.object({ won: z.boolean() });

export class BingoBoardController {
  static getAll = asyncHandler(async (req, res) => {
    const includeAll = !!(req.user?.isAdmin || req.user?.isModerator);
    const games = await BingoBoardService.getAll(includeAll);
    res.json({ success: true, games });
  });

  static getById = asyncHandler(async (req, res) => {
    const game = await BingoBoardService.getById(req.params.id);
    res.json({ success: true, game });
  });

  // ─── Admin ──────────────────────────────────────────────────────────────────

  static create = asyncHandler(async (req, res) => {
    const dto = createSchema.parse(req.body);
    const game = await BingoBoardService.create(dto, req.user!.id);
    res.status(201).json({ success: true, game });
  });

  static openRegistration = asyncHandler(async (req, res) => {
    const game = await BingoBoardService.openRegistration(req.params.id, _io);
    res.json({ success: true, game });
  });

  static startGame = asyncHandler(async (req, res) => {
    const game = await BingoBoardService.startGame(req.params.id, _io);
    res.json({ success: true, game });
  });

  static spinCell = asyncHandler(async (req, res) => {
    const game = await BingoBoardService.spinCell(req.params.id, _io);
    res.json({ success: true, game });
  });

  static drawPlayer = asyncHandler(async (req, res) => {
    const includeWinners = req.body?.includeWinners === true;
    const game = await BingoBoardService.drawPlayer(req.params.id, includeWinners, _io);
    res.json({ success: true, game });
  });

  static markResult = asyncHandler(async (req, res) => {
    const { won } = resultSchema.parse(req.body);
    const result = await BingoBoardService.markResult(req.params.id, won, _io);
    res.json({ success: true, game: result.game, newLineWins: result.newLineWins });
  });

  static unlive = asyncHandler(async (req, res) => {
    const game = await BingoBoardService.unlive(req.params.id, _io);
    res.json({ success: true, game });
  });

  static cancel = asyncHandler(async (req, res) => {
    const game = await BingoBoardService.cancel(req.params.id, _io);
    res.json({ success: true, game });
  });

  static deleteGame = asyncHandler(async (req, res) => {
    await BingoBoardService.deleteGame(req.params.id);
    res.json({ success: true, message: 'Bingo game deleted' });
  });

  static removeParticipant = asyncHandler(async (req, res) => {
    const game = await BingoBoardService.removeParticipant(req.params.id, req.params.userId, _io);
    res.json({ success: true, game });
  });

  // ─── Viewer (auth required) ──────────────────────────────────────────────────

  static join = asyncHandler(async (req, res) => {
    const game = await BingoBoardService.join(req.params.id, req.user!.id, _io);
    res.json({ success: true, game });
  });

  static leave = asyncHandler(async (req, res) => {
    const game = await BingoBoardService.leave(req.params.id, req.user!.id, _io);
    res.json({ success: true, game });
  });

  static setSlot = asyncHandler(async (req, res) => {
    const { slotName } = slotSchema.parse(req.body);
    const isAdminOrMod = !!(req.user!.isAdmin || req.user!.isModerator);
    const game = await BingoBoardService.setSlot(req.params.id, req.params.cellId, slotName, req.user!.id, isAdminOrMod, _io);
    res.json({ success: true, game });
  });
}
