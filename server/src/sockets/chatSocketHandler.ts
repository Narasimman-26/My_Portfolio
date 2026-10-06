import { Server, Socket } from 'socket.io';
import { firestore } from '../config/firebase';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
  EncryptedPacket,
  MessageReceipt,
} from '@securechat/shared';
import { PresenceManager } from './presenceManager';

export function registerChatSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, any, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, any, SocketData>
): void {
  const user = socket.data.user;
  if (!user) return;

  const roomName = (convId: string) => `conversation:${convId}`;

  // Track online status
  PresenceManager.userConnected(io, user.uid, socket.id);

  // Heartbeat ping
  socket.on('presence:ping', () => {
    // Keepalive received
  });

  // Handle joining a conversation room
  socket.on('room:join', async (conversationId: string, callback) => {
    try {
      if (!conversationId) {
        callback?.({ success: false, error: 'Invalid conversation ID' });
        return;
      }

      // Verify user is allowed in this conversation
      const convRef = firestore.collection('conversations').doc(conversationId);
      const convDoc = await convRef.get().catch(() => null);

      if (convDoc && convDoc.exists) {
        const data = convDoc.data();
        const participants: string[] = data?.participantIds || [];
        if (!participants.includes(user.uid)) {
          callback?.({ success: false, error: 'Unauthorized to join this conversation' });
          return;
        }
      }

      await socket.join(roomName(conversationId));
      callback?.({ success: true });
    } catch (err) {
      callback?.({ success: false, error: 'Failed to join conversation room' });
    }
  });

  // Handle leaving a conversation room
  socket.on('room:leave', (conversationId: string) => {
    if (conversationId) {
      socket.leave(roomName(conversationId));
    }
  });

  // Handle sending an encrypted message
  socket.on('message:send', async (packet: EncryptedPacket, callback) => {
    try {
      // Security Validation: Sender ID must match authenticated socket user
      if (packet.senderId !== user.uid) {
        socket.emit('error:socket', {
          code: 'UNAUTHORIZED_SENDER',
          message: 'Sender ID does not match session',
        });
        callback?.({ success: false, messageId: packet.messageId, error: 'Identity spoofing rejected' });
        return;
      }

      // Payload validation: ensure required crypto fields are present
      if (!packet.ciphertext || !packet.iv || !packet.tag || !packet.conversationId || !packet.messageId) {
        callback?.({ success: false, messageId: packet.messageId, error: 'Malformed encrypted packet' });
        return;
      }

      // Sanitized audit log (STRICT: NEVER log ciphertext, iv, or tag)
      console.log(`[Audit] Encrypted packet routed: sender=${user.uid} conv=${packet.conversationId} msgId=${packet.messageId}`);

      // Broadcast to room
      socket.to(roomName(packet.conversationId)).emit('message:receive', packet);

      // Persist encrypted packet in Firestore (Only ciphertext + crypto metadata)
      const convRef = firestore.collection('conversations').doc(packet.conversationId);
      const msgRef = convRef.collection('messages').doc(packet.messageId);

      const packetRecord = {
        messageId: packet.messageId,
        conversationId: packet.conversationId,
        senderId: packet.senderId,
        ciphertext: packet.ciphertext,
        iv: packet.iv,
        tag: packet.tag,
        createdAt: packet.createdAt || Date.now(),
        expiresAt: packet.expiresAt || null,
        status: 'sent',
      };

      await msgRef.set(packetRecord).catch((err) => {
        console.error('Firestore packet save error:', err instanceof Error ? err.message : err);
      });

      // Update conversation metadata (timestamp and status only - ZERO plaintext preview!)
      await convRef.set(
        {
          id: packet.conversationId,
          updatedAt: Date.now(),
          lastMessageMeta: {
            senderId: packet.senderId,
            createdAt: packet.createdAt || Date.now(),
            status: 'sent',
          },
        },
        { merge: true }
      ).catch(() => {});

      callback?.({ success: true, messageId: packet.messageId });
    } catch (error) {
      console.error('Message routing error:', error instanceof Error ? error.message : error);
      callback?.({ success: false, messageId: packet.messageId, error: 'Transmission failed' });
    }
  });

  // Handle message delivery & read receipts
  socket.on('message:ack', async (receipt: MessageReceipt) => {
    try {
      if (!receipt.conversationId || !receipt.messageId) return;

      // Broadcast receipt to conversation room
      socket.to(roomName(receipt.conversationId)).emit('message:receipt', receipt);

      // Update message status in Firestore
      const msgRef = firestore
        .collection('conversations')
        .doc(receipt.conversationId)
        .collection('messages')
        .doc(receipt.messageId);

      await msgRef.update({
        status: receipt.status,
      }).catch(() => {});
    } catch (error) {
      // Non-blocking receipt update
    }
  });

  // Handle typing state
  socket.on('typing:state', ({ conversationId, isTyping }) => {
    if (!conversationId) return;
    socket.to(roomName(conversationId)).emit('typing:update', {
      conversationId,
      userId: user.uid,
      isTyping,
    });
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    PresenceManager.userDisconnected(io, user.uid, socket.id);
  });
}
