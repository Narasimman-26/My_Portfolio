import { firestore } from '../config/firebase';

export class CleanupService {
  private static timer: NodeJS.Timeout | null = null;

  /**
   * Starts periodic scrubber for disappearing messages whose TTL has elapsed.
   */
  static startCleanupJob(intervalMs = 60000): void {
    if (this.timer) return;

    this.timer = setInterval(async () => {
      try {
        const now = Date.now();
        // Query collection group messages where expiresAt is non-null and <= now
        const expiredMessages = await firestore
          .collectionGroup('messages')
          .where('expiresAt', '!=', null)
          .where('expiresAt', '<=', now)
          .limit(100)
          .get()
          .catch(() => null);

        if (expiredMessages && !expiredMessages.empty) {
          const batch = firestore.batch();
          expiredMessages.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          console.log(`[DisappearingTTL] Purged ${expiredMessages.size} expired messages.`);
        }
      } catch (err) {
        // Suppress or handle missing composite index during initial setup
      }
    }, intervalMs);
  }

  static stopCleanupJob(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
