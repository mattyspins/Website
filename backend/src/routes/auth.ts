import { Router } from 'express';
import { AuthController } from '@/controllers/AuthController';
import { authMiddleware, optionalAuthMiddleware } from '@/middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 refresh requests per windowMs
  message: {
    error: 'Too many token refresh attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.get(
  '/discord/initiate',
  authLimiter,
  AuthController.initiateDiscordAuth
);
router.get(
  '/discord/callback',
  authLimiter,
  AuthController.handleDiscordCallback
);
router.post('/refresh', refreshLimiter, AuthController.refreshToken);
router.get('/status', optionalAuthMiddleware, AuthController.getAuthStatus);

// Protected routes
router.post(
  '/kick/verify',
  authMiddleware,
  AuthController.initiateKickVerification
);
router.get('/me', authMiddleware, AuthController.getCurrentUser);
router.post('/logout', authMiddleware, AuthController.logout);
router.get('/validate', authMiddleware, AuthController.validateToken);

export default router;
