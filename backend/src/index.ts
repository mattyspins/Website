import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { notFoundHandler } from '@/middleware/notFoundHandler';
import { authMiddleware } from '@/middleware/auth';
import { validateEnv } from '@/config/env';
import { LeaderboardExpirationJob } from '@/jobs/leaderboardExpiration';
import { KickChatService } from '@/services/KickChatService';

// Load environment variables
dotenv.config();

// Validate environment variables
const env = validateEnv();

const app = express();
const server = createServer(app);

// Socket.IO setup
// Support multiple origins for Socket.IO (with and without www)
const socketCorsOrigins = env.CORS_ORIGIN.split(',').map(origin =>
  origin.trim()
);
const io = new SocketIOServer(server, {
  cors: {
    origin: socketCorsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
// Support multiple origins (with and without www)
const corsOrigins = env.CORS_ORIGIN.split(',').map(origin => origin.trim());
logger.info(`CORS Origins configured: ${corsOrigins.join(', ')}`);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (corsOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Compression middleware
app.use(compression());

// Request logging
app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      },
    },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing middleware
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  });
});

// API routes
import authRoutes from '@/routes/auth';
import leaderboardRoutes from '@/routes/leaderboard';
import manualLeaderboardRoutes from '@/routes/manualLeaderboard';
import adminRoutes from '@/routes/admin';
import moderatorRoutes from '@/routes/moderator';
import scheduleRoutes from '@/routes/schedule';
import guessTheBalanceRoutes from '@/routes/guessTheBalance';
import storeRoutes from '@/routes/store';
import notificationRoutes from '@/routes/notifications';
import milestoneRoutes from '@/routes/milestones';
import streamEventRoutes from '@/routes/streamEvents';
import checkinRoutes from '@/routes/checkin';
import publicProfileRoutes from '@/routes/publicProfile';
import raffleRoutes from '@/routes/raffles';
// Commented out until Kick OAuth is implemented
// import viewingRoutes from '@/routes/viewing';
// import bonusHuntRoutes from '@/routes/bonusHunt';

app.use('/api/auth', authRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/manual-leaderboards', manualLeaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/moderator', moderatorRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/guess-the-balance', guessTheBalanceRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/stream-events', streamEventRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/users', publicProfileRoutes);
app.use('/api/raffles', raffleRoutes);
// Commented out until Kick OAuth is implemented
// app.use('/api/viewing', viewingRoutes);
// app.use('/api/bonus-hunt', bonusHuntRoutes);

// Socket.IO connection handling
io.on('connection', socket => {
  logger.info(`Client connected: ${socket.id}`);

  // Join leaderboard room
  socket.on('joinLeaderboard', (leaderboardId: string) => {
    socket.join(`leaderboard:${leaderboardId}`);
    logger.info(
      `Socket ${socket.id} joined leaderboard room: ${leaderboardId}`
    );
  });

  // Leave leaderboard room
  socket.on('leaveLeaderboard', (leaderboardId: string) => {
    socket.leave(`leaderboard:${leaderboardId}`);
    logger.info(`Socket ${socket.id} left leaderboard room: ${leaderboardId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });

  // Authentication for socket connections
  socket.on('authenticate', async (token: string) => {
    try {
      // TODO: Implement socket authentication
      logger.info(`Socket authentication attempt: ${socket.id}`);
    } catch (error) {
      logger.error('Socket authentication failed:', error);
      socket.disconnect();
    }
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  LeaderboardExpirationJob.stop();
  KickChatService.stop();
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  LeaderboardExpirationJob.stop();
  KickChatService.stop();
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start server
const PORT = parseInt(process.env.PORT || String(env.PORT || 3001), 10);
const HOST = '0.0.0.0'; // Listen on all network interfaces for Railway
server.listen(PORT, HOST, () => {
  logger.info(`🚀 Server running on ${HOST}:${PORT} in ${env.NODE_ENV} mode`);
  logger.info(`📊 Health check available at http://${HOST}:${PORT}/health`);
  logger.info(`🌍 Environment PORT: ${process.env.PORT}`);

  // Start background jobs
  LeaderboardExpirationJob.start();
  logger.info('✅ Background jobs started');

  // Start Kick chat listener (verification + chat points)
  KickChatService.start().catch((err) =>
    logger.error('KickChatService failed to start', { error: (err as Error).message })
  );
});

export { app, server, io };
