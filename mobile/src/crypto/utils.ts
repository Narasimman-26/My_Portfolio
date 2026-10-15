/**
 * Cryptographic utility functions (Base64 encoding/decoding, random bytes, fingerprint)
 * Compatible across Node.js, Web, and React Native runtimes.
 */

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else if (typeof global !== 'undefined' && (global as any).crypto?.getRandomValues) {
    (global as any).crypto.getRandomValues(bytes);
  } else {
    // Fallback for Node.js if global crypto isn't direct
    const nodeCrypto = require('crypto');
    const randomBuf = nodeCrypto.randomBytes(length);
    bytes.set(randomBuf);
  }
  return bytes;
}

export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, curr) => acc + curr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export function stringToUtf8Bytes(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  return new Uint8Array(Buffer.from(str, 'utf8'));
}

export function utf8BytesToString(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(bytes).toString('utf8');
}

/**
 * Creates human-readable fingerprint for public keys:
 * E.g. "A3:F1:89:E2:04:9B:C1:4F"
 */
export function formatKeyFingerprint(publicKeyBase64: string): string {
  try {
    const bytes = base64ToUint8Array(publicKeyBase64);
    const hex = Array.from(bytes.slice(0, 16))
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(':');
    return hex;
  } catch {
    return 'UNKNOWN_FINGERPRINT';
  }
}
