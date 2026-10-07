import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';

import { getDb, initializeDatabase } from './database/db';
import { initWebSocket } from './websocket/socketHandler';
import roomRoutes from './routes/rooms';
import fileRoutes from './routes/files';
import {
  generalLimiter, createRoomLimiter, joinRoomLimiter, fileUploadLimiter,
} from './middleware/rateLimiter';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const NODE_ENV = process.env.NODE_ENV || 'development';

async function main() {
  // ── Initialize DB first ───────────────────────────────────────────────────
  await getDb();
  initializeDatabase();

  // ── Express Setup ─────────────────────────────────────────────────────────
  const app = express();
  const httpServer = createServer(app);

  // ── Security Middleware ───────────────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: false, // Handle in production nginx/CDN
    crossOriginEmbedderPolicy: false,
  }));

  app.use(cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-session-id'],
  }));

  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  // ── Rate Limiting ─────────────────────────────────────────────────────────
  app.use('/api/', generalLimiter);
  app.use('/api/files', fileUploadLimiter);

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use('/api/rooms', roomRoutes);
  app.use('/api/files', fileRoutes);

  // ── Health Check ──────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', version: '1.0.0', env: NODE_ENV });
  });

  // ── 404 for unknown API routes ────────────────────────────────────────────
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // ── Serve client in production ────────────────────────────────────────────
  if (NODE_ENV === 'production') {
    const clientBuild = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientBuild));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientBuild, 'index.html'));
    });
  }

  // ── Error Handler ─────────────────────────────────────────────────────────
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error', { message: err.message });
    res.status(500).json({ error: 'Internal server error' });
  });

  // ── Initialize WebSocket ──────────────────────────────────────────────────
  initWebSocket(httpServer);

  // ── Start Server ──────────────────────────────────────────────────────────
  httpServer.listen(PORT, '0.0.0.0', () => {
    logger.info(`ChatX server running on port ${PORT}`, { env: NODE_ENV });
    logger.info(`Accepting connections from ${CLIENT_URL}`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
