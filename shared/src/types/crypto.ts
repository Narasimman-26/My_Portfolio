export interface EncryptedPacket {
  messageId: string;
  conversationId: string;
  senderId: string;
  ciphertext: string; // Base64 encoded AES-256-GCM ciphertext
  iv: string;         // Base64 encoded 12-byte IV
  tag: string;        // Base64 encoded 16-byte authentication tag
  createdAt: number;
  expiresAt?: number; // Optional TTL timestamp for disappearing messages
}

export interface DecryptedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  plaintext: string;
  createdAt: number;
  expiresAt?: number;
  status: MessageDeliveryStatus;
}

export type MessageDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface X25519KeyPair {
  publicKey: string;  // Base64 encoded 32-byte public key
  privateKey: string; // Base64 encoded 32-byte private key (NEVER transmitted)
}

export interface SharedSecret {
  conversationId: string;
  symmetricKey: string; // Base64 encoded 32-byte key derived via HKDF-SHA256
}
