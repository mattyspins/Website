import { randomInt } from 'crypto';
import { prisma } from '@/config/database';
import { Server as SocketIOServer } from 'socket.io';
import { createError } from '@/middleware/errorHandler';
import { ViewerPickerStatus, Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';

const USER_SELECT = { id: true, displayName: true, kickUsername: true, avatarUrl: true } as const;

const INCLUDE = {
  entries: {
    include: { user: { select: USER_SELECT } },
    orderBy: { enteredAt: 'asc' as const },
  },
  winningEntry: {
    include: { user: { select: USER_SELECT } },
  },
} satisfies Prisma.ViewerPickerInclude;

type PickerWithRelations = Prisma.ViewerPickerGetPayload<{ include: typeof INCLUDE }>;
type EntryWithUser = PickerWithRelations['entries'][number];

// A viewer who hasn't linked Kick or registered on the site has no `user` row — fall back
// to the raw kick_username captured from chat so they can still enter and be displayed.
function entryUserShape(entry: EntryWithUser) {
  if (entry.user) return entry.user;
  return { id: entry.kickUsername, displayName: entry.kickUsername, kickUsername: entry.kickUsername, avatarUrl: null };
}

// Stable per-picker identity for an entry, usable for exclusion/dedup whether or not
// the entrant has a linked site account.
function entryIdentity(entry: { userId: string | null; kickUsername: string }) {
  return entry.userId ?? entry.kickUsername;
}

function toPickerResponse(picker: PickerWithRelations) {
  return {
    id: picker.id,
    keyword: picker.keyword,
    label: picker.label,
    status: picker.status,
    winnerId: picker.winningEntry ? entryIdentity(picker.winningEntry) : null,
    createdAt: picker.createdAt,
    closedAt: picker.closedAt,
    entries: picker.entries.map((e) => ({
      id: e.id,
      pickerId: e.pickerId,
      userId: entryIdentity(e),
      enteredAt: e.enteredAt,
      user: entryUserShape(e),
    })),
    winner: picker.winningEntry ? entryUserShape(picker.winningEntry) : null,
  };
}

export class ViewerPickerService {
  static async create(keyword: string, label?: string, io?: SocketIOServer) {
    // Close any currently open picker first
    await prisma.viewerPicker.updateMany({
      where: { status: ViewerPickerStatus.OPEN },
      data: { status: ViewerPickerStatus.CLOSED, closedAt: new Date() },
    });

    const picker = await prisma.viewerPicker.create({
      data: { keyword: keyword.trim().toLowerCase(), label: label?.trim() || null },
      include: INCLUDE,
    });

    const response = toPickerResponse(picker);
    io?.emit('picker:updated', response);
    logger.info(`ViewerPicker created: keyword="${picker.keyword}" id=${picker.id}`);
    return response;
  }

  static async getActive() {
    const picker = await prisma.viewerPicker.findFirst({
      where: { status: ViewerPickerStatus.OPEN },
      include: INCLUDE,
    });
    return picker ? toPickerResponse(picker) : null;
  }

  static async getAll() {
    const pickers = await prisma.viewerPicker.findMany({
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return pickers.map(toPickerResponse);
  }

  static async close(id: string, io?: SocketIOServer) {
    const picker = await prisma.viewerPicker.findUnique({ where: { id } });
    if (!picker) throw createError.notFound('Picker not found');

    const updated = await prisma.viewerPicker.update({
      where: { id },
      data: { status: ViewerPickerStatus.CLOSED, closedAt: new Date() },
      include: INCLUDE,
    });

    const response = toPickerResponse(updated);
    io?.to(`picker:${id}`).emit('picker:updated', response);
    io?.emit('picker:updated', response);
    return response;
  }

  static async drawWinner(id: string, io?: SocketIOServer, excludeUserIds: string[] = []) {
    const picker = await prisma.viewerPicker.findUnique({ where: { id }, include: INCLUDE });
    if (!picker) throw createError.notFound('Picker not found');
    if (picker.entries.length === 0) throw createError.badRequest('No entries to pick from');

    // Exclude the previous winner plus any session winners passed by the client
    const prevWinnerIdentity = picker.winningEntry ? entryIdentity(picker.winningEntry) : null;
    const allExcluded = new Set([...excludeUserIds, ...(prevWinnerIdentity ? [prevWinnerIdentity] : [])]);
    const pool = allExcluded.size > 0
      ? picker.entries.filter((e) => !allExcluded.has(entryIdentity(e)))
      : picker.entries;
    if (pool.length === 0) throw createError.badRequest('No other eligible entries');

    const pick = pool[randomInt(0, pool.length)];

    const updated = await prisma.viewerPicker.update({
      where: { id },
      data: { status: ViewerPickerStatus.COMPLETED, winningEntryId: pick.id, closedAt: new Date() },
      include: INCLUDE,
    });

    const response = toPickerResponse(updated);
    io?.to(`picker:${id}`).emit('picker:updated', response);
    io?.emit('picker:updated', response);
    logger.info(`ViewerPicker ${id}: winner=${entryIdentity(pick)}`);
    return response;
  }

  static async addEntryByUsername(id: string, kickUsername: string, io?: SocketIOServer) {
    const picker = await prisma.viewerPicker.findUnique({ where: { id } });
    if (!picker) throw createError.notFound('Picker not found');
    if (picker.status !== ViewerPickerStatus.OPEN) throw createError.badRequest('Draw is not open');

    const trimmed = kickUsername.trim();
    const normalized = trimmed.toLowerCase();

    const existing = await prisma.viewerPickerEntry.findUnique({
      where: { pickerId_kickUsername: { pickerId: id, kickUsername: normalized } },
    });
    if (existing) throw createError.badRequest(`${trimmed} is already in the draw`);

    // Optional bonus link — entry is valid either way, since it's keyed on kickUsername.
    const user = await prisma.user.findFirst({
      where: { kickUsername: { equals: normalized, mode: 'insensitive' } },
      select: { id: true },
    });

    await prisma.viewerPickerEntry.create({
      data: { pickerId: id, kickUsername: normalized, userId: user?.id ?? null },
    });

    const updated = await prisma.viewerPicker.findUnique({ where: { id }, include: INCLUDE });
    const response = toPickerResponse(updated!);
    io?.to(`picker:${id}`).emit('picker:updated', response);
    io?.emit('picker:updated', response);

    logger.info(`ViewerPicker ${id}: manually added ${trimmed}${user ? '' : ' (unlinked)'}`);
    return response;
  }

  static async delete(id: string) {
    await prisma.viewerPicker.delete({ where: { id } });
  }

  // Called from KickChatService when a chat message matches the active keyword.
  // The chatter is identified by their Kick username directly from the chat event, so
  // entry never depends on having linked Kick or registered on the site.
  static async handleKeyword(kickUsername: string, message: string, io?: SocketIOServer): Promise<boolean> {
    const picker = await prisma.viewerPicker.findFirst({
      where: { status: ViewerPickerStatus.OPEN },
    });
    if (!picker) return false;

    const trimmed = message.trim().toLowerCase();
    if (trimmed !== picker.keyword.toLowerCase()) return false;

    const normalizedUsername = kickUsername.trim().toLowerCase();

    const existing = await prisma.viewerPickerEntry.findUnique({
      where: { pickerId_kickUsername: { pickerId: picker.id, kickUsername: normalizedUsername } },
    });
    if (existing) return false;

    const user = await prisma.user.findFirst({
      where: { kickUsername: { equals: normalizedUsername, mode: 'insensitive' } },
      select: { id: true },
    });

    await prisma.viewerPickerEntry.create({
      data: { pickerId: picker.id, kickUsername: normalizedUsername, userId: user?.id ?? null },
    });

    const updated = await prisma.viewerPicker.findUnique({ where: { id: picker.id }, include: INCLUDE });
    const response = toPickerResponse(updated!);
    io?.to(`picker:${picker.id}`).emit('picker:updated', response);
    io?.emit('picker:updated', response);

    logger.info(`ViewerPicker ${picker.id}: ${kickUsername} entered via keyword${user ? '' : ' (unlinked)'}`);
    return true;
  }
}
