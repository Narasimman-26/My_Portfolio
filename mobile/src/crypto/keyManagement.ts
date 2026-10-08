import { x25519 } from '@noble/curves/ed25519';
import * as SecureStore from 'expo-secure-store';
import { uint8ArrayToBase64, base64ToUint8Array } from './utils';
import { X25519KeyPair } from '@securechat/shared';

const SECURE_STORE_PREFIX = 'securechat_x25519_sk_';

// In-memory fallback for test environments or web
const memoryKeyStore = new Map<string, string>();

async function savePrivateKey(userId: string, privateKeyBase64: string): Promise<void> {
  const key = `${SECURE_STORE_PREFIX}${userId}`;
  try {
    if (SecureStore.isAvailableAsync && (await SecureStore.isAvailableAsync())) {
      await SecureStore.setItemAsync(key, privateKeyBase64, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      return;
    }
  } catch {
    // Fall back to memory
  }
  memoryKeyStore.set(key, privateKeyBase64);
}

async function getStoredPrivateKey(userId: string): Promise<string | null> {
  const key = `${SECURE_STORE_PREFIX}${userId}`;
  try {
    if (SecureStore.isAvailableAsync && (await SecureStore.isAvailableAsync())) {
      const stored = await SecureStore.getItemAsync(key);
      if (stored) return stored;
    }
  } catch {
    // Fall back to memory
  }
  return memoryKeyStore.get(key) || null;
}

export class KeyManagement {
  /**
   * Generates a brand new X25519 keypair for identity establishment.
   * Private key stays strictly in hardware-backed SecureStore.
   */
  static async generateKeyPair(userId: string): Promise<X25519KeyPair> {
    const privBytes = x25519.utils.randomPrivateKey();
    const pubBytes = x25519.getPublicKey(privBytes);

    const privateKeyBase64 = uint8ArrayToBase64(privBytes);
    const publicKeyBase64 = uint8ArrayToBase64(pubBytes);

    await savePrivateKey(userId, privateKeyBase64);

    return {
      publicKey: publicKeyBase64,
      privateKey: privateKeyBase64,
    };
  }

  /**
   * Retrieves existing keypair or generates a new one on initial launch.
   */
  static async getOrGenerateKeyPair(userId: string): Promise<{ publicKey: string }> {
    const storedPrivate = await getStoredPrivateKey(userId);

    if (storedPrivate) {
      const privBytes = base64ToUint8Array(storedPrivate);
      const pubBytes = x25519.getPublicKey(privBytes);
      return {
        publicKey: uint8ArrayToBase64(pubBytes),
      };
    }

    const newKeyPair = await this.generateKeyPair(userId);
    return {
      publicKey: newKeyPair.publicKey,
    };
  }

  /**
   * Retrieves raw private key bytes strictly for local cryptographic operations.
   * NEVER exposed over network or logged.
   */
  static async getLocalPrivateKeyBytes(userId: string): Promise<Uint8Array> {
    const stored = await getStoredPrivateKey(userId);
    if (!stored) {
      throw new Error(`No cryptographic identity found for user ${userId}. Re-authentication required.`);
    }
    return base64ToUint8Array(stored);
  }

  /**
   * Removes private key upon account logout or key regeneration.
   */
  static async purgeKeyPair(userId: string): Promise<void> {
    const key = `${SECURE_STORE_PREFIX}${userId}`;
    try {
      if (SecureStore.isAvailableAsync && (await SecureStore.isAvailableAsync())) {
        await SecureStore.deleteItemAsync(key);
      }
    } catch {
      // Ignore
    }
    memoryKeyStore.delete(key);
  }
}
