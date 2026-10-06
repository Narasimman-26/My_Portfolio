import { Request, Response } from 'express';
import { firestore } from '../config/firebase';
import { UserProfile } from '@securechat/shared';

export class UserController {
  /**
   * Search users by username query prefix.
   */
  static async searchUsers(req: Request, res: Response): Promise<void> {
    const query = (req.query.q as string || '').toLowerCase().trim();
    const currentUid = req.user?.uid;

    if (!query || query.length < 2) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    try {
      // Query users collection where username >= query and <= query + '\uf8ff'
      const snapshot = await firestore
        .collection('users')
        .where('username', '>=', query)
        .where('username', '<=', query + '\uf8ff')
        .limit(20)
        .get();

      const users: Partial<UserProfile>[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data() as UserProfile;
        // Don't include self
        if (data.uid !== currentUid) {
          users.push({
            uid: data.uid,
            username: data.username,
            displayName: data.displayName,
            publicKey: data.publicKey,
            avatarUrl: data.avatarUrl,
            isOnline: data.isOnline,
            lastSeen: data.lastSeen,
          });
        }
      });

      res.status(200).json({ success: true, data: users });
    } catch (error) {
      console.error('User search error:', error instanceof Error ? error.message : error);
      res.status(500).json({ success: false, error: 'Failed to search users' });
    }
  }

  /**
   * Get user public details (especially X25519 public key for key exchange).
   */
  static async getUserProfile(req: Request, res: Response): Promise<void> {
    const { uid } = req.params;

    try {
      const doc = await firestore.collection('users').doc(uid).get();
      if (!doc.exists) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const data = doc.data() as UserProfile;
      res.status(200).json({
        success: true,
        data: {
          uid: data.uid,
          username: data.username,
          displayName: data.displayName,
          publicKey: data.publicKey,
          avatarUrl: data.avatarUrl,
          isOnline: data.isOnline,
          lastSeen: data.lastSeen,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch user' });
    }
  }

  /**
   * Block a user.
   */
  static async blockUser(req: Request, res: Response): Promise<void> {
    const currentUid = req.user!.uid;
    const { targetUid } = req.body;

    if (!targetUid || targetUid === currentUid) {
      res.status(400).json({ success: false, error: 'Invalid target user ID' });
      return;
    }

    try {
      const blockId = `${currentUid}_${targetUid}`;
      await firestore.collection('blocks').doc(blockId).set({
        blockerId: currentUid,
        blockedId: targetUid,
        createdAt: Date.now(),
      });

      res.status(200).json({ success: true, message: 'User blocked' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to block user' });
    }
  }

  /**
   * Unblock a user.
   */
  static async unblockUser(req: Request, res: Response): Promise<void> {
    const currentUid = req.user!.uid;
    const { targetUid } = req.params;

    try {
      const blockId = `${currentUid}_${targetUid}`;
      await firestore.collection('blocks').doc(blockId).delete();
      res.status(200).json({ success: true, message: 'User unblocked' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to unblock user' });
    }
  }

  /**
   * List blocked users.
   */
  static async getBlockedUsers(req: Request, res: Response): Promise<void> {
    const currentUid = req.user!.uid;

    try {
      const snapshot = await firestore
        .collection('blocks')
        .where('blockerId', '==', currentUid)
        .get();

      const blockedList: string[] = [];
      snapshot.forEach((doc) => {
        blockedList.push(doc.data().blockedId);
      });

      res.status(200).json({ success: true, data: blockedList });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to retrieve blocked users' });
    }
  }
}
