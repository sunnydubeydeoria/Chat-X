import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Users, ChevronDown, LogOut, Copy, Check, Sun, Moon,
  Paperclip, Send, Smile, Shield, X, Info, Menu, AlertTriangle,
} from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useSocketRoom } from '../hooks/useSocketRoom';
import { MessageList } from '../components/room/MessageList';
import { MessageInput } from '../components/room/MessageInput';
import { ParticipantSidebar } from '../components/room/ParticipantSidebar';
import { ConnectionStatusBar } from '../components/room/ConnectionStatusBar';
import { FileUploadHandler } from '../components/room/FileUploadHandler';
import { LeaveConfirmDialog } from '../components/room/LeaveConfirmDialog';
import { TypingIndicator } from '../components/room/TypingIndicator';
import { formatRoomKey } from '../lib/utils';

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const session = useChatStore((s) => s.session);
  const participants = useChatStore((s) => s.participants);
  const connectionStatus = useChatStore((s) => s.connectionStatus);
  const { theme, toggleTheme, setMessages, addNotification } = useChatStore();

  const { sendMessage, startTyping, stopTyping, leaveRoom } = useSocketRoom();

  const [showSidebar, setShowSidebar] = useState(true);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [showRoomKey, setShowRoomKey] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // ── Redirect if no session ──────────────────────────────────────────
  useEffect(() => {
    if (!session || session.roomId !== roomId) {
      navigate('/', { replace: true });
    }
  }, [session, roomId, navigate]);

  // ── Load message history ────────────────────────────────────────────
  useEffect(() => {
    if (!session || session.roomId !== roomId) return;

    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}/messages`, {
          headers: { 'x-session-id': session.sessionId },
        });
        if (!res.ok) return;
        const data = await res.json();

        const { getRoomKeys, decryptMessage, decryptFileName } = await import('../lib/crypto/e2ee');
        const { msgKey, fileKey } = await getRoomKeys(session.roomKey);

        const decrypted = await Promise.all(
          data.messages.map(async (msg: any) => {
            try {
              let content = msg.encryptedContent;
              let fileName: string | undefined;

              if (msg.messageType !== 'system' && msg.messageType !== 'file') {
                content = await decryptMessage(msg.encryptedContent, msgKey);
              }
              if (msg.messageType === 'file' && msg.encryptedFileName) {
                try { fileName = await decryptFileName(msg.encryptedFileName, fileKey); }
                catch { fileName = 'Unknown file'; }
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
                isOwn: msg.senderSessionId === session.sessionId,
                status: 'sent' as const,
              };
            } catch {
              return null;
            }
          })
        );

        setMessages(decrypted.filter(Boolean) as any[]);
      } catch (err) {
        console.error('Failed to load history', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [session, roomId, setMessages]);

  const handleCopyKey = async () => {
    if (!session) return;
    await navigator.clipboard.writeText(session.roomKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
    addNotification('Room key copied!', 'success');
  };

  const onlineCount = participants.filter(p => p.isConnected).length;

  if (!session) return null;

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Connection Status Bar ──────────────────────────────────── */}
      <ConnectionStatusBar status={connectionStatus} />

      {/* ── Room Header ───────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="btn-ghost p-1.5 rounded-lg lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Room identity */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600
              flex items-center justify-center shadow-glow-accent flex-shrink-0">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {session.roomName || 'Temporary Room'}
                </span>
                <span className="encrypt-badge text-xs hidden sm:flex">
                  <Lock className="w-2.5 h-2.5" />
                  E2EE
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex items-center gap-1">
                  <span className="online-dot w-1.5 h-1.5" />
                  {onlineCount} online
                </span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline">Encrypted &amp; Temporary</span>
              </div>
            </div>
          </div>
        </div>

        {/* Room actions */}
        <div className="flex items-center gap-2">
          {/* Room key */}
          <div className="relative">
            <button
              onClick={() => setShowRoomKey(!showRoomKey)}
              className="btn-ghost px-3 py-1.5 rounded-lg text-xs font-mono hidden sm:flex items-center gap-1.5"
              aria-label="Show room key"
            >
              <Lock className="w-3 h-3" />
              Room Key
            </button>
            <AnimatePresence>
              {showRoomKey && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 z-50 card p-4 shadow-glass min-w-64"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Room Key
                    </span>
                    <button onClick={() => setShowRoomKey(false)} className="btn-ghost p-1 rounded">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="font-mono text-base font-semibold mb-3 tracking-widest"
                    style={{ color: 'var(--text-primary)' }}>
                    {session.roomKey}
                  </div>
                  <button
                    onClick={handleCopyKey}
                    className="btn-ghost w-full py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-2"
                  >
                    {keyCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {keyCopied ? 'Copied!' : 'Copy Key'}
                  </button>
                  <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
                    Share this key to invite others
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme toggle */}
          <button onClick={toggleTheme} className="btn-ghost p-1.5 rounded-lg" aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Leave room */}
          <button
            onClick={() => setShowLeaveDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171',
            }}
            aria-label="Leave room"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* ── Main chat area ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Messages Panel ────────────────────────────────────── */}
        <main className="flex flex-col flex-1 overflow-hidden">
          {/* Message history */}
          <div className="flex-1 overflow-hidden">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading messages...</p>
                </div>
              </div>
            ) : (
              <MessageList />
            )}
          </div>

          {/* Typing indicator */}
          <TypingIndicator />

          {/* Message input */}
          <div className="flex-shrink-0 p-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <MessageInput
              onSend={sendMessage}
              onTypingStart={startTyping}
              onTypingStop={stopTyping}
              session={session}
            />
          </div>
        </main>

        {/* ── Participant Sidebar ───────────────────────────────── */}
        <AnimatePresence>
          {showSidebar && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 overflow-hidden border-l"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <ParticipantSidebar
                participants={participants}
                currentSessionId={session.sessionId}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ── File Upload Handler (global) ──────────────────────────── */}
      <FileUploadHandler roomId={roomId!} session={session} />

      {/* ── Leave Confirmation Dialog ─────────────────────────────── */}
      <LeaveConfirmDialog
        open={showLeaveDialog}
        onClose={() => setShowLeaveDialog(false)}
        onConfirm={leaveRoom}
        isLastParticipant={participants.filter(p => p.isConnected).length <= 1}
      />
    </div>
  );
}
