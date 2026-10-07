import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Zap, Trash2, Lock, Users, FileText, ChevronRight,
  Copy, Check, Sun, Moon, User, MessageSquare,
} from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { clearKeyCache } from '../lib/crypto/e2ee';

const API_BASE = '/api';

// ── Animation variants ────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// ── Feature cards data ────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Lock,
    title: 'End-to-End Encrypted',
    desc: 'Messages are encrypted in your browser using AES-256-GCM before transmission. The server never sees plaintext.',
    color: 'from-violet-500 to-indigo-500',
    bg: 'rgba(99,102,241,0.08)',
    border: 'rgba(99,102,241,0.2)',
  },
  {
    icon: Trash2,
    title: 'Auto-Destroy',
    desc: 'Rooms and all data are permanently deleted when the last participant leaves. Nothing is retained.',
    color: 'from-rose-500 to-pink-500',
    bg: 'rgba(244,63,94,0.08)',
    border: 'rgba(244,63,94,0.2)',
  },
  {
    icon: Zap,
    title: 'Real-Time Messaging',
    desc: 'Instant message delivery via WebSockets. Typing indicators, presence, and live participant updates.',
    color: 'from-amber-500 to-orange-500',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
  },
  {
    icon: FileText,
    title: 'Encrypted File Sharing',
    desc: 'Share files of up to 50 MB. Files are encrypted client-side before upload and decrypted on download.',
    color: 'from-emerald-500 to-teal-500',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
  },
  {
    icon: Users,
    title: 'Anonymous by Default',
    desc: 'No registration required. Join with a generated identity. Only share what you choose to share.',
    color: 'from-cyan-500 to-blue-500',
    bg: 'rgba(6,182,212,0.08)',
    border: 'rgba(6,182,212,0.2)',
  },
  {
    icon: Shield,
    title: 'Zero Server Knowledge',
    desc: 'Encryption keys never leave your device. The server stores only encrypted ciphertext it cannot read.',
    color: 'from-purple-500 to-violet-500',
    bg: 'rgba(168,85,247,0.08)',
    border: 'rgba(168,85,247,0.2)',
  },
];

// ── How it works steps ────────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  { step: '01', title: 'Create a Room', desc: 'Get a unique encrypted room key in seconds.' },
  { step: '02', title: 'Share the Key', desc: 'Send the room key to anyone you want to chat with.' },
  { step: '03', title: 'Chat Securely', desc: 'Messages are encrypted end-to-end in your browser.' },
  { step: '04', title: 'Room Self-Destructs', desc: 'When everyone leaves, the room and all data vanish forever.' },
];

