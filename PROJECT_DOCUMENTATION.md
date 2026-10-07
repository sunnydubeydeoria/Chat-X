# ChatX — Comprehensive Project & Developer Documentation Guide

**Application Name**: ChatX  
**Tagline**: *Private conversations. Nothing permanent.*  
**Version**: 1.0.0  
**Owner**: Sunny Kumar Dubey  
**Author**: Engineering & Core Product Team  
**Date**: September 2026  

---

## Table of Contents

1. [Project Overview & Vision](#1-project-overview--vision)
2. [Key Product Features & User Experience](#2-key-product-features--user-experience)
3. [System Architecture & Monorepo Structure](#3-system-architecture--monorepo-structure)
4. [End-to-End Cryptography Pipeline](#4-end-to-end-cryptography-pipeline)
5. [Real-Time Protocol & Socket.IO Specification](#5-real-time-protocol--socketio-specification)
6. [Database Engine & Ephemeral Lifecycle Management](#6-database-engine--ephemeral-lifecycle-management)
7. [Frontend UI/UX Component Blueprint](#7-frontend-uiux-component-blueprint)
8. [REST API Reference](#8-rest-api-reference)
9. [Installation & Local Development Guide](#9-installation--local-development-guide)
10. [Production Deployment & Hardening Guide](#10-production-deployment--hardening-guide)
11. [Troubleshooting & Frequently Asked Questions (FAQ)](#11-troubleshooting--frequently-asked-questions-faq)

---

## 1. Project Overview & Vision

### 1.1 The Privacy Challenge
In today's digital landscape, central server persistence poses a major threat to personal and organizational privacy. Standard messaging applications save transcripts, shared attachments, user profile records, contact lists, and metadata indefinitely. If servers are subpoenaed, breached, or improperly accessed by rogue operators, user conversations are exposed retroactively.

### 1.2 The ChatX Solution
**ChatX** fixes this fundamental vulnerability by establishing a **Zero-Knowledge, Zero-Persistence Architecture**:
- **Zero-Knowledge**: All text messages and binary file attachments are encrypted client-side inside the user's browser using W3C Web Crypto APIs (`AES-256-GCM` with `HKDF-SHA-256` key derivation). The server receives only unreadable Base64 ciphertexts.
- **Zero-Persistence**: Chat rooms exist only while participants are actively connected. Once all users depart (or after a 15-second network disconnect grace window), an automated atomic sweeper permanently purges database rows and physical disk files.

---

## 2. Key Product Features & User Experience

### 2.1 Custom Room & Display Name Setup
- **Create Room Modal**: Users can specify an optional **Display Name** (e.g., *"Onyx Panther"*) and an optional **Discussion Room Name** (e.g., *"Q3 Financial Strategy"*).
- **Join Room Modal**: Joining participants enter the 16-character Room Join Key alongside an optional **Display Name** (e.g., *"Velvet Cougar"*).
- **Anonymous Fallback**: If display names are omitted, ChatX automatically assigns vibrant, high-contrast pseudonym aliases derived from a curated list of adjectives and animals (e.g., *Swift Wolf*, *Jade Falcon*).

### 2.2 16-Character Crockford Base32 Join Keys
- Format: `XXXX-XXXX-XXXX-XXXX` (e.g., `1AJ7-3SPB-00D8-VXCJ`)
- Generated from an 80-bit CSPRNG entropy pool providing over $1.21 \times 10^{24}$ unique combinations.
- Uses 32 unambiguous characters (`0123456789ABCDEFGHJKMNPSTVWXYZ`), completely excluding visually confusing characters (`I`, `L`, `O`, `U`).

### 2.3 E2EE Binary File Attachment Sharing
- Supports images, PDFs, text documents, code snippets, archives, videos, and audio clips up to **50 MB**.
- Binary contents and original filenames are encrypted separately in-memory before upload.
- Recipients stream the encrypted binary blob directly from the server and decrypt it locally.

### 2.4 Per-Session Real-Time Typing Indicators
- Dynamic typing status pills displaying exact participant display names (e.g., *"Velvet Cougar is typing..."*).
- Built with a 2.0-second auto-stop debounce and immediate socket cleanup on disconnect to eliminate persistent ghost typing states.

### 2.5 Cyberpunk Theme & Visual Experience
- Dark mode charcoal aesthetics (`#080b10`) combined with glassmorphic cards (`backdrop-filter: blur(16px)`).
- Glowing emerald E2EE security verification badges with active pulsing indicator dots.
- Reactive UI animations using Framer Motion and dynamic Light/Dark mode switching.

---

## 3. System Architecture & Monorepo Structure

ChatX is organized as a monorepo comprising three TypeScript packages:

```
chat-x/
├── shared/            # @chatx/shared package (Types, Constants, Utilities)
├── server/            # @chatx/server package (Node.js, Express, Socket.IO, sql.js)
└── client/            # @chatx/client package (React 18, Vite, Tailwind CSS, Zustand)
```

```
                               ┌─────────────────────────────────────────────────────────────┐
                               │                        REACT CLIENT                         │
                               │                                                             │
                               │  ┌───────────────────────┐       ┌───────────────────────┐  │
                               │  │  Zustand Chat Store   │◄─────►│    Web Crypto API     │  │
                               │  └───────────┬───────────┘       └───────────────────────┘  │
                               │              │                                              │
                               └──────────────┼──────────────────────────────────────────────┘
                                              │ WSS Socket.IO Events & HTTP REST
                                              ▼
                               ┌─────────────────────────────────────────────────────────────┐
                               │                       NODE.JS SERVER                        │
                               │                                                             │
                               │  ┌───────────────────────┐       ┌───────────────────────┐  │
                               │  │ Socket.IO Realtime    │       │ Express REST Gateway  │  │
                               │  └───────────┬───────────┘       └───────────┬───────────┘  │
                               │              │                               │              │
                               │              ▼                               ▼              │
                               │  ┌────────────────────────────────────────────────────────┐ │
                               │  │        Room & Ephemeral Lifecycle Sweeper Engine       │ │
                               │  └───────────────────────────┬────────────────────────────┘ │
                               │                              │                              │
                               │                              ▼                              │
                               │  ┌────────────────────────────────────────────────────────┐ │
                               │  │      sql.js SQLite WASM (In-Memory Database)         │ │
                               │  └────────────────────────────────────────────────────────┘ │
                               └─────────────────────────────────────────────────────────────┘
```

---

## 4. End-to-End Cryptography Pipeline

### 4.1 Zero-Knowledge Key Verification (Double Hashing)
To prevent server database breaches from leaking secrets, ChatX uses double-hashing:
1. **Client Normalization**: Strips hyphens/spaces and converts key $K$ to uppercase.
2. **Client Verification Token ($H_1$)**:
   $$H_1 = \text{SHA-256}(\text{Normalize}(K))$$
3. **Server Stored Key Hash ($H_2$)**:
   $$H_2 = \text{SHA-256}(H_1)$$

The server receives $H_1$ during verification requests and compares $\text{SHA-256}(H_1)$ against stored $H_2$. Reversing $H_2 \to H_1 \to K$ is computationally impossible due to SHA-256 preimage resistance.

### 4.2 HKDF Key Derivation (RFC 5869)
Human-readable room keys undergo HMAC-based key derivation using HKDF-SHA-256:
- **Global Salt**: `"chatx-v1-salt-2024"`
- **Message Info**: `"chatx-message-encryption"` (Derives 256-bit AES-GCM Message Key)
- **File Info**: `"chatx-file-encryption"` (Derives 256-bit AES-GCM File Key)

### 4.3 AES-256-GCM Payload Wire Format
Every text message payload is encrypted using AES-256-GCM with a fresh 96-bit (12-byte) random IV generated via `crypto.getRandomValues()`:

$$\text{Payload} = \text{Base64}\Big(\text{IV (12 bytes)} \;||\; \text{Ciphertext} \;||\; \text{GCM Auth Tag (16 bytes)}\Big)$$

---

## 5. Real-Time Protocol & Socket.IO Specification

### 5.1 Socket Event Contracts (`@chatx/shared`)

#### Server-to-Client Events (`ServerToClientEvents`)
- `message:new`: Emitted when a new encrypted message is received.
- `typing:update`: Emitted to sync active typing users list.
- `presence:update`: Emitted when active participant list changes.
- `room:destroyed`: Emitted when room is permanently wiped.
- `room:userJoined`: Emitted when a user joins the room.
- `room:userLeft`: Emitted when a user disconnects/leaves.
- `heartbeat:pong`: Acknowledgement for client heartbeat pings.

#### Client-to-Server Events (`ClientToServerEvents`)
- `room:join`: Emitted when opening socket room connection.
- `room:leave`: Emitted when explicitly departing a room.
- `message:send`: Emitted to broadcast an encrypted message frame.
- `typing:start`: Emitted when user starts typing.
- `typing:stop`: Emitted when user stops typing.
- `heartbeat:ping`: Emitted every 10s to keep session alive.

---

## 6. Database Engine & Ephemeral Lifecycle Management

ChatX relies on **`sql.js` (SQLite compiled to WebAssembly)**, offering zero disk I/O latency during message operations, backed by automated 30-second background file sync to `server/data/chatx.db`.

### 6.1 Relational Schemas
```sql
-- Rooms Table
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  room_key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Discussion Room',
  created_at INTEGER NOT NULL,
  last_activity_at INTEGER NOT NULL,
  participant_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
);

-- Participants Table
CREATE TABLE participants (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_color TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  last_heartbeat INTEGER NOT NULL,
  is_connected INTEGER NOT NULL DEFAULT 1
);

-- Messages Table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_session_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_avatar_color TEXT NOT NULL,
  encrypted_content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  file_id TEXT,
  encrypted_file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  created_at INTEGER NOT NULL
);

-- Files Table
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_session_id TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  encrypted_file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

### 6.2 Ephemeral Deletion Sequence
1. **Heartbeat Sweep**: Client pings server every 10 seconds. Server marks participants dead if heartbeat > 25s.
2. **Grace Window**: When active participants reach 0, a 15-second disconnect grace window starts.
3. **Atomic Purge**: If 0 participants remain after 15 seconds:
   - Physical disk unlinking (`fs.unlinkSync`) deletes all stored encrypted file attachments.
   - SQL queries delete all rows in `files`, `messages`, `participants`, and `rooms`.

---

## 7. Frontend UI/UX Component Blueprint

```
client/src/
├── components/
│   ├── Header.tsx           # Logo, room title display, security badge, theme toggle
│   ├── Footer.tsx           # Status indicators & version details
│   ├── CreateRoomModal.tsx  # Name & Discussion Room Name creation dialog
│   ├── JoinRoomModal.tsx    # Display Name & Room Key join dialog
│   ├── ChatRoom.tsx         # Main chat container layout grid
│   ├── MessageList.tsx      # Virtualized scrollable decrypted message list
│   ├── MessageItem.tsx      # Individual message bubble (text & media cards)
│   ├── MessageInput.tsx     # Message input, attachment picker & typing handler
│   ├── TypingIndicator.tsx  # Multi-user animated typing dots
│   ├── ParticipantList.tsx  # Sidebar listing online/offline participants
│   └── SecurityBadge.tsx    # E2EE verification status indicator
├── store/
│   └── chatStore.ts         # Zustand store for room session & message state
├── hooks/
│   └── useSocketRoom.ts     # Socket.IO connection & event subscription hook
└── lib/
    ├── crypto/
    │   └── e2ee.ts          # Web Crypto API key derivation & AES-256-GCM routines
    └── socket/
        └── socketClient.ts  # Singleton Socket.IO client instance
```

---

## 8. REST API Reference

### 8.1 Create Room Endpoint
- **HTTP Method**: `POST /api/rooms`
- **Request Payload**:
  ```json
  {
    "displayName": "Onyx Panther",
    "roomName": "Project Architecture Review"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "roomId": "f8a92b11-3c4d-4e5f-b6a7-8c9d0e1f2a3b",
      "roomKey": "1AJ7-3SPB-00D8-VXCJ",
      "roomName": "Project Architecture Review",
      "sessionId": "s_9a8b7c6d5e4f3a2b",
      "displayName": "Onyx Panther",
      "avatarColor": "#8b5cf6",
      "createdAt": 1789150000000
    }
  }
  ```

### 8.2 Join Room Endpoint
- **HTTP Method**: `POST /api/rooms/join`
- **Request Payload**:
  ```json
  {
    "roomKey": "1AJ7-3SPB-00D8-VXCJ",
    "displayName": "Velvet Cougar"
  }
  ```
- **Response (200 OK)**: Returns `roomId`, `roomName`, `sessionId`, `displayName`, `avatarColor`, and current `participants` array.

---

## 9. Installation & Local Development Guide

### Prerequisites
- Node.js v18.0+
- `npm` v9.0+

### Setup Commands
```bash
# 1. Clone repository & install dependencies
git clone https://github.com/your-org/chat-x.git
cd chat-x
npm install

# 2. Build shared package
npm run build -w shared

# 3. Launch dev environment (Starts client on :5173 and server on :3001)
npm run dev
```

---

## 10. Production Deployment & Hardening Guide

### 10.1 Docker Compose Deployment
```yaml
version: '3.8'

services:
  chatx-server:
    build:
      context: .
      dockerfile: server/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DB_DIR=/app/data
      - UPLOAD_DIR=/app/uploads
      - CLIENT_URL=https://chat.yourdomain.com
    volumes:
      - chatx-data:/app/data
      - chatx-uploads:/app/uploads
    restart: unless-stopped

volumes:
  chatx-data:
  chatx-uploads:
```

### 10.2 Nginx Hardening Snippet
```nginx
server {
    listen 443 ssl http2;
    server_name chat.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/chat.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.yourdomain.com/privkey.pem;

    location / {
        root /var/www/chatx/client/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 55M;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
```

---

## 11. Troubleshooting & Frequently Asked Questions (FAQ)

### FAQ 1: Can server admins read my messages or view my files?
**No.** All message text and file attachments are encrypted inside your browser before transmission. Server admins see only unreadable Base64 ciphertexts.

### FAQ 2: What happens if I refresh my browser tab?
Your session credentials (`roomId`, `roomKey`, `sessionId`) are retained in session storage, allowing seamless reconnection without losing your derived `CryptoKey`.

### FAQ 3: How long does a chat room last?
A room stays active as long as at least one participant is connected. Once all participants leave, a 15-second grace window begins. If no one reconnects within 15 seconds, the room and all content are permanently destroyed.

---

*End of Comprehensive Project & Developer Documentation Guide.*
