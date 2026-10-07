import { Server as SocketServer } from 'socket.io';
import {
  getStaleParticipants, getStaleRooms, updateHeartbeat,
  findParticipantBySession, getConnectedParticipantCount,
} from '../database/queries';
import { destroyRoomWithFiles, handleParticipantLeave } from './roomService';
import { logger } from '../utils/logger';
import {
  HEARTBEAT_TIMEOUT_MS,
  CLEANUP_INTERVAL_MS,
} from '@chatx/shared/constants';

let io: SocketServer;

export function initCleanupService(socketServer: SocketServer): void {
  io = socketServer;

  setInterval(() => {
    runCleanup();
  }, CLEANUP_INTERVAL_MS);

  logger.info('Cleanup service initialized', {
    interval: CLEANUP_INTERVAL_MS,
  });
}

function runCleanup(): void {
  try {
    cleanupStaleParticipants();
    cleanupStaleRooms();
  } catch (err) {
    logger.error('Cleanup error', { err });
  }
}

function cleanupStaleParticipants(): void {
  const cutoff = Date.now() - HEARTBEAT_TIMEOUT_MS;
  const stale = getStaleParticipants(cutoff);

  for (const { session_id, room_id } of stale) {
    logger.info('Removing stale participant', { sessionId: session_id, roomId: room_id });

    const { roomDestroyed } = handleParticipantLeave(session_id, true);

    if (roomDestroyed) {
      // Notify any lingering sockets in the room
      io.to(room_id).emit('room:destroyed', {
        reason: 'All participants have left. Room permanently deleted.',
      });
      logger.info('Room destroyed after cleanup', { roomId: room_id });
    } else {
      // Update presence for remaining participants
      const { getParticipantsByRoom } = require('../database/queries');
      const participants = getParticipantsByRoom(room_id);
      io.to(room_id).emit('presence:update', { participants });
    }
  }
}

function cleanupStaleRooms(): void {
  // Rooms with 0 participants that weren't cleaned up (safety net)
  const staleRooms = getStaleRooms(5 * 60 * 1000); // inactive for 5+ minutes

  for (const { id } of staleRooms) {
    logger.info('Cleaning up abandoned room', { roomId: id });
    destroyRoomWithFiles(id);
    io.to(id).emit('room:destroyed', {
      reason: 'Room has been cleaned up due to inactivity.',
    });
  }
}
