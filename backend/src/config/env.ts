import Joi from 'joi';

export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;

  // Database
  DATABASE_URL: string;
  REDIS_URL: string;

  // JWT
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;

  // Discord
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_REDIRECT_URI: string;
  DISCORD_BOT_TOKEN: string;

  // Kick
  KICK_API_BASE_URL: string;
  KICK_CLIENT_ID: string;
  KICK_CLIENT_SECRET: string;
  KICK_CHANNEL_NAME: string;

  // Server
  CORS_ORIGIN: string;

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // Points
  POINTS_PER_MINUTE_VIEWING: number;
  BONUS_POINTS_MULTIPLIER: number;

  // Admin
  ADMIN_DISCORD_IDS: string[];

  // Security
  BCRYPT_ROUNDS: number;
  SESSION_SECRET: string;

  // Logging
  LOG_LEVEL: string;
  LOG_FILE: string;
}

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),

  // Database
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Discord
  DISCORD_CLIENT_ID: Joi.string().required(),
  DISCORD_CLIENT_SECRET: Joi.string().required(),
  DISCORD_REDIRECT_URI: Joi.string().uri().required(),
  DISCORD_BOT_TOKEN: Joi.string().required(),

  // Kick
  KICK_API_BASE_URL: Joi.string().uri().default('https://kick.com/api/v2'),
  KICK_CLIENT_ID: Joi.string().required(),
  KICK_CLIENT_SECRET: Joi.string().required(),
  KICK_CHANNEL_NAME: Joi.string().default('mattyspins'),

  // Server
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

  // Points
  POINTS_PER_MINUTE_VIEWING: Joi.number().default(1),
  BONUS_POINTS_MULTIPLIER: Joi.number().default(1.5),

  // Admin
  ADMIN_DISCORD_IDS: Joi.string().default(''),

  // Security
  BCRYPT_ROUNDS: Joi.number().default(12),
  SESSION_SECRET: Joi.string().min(32).required(),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  LOG_FILE: Joi.string().default('logs/app.log'),
});

export function validateEnv(): EnvConfig {
  const { error, value } = envSchema.validate(process.env, {
    allowUnknown: true,
    stripUnknown: true,
  });

  if (error) {
    throw new Error(`Environment validation error: ${error.message}`);
  }

  // Parse admin Discord IDs
  const adminIds = value.ADMIN_DISCORD_IDS
    ? value.ADMIN_DISCORD_IDS.split(',')
        .map((id: string) => id.trim())
        .filter(Boolean)
    : [];

  return {
    ...value,
    ADMIN_DISCORD_IDS: adminIds,
  } as EnvConfig;
}
