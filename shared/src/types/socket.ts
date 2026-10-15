import { EncryptedPacket } from './crypto';
import { MessageReceipt } from './chat';

export interface ServerToClientEvents {
  // Chat events
  'message:receive': (packet: EncryptedPacket) => void;
  'message:receipt': (receipt: MessageReceipt) => void;
  'typing:update': (data: { conversationId: string; userId: string; isTyping: boolean }) => void;
  
  // Presence events
  'user:status': (data: { userId: string; isOnline: boolean; lastSeen: number }) => void;
  
  // Errors
  'error:socket': (error: { code: string; message: string }) => void;
}

export interface ClientToServerEvents {
  // Room subscription
  'room:join': (conversationId: string, callback?: (response: { success: boolean; error?: string }) => void) => void;
  'room:leave': (conversationId: string) => void;
  
  // Encrypted transmission
  'message:send': (packet: EncryptedPacket, callback?: (response: { success: boolean; messageId: string; error?: string }) => void) => void;
  
  // Receipts
  'message:ack': (receipt: MessageReceipt) => void;
  
  // Typing state
  'typing:state': (data: { conversationId: string; isTyping: boolean }) => void;
  
  // Heartbeat / ping
  'presence:ping': () => void;
}

export interface SocketData {
  user: {
    uid: string;
    email: string;
    username: string;
  };
}
