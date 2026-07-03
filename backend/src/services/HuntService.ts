import { prisma } from '@/config/database';
import { Prisma } from '@prisma/client';

export interface HuntInput {
  name: string;
  date: string;
  currency: string;
  startCost: number;
  bonuses: Prisma.InputJsonValue;
  isStarted: boolean;
  isCompleted?: boolean;
  gtbGameId?: string | null;
  createdAt: string;
}

export class HuntService {
  static async listAll() {
    return prisma.hunt.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  static async get(id: string) {
    return prisma.hunt.findUnique({ where: { id } });
  }

  static async upsert(id: string, data: HuntInput) {
    const { createdAt, ...rest } = data;
    return prisma.hunt.upsert({
      where: { id },
      create: { id, ...rest, createdAt: new Date(createdAt) },
      update: { ...rest },
    });
  }

  static async remove(id: string) {
    await prisma.hunt.delete({ where: { id } }).catch(() => {});
  }
}
