import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateJwt);

// Search users by username
router.get('/search', UserController.searchUsers);

// Get user profile / public key
router.get('/:uid', UserController.getUserProfile);

// Block management
router.post('/block', UserController.blockUser);
router.delete('/block/:targetUid', UserController.unblockUser);
router.get('/blocked', UserController.getBlockedUsers);

export default router;
