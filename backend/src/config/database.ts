import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Prevent multiple instances of Prisma Client in development
const prisma =
  globalThis.__prisma ||
  new PrismaClient({
    log: ['query', 'error', 'info', 'warn'],
  });

// Log database queries in development
if (process.env['NODE_ENV'] === 'development') {
  // Enable query logging for development
  logger.debug('Database query logging enabled');
}

if (process.env['NODE_ENV'] === 'development') {
  globalThis.__prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  logger.info('Disconnecting from database...');
  await prisma.$disconnect();
});

export { prisma };
export default prisma;
