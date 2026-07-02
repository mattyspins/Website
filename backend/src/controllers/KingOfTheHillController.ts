import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { KingOfTheHillService } from '@/services/KingOfTheHillService';
import { Server as SocketIOServer } from 'socket.io';

let _io: SocketIOServer | undefined;
export const setKothIO = (io: SocketIOServer) => { _io = io; };

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

export class KingOfTheHillController {
  static getAll = asyncHandler(async (_req, res) => {
    const sessions = await KingOfTheHillService.getAll();
    res.json({ success: true, sessions });
  });

  static getActive = asyncHandler(async (_req, res) => {
    const session = await KingOfTheHillService.getActive();
    res.json({ success: true, session });
  });

  static create = asyncHandler(async (req, res) => {
    const { label } = req.body;
    const session = await KingOfTheHillService.create(label, _io);
    res.status(201).json({ success: true, session });
  });

  static close = asyncHandler(async (req, res) => {
    const session = await KingOfTheHillService.close(req.params.id, _io);
    res.json({ success: true, session });
  });

  static draw = asyncHandler(async (req, res) => {
    const session = await KingOfTheHillService.draw(req.params.id, _io);
    res.json({ success: true, session });
  });

  static cancelDraw = asyncHandler(async (req, res) => {
    const session = await KingOfTheHillService.cancelDraw(req.params.id, _io);
    res.json({ success: true, session });
  });

  static addEntry = asyncHandler(async (req, res) => {
    const { kickUsername } = req.body;
    if (!kickUsername?.trim()) { res.status(400).json({ error: 'kickUsername is required' }); return; }
    const session = await KingOfTheHillService.addEntryByUsername(req.params.id, kickUsername, _io);
    res.json({ success: true, session });
  });

  static removeEntry = asyncHandler(async (req, res) => {
    const session = await KingOfTheHillService.removeEntry(req.params.entryId, _io);
    res.json({ success: true, session });
  });

  static submitRound = asyncHandler(async (req, res) => {
    const { betAmount, payoutAmount } = req.body;
    const session = await KingOfTheHillService.submitRound(
      req.params.entryId,
      Number(betAmount),
      Number(payoutAmount),
      _io
    );
    res.json({ success: true, session });
  });

  static deleteSession = asyncHandler(async (req, res) => {
    await KingOfTheHillService.delete(req.params.id);
    res.json({ success: true });
  });
}
