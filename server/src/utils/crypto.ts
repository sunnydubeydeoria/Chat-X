import crypto from 'crypto';
import { ADJECTIVES, ANIMALS, AVATAR_COLORS } from '@chatx/shared/constants';

// ── Room Key Generation ───────────────────────────────────────────────────────

/**
 * Crockford Base32 alphabet (no 0, O, I, L to avoid visual confusion).
 * 160 bits of entropy = 32 base32 characters = XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
 * We use 80 bits (16 chars in 4 groups) for human readability while maintaining
 * sufficient entropy against brute-force (>10^24 combinations).
 */
const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function bytesToBase32(bytes: Buffer): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += CROCKFORD_ALPHABET[(value >> bits) & 0x1f];
    }
  }

  if (bits > 0) {
    result += CROCKFORD_ALPHABET[(value << (5 - bits)) & 0x1f];
  }

  return result;
}

/**
 * Generate a cryptographically secure room key.
 * Format: XXXX-XXXX-XXXX-XXXX (80 bits entropy = 2^80 ≈ 10^24 combinations)
 * Using crypto.randomBytes() — CSPRNG.
 */
export function generateRoomKey(): string {
  // 10 bytes = 80 bits → 16 Base32 chars
  const bytes = crypto.randomBytes(10);
  const b32 = bytesToBase32(bytes);
  // Pad/truncate to exactly 16 chars then format
  const padded = b32.padEnd(16, '0').substring(0, 16);
  return `${padded.substring(0, 4)}-${padded.substring(4, 8)}-${padded.substring(8, 12)}-${padded.substring(12, 16)}`;
}

/**
 * Double-hash the room key for DB storage.
 * SHA-256(SHA-256(normalized_key)) — so even the DB hash cannot be used to
 * derive the encryption key (which clients derive via HKDF from the raw key).
 */
export function hashRoomKey(roomKey: string): string {
  const normalized = roomKey.toUpperCase().replace(/-/g, '');
  const firstHash = crypto.createHash('sha256').update(normalized).digest();
  return crypto.createHash('sha256').update(firstHash).digest('hex');
}

/**
 * Normalize a room key entered by the user (uppercase, trim spaces/dashes).
 */
export function normalizeRoomKey(input: string): string {
  return input.toUpperCase().replace(/\s+/g, '').replace(/-/g, '');
}

/**
 * Reformat a normalized key back to display format XXXX-XXXX-XXXX-XXXX.
 */
export function formatRoomKey(normalized: string): string {
  const clean = normalized.replace(/-/g, '').substring(0, 16);
  return `${clean.substring(0, 4)}-${clean.substring(4, 8)}-${clean.substring(8, 12)}-${clean.substring(12, 16)}`;
}

/**
 * Validate the format of a room key (allows with or without dashes).
 */
export function validateRoomKeyFormat(key: string): boolean {
  const normalized = normalizeRoomKey(key);
  if (normalized.length !== 16) return false;
  return /^[0-9A-HJKMNP-TV-Z]{16}$/.test(normalized);
}

// ── Anonymous Identity Generation ─────────────────────────────────────────────

export function generateAnonymousName(): string {
  const adjIdx = crypto.randomInt(0, ADJECTIVES.length);
  const animalIdx = crypto.randomInt(0, ANIMALS.length);
  return `${ADJECTIVES[adjIdx]} ${ANIMALS[animalIdx]}`;
}

export function generateAvatarColor(sessionId: string): string {
  const hash = crypto.createHash('sha256').update(sessionId).digest();
  const idx = hash[0] % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

// ── Session ID Generation ─────────────────────────────────────────────────────

export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateId(): string {
  return crypto.randomUUID();
}

// ── Timing-safe comparison ────────────────────────────────────────────────────

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return crypto.timingSafeEqual(bufA, bufB);
}
