import { runDb, queryDb, queryOneDb } from './db';
import { generateId } from '../utils/crypto';
import { logger } from '../utils/logger';
import type { Participant, Room } from '@chatx/shared';

// ── Room Queries ──────────────────────────────────────────────────────────────

export function findRoomByKeyHash(keyHash: string): Room | null {
  const row = queryOneDb(
    `SELECT * FROM rooms WHERE room_key_hash = ? AND status = 'active'`,
    [keyHash],
  );
  return row ? mapRoomRow(row) : null;
}

export function findRoomById(roomId: string): Room | null {
  const row = queryOneDb(
    `SELECT * FROM rooms WHERE id = ? AND status = 'active'`,
    [roomId],
  );
  return row ? mapRoomRow(row) : null;
}

export function createRoom(roomId: string, keyHash: string, name = 'Discussion Room'): Room {
  const now = Date.now();
  runDb(
    `INSERT INTO rooms (id, room_key_hash, name, created_at, last_activity_at, participant_count, status)
     VALUES (?, ?, ?, ?, ?, 0, 'active')`,
    [roomId, keyHash, name, now, now],
  );
  return { id: roomId, name, createdAt: now, lastActivityAt: now, participantCount: 0, status: 'active' };
}

export function updateRoomActivity(roomId: string): void {
  runDb(`UPDATE rooms SET last_activity_at = ? WHERE id = ?`, [Date.now(), roomId]);
}

export function updateRoomParticipantCount(roomId: string): void {
  const row = queryOneDb(
    `SELECT COUNT(*) as cnt FROM participants WHERE room_id = ? AND is_connected = 1`,
    [roomId],
  );
  runDb(
    `UPDATE rooms SET participant_count = ? WHERE id = ?`,
    [row?.cnt ?? 0, roomId],
  );
}

export function destroyRoom(roomId: string): void {
  runDb(`DELETE FROM messages WHERE room_id = ?`, [roomId]);
  runDb(`DELETE FROM files WHERE room_id = ?`, [roomId]);
  runDb(`DELETE FROM participants WHERE room_id = ?`, [roomId]);
  runDb(`DELETE FROM rooms WHERE id = ?`, [roomId]);
  logger.info('Room permanently destroyed', { roomId });
}

// ── Participant Queries ───────────────────────────────────────────────────────

export function getParticipantsByRoom(roomId: string): Participant[] {
  const rows = queryDb(
    `SELECT * FROM participants WHERE room_id = ? ORDER BY joined_at ASC`,
    [roomId],
  );
  return rows.map(mapParticipantRow);
}

export function getConnectedParticipantCount(roomId: string): number {
  const row = queryOneDb(
    `SELECT COUNT(*) as cnt FROM participants WHERE room_id = ? AND is_connected = 1`,
    [roomId],
  );
  return (row?.cnt as number) ?? 0;
}

export function findParticipantBySession(sessionId: string): Participant | null {
  const row = queryOneDb(`SELECT * FROM participants WHERE session_id = ?`, [sessionId]);
  return row ? mapParticipantRow(row) : null;
}

