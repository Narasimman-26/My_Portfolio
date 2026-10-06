import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authLimiter } from '../middlewares/rateLimiter';
import { authenticateJwt } from '../middlewares/auth.middleware';

const router = Router();

// Exchange Firebase ID Token for backend JWT
router.post('/token', authLimiter, AuthController.exchangeFirebaseToken);

// Refresh expired access token
router.post('/refresh', authLimiter, AuthController.refreshToken);

// Get current user profile
router.get('/me', authenticateJwt, AuthController.getMe);

export default router;
