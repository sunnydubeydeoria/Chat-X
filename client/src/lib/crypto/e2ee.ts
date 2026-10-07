/**
 * ChatX E2EE Cryptography Module
 * ===================================
 * Uses Web Crypto API (AES-256-GCM) with HKDF key derivation.
 *
 * Architecture:
 * - Room join key → HKDF-SHA-256 → AES-256-GCM room symmetric key
 * - Every message/file uses a fresh 96-bit random IV
 * - The server NEVER receives the raw join key or the derived AES key
 * - The server only stores/forwards the ciphertext
 *
 * Key Derivation:
 *   roomKey (user-visible) → normalize → HKDF(SHA-256, salt, info) → CryptoKey
 *
 * Encryption:
 *   plaintext → AES-256-GCM(key, iv=crypto.getRandomValues(12bytes)) → {iv, ciphertext}
 *   encoded as base64(iv || ciphertext) for transport
 *
 * Decryption:
 *   base64 decode → split iv (12 bytes) + ciphertext → AES-256-GCM decrypt → plaintext
 */

import { HKDF_SALT, HKDF_INFO_MSG, HKDF_INFO_FILE, AES_KEY_LENGTH, AES_IV_LENGTH } from '@chatx/shared/constants';

// ── Utilities ─────────────────────────────────────────────────────────────────

function base64Encode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64Decode(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function concatBuffers(...buffers: Uint8Array[]): Uint8Array {
  const total = buffers.reduce((acc, b) => acc + b.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const b of buffers) {
    result.set(b, offset);
    offset += b.length;
  }
  return result;
}

function stringToBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function bufferToString(buf: Uint8Array): string {
  return new TextDecoder().decode(buf);
}

// ── Key Derivation ────────────────────────────────────────────────────────────

/**
 * Derive a room AES-256-GCM CryptoKey from the raw room join key.
 * Uses HKDF-SHA-256 so the derived key is cryptographically independent
 * from the join key itself.
 *
 * @param roomKey - The human-readable room join key (e.g. "ABCD-EFGH-IJKL-MNOP")
 * @param infoString - Domain separation string
 * @returns CryptoKey suitable for AES-GCM encrypt/decrypt
 */
async function deriveRoomKey(roomKey: string, infoString: string): Promise<CryptoKey> {
  // Normalize: uppercase, remove dashes/spaces
  const normalized = roomKey.toUpperCase().replace(/[-\s]/g, '');

  // Import the raw key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    stringToBuffer(normalized) as BufferSource,
    { name: 'HKDF' },
    false,
    ['deriveKey'],
  );

  // Derive AES-256-GCM key via HKDF-SHA-256
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: stringToBuffer(HKDF_SALT) as BufferSource,
      info: stringToBuffer(infoString) as BufferSource,
    },
    keyMaterial,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false, // non-extractable
    ['encrypt', 'decrypt'],
  );
}

export async function deriveMessageKey(roomKey: string): Promise<CryptoKey> {
  return deriveRoomKey(roomKey, HKDF_INFO_MSG);
}

export async function deriveFileKey(roomKey: string): Promise<CryptoKey> {
  return deriveRoomKey(roomKey, HKDF_INFO_FILE);
}

// ── Message Encryption ────────────────────────────────────────────────────────

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns base64(iv || ciphertext) — IV is always 12 random bytes prepended.
 */
export async function encryptMessage(
  plaintext: string,
  key: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));
  const encoded = stringToBuffer(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded as BufferSource,
  );

  // Prepend IV: [12 bytes IV] [ciphertext + 16 byte auth tag]
  const combined = concatBuffers(iv, new Uint8Array(ciphertext));
  return base64Encode(combined);
}

/**
 * Decrypt an AES-256-GCM encrypted message.
 * Input: base64(iv || ciphertext)
 */
export async function decryptMessage(
  encryptedB64: string,
  key: CryptoKey,
): Promise<string> {
  const combined = base64Decode(encryptedB64);

  if (combined.length < AES_IV_LENGTH + 1) {
    throw new Error('Invalid ciphertext: too short');
  }

  const iv = combined.slice(0, AES_IV_LENGTH);
  const ciphertext = combined.slice(AES_IV_LENGTH);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext as BufferSource,
  );

  return bufferToString(new Uint8Array(plaintext));
}

// ── File Encryption ───────────────────────────────────────────────────────────

/**
 * Encrypt a file (ArrayBuffer) using AES-256-GCM.
 * Returns { encryptedBlob, encryptedName } — both encrypted.
 */
export async function encryptFile(
  fileData: ArrayBuffer,
  fileName: string,
  key: CryptoKey,
): Promise<{ encryptedBlob: Blob; encryptedName: string }> {
  // Encrypt file contents
  const fileIv = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));
  const encryptedFile = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: fileIv },
    key,
    fileData,
  );

  const encryptedFileBytes = concatBuffers(fileIv, new Uint8Array(encryptedFile));
  const encryptedBlob = new Blob([encryptedFileBytes as unknown as BlobPart], { type: 'application/octet-stream' });

  // Encrypt file name
  const nameIv = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));
  const encryptedFileName = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nameIv },
    key,
    stringToBuffer(fileName) as BufferSource,
  );
  const nameBytes = concatBuffers(nameIv, new Uint8Array(encryptedFileName));
  const encryptedName = base64Encode(nameBytes);

  return { encryptedBlob, encryptedName };
}

/**
 * Decrypt an encrypted file blob received from the server.
 */
export async function decryptFile(
  encryptedData: ArrayBuffer,
  key: CryptoKey,
): Promise<ArrayBuffer> {
  const combined = new Uint8Array(encryptedData);
  const iv = combined.slice(0, AES_IV_LENGTH);
  const ciphertext = combined.slice(AES_IV_LENGTH);

  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext as BufferSource,
  );
}

/**
 * Decrypt an encrypted file name.
 */
export async function decryptFileName(
  encryptedNameB64: string,
  key: CryptoKey,
): Promise<string> {
  const combined = base64Decode(encryptedNameB64);
  const iv = combined.slice(0, AES_IV_LENGTH);
  const ciphertext = combined.slice(AES_IV_LENGTH);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext as BufferSource,
  );

  return bufferToString(new Uint8Array(plaintext));
}

// ── Key Caching ───────────────────────────────────────────────────────────────

// Cache derived keys to avoid expensive re-derivation on every message
const keyCache = new Map<string, { msgKey: CryptoKey; fileKey: CryptoKey }>();

export async function getRoomKeys(roomKey: string): Promise<{ msgKey: CryptoKey; fileKey: CryptoKey }> {
  const cacheKey = roomKey.toUpperCase().replace(/[-\s]/g, '');

  if (keyCache.has(cacheKey)) {
    return keyCache.get(cacheKey)!;
  }

  const [msgKey, fileKey] = await Promise.all([
    deriveMessageKey(roomKey),
    deriveFileKey(roomKey),
  ]);

  keyCache.set(cacheKey, { msgKey, fileKey });
  return { msgKey, fileKey };
}

export function clearKeyCache(): void {
  keyCache.clear();
}