// ── Main Component ────────────────────────────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme, addNotification, setSession } = useChatStore();

  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createRoomName, setCreateRoomName] = useState('');
  const [joinDisplayName, setJoinDisplayName] = useState('');
  const [joinKey, setJoinKey] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [createdRoom, setCreatedRoom] = useState<{
    roomKey: string; roomId: string; roomName: string; sessionId: string; displayName: string; avatarColor: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const res = await fetch(`${API_BASE}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: createDisplayName.trim(),
          roomName: createRoomName.trim(),
        }),
      });
      if (!res.ok) throw new Error('Failed to create room');
      const data = await res.json();
      clearKeyCache();
      setCreatedRoom(data);
    } catch {
      addNotification('Failed to create room. Please try again.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEnterRoom = () => {
    if (!createdRoom) return;
    setSession({
      roomId: createdRoom.roomId,
      roomKey: createdRoom.roomKey,
      roomName: createdRoom.roomName,
      sessionId: createdRoom.sessionId,
      displayName: createdRoom.displayName,
      avatarColor: createdRoom.avatarColor,
    });
    navigate(`/room/${createdRoom.roomId}`);
  };

  const handleJoinRoom = async () => {
    const key = joinKey.trim();
    if (!key) return;

    setIsJoining(true);
    setJoinError('');

    try {
      const res = await fetch(`${API_BASE}/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomKey: key,
          displayName: joinDisplayName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setJoinError(data.error || 'Room not found or already expired.');
        return;
      }

      clearKeyCache();
      setSession({
        roomId: data.roomId,
        roomKey: key,
        roomName: data.roomName,
        sessionId: data.sessionId,
        displayName: data.displayName,
        avatarColor: data.avatarColor,
      });
      navigate(`/room/${data.roomId}`);
    } catch {
      setJoinError('Unable to connect. Please check your connection.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCopyKey = async () => {
    if (!createdRoom) return;
    await navigator.clipboard.writeText(createdRoom.roomKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addNotification('Room key copied to clipboard!', 'success');
  };

  const handleKeyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '');
    // Auto-insert dashes
    if (val.length > 4)  val = val.slice(0, 4) + '-' + val.slice(4);
    if (val.length > 9)  val = val.slice(0, 9) + '-' + val.slice(9);
    if (val.length > 14) val = val.slice(0, 14) + '-' + val.slice(14);
    val = val.slice(0, 19); // max XXXX-XXXX-XXXX-XXXX
    setJoinKey(val);
    setJoinError('');
  };

  return (
    <div className="min-h-screen animated-bg relative">
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* ── Hero glow orbs ──────────────────────────────────────────── */}
      <div className="hero-glow" style={{ top: '-100px', left: '50%', transform: 'translateX(-50%)' }} />
      <div
        className="hero-glow opacity-40"
        style={{ top: '60%', left: '-100px', width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)' }}
      />

      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-glow-accent">
            <Lock className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
            Chat<span className="gradient-text">X</span>
          </span>
        </motion.div>

        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="encrypt-badge hidden sm:flex">
            <Lock className="w-3 h-3" />
            <span>E2E Encrypted</span>
          </div>
          <button
            onClick={toggleTheme}
            className="btn-ghost p-2 rounded-lg transition-all"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </motion.div>
      </nav>

      {/* ── Hero Section ────────────────────────────────────────────── */}
      <section className="relative z-10 pt-16 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeUp} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium"
                style={{
                  background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  color: '#818cf8',
                }}>
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-slow" />
                No registration required
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Private conversations.
              <br />
              <span className="gradient-text">Nothing permanent.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-12"
              style={{ color: 'var(--text-secondary)' }}
            >
              Create a temporary encrypted room, share the key, chat securely.
              When everyone leaves, the room and every message disappear forever.
            </motion.p>

            {/* ── CTA Card ───────────────────────────────────────────── */}
            <motion.div variants={fadeUp} className="max-w-md mx-auto">
              <AnimatePresence mode="wait">
                {!createdRoom ? (
                  <motion.div
                    key="cta"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="card p-6 shadow-glass"
                  >
                    {/* Tab switcher */}
                    <div className="flex rounded-xl p-1 mb-6"
                      style={{ background: 'var(--bg-elevated)' }}>
                      {(['create', 'join'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className="flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all"
                          style={{
                            background: activeTab === tab ? 'var(--accent)' : 'transparent',
                            color: activeTab === tab ? 'white' : 'var(--text-secondary)',
                          }}
                        >
                          {tab === 'create' ? '+ Create Room' : '→ Join Room'}
                        </button>
                      ))}
                    </div>

                    <AnimatePresence mode="wait">
                      {activeTab === 'create' ? (
                        <motion.div
                          key="create"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-4"
                        >
                          {/* Option 1: Write Your Name */}
                          <div className="text-left">
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                              style={{ color: 'var(--text-secondary)' }}>
                              1. Write Your Name
                            </label>
                            <div className="relative">
                              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                                style={{ color: 'var(--text-muted)' }} />
                              <input
                                type="text"
                                value={createDisplayName}
                                onChange={(e) => setCreateDisplayName(e.target.value)}
                                placeholder="Enter your name (e.g. Alex)"
                                className="input-base py-2.5 pl-10 pr-4 text-sm w-full"
                                maxLength={30}
                                autoComplete="off"
                              />
                            </div>
                          </div>

                          {/* Option 2: Write Discussion Room Name */}
                          <div className="text-left">
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                              style={{ color: 'var(--text-secondary)' }}>
                              2. Write Discussion Room Name
                            </label>
                            <div className="relative">
                              <MessageSquare className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                                style={{ color: 'var(--text-muted)' }} />
                              <input
                                type="text"
                                value={createRoomName}
                                onChange={(e) => setCreateRoomName(e.target.value)}
                                placeholder="Enter discussion room name (e.g. Project Review)"
                                className="input-base py-2.5 pl-10 pr-4 text-sm w-full"
                                maxLength={50}
                                autoComplete="off"
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                              />
                            </div>
                          </div>

                          <button
                            onClick={handleCreateRoom}
                            disabled={isCreating}
                            className="btn-primary w-full py-3 px-6 flex items-center justify-center gap-2 text-base mt-2"
                          >
                            {isCreating ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Creating room...
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4" />
                                Create Encrypted Room
                              </>
                            )}
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="join"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-4"
                        >
                          {/* Option 1: Write Your Name */}
                          <div className="text-left">
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                              style={{ color: 'var(--text-secondary)' }}>
                              1. Write Your Name
                            </label>
                            <div className="relative">
                              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                                style={{ color: 'var(--text-muted)' }} />
                              <input
                                type="text"
                                value={joinDisplayName}
                                onChange={(e) => setJoinDisplayName(e.target.value)}
                                placeholder="Enter your name (e.g. Sam)"
                                className="input-base py-2.5 pl-10 pr-4 text-sm w-full"
                                maxLength={30}
                                autoComplete="off"
                              />
                            </div>
                          </div>

                          {/* Option 2: Enter Room ID / Key */}
                          <div className="text-left">
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                              style={{ color: 'var(--text-secondary)' }}>
                              2. Room ID / Key
                            </label>
                            <input
                              type="text"
                              value={joinKey}
                              onChange={handleKeyInput}
                              placeholder="XXXX-XXXX-XXXX-XXXX"
                              className="input-base py-2.5 px-4 text-center font-mono text-base tracking-widest w-full"
                              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                              aria-label="Room key"
                              maxLength={19}
                              autoComplete="off"
                              spellCheck={false}
                            />
                            {joinError && (
                              <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-2 text-sm text-red-400 text-center"
                              >
                                {joinError}
                              </motion.p>
                            )}
                          </div>

                          <button
                            onClick={handleJoinRoom}
                            disabled={isJoining || joinKey.length < 16}
                            className="btn-primary w-full py-3 px-6 flex items-center justify-center gap-2 text-base"
                            style={{ opacity: joinKey.length < 16 ? 0.5 : 1 }}
                          >
                            {isJoining ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Joining...
                              </>
                            ) : (
                              <>
                                Join Room
                                <ChevronRight className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  /* Room created — show key */
                  <motion.div
                    key="created"
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="card p-6 shadow-glass text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20
                      flex items-center justify-center mx-auto mb-4">
                      <Check className="w-6 h-6 text-green-400" />
                    </div>
                    <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
                      Room Created!
                    </h3>
                    <p className="text-sm mb-1 font-semibold text-indigo-400">
                      {createdRoom.roomName}
                    </p>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                      Share this key with people you want to invite:
                    </p>

                    {/* Room key display */}
                    <div className="rounded-xl p-4 mb-4 flex items-center justify-between gap-3"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <span className="room-key" style={{ color: 'var(--text-primary)' }}>
                        {createdRoom.roomKey}
                      </span>
                      <button
                        onClick={handleCopyKey}
                        className="btn-ghost p-2 rounded-lg flex-shrink-0"
                        aria-label="Copy room key"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="rounded-lg p-3 mb-4 text-xs text-amber-400"
                      style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                      ⚠️ Anyone with this key can join. Share it only with trusted people.
                    </div>

                    <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                      You'll join as: <span style={{ color: 'var(--text-secondary)' }}>{createdRoom.displayName}</span>
                    </p>

                    <button
                      onClick={handleEnterRoom}
                      className="btn-primary w-full py-3 px-6 flex items-center justify-center gap-2"
                    >
                      Enter Chat Room
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              How it works
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>Simple, secure, ephemeral.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(({ step, title, desc }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card p-6 text-center"
              >
                <div className="text-5xl font-black mb-3 gradient-text-blue opacity-60">{step}</div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ───────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Built for privacy
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Every feature is designed with your privacy and security in mind.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg, border }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="card p-6 cursor-default"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: bg, border: `1px solid ${border}` }}>
                  <Icon className="w-5 h-5" style={{ color: '#818cf8' }} />
                </div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── E2EE explainer ──────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card p-8 md:p-12 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.06))',
              border: '1px solid rgba(99,102,241,0.2)',
            }}
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600
              flex items-center justify-center mx-auto mb-6 shadow-glow-accent">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Real end-to-end encryption
            </h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
              Your room key is used to derive an <strong style={{ color: 'var(--text-primary)' }}>AES-256-GCM</strong> encryption key
              via HKDF-SHA-256 — entirely in your browser. Every message is encrypted before leaving
              your device. The server stores and relays only ciphertext it cannot read.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-mono"
              style={{ color: 'var(--text-muted)' }}>
              {['Your Browser', '→', 'AES-256-GCM', '→', 'Server (blind)', '→', 'AES-256-GCM', '→', "Recipient's Browser"]
                .map((item, i) => (
                  <span key={i}
                    style={{ color: item === '→' ? 'var(--text-muted)' :
                      item === 'Server (blind)' ? '#ef4444' : '#818cf8' }}>
                    {item}
                  </span>
                ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="relative z-10 py-10 px-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600
              flex items-center justify-center">
              <Lock className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>ChatX</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Private conversations. Nothing permanent. No logs. No tracking.
          </p>
          <div className="encrypt-badge">
            <Lock className="w-3 h-3" />
            <span>E2E Encrypted</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
