# ChatX 🔒

> **Private conversations. Nothing permanent.**

**Owner:** Sunny Kumar Dubey

A production-quality, end-to-end encrypted temporary chat application. Rooms self-destruct when the last participant leaves. The server never sees your messages.

---

## Features

- 🔒 **Real E2EE** — AES-256-GCM encryption in your browser via Web Crypto API
- 💨 **Temporary Rooms** — Permanently deleted when everyone leaves
- ⚡ **Real-time** — Socket.IO WebSockets with typing indicators and presence
- 📁 **Encrypted File Sharing** — Files encrypted before upload, decrypted after download
- 👤 **Anonymous** — No registration, temporary session identities
- 🎨 **Premium UI** — Dark/light mode, animations, glassmorphism design
- 🛡️ **Security-First** — Rate limiting, input validation, no plaintext logs

---

## Quick Start

### Prerequisites
- Node.js 18+ (tested on v22)
- npm 9+

### 1. Clone and install

```bash
git clone <repo>
cd chatx
npm install
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
# Edit server/.env if needed (defaults work for local dev)
```

### 3. Run development servers

```bash
npm run dev
```

This starts:
- **Backend**: `http://localhost:3001`
- **Frontend**: `http://localhost:5173`

Open `http://localhost:5173` in your browser.

---

## Testing

Open 3 browser tabs to `http://localhost:5173`:
1. **Tab 1**: Click "Create Room" → copy the key → enter the room
2. **Tab 2**: Click "Join Room" → paste the key → enter the room
3. **Tab 3**: Same as Tab 2

Test scenarios:
- ✅ Send messages — verify they appear instantly in all tabs
- ✅ Type in Tab 1 — see "typing..." in Tab 2 and 3
- ✅ Close Tab 2 — see presence update in remaining tabs
- ✅ Upload a file — download it in another tab (decrypted locally)
- ✅ Close ALL tabs — room is permanently deleted from the server DB

---

## Cryptographic Architecture

### Key Derivation
```
Room Join Key (user-visible, e.g. "ABCD-EFGH-IJKL-MNOP")
       │
       ▼
   ├── salt: "chatx-v1-salt-2024"
   ├── info: "chatx-message-encryption"  → AES-256-GCM Message Key
   └── info: "chatx-file-encryption"     → AES-256-GCM File Key
```

### Message Encryption
```
plaintext
    │
    ▼
AES-256-GCM (random 96-bit IV per message)
    │
    ▼
base64(IV ‖ ciphertext ‖ authTag)
    │
    ▼
Server (relays ciphertext — cannot read content)
    │
    ▼
base64 decode → split IV + ciphertext
    │
    ▼
AES-256-GCM decrypt → plaintext
```

### Server Storage
- Server stores: `SHA-256(SHA-256(joinKey))` for room lookup
- Server **cannot** reverse this to the join key
- Server **cannot** derive the AES key (requires the raw join key + HKDF)
- Server stores only encrypted ciphertext — never plaintext

### File Encryption
- Files are encrypted in-browser using the same AES-256-GCM File Key
- Encrypted blobs are uploaded to the server
- File names are also encrypted (base64-encoded ciphertext stored in DB)
- Download: receive encrypted blob → decrypt in browser → offer as download

### Nonce/IV Policy
- Every message uses `crypto.getRandomValues(new Uint8Array(12))` for a fresh 96-bit IV
- IVs are never reused (statistically impossible with 96-bit random values)
- IVs are prepended to the ciphertext: `base64(iv ‖ ciphertext)`

### Threat Model
**What ChatX protects against:**
- Server reading your messages (server never has the AES key)
- Passive network adversaries (E2EE + TLS/WSS)
- Old messages leaking after a room is destroyed (immediate DB deletion)
- Room key guessing (80-bit entropy = 2^80 combinations)

**Limitations (known):**
- No forward secrecy per message (all messages use the same room key)
- If an attacker obtains the room join key, they can decrypt all messages
- The server can see metadata: who's connected, when, and file sizes
- Anonymity is limited — IP addresses are visible to the server
- No protection against malicious participants who share the room key

