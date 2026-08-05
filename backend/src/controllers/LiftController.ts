import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { LiftService } from '@/services/LiftService';
import { Server as SocketIOServer } from 'socket.io';

let _io: SocketIOServer | undefined;
export const setLiftIO = (io: SocketIOServer) => { _io = io; };

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

export class LiftController {
  static getActive = asyncHandler(async (_req, res) => {
    const session = await LiftService.getActive();
    res.json({ success: true, session });
  });

  static getById = asyncHandler(async (req, res) => {
    const session = await LiftService.getById(req.params.id);
    res.json({ success: true, session });
  });

  static create = asyncHandler(async (req, res) => {
    const { label } = req.body;
    const session = await LiftService.create(label, _io);
    res.status(201).json({ success: true, session });
  });

  static advanceToReady = asyncHandler(async (req, res) => {
    const session = await LiftService.advanceToReady(req.params.id, _io);
    res.json({ success: true, session });
  });

  static start = asyncHandler(async (req, res) => {
    const session = await LiftService.start(req.params.id, _io);
    res.json({ success: true, session });
  });

  static cancel = asyncHandler(async (req, res) => {
    const session = await LiftService.cancel(req.params.id, _io);
    res.json({ success: true, session });
  });
}
