import { prisma } from '@/config/database';
import { RedisService } from '@/config/redis';
import { Server as SocketIOServer } from 'socket.io';
import { SlotRequestStatus } from '@prisma/client';
import { logger } from '@/utils/logger';
import { KickChatService } from '@/services/KickChatService';

const OPEN_KEY = 'slot_requests:open';
const CD_KEY = (u: string) => `slot_req_cd:${u.toLowerCase()}`;
const COOLDOWN_SECONDS = 35;

const INCLUDE = {
  user: { select: { id: true, displayName: true, kickUsername: true, avatarUrl: true } },
};

export class SlotRequestService {
  static async isOpen(): Promise<boolean> {
    return !!(await RedisService.get(OPEN_KEY));
  }

  static async open(io?: SocketIOServer): Promise<void> {
    await RedisService.set(OPEN_KEY, '1');
    io?.emit('slot_request:status', { open: true });
    await KickChatService.sendChatMessage(
      '🎰 Slot requests are now OPEN! Type !sr <slot name> to request a slot for the hunt!'
    );
    logger.info('SlotRequestService: requests opened');
  }

  static async close(io?: SocketIOServer): Promise<void> {
    await RedisService.del(OPEN_KEY);
    io?.emit('slot_request:status', { open: false });
    await KickChatService.sendChatMessage('🔒 Slot requests are now CLOSED. Thanks for your requests!');
    logger.info('SlotRequestService: requests closed');
  }

  // Called from KickChatService when !sr <slot name> is detected in chat
  static async handleChatRequest(
    kickUsername: string,
    slotName: string,
    io?: SocketIOServer
  ): Promise<void> {
    if (!(await this.isOpen())) {
      await KickChatService.sendChatMessage(
        `@${kickUsername} Slot requests are currently closed. Stay tuned!`
      );
      return;
    }

    const cdKey = CD_KEY(kickUsername);
    const onCooldown = await RedisService.get(cdKey);
    if (onCooldown) {
      // Don't spam the channel — silent ignore when on cooldown
      return;
    }

    const trimmed = slotName.trim();
    if (!trimmed || trimmed.length > 100) return;

    // Try to resolve to a registered user (optional — not required)
    const user = await prisma.user.findFirst({
      where: { kickUsername: { equals: kickUsername, mode: 'insensitive' } },
      select: { id: true },
    });

    const request = await prisma.slotRequest.create({
      data: {
        slotName: trimmed,
        kickUsername,
        userId: user?.id ?? null,
        status: SlotRequestStatus.PENDING,
      },
      include: INCLUDE,
    });

    // Set cooldown
    await RedisService.set(cdKey, '1', COOLDOWN_SECONDS);

    io?.emit('slot_request:new', request);
    await KickChatService.sendChatMessage(
      `✅ @${kickUsername} your request for "${trimmed}" has been received!`
    );
    logger.info(`SlotRequestService: ${kickUsername} requested "${trimmed}"`);
  }

  static async getAll(limit = 100) {
    return prisma.slotRequest.findMany({
      include: INCLUDE,
      orderBy: { requestedAt: 'desc' },
      take: limit,
    });
  }

  static async getPending() {
    return prisma.slotRequest.findMany({
      where: { status: SlotRequestStatus.PENDING },
      include: INCLUDE,
      orderBy: { requestedAt: 'asc' },
    });
  }

  static async markAdded(id: string, io?: SocketIOServer) {
    const updated = await prisma.slotRequest.update({
      where: { id },
      data: { status: SlotRequestStatus.ADDED },
      include: INCLUDE,
    });
    io?.emit('slot_request:updated', updated);
    return updated;
  }

  static async markRejected(id: string, io?: SocketIOServer) {
    const updated = await prisma.slotRequest.update({
      where: { id },
      data: { status: SlotRequestStatus.REJECTED },
      include: INCLUDE,
    });
    io?.emit('slot_request:updated', updated);
    return updated;
  }

  static async delete(id: string) {
    await prisma.slotRequest.delete({ where: { id } });
  }

  static async clearPending(io?: SocketIOServer) {
    await prisma.slotRequest.deleteMany({ where: { status: SlotRequestStatus.PENDING } });
    io?.emit('slot_request:cleared');
    logger.info('SlotRequestService: all pending requests cleared');
  }
}
