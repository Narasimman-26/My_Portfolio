import { Router } from 'express';
import { AiController } from '../controllers/ai.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { sensitivityLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Consented Deep AI check (JWT authenticated + rate limited)
router.post('/check-sensitivity', authenticateJwt, sensitivityLimiter, AiController.checkSensitivity);

export default router;
