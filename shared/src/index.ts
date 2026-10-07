// ============================================================
// Shared Types for ChatX
// ============================================================

export type MessageType = 'text' | 'file' | 'system';
export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';
export type RoomStatus = 'active' | 'deleted';
export type ParticipantStatus = 'online' | 'offline';

// ── Room ─────────────────────────────────────────────────────
export interface Room {
  id: string;
  name?: string;
  createdAt: number;
  lastActivityAt: number;
  participantCount: number;
  status: RoomStatus;
}

// ── Participant ───────────────────────────────────────────────
export interface Participant {
  id: string;
  roomId: string;
  sessionId: string;
  displayName: string;
  avatarColor: string;
  joinedAt: number;
  lastHeartbeat: number;
  isConnected: boolean;
}

// ── Message ───────────────────────────────────────────────────
export interface EncryptedMessage {
  id: string;
  roomId: string;
  senderSessionId: string;
  senderName: string;
  senderAvatarColor: string;
  encryptedContent: string; // base64(iv + ciphertext + authTag)
  messageType: MessageType;
  createdAt: number;
  // For file messages only:
  fileId?: string;
  encryptedFileName?: string;
  fileSize?: number;
  mimeType?: string;
}

// Client-side decrypted message
export interface ChatMessage {
  id: string;
  roomId: string;
  senderSessionId: string;
  senderName: string;
  senderAvatarColor: string;
  content: string;          // plaintext (decrypted)
  messageType: MessageType;
  createdAt: number;
  // File fields
  fileId?: string;
  fileName?: string;        // decrypted
  fileSize?: number;
  mimeType?: string;
  // UI state
  isOwn?: boolean;
  status?: 'sending' | 'sent' | 'error';
}

// ── WebSocket Payloads ────────────────────────────────────────
export interface WsJoinRoomPayload {
  roomId: string;
  sessionId: string;
  displayName: string;
  avatarColor: string;
}

export interface WsLeaveRoomPayload {
  roomId: string;
  sessionId: string;
}

export interface WsSendMessagePayload {
  roomId: string;
  sessionId: string;
  encryptedContent: string;
  messageType: MessageType;
  // File fields
  fileId?: string;
  encryptedFileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface WsTypingPayload {
  roomId: string;
  sessionId: string;
  displayName: string;
}

export interface WsHeartbeatPayload {
  roomId: string;
  sessionId: string;
}

// ── API Request/Response ──────────────────────────────────────
export interface CreateRoomRequest {
  displayName?: string;
  roomName?: string;
}

export interface CreateRoomResponse {
  roomId: string;
  roomKey: string;           // Full join key (shown to creator)
  roomName: string;
  sessionId: string;
  displayName: string;
  avatarColor: string;
}

export interface JoinRoomRequest {
  roomKey: string;
  displayName?: string;
}

export interface JoinRoomResponse {
  roomId: string;
  roomName: string;
  sessionId: string;
  displayName: string;
  avatarColor: string;
  participants: Participant[];
}

export interface MessagesResponse {
  messages: EncryptedMessage[];
}

export interface FileUploadResponse {
  fileId: string;
}

// ── Socket.IO Event Maps ──────────────────────────────────────
export interface ServerToClientEvents {
  'message:new': (msg: EncryptedMessage) => void;
  'message:deleted': (data: { messageId: string }) => void;
  'typing:update': (data: { typingUsers: { sessionId: string; displayName: string }[] }) => void;
  'presence:update': (data: { participants: Participant[] }) => void;
  'room:destroyed': (data: { reason: string }) => void;
  'room:userJoined': (data: { participant: Participant }) => void;
  'room:userLeft': (data: { sessionId: string; displayName: string }) => void;
  'heartbeat:pong': () => void;
  'error': (data: { code: string; message: string }) => void;
}

export interface ClientToServerEvents {
  'room:join': (payload: WsJoinRoomPayload) => void;
  'room:leave': (payload: WsLeaveRoomPayload) => void;
  'message:send': (payload: WsSendMessagePayload) => void;
  'typing:start': (payload: WsTypingPayload) => void;
  'typing:stop': (payload: WsTypingPayload) => void;
  'heartbeat:ping': (payload: WsHeartbeatPayload) => void;
}
