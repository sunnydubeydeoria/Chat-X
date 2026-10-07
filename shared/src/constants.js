"use strict";
// ============================================================
// Shared Constants for ChatX
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_VERSION = exports.APP_TAGLINE = exports.APP_NAME = exports.MAX_MESSAGES_HISTORY = exports.MAX_PARTICIPANTS_PER_ROOM = exports.AVATAR_COLORS = exports.ANIMALS = exports.ADJECTIVES = exports.AES_IV_LENGTH = exports.AES_KEY_LENGTH = exports.HKDF_INFO_FILE = exports.HKDF_INFO_MSG = exports.HKDF_SALT = exports.ALLOWED_MIME_TYPES = exports.MAX_FILE_SIZE_BYTES = exports.RATE_LIMIT_MSG_MAX = exports.RATE_LIMIT_MSG_WINDOW_MS = exports.RATE_LIMIT_CREATE_MAX = exports.RATE_LIMIT_CREATE_WINDOW_MS = exports.RATE_LIMIT_JOIN_MAX = exports.RATE_LIMIT_JOIN_WINDOW_MS = exports.CLEANUP_INTERVAL_MS = exports.DISCONNECT_GRACE_PERIOD_MS = exports.HEARTBEAT_TIMEOUT_MS = exports.HEARTBEAT_INTERVAL_MS = exports.ROOM_KEY_FORMAT_REGEX = void 0;
// Room key format: XXXX-XXXX-XXXX-XXXX (Base32 Crockford)
exports.ROOM_KEY_FORMAT_REGEX = /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;
// Heartbeat / presence
exports.HEARTBEAT_INTERVAL_MS = 10_000; // 10s - client sends ping
exports.HEARTBEAT_TIMEOUT_MS = 25_000; // 25s - server considers dead
exports.DISCONNECT_GRACE_PERIOD_MS = 15_000; // 15s grace on disconnect
exports.CLEANUP_INTERVAL_MS = 30_000; // 30s - server cleanup sweep
// Rate limits
exports.RATE_LIMIT_JOIN_WINDOW_MS = 60_000; // 1 minute
exports.RATE_LIMIT_JOIN_MAX = 10; // 10 joins per minute per IP
exports.RATE_LIMIT_CREATE_WINDOW_MS = 3_600_000; // 1 hour
exports.RATE_LIMIT_CREATE_MAX = 20; // 20 rooms per hour per IP
exports.RATE_LIMIT_MSG_WINDOW_MS = 60_000; // 1 minute
exports.RATE_LIMIT_MSG_MAX = 120; // 120 messages per minute
// File limits
exports.MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
exports.ALLOWED_MIME_TYPES = [
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
exports.HKDF_SALT = 'chatx-v1-salt-2024';
exports.HKDF_INFO_MSG = 'chatx-message-encryption';
exports.HKDF_INFO_FILE = 'chatx-file-encryption';
exports.AES_KEY_LENGTH = 256;
exports.AES_IV_LENGTH = 12; // 96 bits for GCM
// Anonymous name generation
exports.ADJECTIVES = [
    'Silent', 'Shadow', 'Swift', 'Azure', 'Crimson', 'Mystic', 'Ghost',
    'Ember', 'Frost', 'Jade', 'Onyx', 'Sage', 'Lunar', 'Solar', 'Storm',
    'Amber', 'Cobalt', 'Ivory', 'Scarlet', 'Violet', 'Indigo', 'Teal',
    'Nova', 'Pixel', 'Echo', 'Cipher', 'Phantom', 'Nebula', 'Zenith',
    'Quantum', 'Stealth', 'Nimble', 'Radiant', 'Velvet', 'Obsidian',
];
exports.ANIMALS = [
    'Fox', 'Wolf', 'Panda', 'Eagle', 'Falcon', 'Raven', 'Lynx', 'Panther',
    'Hawk', 'Crane', 'Manta', 'Orca', 'Jaguar', 'Viper', 'Owl', 'Bear',
    'Tiger', 'Leopard', 'Cheetah', 'Dragon', 'Phoenix', 'Cobra', 'Coyote',
    'Mantis', 'Kestrel', 'Ferret', 'Osprey', 'Badger', 'Wolverine', 'Cougar',
];
exports.AVATAR_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
    '#a855f7', '#d946ef', '#ef4444', '#84cc16', '#10b981',
];
// Room constraints
exports.MAX_PARTICIPANTS_PER_ROOM = 50;
exports.MAX_MESSAGES_HISTORY = 200; // messages loaded on join
// App info
exports.APP_NAME = 'ChatX';
exports.APP_TAGLINE = 'Private conversations. Nothing permanent.';
exports.APP_VERSION = '1.0.0';
//# sourceMappingURL=constants.js.map