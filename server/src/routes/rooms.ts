import { Router, Request, Response } from 'express';
import { createNewRoom, joinRoom } from '../services/roomService';
import { getMessages } from '../database/queries';
import { logger } from '../utils/logger';
import { validateRoomKeyFormat, normalizeRoomKey, formatRoomKey } from '../utils/crypto';

const router = Router();

// ── POST /api/rooms — Create a new room ─────────────────────────────────────
router.post('/', (req: Request, res: Response) => {
  try {
    const { displayName, roomName } = req.body || {};
    const result = createNewRoom(displayName, roomName);
    res.status(201).json(result);
  } catch (err) {
    logger.error('Create room failed', { err });
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// ── POST /api/rooms/join — Join an existing room ─────────────────────────────
router.post('/join', (req: Request, res: Response) => {
  try {
    const { roomKey, displayName } = req.body;

    if (!roomKey || typeof roomKey !== 'string') {
      return res.status(400).json({ error: 'Room key is required' });
    }

    const result = joinRoom(roomKey.trim(), displayName);
    res.status(200).json(result);
  } catch (err: any) {
    if (err.message === 'INVALID_KEY_FORMAT') {
      return res.status(400).json({ error: 'Invalid room key format' });
    }
    if (err.message === 'ROOM_NOT_FOUND') {
      // Return same message for not found vs expired — don't reveal status
      return res.status(404).json({ error: 'Room not found or already expired' });
    }
    if (err.message === 'ROOM_FULL') {
      return res.status(409).json({ error: 'This room has reached its participant limit' });
    }
    logger.error('Join room failed', { err });
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// ── GET /api/rooms/:roomId/messages — Get encrypted message history ──────────
router.get('/:roomId/messages', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      return res.status(401).json({ error: 'Session ID required' });
    }

    // Verify session is in this room
    const { findParticipantBySession } = require('../database/queries');
    const participant = findParticipantBySession(sessionId);
    if (!participant || participant.roomId !== roomId) {
      return res.status(403).json({ error: 'Not authorized to access this room' });
    }

    const messages = getMessages(roomId, 200);
    const formatted = messages.map((m: any) => ({
      id: m.id,
      roomId: m.room_id,
      senderSessionId: m.sender_session_id,
      senderName: m.sender_name,
      senderAvatarColor: m.sender_avatar_color,
      encryptedContent: m.encrypted_content,
      messageType: m.message_type,
      createdAt: m.created_at,
      fileId: m.file_id,
      encryptedFileName: m.encrypted_file_name,
      fileSize: m.file_size,
      mimeType: m.mime_type,
    }));

    res.json({ messages: formatted });
  } catch (err) {
    logger.error('Get messages failed', { err });
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

export default router;
