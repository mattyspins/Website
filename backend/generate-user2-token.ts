import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Generate user 2 token
const user2Payload = {
  id: '23e6d510-da72-4a93-b8dc-572899f45682', // From create-test-users output
  discordId: 'test-user-2-discord-id',
  isAdmin: false,
  isModerator: false,
};

const user2Token = jwt.sign(user2Payload, JWT_SECRET, { expiresIn: '24h' });

console.log('\nUser 2 Token:');
console.log(user2Token);
console.log('\n');
