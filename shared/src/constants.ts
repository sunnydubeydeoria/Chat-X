// ============================================================
// Shared Constants for ChatX
// ============================================================

// Room key format: XXXX-XXXX-XXXX-XXXX (Base32 Crockford)
export const ROOM_KEY_FORMAT_REGEX = /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

// Heartbeat / presence
export const HEARTBEAT_INTERVAL_MS = 10_000;       // 10s - client sends ping
export const HEARTBEAT_TIMEOUT_MS = 25_000;        // 25s - server considers dead
export const DISCONNECT_GRACE_PERIOD_MS = 15_000;  // 15s grace on disconnect
export const CLEANUP_INTERVAL_MS = 30_000;         // 30s - server cleanup sweep

// Rate limits
export const RATE_LIMIT_JOIN_WINDOW_MS = 60_000;   // 1 minute
export const RATE_LIMIT_JOIN_MAX = 10;             // 10 joins per minute per IP
export const RATE_LIMIT_CREATE_WINDOW_MS = 3_600_000; // 1 hour
export const RATE_LIMIT_CREATE_MAX = 20;           // 20 rooms per hour per IP
export const RATE_LIMIT_MSG_WINDOW_MS = 60_000;    // 1 minute
export const RATE_LIMIT_MSG_MAX = 120;             // 120 messages per minute

// File limits
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'text/plain', 'text/csv', 'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'application/x-zip-compressed',
  'video/mp4', 'video/webm', 'video/ogg',
  'audio/mpeg', 'audio/ogg', 'audio/wav',
  'application/json',
];

// Crypto
export const HKDF_SALT = 'chatx-v1-salt-2024';
export const HKDF_INFO_MSG = 'chatx-message-encryption';
export const HKDF_INFO_FILE = 'chatx-file-encryption';
export const AES_KEY_LENGTH = 256;
export const AES_IV_LENGTH = 12; // 96 bits for GCM

// Anonymous name generation
export const ADJECTIVES = [
  'Silent', 'Shadow', 'Swift', 'Azure', 'Crimson', 'Mystic', 'Ghost',
  'Ember', 'Frost', 'Jade', 'Onyx', 'Sage', 'Lunar', 'Solar', 'Storm',
  'Amber', 'Cobalt', 'Ivory', 'Scarlet', 'Violet', 'Indigo', 'Teal',
  'Nova', 'Pixel', 'Echo', 'Cipher', 'Phantom', 'Nebula', 'Zenith',
  'Quantum', 'Stealth', 'Nimble', 'Radiant', 'Velvet', 'Obsidian',
];

export const ANIMALS = [
  'Fox', 'Wolf', 'Panda', 'Eagle', 'Falcon', 'Raven', 'Lynx', 'Panther',
  'Hawk', 'Crane', 'Manta', 'Orca', 'Jaguar', 'Viper', 'Owl', 'Bear',
  'Tiger', 'Leopard', 'Cheetah', 'Dragon', 'Phoenix', 'Cobra', 'Coyote',
  'Mantis', 'Kestrel', 'Ferret', 'Osprey', 'Badger', 'Wolverine', 'Cougar',
];

export const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#a855f7', '#d946ef', '#ef4444', '#84cc16', '#10b981',
];

// Room constraints
export const MAX_PARTICIPANTS_PER_ROOM = 50;
export const MAX_MESSAGES_HISTORY = 200;   // messages loaded on join

// App info
export const APP_NAME = 'ChatX';
export const APP_TAGLINE = 'Private conversations. Nothing permanent.';
export const APP_VERSION = '1.0.0';
