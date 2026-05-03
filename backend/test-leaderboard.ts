/**
 * Simple test script for Manual Leaderboard API
 * Run with: npx ts-node test-leaderboard.ts
 */

import { LeaderboardService } from './src/services/LeaderboardService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLeaderboardService() {
  console.log('🧪 Testing Manual Leaderboard Service\n');

  try {
    // Test 1: Create a leaderboard
    console.log('Test 1: Creating a leaderboard...');
    const leaderboard = await LeaderboardService.createLeaderboard({
      title: 'Test Weekly Challenge',
      description: 'Test leaderboard for API validation',
      prizePool: '$500',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-05-08'),
      prizes: [
        { position: 1, prizeAmount: '$250', prizeDescription: 'First Place' },
        { position: 2, prizeAmount: '$150', prizeDescription: 'Second Place' },
        { position: 3, prizeAmount: '$100', prizeDescription: 'Third Place' },
      ],
    });
    console.log('✅ Leaderboard created:', leaderboard.id);
    console.log('   Title:', leaderboard.title);
    console.log('   Prize Pool:', leaderboard.prizePool);
    console.log('   Status:', leaderboard.status);
    console.log();

    // Test 2: Get leaderboard details
    console.log('Test 2: Fetching leaderboard details...');
    const details = await LeaderboardService.getLeaderboardById(leaderboard.id);
    console.log('✅ Leaderboard details fetched');
    console.log('   Prizes:', details?.prizes.length);
    console.log('   Wagers:', details?.wagers.length);
    console.log();

    // Test 3: Find a test user
    console.log('Test 3: Finding test user...');
    const testUser = await prisma.user.findFirst({
      where: { isAdmin: false },
    });

    if (!testUser) {
      console.log('⚠️  No test user found, skipping wager tests');
      return;
    }
    console.log('✅ Test user found:', testUser.displayName);
    console.log();

    // Test 4: Add wagers
    console.log('Test 4: Adding wagers...');
    const adminUser = await prisma.user.findFirst({
      where: { isAdmin: true },
    });

    if (!adminUser) {
      console.log('⚠️  No admin user found, skipping wager tests');
      return;
    }

    const wager1 = await LeaderboardService.addWager(leaderboard.id, {
      userId: testUser.id,
      amount: 1500.5,
      notes: 'Big win on slots',
      verifiedBy: adminUser.id,
    });
    console.log('✅ Wager 1 added:', wager1.wagerAmount.toString());

    const wager2 = await LeaderboardService.addWager(leaderboard.id, {
      userId: testUser.id,
      amount: 750.25,
      notes: 'Another win',
      verifiedBy: adminUser.id,
    });
    console.log('✅ Wager 2 added:', wager2.wagerAmount.toString());
    console.log();

    // Test 5: Get rankings
    console.log('Test 5: Calculating rankings...');
    const rankings = await LeaderboardService.getRankings(leaderboard.id);
    console.log('✅ Rankings calculated');
    console.log('   Total participants:', rankings.length);
    if (rankings.length > 0) {
      console.log('   Top player:', rankings[0].username);
      console.log('   Total wagers:', rankings[0].totalWagers);
      console.log('   Wager count:', rankings[0].wagerCount);
      console.log('   Prize:', rankings[0].prize || 'N/A');
    }
    console.log();

    // Test 6: Get user total
    console.log('Test 6: Getting user total wagers...');
    const userTotal = await LeaderboardService.getUserTotalWagers(
      leaderboard.id,
      testUser.id
    );
    console.log('✅ User total wagers:', userTotal);
    console.log();

    // Test 7: Export data
    console.log('Test 7: Exporting leaderboard data...');
    const exportData = await LeaderboardService.exportLeaderboardData(
      leaderboard.id
    );
    console.log('✅ Export data generated');
    console.log(
      '   Total participants:',
      exportData.metadata.totalParticipants
    );
    console.log('   Total wagers:', exportData.metadata.totalWagers);
    console.log(
      '   Average wager:',
      exportData.metadata.averageWager.toFixed(2)
    );
    console.log();

    // Test 8: Update prizes
    console.log('Test 8: Updating prize distribution...');
    await LeaderboardService.updatePrizeDistribution(leaderboard.id, [
      {
        position: 1,
        prizeAmount: '$300',
        prizeDescription: 'Updated First Place',
      },
      {
        position: 2,
        prizeAmount: '$200',
        prizeDescription: 'Updated Second Place',
      },
    ]);
    console.log('✅ Prize distribution updated');
    console.log();

    // Test 9: Get all leaderboards
    console.log('Test 9: Getting all active leaderboards...');
    const allLeaderboards = await LeaderboardService.getLeaderboards(
      'active',
      10
    );
    console.log('✅ Active leaderboards:', allLeaderboards.length);
    console.log();

    // Test 10: Expire leaderboards (won't expire our test one since it's in the future)
    console.log('Test 10: Checking for expired leaderboards...');
    const expiredCount = await LeaderboardService.expireLeaderboards();
    console.log('✅ Expired leaderboards:', expiredCount);
    console.log();

    console.log('🎉 All tests passed!\n');
    console.log('Test leaderboard ID:', leaderboard.id);
    console.log(
      'You can use this ID to test the API endpoints in test-leaderboard-api.http'
    );
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testLeaderboardService()
  .then(() => {
    console.log('\n✅ Test script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
