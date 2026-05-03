import { beforeAll, afterAll, beforeEach } from '@jest/globals';
import { prisma } from '@/config/database';
import { redis } from '@/config/redis';

// Setup test environment
beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();

  // Connect to test Redis
  await redis.connect();
});

// Cleanup after each test
beforeEach(async () => {
  // Clear Redis cache
  await redis.flushdb();

  // Clean up database tables in correct order (respecting foreign keys)
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "public"."${tablename}" CASCADE;`
      );
    }
  }
});

// Cleanup after all tests
afterAll(async () => {
  await prisma.$disconnect();
  await redis.quit();
});

// Global test utilities
declare global {
  // eslint-disable-next-line no-var
  var testUtils: {
    createTestUser: (overrides?: Partial<any>) => Promise<any>;
    createTestAdmin: (overrides?: Partial<any>) => Promise<any>;
    generateJWT: (payload: any) => string;
  };
}

// Test utilities
global.testUtils = {
  createTestUser: async (overrides = {}) => {
    return await prisma.user.create({
      data: {
        discordId: '123456789012345678',
        displayName: 'Test User',
        points: 1000,
        ...overrides,
      },
    });
  },

  createTestAdmin: async (overrides = {}) => {
    return await prisma.user.create({
      data: {
        discordId: '987654321098765432',
        displayName: 'Test Admin',
        points: 5000,
        isAdmin: true,
        ...overrides,
      },
    });
  },

  generateJWT: (payload: any) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(payload, process.env['JWT_SECRET'] || 'test-secret', {
      expiresIn: '1h',
    });
  },
};
