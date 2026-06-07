import { prisma } from '@/config/database';
import { Server as SocketIOServer } from 'socket.io';
import { createError } from '@/middleware/errorHandler';
import { ViewerPickerStatus } from '@prisma/client';
import { logger } from '@/utils/logger';

const INCLUDE = {
  entries: {
    include: {
      user: { select: { id: true, displayName: true, kickUsername: true, avatarUrl: true } },
    },
    orderBy: { enteredAt: 'asc' as const },
  },
  winner: { select: { id: true, displayName: true, kickUsername: true, avatarUrl: true } },
};

export class ViewerPickerService {
  static async create(keyword: string, label?: string, io?: SocketIOServer) {
    // Close any currently open picker first
    await prisma.viewerPicker.updateMany({
      where: { status: ViewerPickerStatus.OPEN },
      data: { status: ViewerPickerStatus.CLOSED, closedAt: new Date() },
    });

    const picker = await prisma.viewerPicker.create({
      data: { keyword: keyword.trim(), label: label?.trim() || null },
      include: INCLUDE,
    });

    io?.emit('picker:updated', picker);
    logger.info(`ViewerPicker created: keyword="${picker.keyword}" id=${picker.id}`);
    return picker;
  }

  static async getActive() {
    return prisma.viewerPicker.findFirst({
      where: { status: ViewerPickerStatus.OPEN },
      include: INCLUDE,
    });
  }

  static async getAll() {
    return prisma.viewerPicker.findMany({
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  static async close(id: string, io?: SocketIOServer) {
    const picker = await prisma.viewerPicker.findUnique({ where: { id } });
    if (!picker) throw createError.notFound('Picker not found');

    const updated = await prisma.viewerPicker.update({
      where: { id },
      data: { status: ViewerPickerStatus.CLOSED, closedAt: new Date() },
      include: INCLUDE,
    });

    io?.to(`picker:${id}`).emit('picker:updated', updated);
    io?.emit('picker:updated', updated);
    return updated;
  }

  static async drawWinner(id: string, io?: SocketIOServer) {
    const picker = await prisma.viewerPicker.findUnique({ where: { id }, include: INCLUDE });
    if (!picker) throw createError.notFound('Picker not found');
    if (picker.entries.length === 0) throw createError.badRequest('No entries to pick from');

    const pick = picker.entries[Math.floor(Math.random() * picker.entries.length)];

    const updated = await prisma.viewerPicker.update({
      where: { id },
      data: { status: ViewerPickerStatus.COMPLETED, winnerId: pick.userId, closedAt: new Date() },
      include: INCLUDE,
    });

    io?.to(`picker:${id}`).emit('picker:updated', updated);
    io?.emit('picker:updated', updated);
    logger.info(`ViewerPicker ${id}: winner=${pick.userId}`);
    return updated;
  }

  static async delete(id: string) {
    await prisma.viewerPicker.delete({ where: { id } });
  }

  // Called from KickChatService when a chat message matches the active keyword
  static async handleKeyword(kickUsername: string, message: string, io?: SocketIOServer): Promise<boolean> {
    const picker = await prisma.viewerPicker.findFirst({
      where: { status: ViewerPickerStatus.OPEN },
    });
    if (!picker) return false;

    const trimmed = message.trim().toLowerCase();
    if (trimmed !== picker.keyword.toLowerCase()) return false;

    const user = await prisma.user.findFirst({
      where: { kickUsername: { equals: kickUsername, mode: 'insensitive' } },
      select: { id: true, displayName: true, kickUsername: true, avatarUrl: true },
    });
    if (!user) return false;

    // Upsert so duplicate messages are ignored
    const existing = await prisma.viewerPickerEntry.findUnique({
      where: { pickerId_userId: { pickerId: picker.id, userId: user.id } },
    });
    if (existing) return false;

    await prisma.viewerPickerEntry.create({ data: { pickerId: picker.id, userId: user.id } });

    const updated = await prisma.viewerPicker.findUnique({ where: { id: picker.id }, include: INCLUDE });
    io?.to(`picker:${picker.id}`).emit('picker:updated', updated);
    io?.emit('picker:updated', updated);

    logger.info(`ViewerPicker ${picker.id}: ${kickUsername} entered via keyword`);
    return true;
  }
}
