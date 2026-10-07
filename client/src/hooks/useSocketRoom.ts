import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket, connectSocket, disconnectSocket } from '../lib/socket/socketClient';
import { useChatStore } from '../store/chatStore';
import { getRoomKeys, encryptMessage, decryptMessage, decryptFileName } from '../lib/crypto/e2ee';
import type { EncryptedMessage, ChatMessage, WsSendMessagePayload } from '@chatx/shared';
import { HEARTBEAT_INTERVAL_MS } from '@chatx/shared/constants';

export function useSocketRoom() {
  const navigate = useNavigate();
  const session = useChatStore((s) => s.session);
  const {
    addMessage, setParticipants, setTypingUsers, setConnectionStatus,
    addNotification, resetRoom,
  } = useChatStore();

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  // Keep a stable ref to session so callbacks don't go stale
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  // ── Decrypt incoming message ────────────────────────────────────────
  const decryptIncoming = useCallback(async (msg: EncryptedMessage): Promise<ChatMessage | null> => {
    const sess = sessionRef.current;
    if (!sess) return null;
    try {
      const { msgKey, fileKey } = await getRoomKeys(sess.roomKey);

      let content = '';
      let fileName: string | undefined;

      if (msg.messageType === 'system') {
        content = msg.encryptedContent;
      } else if (msg.messageType === 'file') {
        content = '[Encrypted File]';
        if (msg.encryptedFileName) {
          try { fileName = await decryptFileName(msg.encryptedFileName, fileKey); }
          catch { fileName = 'Unknown file'; }
        }
      } else {
        content = await decryptMessage(msg.encryptedContent, msgKey);
      }

      return {
        id: msg.id,
        roomId: msg.roomId,
        senderSessionId: msg.senderSessionId,
        senderName: msg.senderName,
        senderAvatarColor: msg.senderAvatarColor,
        content,
        messageType: msg.messageType,
        createdAt: msg.createdAt,
        fileId: msg.fileId,
        fileName,
        fileSize: msg.fileSize,
        mimeType: msg.mimeType,
        isOwn: msg.senderSessionId === sess.sessionId,
        status: 'sent',
      };
    } catch (err) {
      console.error('Decryption failed:', err);
      return null;
    }
  }, []); // stable — uses sessionRef

  // ── Initialize socket connection ────────────────────────────────────
  useEffect(() => {
    if (!session) return;

    const socket = getSocket();

    // If already connected, just join the room
    if (socket.connected) {
      socket.emit('room:join', {
        roomId: session.roomId,
        sessionId: session.sessionId,
        displayName: session.displayName,
        avatarColor: session.avatarColor,
      });
      setConnectionStatus('connected');
    } else {
      connectSocket();
    }

    // ── Event Listeners ────────────────────────────────────────────
    const onConnect = () => {
      setConnectionStatus('connected');
      socket.emit('room:join', {
        roomId: session.roomId,
        sessionId: session.sessionId,
        displayName: session.displayName,
        avatarColor: session.avatarColor,
      });
    };

    const onDisconnect = () => {
      setConnectionStatus('reconnecting');
    };

    const onConnectError = () => {
      setConnectionStatus('disconnected');
    };

    const onMessageNew = async (msg: EncryptedMessage) => {
      const decrypted = await decryptIncoming(msg);
      if (decrypted) addMessage(decrypted);
    };

    const onPresenceUpdate = ({ participants }: any) => {
      setParticipants(participants);
    };

    const onTypingUpdate = ({ typingUsers }: any) => {
      const sess = sessionRef.current;
      setTypingUsers(typingUsers.filter((u: any) => u.sessionId !== sess?.sessionId));
    };

    const onUserJoined = ({ participant }: any) => {
      addNotification(`${participant.displayName} joined the room`, 'info');
    };

    const onUserLeft = ({ displayName }: any) => {
      addNotification(`${displayName} left the room`, 'info');
    };

    const onRoomDestroyed = ({ reason }: any) => {
      addNotification('This room has been permanently deleted.', 'warning');
      setTimeout(() => {
        resetRoom();
        navigate('/', { replace: true });
      }, 2000);
    };

    const onError = ({ code, message }: any) => {
      console.error('Socket error:', code, message);
      addNotification(`Connection error: ${message}`, 'error');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('message:new', onMessageNew);
    socket.on('presence:update', onPresenceUpdate);
    socket.on('typing:update', onTypingUpdate);
    socket.on('room:userJoined', onUserJoined);
    socket.on('room:userLeft', onUserLeft);
    socket.on('room:destroyed', onRoomDestroyed);
    socket.on('heartbeat:pong', () => { /* acknowledged */ });
    socket.on('error', onError);

    // ── Heartbeat ──────────────────────────────────────────────────
    heartbeatRef.current = setInterval(() => {
      const sess = sessionRef.current;
      if (socket.connected && sess) {
        socket.emit('heartbeat:ping', {
          roomId: sess.roomId,
          sessionId: sess.sessionId,
        });
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('message:new', onMessageNew);
      socket.off('presence:update', onPresenceUpdate);
      socket.off('typing:update', onTypingUpdate);
      socket.off('room:userJoined', onUserJoined);
      socket.off('room:userLeft', onUserLeft);
      socket.off('room:destroyed', onRoomDestroyed);
      socket.off('heartbeat:pong');
      socket.off('error', onError);
    };
  }, [session?.sessionId]); // Only re-run when session changes

  // ── Send message ────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const sess = sessionRef.current;
    if (!sess || !text.trim()) return;

    const socket = getSocket();
    const { msgKey } = await getRoomKeys(sess.roomKey);
    const encryptedContent = await encryptMessage(text.trim(), msgKey);

    const payload: WsSendMessagePayload = {
      roomId: sess.roomId,
      sessionId: sess.sessionId,
      encryptedContent,
      messageType: 'text',
    };

    socket.emit('message:send', payload);
    stopTyping();
  }, []);

  // ── Typing indicators ───────────────────────────────────────────────
  const stopTyping = useCallback(() => {
    const sess = sessionRef.current;
    if (!sess) return;
    const socket = getSocket();

    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit('typing:stop', {
        roomId: sess.roomId,
        sessionId: sess.sessionId,
        displayName: sess.displayName,
      });
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, []);

  const startTyping = useCallback(() => {
    const sess = sessionRef.current;
    if (!sess) return;
    const socket = getSocket();

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing:start', {
        roomId: sess.roomId,
        sessionId: sess.sessionId,
        displayName: sess.displayName,
      });
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => stopTyping(), 2000);
  }, [stopTyping]);

  // ── Leave room ──────────────────────────────────────────────────────
  const leaveRoom = useCallback(() => {
    const sess = sessionRef.current;
    if (!sess) return;
    const socket = getSocket();

    socket.emit('room:leave', {
      roomId: sess.roomId,
      sessionId: sess.sessionId,
    });

    disconnectSocket();
    resetRoom();
    navigate('/', { replace: true });
  }, [resetRoom, navigate]);

  return { sendMessage, startTyping, stopTyping, leaveRoom };
}
