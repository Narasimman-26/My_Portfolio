import { gcm } from '@noble/ciphers/aes';
import {
  getRandomBytes,
  stringToUtf8Bytes,
  utf8BytesToString,
  uint8ArrayToBase64,
  base64ToUint8Array,
  concatBytes,
} from './utils';
import { EncryptedPacket } from '@securechat/shared';

export interface EncryptionResult {
  ciphertext: string; // Base64
  iv: string;         // Base64
  tag: string;        // Base64
}

export class AesGcmService {
  /**
   * Encrypts plaintext using AES-256-GCM with a unique 12-byte IV and AAD binding.
   *
   * @param plaintext - The raw user message string
   * @param symmetricKey - 32-byte AES key derived via ECDH
   * @param aadMetadata - Context data bound to the authentication tag
   */
  static encrypt(
    plaintext: string,
    symmetricKey: Uint8Array,
    aadMetadata: { conversationId: string; senderId: string; timestamp: number }
  ): EncryptionResult {
    // 1. Generate unique 12-byte (96-bit) cryptographically random IV
    const iv = getRandomBytes(12);

    // 2. Form Associated Authenticated Data (AAD)
    const aadString = `${aadMetadata.conversationId}:${aadMetadata.senderId}:${aadMetadata.timestamp}`;
    const aad = stringToUtf8Bytes(aadString);

    // 3. Encrypt via AES-256-GCM
    const cipher = gcm(symmetricKey, iv, aad);
    const plaintextBytes = stringToUtf8Bytes(plaintext);
    const encryptedWithTag = cipher.encrypt(plaintextBytes);

    // GCM appends 16-byte (128-bit) authentication tag at the end
    const tagLength = 16;
    const ciphertextBytes = encryptedWithTag.slice(0, encryptedWithTag.length - tagLength);
    const tagBytes = encryptedWithTag.slice(encryptedWithTag.length - tagLength);

    return {
      ciphertext: uint8ArrayToBase64(ciphertextBytes),
      iv: uint8ArrayToBase64(iv),
      tag: uint8ArrayToBase64(tagBytes),
    };
  }

  /**
   * Decrypts ciphertext and verifies the 16-byte GCM authentication tag and AAD.
   * Throws an error if ciphertext or tag was tampered with.
   */
  static decrypt(
    packet: Pick<EncryptedPacket, 'ciphertext' | 'iv' | 'tag' | 'conversationId' | 'senderId' | 'createdAt'>,
    symmetricKey: Uint8Array
  ): string {
    const ciphertextBytes = base64ToUint8Array(packet.ciphertext);
    const ivBytes = base64ToUint8Array(packet.iv);
    const tagBytes = base64ToUint8Array(packet.tag);

    // Reconstruct AAD
    const aadString = `${packet.conversationId}:${packet.senderId}:${packet.createdAt}`;
    const aad = stringToUtf8Bytes(aadString);

    // Concatenate ciphertext + tag for Noble GCM verification
    const encryptedWithTag = concatBytes(ciphertextBytes, tagBytes);

    try {
      const cipher = gcm(symmetricKey, ivBytes, aad);
      const decryptedBytes = cipher.decrypt(encryptedWithTag);
      return utf8BytesToString(decryptedBytes);
    } catch (err) {
      throw new Error('GCM authentication verification failed: Ciphertext or Tag has been tampered with.');
    }
  }
}
