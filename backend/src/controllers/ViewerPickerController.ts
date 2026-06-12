import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { ViewerPickerService } from '@/services/ViewerPickerService';
import { Server as SocketIOServer } from 'socket.io';

let _io: SocketIOServer | undefined;
export const setPickerIO = (io: SocketIOServer) => { _io = io; };

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

export class ViewerPickerController {
  static getAll = asyncHandler(async (_req, res) => {
    const pickers = await ViewerPickerService.getAll();
    res.json({ success: true, pickers });
  });

  static getActive = asyncHandler(async (_req, res) => {
    const picker = await ViewerPickerService.getActive();
    res.json({ success: true, picker });
  });

  static create = asyncHandler(async (req, res) => {
    const { keyword, label } = req.body;
    if (!keyword?.trim()) { res.status(400).json({ error: 'keyword is required' }); return; }
    const picker = await ViewerPickerService.create(keyword, label, _io);
    res.status(201).json({ success: true, picker });
  });

  static close = asyncHandler(async (req, res) => {
    const picker = await ViewerPickerService.close(req.params.id, _io);
    res.json({ success: true, picker });
  });

  static drawWinner = asyncHandler(async (req, res) => {
    const excludeUserIds: string[] = Array.isArray(req.body?.excludeUserIds) ? req.body.excludeUserIds : [];
    const picker = await ViewerPickerService.drawWinner(req.params.id, _io, excludeUserIds);
    res.json({ success: true, picker });
  });

  static addEntry = asyncHandler(async (req, res) => {
    const { kickUsername } = req.body;
    if (!kickUsername?.trim()) { res.status(400).json({ error: 'kickUsername is required' }); return; }
    const picker = await ViewerPickerService.addEntryByUsername(req.params.id, kickUsername, _io);
    res.json({ success: true, picker });
  });

  static deletePicker = asyncHandler(async (req, res) => {
    await ViewerPickerService.delete(req.params.id);
    res.json({ success: true });
  });
}
