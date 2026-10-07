import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import {
  findParticipantBySession, getParticipantsByRoom, updateHeartbeat,
  saveMessage, getConnectedParticipantCount, updateDisplayName,
} from '../database/queries';
import {
  handleParticipantLeave, validateRoomAccess, destroyRoomWithFiles,
} from '../services/roomService';
import { generateId } from '../utils/crypto';
import { logger } from '../utils/logger';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  WsJoinRoomPayload,
  WsLeaveRoomPayload,
  WsSendMessagePayload,
  WsTypingPayload,
  WsHeartbeatPayload,
} from '@chatx/shared';
import { DISCONNECT_GRACE_PERIOD_MS } from '@chatx/shared/constants';
import { initCleanupService } from '../services/cleanupService';

// Track typing state per room: Map<roomId, Map<sessionId, displayName>>
const typingUsers = new Map<string, Map<string, string>>();
// Track disconnect timers for grace period
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
// Track socket → session mapping
const socketSessionMap = new Map<string, { sessionId: string; roomId: string }>();

export function initWebSocket(httpServer: HttpServer): SocketServer {
  const io = new SocketServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 10000,
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    logger.info('Socket connected', { socketId: socket.id });

    // ── room:join ──────────────────────────────────────────────────────────
    socket.on('room:join', async (payload: WsJoinRoomPayload) => {
      try {
        const { roomId, sessionId, displayName, avatarColor } = payload;

        // Validate participant exists in DB
        const participant = findParticipantBySession(sessionId);
        if (!participant || participant.roomId !== roomId) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Invalid session' });
          return;
        }

        // Cancel any pending disconnect timer for this session (reconnection)
        const existingTimer = disconnectTimers.get(sessionId);
        if (existingTimer) {
          clearTimeout(existingTimer);
          disconnectTimers.delete(sessionId);
          logger.info('Participant reconnected within grace period', { sessionId });
        }

        // Join socket room
        socket.join(roomId);
        socketSessionMap.set(socket.id, { sessionId, roomId });

        // Update heartbeat
        updateHeartbeat(sessionId);

        // Broadcast user joined to others
        const participants = getParticipantsByRoom(roomId);
        socket.to(roomId).emit('room:userJoined', { participant });
        io.to(roomId).emit('presence:update', { participants });

        logger.info('Participant joined socket room', { roomId, displayName });
      } catch (err) {
        logger.error('room:join error', { err });
        socket.emit('error', { code: 'JOIN_FAILED', message: 'Failed to join room' });
      }
    });

    // ── room:leave ─────────────────────────────────────────────────────────
    socket.on('room:leave', async (payload: WsLeaveRoomPayload) => {
      try {
        const { roomId, sessionId } = payload;
        const participant = findParticipantBySession(sessionId);
        if (!participant) return;

        // Broadcast leave event
        socket.to(roomId).emit('room:userLeft', {
          sessionId,
          displayName: participant.displayName,
        });

        // Immediate leave (explicit, not disconnect)
        const { roomDestroyed } = handleParticipantLeave(sessionId, true);

        if (roomDestroyed) {
          io.to(roomId).emit('room:destroyed', {
            reason: 'The last participant has left. Room permanently deleted.',
          });
          logger.info('Room destroyed on explicit leave', { roomId });
        } else {
          const participants = getParticipantsByRoom(roomId);
          io.to(roomId).emit('presence:update', { participants });
        }

        // Remove typing state
        cleanupTyping(roomId, sessionId, io);

        socket.leave(roomId);
        socketSessionMap.delete(socket.id);
      } catch (err) {
        logger.error('room:leave error', { err });
      }
    });

    // ── message:send ───────────────────────────────────────────────────────
    socket.on('message:send', (payload: WsSendMessagePayload) => {
      try {
        const { roomId, sessionId, encryptedContent, messageType, fileId, encryptedFileName, fileSize, mimeType } = payload;

        // Authorize
        if (!validateRoomAccess(roomId, sessionId)) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Not authorized to send to this room' });
          return;
        }

        const participant = findParticipantBySession(sessionId);
        if (!participant) return;

        const msgId = generateId();

        // IMPORTANT: Only encrypted content is stored/forwarded — server never sees plaintext
        const encryptedMessage = {
          id: msgId,
          roomId,
          senderSessionId: sessionId,
          senderName: participant.displayName,
          senderAvatarColor: participant.avatarColor,
          encryptedContent,
          messageType,
          createdAt: Date.now(),
          fileId,
          encryptedFileName,
          fileSize,
          mimeType,
        };

        // Save to DB (encrypted)
        saveMessage({
          id: msgId,
          roomId,
          senderSessionId: sessionId,
          senderName: participant.displayName,
          senderAvatarColor: participant.avatarColor,
          encryptedContent,
          messageType,
          fileId,
          encryptedFileName,
          fileSize,
          mimeType,
        });

        // Broadcast to all in room (including sender for confirmation)
        io.to(roomId).emit('message:new', encryptedMessage);

        // Stop typing on send
        cleanupTyping(roomId, sessionId, io);
      } catch (err) {
        logger.error('message:send error', { err });
      }
    });

    // ── typing:start ───────────────────────────────────────────────────────
    socket.on('typing:start', (payload: WsTypingPayload) => {
      const { roomId, sessionId, displayName } = payload;

      if (!typingUsers.has(roomId)) {
        typingUsers.set(roomId, new Map());
      }
      typingUsers.get(roomId)!.set(sessionId, displayName);

      broadcastTyping(roomId, io);
    });

    // ── typing:stop ────────────────────────────────────────────────────────
    socket.on('typing:stop', (payload: WsTypingPayload) => {
      cleanupTyping(payload.roomId, payload.sessionId, io);
    });

    // ── heartbeat:ping ─────────────────────────────────────────────────────
    socket.on('heartbeat:ping', (payload: WsHeartbeatPayload) => {
      const { sessionId } = payload;
      updateHeartbeat(sessionId);
      socket.emit('heartbeat:pong');
    });

    // ── disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      const mapping = socketSessionMap.get(socket.id);
      if (!mapping) return;

      const { sessionId, roomId } = mapping;
      socketSessionMap.delete(socket.id);

      logger.info('Socket disconnected', { socketId: socket.id, reason, sessionId });

      // Immediately cleanup typing indicator for disconnected participant
      cleanupTyping(roomId, sessionId, io);

      const participant = findParticipantBySession(sessionId);
      if (!participant) return;

      // Mark offline but don't remove yet — use grace period
      handleParticipantLeave(sessionId, false);

      // Notify others of temporary disconnect
      socket.to(roomId).emit('room:userLeft', {
        sessionId,
        displayName: participant.displayName,
      });
      const participants = getParticipantsByRoom(roomId).filter(p => p.sessionId !== sessionId);
      socket.to(roomId).emit('presence:update', { participants });

      // Grace period timer
      const timer = setTimeout(() => {
        disconnectTimers.delete(sessionId);
        logger.info('Grace period expired, removing participant', { sessionId });

        const { roomDestroyed } = handleParticipantLeave(sessionId, true);

        if (roomDestroyed) {
          io.to(roomId).emit('room:destroyed', {
            reason: 'All participants have left. Room permanently deleted.',
          });
        } else {
          const remaining = getParticipantsByRoom(roomId);
          io.to(roomId).emit('presence:update', { participants: remaining });
        }

        // Cleanup typing
        cleanupTyping(roomId, sessionId, io);
      }, DISCONNECT_GRACE_PERIOD_MS);

      disconnectTimers.set(sessionId, timer);
    });
  });

  // Initialize background cleanup
  initCleanupService(io);

  return io;
}

function broadcastTyping(roomId: string, io: SocketServer): void {
  const users = typingUsers.get(roomId);
  if (!users) return;

  const typingList = Array.from(users.entries()).map(([sessionId, displayName]) => ({
    sessionId,
    displayName,
  }));

  io.to(roomId).emit('typing:update', { typingUsers: typingList });
}

function cleanupTyping(roomId: string, sessionId: string, io: SocketServer): void {
  const users = typingUsers.get(roomId);
  if (!users) return;

  if (users.has(sessionId)) {
    users.delete(sessionId);
    if (users.size === 0) {
      typingUsers.delete(roomId);
    }
    broadcastTyping(roomId, io);
  }
}
