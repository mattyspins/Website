"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seeding...');
    // Create admin user
    const adminUser = await prisma.user.upsert({
        where: { discordId: '123456789012345678' },
        update: {},
        create: {
            discordId: '123456789012345678',
            displayName: 'MattySpins Admin',
            avatarUrl: 'https://cdn.discordapp.com/avatars/123456789012345678/avatar.png',
            points: 10000,
            totalEarned: 10000,
            isAdmin: true,
        },
    });
    console.log('✅ Created admin user:', adminUser.displayName);
    // Create test users
    const testUsers = [
        {
            discordId: '234567890123456789',
            displayName: 'TestUser1',
            points: 5000,
            totalEarned: 7500,
            totalSpent: 2500,
        },
        {
            discordId: '345678901234567890',
            displayName: 'TestUser2',
            kickUsername: 'testuser2_kick',
            points: 3000,
            totalEarned: 4000,
            totalSpent: 1000,
        },
        {
            discordId: '456789012345678901',
            displayName: 'TestUser3',
            points: 1500,
            totalEarned: 2000,
            totalSpent: 500,
        },
    ];
    for (const userData of testUsers) {
        const user = await prisma.user.upsert({
            where: { discordId: userData.discordId },
            update: {},
            create: userData,
        });
        console.log('✅ Created test user:', user.displayName);
    }
    // Create user statistics for test users
    const users = await prisma.user.findMany();
    for (const user of users) {
        if (!user.isAdmin) {
            await prisma.userStatistics.upsert({
                where: { userId: user.id },
                update: {},
                create: {
                    userId: user.id,
                    totalViewingTime: Math.floor(Math.random() * 1000) + 100,
                    totalPurchases: Math.floor(Math.random() * 10),
                    totalRaffleTickets: Math.floor(Math.random() * 50),
                    totalWins: Math.floor(Math.random() * 5),
                    currentStreak: Math.floor(Math.random() * 10),
                    longestStreak: Math.floor(Math.random() * 20) + 5,
                },
            });
        }
    }
    console.log('✅ Created user statistics');
    // Create store items
    const storeItems = [
        {
            name: 'Bonus Buy - $10',
            description: 'Get a $10 bonus buy for your next session',
            price: 1000,
            category: 'bonus_buys',
            stock: -1, // unlimited
            deliveryType: 'manual',
        },
        {
            name: 'Bonus Buy - $25',
            description: 'Get a $25 bonus buy for your next session',
            price: 2500,
            category: 'bonus_buys',
            stock: -1,
            deliveryType: 'manual',
        },
        {
            name: 'Cash Reward - $5',
            description: 'Receive $5 cash reward',
            price: 500,
            category: 'cash_rewards',
            stock: 10,
            deliveryType: 'manual',
        },
        {
            name: 'Premium Chat Badge',
            description: 'Get a premium badge in chat for 30 days',
            price: 750,
            category: 'premium_features',
            stock: -1,
            deliveryType: 'instant',
        },
        {
            name: 'Raffle Ticket Bundle (5x)',
            description: 'Get 5 raffle tickets for upcoming raffles',
            price: 250,
            category: 'raffle_tickets',
            stock: -1,
            deliveryType: 'instant',
        },
    ];
    for (const itemData of storeItems) {
        const item = await prisma.storeItem.upsert({
            where: { id: itemData.name }, // Using name as unique identifier for seeding
            update: {},
            create: itemData,
        });
        console.log('✅ Created store item:', item.name);
    }
    // Create sample raffles
    const sampleRaffles = [
        {
            title: 'Weekly Cash Giveaway',
            description: 'Win $100 cash prize!',
            prize: '$100 Cash',
            ticketPrice: 100,
            maxTickets: 100,
            category: 'cash',
            isFeatured: true,
            endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            createdBy: adminUser.id,
        },
        {
            title: 'Bonus Hunt Bankroll',
            description: 'Win a $500 bankroll for your next bonus hunt session',
            prize: '$500 Bonus Hunt Bankroll',
            ticketPrice: 200,
            maxTickets: 50,
            category: 'bankroll',
            isFeatured: false,
            endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
            createdBy: adminUser.id,
        },
    ];
    for (const raffleData of sampleRaffles) {
        const raffle = await prisma.raffle.create({
            data: raffleData,
        });
        console.log('✅ Created raffle:', raffle.title);
    }
    // Create system configuration
    const systemConfigs = [
        {
            key: 'points_per_minute_viewing',
            value: 1,
            description: 'Points earned per minute of viewing time',
        },
        {
            key: 'bonus_points_multiplier',
            value: 1.5,
            description: 'Multiplier for bonus point events',
        },
        {
            key: 'max_daily_points',
            value: 1000,
            description: 'Maximum points a user can earn per day',
        },
        {
            key: 'leaderboard_reset_time',
            value: '00:00',
            description: 'Time when daily leaderboard resets (UTC)',
        },
        {
            key: 'maintenance_mode',
            value: false,
            description: 'Enable maintenance mode',
        },
    ];
    for (const configData of systemConfigs) {
        await prisma.systemConfig.upsert({
            where: { key: configData.key },
            update: { value: configData.value },
            create: {
                key: configData.key,
                value: configData.value,
                description: configData.description,
                updatedBy: adminUser.id,
            },
        });
        console.log('✅ Created system config:', configData.key);
    }
    // Create sample point transactions
    const nonAdminUsers = users.filter(user => !user.isAdmin);
    for (const user of nonAdminUsers) {
        // Create some viewing time transactions
        await prisma.pointTransaction.create({
            data: {
                userId: user.id,
                amount: 120,
                transactionType: 'earned',
                reason: 'Viewing time reward',
                referenceType: 'viewing_time',
            },
        });
        // Create some purchase transactions
        await prisma.pointTransaction.create({
            data: {
                userId: user.id,
                amount: -500,
                transactionType: 'spent',
                reason: 'Store purchase',
                referenceType: 'purchase',
            },
        });
    }
    console.log('✅ Created sample point transactions');
    // Create leaderboard entries for current period
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < nonAdminUsers.length; i++) {
        const user = nonAdminUsers[i];
        await prisma.leaderboardEntry.create({
            data: {
                userId: user.id,
                periodType: 'daily',
                periodStart: today,
                scoreType: 'points',
                score: user.points,
                rank: i + 1,
            },
        });
    }
    console.log('✅ Created leaderboard entries');
    console.log('🎉 Database seeding completed successfully!');
}
main()
    .catch(e => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map