import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

const DB_DIR = process.env.DB_DIR || path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'chatx.db');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db: Database;
let SQL: SqlJsStatic;

// Persist DB to disk every 30 seconds and on exit
function persistDb(): void {
  try {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    logger.error('Failed to persist DB', { err });
  }
}

export async function getDb(): Promise<Database> {
  if (db) return db;

  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    logger.info('Loaded existing database', { path: DB_PATH });
  } else {
    db = new SQL.Database();
    logger.info('Created new database', { path: DB_PATH });
  }

  // Auto-persist every 30s
  setInterval(persistDb, 30_000);

  // Persist on exit
  process.on('exit', persistDb);
  process.on('SIGINT', () => { persistDb(); process.exit(0); });
  process.on('SIGTERM', () => { persistDb(); process.exit(0); });

  return db;
}

export function runDb(sql: string, params: any[] = []): void {
  db.run(sql, params);
}

export function queryDb(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function queryOneDb(sql: string, params: any[] = []): any | null {
  const results = queryDb(sql, params);
  return results.length > 0 ? results[0] : null;
}

export function initializeDatabase(): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id                TEXT PRIMARY KEY,
      room_key_hash     TEXT NOT NULL UNIQUE,
      name              TEXT NOT NULL DEFAULT 'Discussion Room',
      created_at        INTEGER NOT NULL,
      last_activity_at  INTEGER NOT NULL,
      participant_count INTEGER NOT NULL DEFAULT 0,
      status            TEXT NOT NULL DEFAULT 'active'
    )
  `);

  try {
    db.run(`ALTER TABLE rooms ADD COLUMN name TEXT NOT NULL DEFAULT 'Discussion Room'`);
  } catch {}

  db.run(`CREATE INDEX IF NOT EXISTS idx_rooms_key_hash ON rooms(room_key_hash)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_rooms_status   ON rooms(status)`);

  db.run(`
    CREATE TABLE IF NOT EXISTS participants (
      id               TEXT PRIMARY KEY,
      room_id          TEXT NOT NULL,
      session_id       TEXT NOT NULL UNIQUE,
      display_name     TEXT NOT NULL,
      avatar_color     TEXT NOT NULL,
      joined_at        INTEGER NOT NULL,
      last_heartbeat   INTEGER NOT NULL,
      is_connected     INTEGER NOT NULL DEFAULT 1
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_participants_room    ON participants(room_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_participants_session ON participants(session_id)`);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id                  TEXT PRIMARY KEY,
      room_id             TEXT NOT NULL,
      sender_session_id   TEXT NOT NULL,
      sender_name         TEXT NOT NULL,
      sender_avatar_color TEXT NOT NULL,
      encrypted_content   TEXT NOT NULL,
      message_type        TEXT NOT NULL DEFAULT 'text',
      file_id             TEXT,
      encrypted_file_name TEXT,
      file_size           INTEGER,
      mime_type           TEXT,
      created_at          INTEGER NOT NULL
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at)`);

  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id                   TEXT PRIMARY KEY,
      room_id              TEXT NOT NULL,
      sender_session_id    TEXT NOT NULL,
      storage_path         TEXT NOT NULL,
      encrypted_file_name  TEXT NOT NULL,
      file_size            INTEGER NOT NULL,
      mime_type            TEXT NOT NULL,
      created_at           INTEGER NOT NULL
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_files_room ON files(room_id)`);

  logger.info('Database initialized', { path: DB_PATH });
}
