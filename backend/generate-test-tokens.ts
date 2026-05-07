import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Generate admin token
const adminPayload = {
  id: 'test-admin-id',
  discordId: '1435983820968169482', // From ADMIN_DISCORD_IDS
  isAdmin: true,
  isModerator: false,
};

const adminToken = jwt.sign(adminPayload, JWT_SECRET, { expiresIn: '24h' });

// Generate regular user token
const userPayload = {
  id: 'test-user-id',
  discordId: 'test-user-discord-id',
  isAdmin: false,
  isModerator: false,
};

const userToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });

console.log('\n=== Test Tokens Generated ===\n');
console.log('Admin Token:');
console.log(adminToken);
console.log('\n');
console.log('User Token:');
console.log(userToken);
console.log('\n');
console.log('Copy these tokens to test-guess-the-balance.http file');
console.log('Replace @adminToken and @userToken variables\n');
