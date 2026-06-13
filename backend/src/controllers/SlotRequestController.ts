import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { SlotRequestService } from '@/services/SlotRequestService';
import { Server as SocketIOServer } from 'socket.io';

let _io: SocketIOServer | undefined;
export const setSlotRequestIO = (io: SocketIOServer) => { _io = io; };

const wrap = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

export class SlotRequestController {
  static getStatus = wrap(async (_req, res) => {
    const open = await SlotRequestService.isOpen();
    res.json({ success: true, open });
  });

  static getAll = wrap(async (_req, res) => {
    const requests = await SlotRequestService.getAll();
    res.json({ success: true, requests });
  });

  static getPending = wrap(async (_req, res) => {
    const requests = await SlotRequestService.getPending();
    res.json({ success: true, requests });
  });

  static open = wrap(async (_req, res) => {
    await SlotRequestService.open(_io);
    res.json({ success: true });
  });

  static close = wrap(async (_req, res) => {
    await SlotRequestService.close(_io);
    res.json({ success: true });
  });

  static markAdded = wrap(async (req, res) => {
    const updated = await SlotRequestService.markAdded(req.params.id, _io);
    res.json({ success: true, request: updated });
  });

  static markRejected = wrap(async (req, res) => {
    const updated = await SlotRequestService.markRejected(req.params.id, _io);
    res.json({ success: true, request: updated });
  });

  static delete = wrap(async (req, res) => {
    await SlotRequestService.delete(req.params.id);
    res.json({ success: true });
  });

  static clearPending = wrap(async (_req, res) => {
    await SlotRequestService.clearPending(_io);
    res.json({ success: true });
  });
}