---

## API Reference

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/rooms` | Create a new room |
| POST | `/api/rooms/join` | Join a room with a key |
| GET | `/api/rooms/:roomId/messages` | Get encrypted message history |
| POST | `/api/files/:roomId` | Upload encrypted file |
| GET | `/api/files/:roomId/:fileId` | Download encrypted file |
| GET | `/api/health` | Server health check |

### WebSocket Events

**Client → Server:**
| Event | Payload |
|-------|---------|
| `room:join` | `{ roomId, sessionId, displayName, avatarColor }` |
| `room:leave` | `{ roomId, sessionId }` |
| `message:send` | `{ roomId, sessionId, encryptedContent, messageType, ... }` |
| `typing:start` | `{ roomId, sessionId, displayName }` |
| `typing:stop` | `{ roomId, sessionId, displayName }` |
| `heartbeat:ping` | `{ roomId, sessionId }` |

**Server → Client:**
| Event | Payload |
|-------|---------|
| `message:new` | Encrypted message object |
| `presence:update` | `{ participants: Participant[] }` |
| `typing:update` | `{ typingUsers: [...] }` |
| `room:userJoined` | `{ participant: Participant }` |
| `room:userLeft` | `{ sessionId, displayName }` |
| `room:destroyed` | `{ reason: string }` |
| `heartbeat:pong` | (empty) |
| `error` | `{ code, message }` |

---

## Project Structure

```
chatx/
├── client/                     # React 18 + TypeScript + Vite
│   └── src/
│       ├── components/
│       │   ├── room/           # Chat room UI components
│       │   └── ui/             # Design system primitives
│       ├── hooks/              # useSocketRoom hook
│       ├── lib/
│       │   ├── crypto/         # E2EE implementation (Web Crypto API)
│       │   ├── socket/         # Socket.IO client factory
│       │   └── utils.ts        # Helpers
│       ├── pages/              # LandingPage, RoomPage, NotFoundPage
│       ├── store/              # Zustand global state
│       └── types/              # TypeScript types
│
├── server/                     # Node.js + Express + TypeScript
│   └── src/
│       ├── database/           # sql.js DB layer + queries
│       ├── middleware/         # Rate limiting
│       ├── routes/             # REST routes
│       ├── services/           # Room lifecycle, cleanup
│       ├── utils/              # Crypto helpers, logger
│       └── websocket/          # Socket.IO handler
│
└── shared/                     # Types + constants shared between client & server
```

---

## Production Deployment

1. Build: `npm run build`
2. Serve: `NODE_ENV=production node server/dist/index.js`
3. Put behind nginx with TLS (required for WSS)
4. Set `CLIENT_URL` to your production domain

### Recommended Production Setup
- **Reverse proxy**: nginx with TLS termination
- **Process manager**: PM2 or systemd
- **Storage**: Replace `sql.js` with PostgreSQL for multi-instance deployments
- **File storage**: Replace local disk with S3-compatible storage

---

## Security Review Checklist

- [x] Cryptographically secure room keys (80-bit entropy via CSPRNG)
- [x] Double-hashed room key storage (SHA-256² — no plaintext)
- [x] HKDF key derivation (server can't derive AES key from stored hash)
- [x] AES-256-GCM with authenticated encryption
- [x] Random 96-bit IV per message/file (never reused)
- [x] Rate limiting on all sensitive endpoints
- [x] Server logs strip plaintext content
- [x] File access control (session must be in the room)
- [x] Room deletion is atomic (single transaction)
- [x] Grace period prevents false disconnects
- [x] Room key brute-force protection (rate limiting + 80-bit entropy)
- [x] XSS protection (React DOM, no dangerouslySetInnerHTML for user content except linkify)
- [x] Input validation and sanitization
- [x] No sensitive data in URLs (room key not in URL)
- [x] Background cleanup for abandoned rooms (safety net)
