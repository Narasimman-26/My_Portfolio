import { Request, Response } from 'express';
import { z } from 'zod';
import { firebaseAuth, firestore, isFirebaseConfigured } from '../config/firebase';
import { JwtService } from '../services/jwt.service';
import { UserProfile } from '@securechat/shared';

const exchangeTokenSchema = z.object({
  idToken: z.string().min(10),
  username: z.string().min(3).max(30).optional(),
  displayName: z.string().min(1).max(50).optional(),
  publicKey: z.string().min(20).optional(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10),
});

export class AuthController {
  /**
   * Exchanges a Firebase ID Token for backend JWT tokens.
   * Creates or updates the user profile in Firestore.
   */
  static async exchangeFirebaseToken(req: Request, res: Response): Promise<void> {
    const parseResult = exchangeTokenSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, error: parseResult.error.errors[0].message });
      return;
    }

    const { idToken, username, displayName, publicKey } = parseResult.data;

    try {
      let uid: string;
      let email: string;

      // Verify ID token via Firebase Admin if configured, else support dev mode
      if (isFirebaseConfigured() && process.env.FIREBASE_PRIVATE_KEY) {
        const decoded = await firebaseAuth.verifyIdToken(idToken);
        uid = decoded.uid;
        email = decoded.email || `${uid}@securechat.app`;
      } else {
        // Fallback for dev / mock testing: decode base64 or treat idToken as mock
        try {
          const parts = idToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            uid = payload.user_id || payload.sub || payload.uid || 'dev-user-id';
            email = payload.email || 'dev@securechat.app';
          } else {
            uid = idToken;
            email = `${uid}@securechat.app`;
          }
        } catch {
          uid = idToken;
          email = `${uid}@securechat.app`;
        }
      }

      // Check or create user profile in Firestore
      const userRef = firestore.collection('users').doc(uid);
      const userDoc = await userRef.get().catch(() => null);

      let existingData = userDoc && userDoc.exists ? (userDoc.data() as UserProfile) : null;
      const effectiveUsername = username || existingData?.username || email.split('@')[0];
      const effectiveDisplayName = displayName || existingData?.displayName || effectiveUsername;

      if (!existingData) {
        const newProfile: Partial<UserProfile> = {
          uid,
          email,
          username: effectiveUsername.toLowerCase(),
          displayName: effectiveDisplayName,
          publicKey: publicKey || '',
          createdAt: Date.now(),
          lastSeen: Date.now(),
          isOnline: true,
        };
        await userRef.set(newProfile, { merge: true }).catch(() => {});
      } else if (publicKey && publicKey !== existingData.publicKey) {
        await userRef.update({ publicKey, lastSeen: Date.now(), isOnline: true }).catch(() => {});
      }

      const tokens = JwtService.generateTokens({
        uid,
        email,
        username: effectiveUsername,
      });

      res.status(200).json({
        success: true,
        data: {
          user: {
            uid,
            email,
            username: effectiveUsername,
            displayName: effectiveDisplayName,
          },
          tokens,
        },
      });
    } catch (error) {
      console.error('Error exchanging auth token:', error instanceof Error ? error.message : error);
      res.status(401).json({
        success: false,
        error: 'Authentication failed: Invalid identity token',
      });
    }
  }

  /**
   * Refreshes an expired access token using a valid refresh token.
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    const parseResult = refreshTokenSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, error: 'Invalid refresh token payload' });
      return;
    }

    const { refreshToken } = parseResult.data;

    try {
      const payload = JwtService.verifyRefreshToken(refreshToken);
      const tokens = JwtService.generateTokens({
        uid: payload.uid,
        email: payload.email,
        username: payload.username,
      });

      res.status(200).json({
        success: true,
        data: { tokens },
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
    }
  }

  /**
   * Returns authenticated user profile.
   */
  static async getMe(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    try {
      const userDoc = await firestore.collection('users').doc(req.user.uid).get();
      if (!userDoc.exists) {
        res.status(404).json({ success: false, error: 'User profile not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: userDoc.data(),
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to retrieve profile' });
    }
  }
}
