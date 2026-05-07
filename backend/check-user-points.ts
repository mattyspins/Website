import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPoints() {
  const user1 = await prisma.user.findUnique({
    where: { id: 'test-user-id' },
  });

  const user2 = await prisma.user.findUnique({
    where: { id: '23e6d510-da72-4a93-b8dc-572899f45682' },
  });

  console.log('\nUser 1 (Test User) points:', user1?.points);
  console.log('User 2 (Test User 2) points:', user2?.points);
  console.log('\n');

  await prisma.$disconnect();
}

checkPoints();
