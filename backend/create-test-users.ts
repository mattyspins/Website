import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    // Create admin user
    const admin = await prisma.user.upsert({
      where: { id: 'test-admin-id' },
      update: {},
      create: {
        id: 'test-admin-id',
        discordId: '1435983820968169482',
        displayName: 'Test Admin',
        avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
        points: 10000,
        isAdmin: true,
        isModerator: false,
      },
    });

    console.log('✅ Admin user created:', admin);

    // Create regular user
    const user = await prisma.user.upsert({
      where: { id: 'test-user-id' },
      update: {},
      create: {
        id: 'test-user-id',
        discordId: 'test-user-discord-id',
        displayName: 'Test User',
        avatarUrl: 'https://cdn.discordapp.com/embed/avatars/1.png',
        points: 1000,
        isAdmin: false,
        isModerator: false,
      },
    });

    console.log('✅ Regular user created:', user);

    // Create second test user for multiple guesses
    const user2 = await prisma.user.upsert({
      where: { discordId: 'test-user-2-discord-id' },
      update: {},
      create: {
        discordId: 'test-user-2-discord-id',
        displayName: 'Test User 2',
        avatarUrl: 'https://cdn.discordapp.com/embed/avatars/2.png',
        points: 500,
        isAdmin: false,
        isModerator: false,
      },
    });

    console.log('✅ Second test user created:', user2);

    console.log('\n✅ All test users created successfully!');
  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();
