import { io, Socket } from 'socket.io-client';
import { StorageService } from './storageService';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  EncryptedPacket,
  MessageReceipt,
} from '@securechat/shared';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:4000';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export class SocketService {
  private static socket: TypedSocket | null = null;
  private static isConnecting = false;

  static async connect(): Promise<TypedSocket> {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.isConnecting && this.socket) {
      return this.socket;
    }

    this.isConnecting = true;
    const token = await StorageService.getAccessToken();

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
    }) as TypedSocket;

    this.socket.on('connect', () => {
      this.isConnecting = false;
      console.log('📡 [SecureSocket] Connected securely to real-time gateway');
    });

    this.socket.on('connect_error', async (err) => {
      this.isConnecting = false;
      console.warn('⚠️ [SecureSocket] Connection error:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 [SecureSocket] Disconnected:', reason);
    });

    return this.socket;
  }

  static getSocket(): TypedSocket | null {
    return this.socket;
  }

  static disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  static joinRoom(conversationId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        resolve(false);
        return;
      }
      this.socket.emit('room:join', conversationId, (res) => {
        resolve(res?.success || false);
      });
    });
  }

  static leaveRoom(conversationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('room:leave', conversationId);
    }
  }

  static sendEncryptedMessage(packet: EncryptedPacket): Promise<{ success: boolean; messageId: string }> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Socket disconnected'));
        return;
      }
      this.socket.emit('message:send', packet, (res) => {
        if (res?.success) {
          resolve(res);
        } else {
          reject(new Error(res?.error || 'Send failed'));
        }
      });
    });
  }

  static sendReceipt(receipt: MessageReceipt): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('message:ack', receipt);
    }
  }

  static sendTypingState(conversationId: string, isTyping: boolean): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing:state', { conversationId, isTyping });
    }
  }
}
