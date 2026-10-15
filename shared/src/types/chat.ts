import { MessageDeliveryStatus } from './crypto';

export type DisappearingTTL = 0 | 30 | 300 | 3600 | 86400; // in seconds (0 = off)

export interface Conversation {
  id: string;
  participantIds: string[];
  createdAt: number;
  updatedAt: number;
  disappearingTtl: DisappearingTTL;
  lastMessageMeta?: {
    senderId: string;
    createdAt: number;
    status: MessageDeliveryStatus;
  };
}

export interface ConversationWithPeer extends Conversation {
  peerUser: {
    uid: string;
    username: string;
    displayName: string;
    publicKey: string;
    isOnline: boolean;
    lastSeen: number;
  };
}

export interface MessageReceipt {
  messageId: string;
  conversationId: string;
  userId: string;
  status: 'delivered' | 'read';
  timestamp: number;
}

export interface BlockRecord {
  blockerId: string;
  blockedId: string;
  createdAt: number;
}
