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
router.get('/kick/initiate', authMiddleware, authLimiter, AuthController.initiateKickAuth);
// Kick callback is PUBLIC — user identity resolved via Redis state
router.get('/kick/callback', authLimiter, AuthController.handleKickCallback);
router.delete('/kick/unlink', authMiddleware, AuthController.unlinkKickAccount);
router.get('/kick/status', authMiddleware, AuthController.getKickStatus);

router.get('/me', authMiddleware, AuthController.getCurrentUser);
router.post('/logout', authMiddleware, AuthController.logout);
router.get('/validate', authMiddleware, AuthController.validateToken);
router.post(
  '/kick-username',
  authMiddleware,
  AuthController.submitKickUsername
);
router.post(
  '/rainbet-username',
  authMiddleware,
  AuthController.submitRainbetUsername
);
// Kick chat-based verification
router.post('/kick-verify/initiate', authLimiter, authMiddleware, AuthController.initiateKickChatVerify);
router.get('/kick-verify/status', authMiddleware, AuthController.checkKickVerifyStatus);

export default router;
