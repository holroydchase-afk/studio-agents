// SPDX-License-Identifier: MIT
import type { D1Like, Kind, ListOptions, Message, NewMessage, Store } from './types.ts';

interface Row {
  id: number;
  from_project: string;
  to_project: string;
  kind: string;
  subject: string;
  body: string;
  ref: string | null;
  reply_to: number | null;
  created_at: number;
}

const COLS = 'id, from_project, to_project, kind, subject, body, ref, reply_to, created_at';
const VISIBLE = "(to_project = ? OR to_project = 'all') AND from_project != ?";

const toMessage = (r: Row): Message => ({
  id: Number(r.id),
  from: r.from_project,
  to: r.to_project,
  kind: r.kind as Kind,
  subject: r.subject,
  body: r.body,
  ref: r.ref ?? null,
  replyTo: r.reply_to ?? null,
  createdAt: Number(r.created_at),
});

export class D1Store implements Store {
  private readonly db: D1Like;

  constructor(db: D1Like) {
    this.db = db;
  }

  async insert(m: NewMessage): Promise<Message> {
    const res = await this.db
      .prepare('INSERT INTO messages (from_project, to_project, kind, subject, body, ref, reply_to, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(m.from, m.to, m.kind, m.subject, m.body, m.ref, m.replyTo, m.createdAt)
      .run();
    return { id: Number(res.meta.last_row_id), ...m };
  }

  async get(id: number): Promise<Message | null> {
    const r = await this.db.prepare(`SELECT ${COLS} FROM messages WHERE id = ?`).bind(id).first<Row>();
    return r ? toMessage(r) : null;
  }

  async listFor(project: string, opts: ListOptions): Promise<Message[]> {
    const from = opts.from ?? null;
    const kind = opts.kind ?? null;
    const { results } = await this.db
      .prepare(`SELECT ${COLS} FROM messages WHERE id > ? AND ${VISIBLE} AND (? IS NULL OR from_project = ?) AND (? IS NULL OR kind = ?) ORDER BY id ASC LIMIT ?`)
      .bind(opts.afterId, project, project, from, from, kind, kind, opts.limit)
      .all<Row>();
    return results.map(toMessage);
  }

  async countFor(project: string, afterId: number): Promise<number> {
    const r = await this.db.prepare(`SELECT COUNT(*) AS n FROM messages WHERE id > ? AND ${VISIBLE}`).bind(afterId, project, project).first<{ n: number }>();
    return Number(r?.n ?? 0);
  }

  async countFrom(from: string, sinceMs: number): Promise<number> {
    const r = await this.db.prepare('SELECT COUNT(*) AS n FROM messages WHERE from_project = ? AND created_at >= ?').bind(from, sinceMs).first<{ n: number }>();
    return Number(r?.n ?? 0);
  }

  async getCursor(project: string): Promise<number> {
    const r = await this.db.prepare('SELECT last_id FROM cursors WHERE project = ?').bind(project).first<{ last_id: number }>();
    return Number(r?.last_id ?? 0);
  }

  async setCursor(project: string, id: number): Promise<void> {
    await this.db
      .prepare('INSERT INTO cursors (project, last_id) VALUES (?, ?) ON CONFLICT(project) DO UPDATE SET last_id = MAX(last_id, excluded.last_id)')
      .bind(project, id)
      .run();
  }

  async headId(): Promise<number> {
    const r = await this.db.prepare('SELECT COALESCE(MAX(id), 0) AS n FROM messages').first<{ n: number }>();
    return Number(r?.n ?? 0);
  }

  async purgeOlderThan(ms: number): Promise<number> {
    const res = await this.db.prepare('DELETE FROM messages WHERE created_at < ?').bind(ms).run();
    return Number(res.meta.changes ?? 0);
  }

  async trimToLimit(max: number): Promise<number> {
    const res = await this.db.prepare('DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT ?)').bind(Math.max(0, max)).run();
    return Number(res.meta.changes ?? 0);
  }
}
