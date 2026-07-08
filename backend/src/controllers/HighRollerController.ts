import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { HighRollerService } from '@/services/HighRollerService';
import { Server as SocketIOServer } from 'socket.io';

let _io: SocketIOServer | undefined;
export const setHighRollerIO = (io: SocketIOServer) => { _io = io; };

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

export class HighRollerController {
  static getAll = asyncHandler(async (_req, res) => {
    const sessions = await HighRollerService.getAll();
    res.json({ success: true, sessions });
  });

  static getActive = asyncHandler(async (_req, res) => {
    const session = await HighRollerService.getActive();
    res.json({ success: true, session });
  });

  static create = asyncHandler(async (req, res) => {
    const { title, threshold, joinKeyword, leaveKeyword, overKeyword, underKeyword, suggestKeyword, treatMissedAsWrong } = req.body;
    if (threshold === undefined || threshold === null || !(Number(threshold) > 0)) {
      res.status(400).json({ error: 'threshold is required and must be greater than 0' });
      return;
    }
    const session = await HighRollerService.createGame(
      { title, threshold: Number(threshold), joinKeyword, leaveKeyword, overKeyword, underKeyword, suggestKeyword, treatMissedAsWrong },
      _io
    );
    res.status(201).json({ success: true, session });
  });

  static addPlayer = asyncHandler(async (req, res) => {
    const { kickUsername } = req.body;
    if (!kickUsername?.trim()) { res.status(400).json({ error: 'kickUsername is required' }); return; }
    const session = await HighRollerService.addPlayerByUsername(req.params.id, kickUsername, _io);
    res.json({ success: true, session });
  });

  static removePlayer = asyncHandler(async (req, res) => {
    const session = await HighRollerService.removePlayer(req.params.playerId, _io);
    res.json({ success: true, session });
  });

  static lockPredictions = asyncHandler(async (req, res) => {
    const session = await HighRollerService.lockPredictions(req.params.id, _io);
    res.json({ success: true, session });
  });

  static resetRound = asyncHandler(async (req, res) => {
    const session = await HighRollerService.resetRound(req.params.id, _io);
    res.json({ success: true, session });
  });

  static resolveRound = asyncHandler(async (req, res) => {
    const { slotResult } = req.body;
    if (slotResult === undefined || slotResult === null || !(Number(slotResult) >= 0)) {
      res.status(400).json({ error: 'slotResult is required and must be zero or greater' });
      return;
    }
    const result = await HighRollerService.resolveRound(req.params.id, Number(slotResult), _io);
    res.json({ success: true, ...result });
  });

  static changeThreshold = asyncHandler(async (req, res) => {
    const { threshold } = req.body;
    if (threshold === undefined || threshold === null || !(Number(threshold) > 0)) {
      res.status(400).json({ error: 'threshold is required and must be greater than 0' });
      return;
    }
    const session = await HighRollerService.changeThreshold(req.params.id, Number(threshold), _io);
    res.json({ success: true, session });
  });

  static pause = asyncHandler(async (req, res) => {
    const session = await HighRollerService.setPaused(req.params.id, true, _io);
    res.json({ success: true, session });
  });

  static resume = asyncHandler(async (req, res) => {
    const session = await HighRollerService.setPaused(req.params.id, false, _io);
    res.json({ success: true, session });
  });

  static setFinalRound = asyncHandler(async (req, res) => {
    const { finalRound } = req.body;
    const session = await HighRollerService.setFinalRound(req.params.id, Boolean(finalRound), _io);
    res.json({ success: true, session });
  });

  static endGame = asyncHandler(async (req, res) => {
    const result = await HighRollerService.endGame(req.params.id, _io);
    res.json({ success: true, ...result });
  });

  static drawSuggestion = asyncHandler(async (req, res) => {
    const { pool, excludePrevious } = req.body;
    const result = await HighRollerService.drawSuggestion(
      req.params.id,
      { pool: pool === 'suggested' ? 'suggested' : 'joined', excludePrevious: Boolean(excludePrevious) },
      _io
    );
    res.json({ success: true, ...result });
  });

  static deleteSession = asyncHandler(async (req, res) => {
    await HighRollerService.delete(req.params.id);
    res.json({ success: true });
  });
}
