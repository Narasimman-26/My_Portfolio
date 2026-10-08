import { KeyManagement } from '../keyManagement';
import { EcdhService } from '../ecdh';
import { AesGcmService } from '../aesGcm';
import { formatKeyFingerprint } from '../utils';

describe('SecureChat E2EE Cryptographic Suite', () => {
  const aliceId = 'user_alice_01';
  const bobId = 'user_bob_02';
  const conversationId = 'conv_alice_bob_secure';

  beforeEach(() => {
    EcdhService.clearCache();
  });

  describe('1. Identity & X25519 Key Generation', () => {
    it('should generate valid X25519 keypairs for Alice and Bob', async () => {
      const aliceKeys = await KeyManagement.generateKeyPair(aliceId);
      const bobKeys = await KeyManagement.generateKeyPair(bobId);

      expect(aliceKeys.publicKey).toBeDefined();
      expect(aliceKeys.privateKey).toBeDefined();
      expect(bobKeys.publicKey).toBeDefined();
      expect(bobKeys.privateKey).toBeDefined();

      expect(aliceKeys.publicKey).not.toEqual(bobKeys.publicKey);

      // Verify fingerprint generation
      const fingerprint = formatKeyFingerprint(aliceKeys.publicKey);
      expect(fingerprint).toMatch(/^[0-9A-F]{2}(:[0-9A-F]{2}){15}$/);
    });

    it('should retrieve existing key from storage on subsequent calls', async () => {
      const initial = await KeyManagement.getOrGenerateKeyPair(aliceId);
      const retrieved = await KeyManagement.getOrGenerateKeyPair(aliceId);

      expect(initial.publicKey).toEqual(retrieved.publicKey);
    });
  });

  describe('2. ECDH Shared Secret & HKDF Key Agreement', () => {
    it('should derive identical 32-byte AES keys for both Alice and Bob', async () => {
      const alice = await KeyManagement.generateKeyPair(aliceId);
      const bob = await KeyManagement.generateKeyPair(bobId);

      const aliceDerivedKey = await EcdhService.deriveConversationKey(aliceId, bob.publicKey, conversationId);
      const bobDerivedKey = await EcdhService.deriveConversationKey(bobId, alice.publicKey, conversationId);

      expect(aliceDerivedKey.length).toBe(32);
      expect(bobDerivedKey.length).toBe(32);

      // Verify both sides derived the exact same key bytes
      expect(Buffer.from(aliceDerivedKey).toString('hex')).toEqual(
        Buffer.from(bobDerivedKey).toString('hex')
      );
    });

    it('should derive different keys for different conversations (domain separation)', async () => {
      const alice = await KeyManagement.generateKeyPair(aliceId);
      const bob = await KeyManagement.generateKeyPair(bobId);

      const keyRoom1 = await EcdhService.deriveConversationKey(aliceId, bob.publicKey, 'room_1');
      const keyRoom2 = await EcdhService.deriveConversationKey(aliceId, bob.publicKey, 'room_2');

      expect(Buffer.from(keyRoom1).toString('hex')).not.toEqual(
        Buffer.from(keyRoom2).toString('hex')
      );
    });
  });

  describe('3. AES-256-GCM Symmetrical Encryption & Decryption', () => {
    it('should encrypt on sender side and decrypt cleanly on receiver side', async () => {
      const alice = await KeyManagement.generateKeyPair(aliceId);
      const bob = await KeyManagement.generateKeyPair(bobId);

      const aliceKey = await EcdhService.deriveConversationKey(aliceId, bob.publicKey, conversationId);
      const bobKey = await EcdhService.deriveConversationKey(bobId, alice.publicKey, conversationId);

      const secretMessage = 'CYBERPUNK://CONFIDENTIAL_TRANSMISSION_2026';
      const timestamp = 1791270000000;

      // Alice encrypts
      const encrypted = AesGcmService.encrypt(secretMessage, aliceKey, {
        conversationId,
        senderId: aliceId,
        timestamp,
      });

      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      expect(encrypted.ciphertext).not.toContain(secretMessage);

      // Bob decrypts
      const decrypted = AesGcmService.decrypt(
        {
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          tag: encrypted.tag,
          conversationId,
          senderId: aliceId,
          createdAt: timestamp,
        },
        bobKey
      );

      expect(decrypted).toEqual(secretMessage);
    });

    it('should generate a unique 12-byte IV for every message', async () => {
      const alice = await KeyManagement.generateKeyPair(aliceId);
      const bob = await KeyManagement.generateKeyPair(bobId);
      const key = await EcdhService.deriveConversationKey(aliceId, bob.publicKey, conversationId);

      const msg = 'Test message';
      const enc1 = AesGcmService.encrypt(msg, key, { conversationId, senderId: aliceId, timestamp: 1000 });
      const enc2 = AesGcmService.encrypt(msg, key, { conversationId, senderId: aliceId, timestamp: 1000 });

      // Unique random IV must ensure distinct ciphertexts even for identical plaintext
      expect(enc1.iv).not.toEqual(enc2.iv);
      expect(enc1.ciphertext).not.toEqual(enc2.ciphertext);
    });
  });

  describe('4. Anti-Tamper & Authentication Tag Integrity', () => {
    it('should reject tampered ciphertext with an authentication failure', async () => {
      const alice = await KeyManagement.generateKeyPair(aliceId);
      const bob = await KeyManagement.generateKeyPair(bobId);
      const aliceKey = await EcdhService.deriveConversationKey(aliceId, bob.publicKey, conversationId);
      const bobKey = await EcdhService.deriveConversationKey(bobId, alice.publicKey, conversationId);

      const encrypted = AesGcmService.encrypt('Top Secret', aliceKey, {
        conversationId,
        senderId: aliceId,
        timestamp: 1000,
      });

      // Tamper with ciphertext by altering characters
      const tamperedCiphertext = Buffer.from('TAMPERED_PAYLOAD_CORRUPT').toString('base64');

      expect(() => {
        AesGcmService.decrypt(
          {
            ciphertext: tamperedCiphertext,
            iv: encrypted.iv,
            tag: encrypted.tag,
            conversationId,
            senderId: aliceId,
            createdAt: 1000,
          },
          bobKey
        );
      }).toThrow(/tampered/i);
    });

    it('should reject tampered AAD (spoofed senderId)', async () => {
      const alice = await KeyManagement.generateKeyPair(aliceId);
      const bob = await KeyManagement.generateKeyPair(bobId);
      const aliceKey = await EcdhService.deriveConversationKey(aliceId, bob.publicKey, conversationId);
      const bobKey = await EcdhService.deriveConversationKey(bobId, alice.publicKey, conversationId);

      const encrypted = AesGcmService.encrypt('Top Secret', aliceKey, {
        conversationId,
        senderId: aliceId,
        timestamp: 1000,
      });

      // Attempt to attribute message to an imposter
      expect(() => {
        AesGcmService.decrypt(
          {
            ciphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            tag: encrypted.tag,
            conversationId,
            senderId: 'imposter_mallory', // Spoofed sender
            createdAt: 1000,
          },
          bobKey
        );
      }).toThrow(/tampered/i);
    });
  });
});
