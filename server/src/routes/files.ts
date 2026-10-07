import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { generateId } from '../utils/crypto';
import { saveFile, findFile } from '../database/queries';
import { findParticipantBySession } from '../database/queries';
import { logger } from '../utils/logger';
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from '@chatx/shared/constants';

const router = Router();

const FILES_DIR = process.env.FILES_DIR || path.join(process.cwd(), 'data', 'files');
if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true });

// Multer storage — files saved as encrypted blobs with random name
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, FILES_DIR),
  filename: (_req, _file, cb) => {
    // Random filename — original name is encrypted and stored in DB
    cb(null, generateId() + '.enc');
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    // We accept any mime type since the file is already encrypted —
    // the encrypted blob looks like binary data. We validate on the
    // declared mime type that was provided by the client.
    cb(null, true);
  },
});

// ── POST /api/files/:roomId — Upload encrypted file ──────────────────────────
router.post('/:roomId', upload.single('file'), (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(401).json({ error: 'Session required' });
    }

    // Validate session is in this room
    const participant = findParticipantBySession(sessionId);
    if (!participant || participant.roomId !== roomId) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { encryptedFileName, mimeType } = req.body;

    if (!encryptedFileName || !mimeType) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Missing encrypted file metadata' });
    }

    // Validate declared MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'File type not allowed' });
    }

    const fileId = generateId();

    saveFile({
      id: fileId,
      roomId,
      senderSessionId: sessionId,
      storagePath: req.file.path,
      encryptedFileName,
      fileSize: req.file.size,
      mimeType,
    });

    logger.info('File uploaded', { fileId, roomId, size: req.file.size });

    res.status(201).json({ fileId });
  } catch (err) {
    logger.error('File upload failed', { err });
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ── GET /api/files/:roomId/:fileId — Download encrypted file ─────────────────
router.get('/:roomId/:fileId', (req: Request, res: Response) => {
  try {
    const { roomId, fileId } = req.params;
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      return res.status(401).json({ error: 'Session required' });
    }

    // Validate session is in this room
    const participant = findParticipantBySession(sessionId);
    if (!participant || participant.roomId !== roomId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const file = findFile(fileId);
    if (!file || file.room_id !== roomId) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!fs.existsSync(file.storage_path)) {
      return res.status(404).json({ error: 'File no longer available' });
    }

    // Stream encrypted blob — client will decrypt locally
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', file.file_size);
    res.setHeader('X-File-Mime', file.mime_type);
    res.setHeader('X-Encrypted-Name', file.encrypted_file_name);
    res.setHeader('Cache-Control', 'no-store');

    const stream = fs.createReadStream(file.storage_path);
    stream.pipe(res);
  } catch (err) {
    logger.error('File download failed', { err });
    res.status(500).json({ error: 'Download failed' });
  }
});

export default router;
