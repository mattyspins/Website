"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const database_1 = require("@/config/database");
const redis_1 = require("@/config/redis");
// Setup test environment
(0, globals_1.beforeAll)(async () => {
    // Connect to test database
    await database_1.prisma.$connect();
    // Connect to test Redis
    await redis_1.redis.connect();
});
// Cleanup after each test
(0, globals_1.beforeEach)(async () => {
    // Clear Redis cache
    await redis_1.redis.flushdb();
    // Clean up database tables in correct order (respecting foreign keys)
    const tablenames = await database_1.prisma.$queryRaw `
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;
    for (const { tablename } of tablenames) {
        if (tablename !== '_prisma_migrations') {
            await database_1.prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
        }
    }
});
// Cleanup after all tests
(0, globals_1.afterAll)(async () => {
    await database_1.prisma.$disconnect();
    await redis_1.redis.quit();
});
// Test utilities
global.testUtils = {
    createTestUser: async (overrides = {}) => {
        return await database_1.prisma.user.create({
            data: {
                discordId: '123456789012345678',
                displayName: 'Test User',
                points: 1000,
                ...overrides,
            },
        });
    },
    createTestAdmin: async (overrides = {}) => {
        return await database_1.prisma.user.create({
            data: {
                discordId: '987654321098765432',
                displayName: 'Test Admin',
                points: 5000,
                isAdmin: true,
                ...overrides,
            },
        });
    },
    generateJWT: (payload) => {
        const jwt = require('jsonwebtoken');
        return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
            expiresIn: '1h',
        });
    },
};
//# sourceMappingURL=setup.js.map