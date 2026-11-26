-- SPDX-License-Identifier: MIT
-- studio-inbox schema for Cloudflare D1 (SQLite). Apply once: wrangler d1 execute studio-inbox --remote --file schema.sql
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_project TEXT NOT NULL,
  to_project TEXT NOT NULL,
  kind TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  ref TEXT,
  reply_to INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_to ON messages (to_project);
CREATE INDEX IF NOT EXISTS idx_messages_from ON messages (from_project);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);

CREATE TABLE IF NOT EXISTS cursors (
  project TEXT PRIMARY KEY,
  last_id INTEGER NOT NULL DEFAULT 0
);
