import fs from 'fs';
import path from 'path';
import {
  createRoom, findRoomByKeyHash, findRoomById, updateRoomActivity,
  updateRoomParticipantCount, destroyRoom, getConnectedParticipantCount,
  createParticipant, markParticipantDisconnected, removeParticipant,
  findParticipantBySession, getParticipantsByRoom, getFilesByRoom,
} from '../database/queries';
import {
  generateRoomKey, hashRoomKey, generateSessionId, generateId,
  generateAnonymousName, generateAvatarColor, validateRoomKeyFormat,
  formatRoomKey, normalizeRoomKey,
} from '../utils/crypto';
import { logger } from '../utils/logger';
import type { CreateRoomResponse, JoinRoomResponse } from '@chatx/shared';
import { MAX_PARTICIPANTS_PER_ROOM } from '@chatx/shared/constants';

const FILES_DIR = process.env.FILES_DIR || path.join(process.cwd(), 'data', 'files');
if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true });

// ── Room Service ──────────────────────────────────────────────────────────────

export function createNewRoom(
  providedDisplayName?: string,
  providedRoomName?: string,
): CreateRoomResponse {
  const roomKey = generateRoomKey();
  const keyHash = hashRoomKey(roomKey);
  const roomId = generateId();
  const sessionId = generateSessionId();
  const displayName = providedDisplayName?.trim().substring(0, 30) || generateAnonymousName();
  const roomName = providedRoomName?.trim().substring(0, 50) || 'Discussion Room';
  const avatarColor = generateAvatarColor(sessionId);

  // Create room first
  createRoom(roomId, keyHash, roomName);

  // Create participant record for the creator so socket auth works
  createParticipant(roomId, sessionId, displayName, avatarColor);
  updateRoomParticipantCount(roomId);
  updateRoomActivity(roomId);

  logger.info('Room created', { roomId, roomName });

  return { roomId, roomKey, roomName, sessionId, displayName, avatarColor };
}

export function joinRoom(
  roomKey: string,
  providedName?: string,
): JoinRoomResponse & { roomId: string } {
  if (!validateRoomKeyFormat(roomKey)) {
    throw new Error('INVALID_KEY_FORMAT');
  }

  const keyHash = hashRoomKey(roomKey);
  const room = findRoomByKeyHash(keyHash);

  if (!room) {
    throw new Error('ROOM_NOT_FOUND');
  }

  const connectedCount = getConnectedParticipantCount(room.id);
  if (connectedCount >= MAX_PARTICIPANTS_PER_ROOM) {
    throw new Error('ROOM_FULL');
  }

  const sessionId = generateSessionId();
  const displayName = providedName?.trim().substring(0, 30) || generateAnonymousName();
  const avatarColor = generateAvatarColor(sessionId);

  const participant = createParticipant(room.id, sessionId, displayName, avatarColor);
  updateRoomParticipantCount(room.id);
  updateRoomActivity(room.id);

  const participants = getParticipantsByRoom(room.id);

  logger.info('Participant joined room', { roomId: room.id });

  return {
    roomId: room.id,
    roomName: room.name || 'Discussion Room',
    sessionId,
    displayName: participant.displayName,
    avatarColor,
    participants,
  };
}

export function handleParticipantLeave(sessionId: string, immediate = false): {
  roomId: string | null;
  roomDestroyed: boolean;
} {
  const participant = findParticipantBySession(sessionId);
  if (!participant) return { roomId: null, roomDestroyed: false };

  const { roomId } = participant;

  if (immediate) {
    removeParticipant(sessionId);
  } else {
    markParticipantDisconnected(sessionId);
  }

  updateRoomParticipantCount(roomId);

  const remaining = getConnectedParticipantCount(roomId);

  if (remaining === 0) {
    // Destroy room
    destroyRoomWithFiles(roomId);
    return { roomId, roomDestroyed: true };
  }

  updateRoomActivity(roomId);
  return { roomId, roomDestroyed: false };
}

export function destroyRoomWithFiles(roomId: string): void {
  // Delete all encrypted file blobs from disk
  try {
    const files = getFilesByRoom(roomId);
    for (const file of files) {
      if (fs.existsSync(file.storage_path)) {
        fs.unlinkSync(file.storage_path);
        logger.info('Deleted encrypted file', { fileId: file.id });
      }
    }
  } catch (err) {
    logger.error('Error deleting room files', { roomId, err });
  }

  destroyRoom(roomId);
}

export function validateRoomAccess(roomId: string, sessionId: string): boolean {
  const participant = findParticipantBySession(sessionId);
  return !!(participant && participant.roomId === roomId);
}

export function getRoomByKey(roomKey: string) {
  if (!validateRoomKeyFormat(roomKey)) return null;
  const keyHash = hashRoomKey(roomKey);
  return findRoomByKeyHash(keyHash);
}
