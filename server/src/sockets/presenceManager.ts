import { Server } from 'socket.io';
import { firestore } from '../config/firebase';
import { ServerToClientEvents, ClientToServerEvents, SocketData } from '@securechat/shared';

export class PresenceManager {
  // Map of userId -> Set of socket IDs (to support multiple device tabs/sessions)
  private static userSockets = new Map<string, Set<string>>();

  static userConnected(
    io: Server<ClientToServerEvents, ServerToClientEvents, any, SocketData>,
    userId: string,
    socketId: string
  ): void {
    let sockets = this.userSockets.get(userId);
    if (!sockets) {
      sockets = new Set();
      this.userSockets.set(userId, sockets);
      // User just transitioned from offline to online
      this.broadcastStatus(io, userId, true);
      this.persistStatus(userId, true);
    }
    sockets.add(socketId);
  }

  static userDisconnected(
    io: Server<ClientToServerEvents, ServerToClientEvents, any, SocketData>,
    userId: string,
    socketId: string
  ): void {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        // User transitioned from online to offline
        this.broadcastStatus(io, userId, false);
        this.persistStatus(userId, false);
      }
    }
  }

  static isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return Boolean(sockets && sockets.size > 0);
  }

  private static broadcastStatus(
    io: Server<ClientToServerEvents, ServerToClientEvents, any, SocketData>,
    userId: string,
    isOnline: boolean
  ): void {
    io.emit('user:status', {
      userId,
      isOnline,
      lastSeen: Date.now(),
    });
  }

  private static async persistStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      await firestore.collection('users').doc(userId).set(
        {
          isOnline,
          lastSeen: Date.now(),
        },
        { merge: true }
      );
    } catch {
      // Ignore background persistence errors
    }
  }
}
