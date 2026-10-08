import { x25519 } from '@noble/curves/ed25519';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { base64ToUint8Array, stringToUtf8Bytes } from './utils';
import { KeyManagement } from './keyManagement';

export class EcdhService {
  // In-memory session key cache: `${conversationId}` -> 32-byte symmetric key Uint8Array
  private static keyCache = new Map<string, Uint8Array>();

  /**
   * Derives a 32-byte AES-256 conversation key via X25519 ECDH + HKDF-SHA256.
   *
   * @param localUserId - Current user UID (to fetch local private key from SecureStore)
   * @param peerPublicKeyBase64 - Remote peer's public key (fetched from Firestore)
   * @param conversationId - Unique room ID used as HKDF salt for domain separation
   */
  static async deriveConversationKey(
    localUserId: string,
    peerPublicKeyBase64: string,
    conversationId: string
  ): Promise<Uint8Array> {
    const cacheKey = `${conversationId}_${peerPublicKeyBase64}`;
    const cached = this.keyCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const localPrivBytes = await KeyManagement.getLocalPrivateKeyBytes(localUserId);
    const peerPubBytes = base64ToUint8Array(peerPublicKeyBase64);

    // Compute raw X25519 shared secret point
    const rawSharedSecret = x25519.getSharedSecret(localPrivBytes, peerPubBytes);

    // Key Derivation: HKDF-SHA256 with conversationId as salt
    const salt = stringToUtf8Bytes(`SecureChat:Salt:${conversationId}`);
    const info = stringToUtf8Bytes('SecureChat-v1-AES-256-GCM-Key');

    const derivedSymmetricKey = hkdf(sha256, rawSharedSecret, salt, info, 32);

    this.keyCache.set(cacheKey, derivedSymmetricKey);
    return derivedSymmetricKey;
  }

  /**
   * Clears cached keys from memory (e.g. on logout).
   */
  static clearCache(): void {
    this.keyCache.clear();
  }
}
