import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupTestData() {
  try {
    console.log('🧹 Cleaning up Guess the Balance test data...\n');

    // Delete all guess submissions
    const deletedGuesses = await prisma.guessSubmission.deleteMany({});
    console.log(`✅ Deleted ${deletedGuesses.count} guess submissions`);

    // Delete all games
    const deletedGames = await prisma.guessTheBalance.deleteMany({});
    console.log(`✅ Deleted ${deletedGames.count} games`);

    console.log('\n✨ Cleanup complete! Database is ready for production.');
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTestData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