export function createParticipant(
  roomId: string,
  sessionId: string,
  displayName: string,
  avatarColor: string,
): Participant {
  const id = generateId();
  const now = Date.now();

  runDb(
    `INSERT INTO participants (id, room_id, session_id, display_name, avatar_color, joined_at, last_heartbeat, is_connected)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [id, roomId, sessionId, displayName, avatarColor, now, now],
  );

  return {
    id, roomId, sessionId, displayName, avatarColor,
    joinedAt: now, lastHeartbeat: now, isConnected: true,
  };
}

export function updateHeartbeat(sessionId: string): void {
  runDb(
    `UPDATE participants SET last_heartbeat = ?, is_connected = 1 WHERE session_id = ?`,
    [Date.now(), sessionId],
  );
}

export function markParticipantDisconnected(sessionId: string): void {
  runDb(`UPDATE participants SET is_connected = 0 WHERE session_id = ?`, [sessionId]);
}

export function updateDisplayName(sessionId: string, displayName: string): void {
  runDb(`UPDATE participants SET display_name = ? WHERE session_id = ?`, [displayName, sessionId]);
}

export function removeParticipant(sessionId: string): void {
  runDb(`DELETE FROM participants WHERE session_id = ?`, [sessionId]);
}

// ── Message Queries ───────────────────────────────────────────────────────────

export function getMessages(roomId: string, limit = 200): any[] {
  // Get last N messages ordered by time
  const rows = queryDb(
    `SELECT * FROM (
       SELECT * FROM messages WHERE room_id = ? ORDER BY created_at DESC LIMIT ?
     ) ORDER BY created_at ASC`,
    [roomId, limit],
  );
  return rows;
}

export function saveMessage(data: {
  id: string; roomId: string; senderSessionId: string; senderName: string;
  senderAvatarColor: string; encryptedContent: string; messageType: string;
  fileId?: string; encryptedFileName?: string; fileSize?: number; mimeType?: string;
}): void {
  runDb(
    `INSERT INTO messages (
       id, room_id, sender_session_id, sender_name, sender_avatar_color,
       encrypted_content, message_type, file_id, encrypted_file_name, file_size, mime_type, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.id, data.roomId, data.senderSessionId, data.senderName, data.senderAvatarColor,
      data.encryptedContent, data.messageType,
      data.fileId ?? null, data.encryptedFileName ?? null,
      data.fileSize ?? null, data.mimeType ?? null,
      Date.now(),
    ],
  );
}

export function deleteMessage(messageId: string, senderSessionId: string): boolean {
  const before = queryOneDb(`SELECT id FROM messages WHERE id = ?`, [messageId]);
  if (!before) return false;
  runDb(`DELETE FROM messages WHERE id = ? AND sender_session_id = ?`, [messageId, senderSessionId]);
  return true;
}

// ── File Queries ──────────────────────────────────────────────────────────────

export function saveFile(data: {
  id: string; roomId: string; senderSessionId: string;
  storagePath: string; encryptedFileName: string; fileSize: number; mimeType: string;
}): void {
  runDb(
    `INSERT INTO files (id, room_id, sender_session_id, storage_path, encrypted_file_name, file_size, mime_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.id, data.roomId, data.senderSessionId, data.storagePath,
     data.encryptedFileName, data.fileSize, data.mimeType, Date.now()],
  );
}

export function findFile(fileId: string): any {
  return queryOneDb(`SELECT * FROM files WHERE id = ?`, [fileId]);
}

export function getFilesByRoom(roomId: string): any[] {
  return queryDb(`SELECT * FROM files WHERE room_id = ?`, [roomId]);
}

// ── Stale Data Queries ────────────────────────────────────────────────────────

export function getStaleRooms(olderThanMs: number): { id: string }[] {
  const cutoff = Date.now() - olderThanMs;
  return queryDb(
    `SELECT id FROM rooms WHERE status = 'active' AND last_activity_at < ? AND participant_count = 0`,
    [cutoff],
  ) as { id: string }[];
}

export function getStaleParticipants(heartbeatCutoff: number): { session_id: string; room_id: string }[] {
  return queryDb(
    `SELECT session_id, room_id FROM participants WHERE is_connected = 1 AND last_heartbeat < ?`,
    [heartbeatCutoff],
  ) as { session_id: string; room_id: string }[];
}

// ── Row Mappers ───────────────────────────────────────────────────────────────

function mapRoomRow(row: any): Room {
  return {
    id: row.id as string,
    name: (row.name as string) || 'Discussion Room',
    createdAt: row.created_at as number,
    lastActivityAt: row.last_activity_at as number,
    participantCount: row.participant_count as number,
    status: row.status as any,
  };
}

function mapParticipantRow(row: any): Participant {
  return {
    id: row.id as string,
    roomId: row.room_id as string,
    sessionId: row.session_id as string,
    displayName: row.display_name as string,
    avatarColor: row.avatar_color as string,
    joinedAt: row.joined_at as number,
    lastHeartbeat: row.last_heartbeat as number,
    isConnected: row.is_connected === 1 || row.is_connected === true,
  };
}
