// SPDX-License-Identifier: MIT
import type { ListOptions, Message, NewMessage, Store } from './types.ts';

export interface MemoryState {
  messages: Message[];
  cursors: Record<string, number>;
  nextId: number;
}

const visible = (m: Message, project: string): boolean => (m.to === project || m.to === 'all') && m.from !== project;

export class MemoryStore implements Store {
  private messages: Message[] = [];
  private byId = new Map<number, Message>();
  private cursors = new Map<string, number>();
  private nextId = 1;
  /** Bumped on every change, so a runner can tell when to persist. */
  revision = 0;

  constructor(state?: MemoryState) {
    if (state) {
      this.messages = state.messages.map((m) => ({ ...m }));
      for (const m of this.messages) this.byId.set(m.id, m);
      this.cursors = new Map(Object.entries(state.cursors));
      this.nextId = state.nextId;
    }
  }

  snapshot(): MemoryState {
    return { messages: this.messages.map((m) => ({ ...m })), cursors: Object.fromEntries(this.cursors), nextId: this.nextId };
  }

  async insert(m: NewMessage): Promise<Message> {
    const msg: Message = { id: this.nextId++, from: m.from, to: m.to, kind: m.kind, subject: m.subject, body: m.body, ref: m.ref, replyTo: m.replyTo, createdAt: m.createdAt };
    this.messages.push(msg);
    this.byId.set(msg.id, msg);
    this.revision++;
    return { ...msg };
  }

  async get(id: number): Promise<Message | null> {
    const m = this.byId.get(id);
    return m ? { ...m } : null;
  }

  async listFor(project: string, opts: ListOptions): Promise<Message[]> {
    const out: Message[] = [];
    for (const m of this.messages) {
      if (out.length >= opts.limit) break;
      if (m.id <= opts.afterId || !visible(m, project)) continue;
      if (opts.from !== undefined && m.from !== opts.from) continue;
      if (opts.kind !== undefined && m.kind !== opts.kind) continue;
      out.push({ ...m });
    }
    return out;
  }

  async countFor(project: string, afterId: number): Promise<number> {
    let n = 0;
    for (const m of this.messages) if (m.id > afterId && visible(m, project)) n++;
    return n;
  }

  async countFrom(from: string, sinceMs: number): Promise<number> {
    let n = 0;
    for (const m of this.messages) if (m.from === from && m.createdAt >= sinceMs) n++;
    return n;
  }

  async getCursor(project: string): Promise<number> {
    return this.cursors.get(project) ?? 0;
  }

  async setCursor(project: string, id: number): Promise<void> {
    if (id > (this.cursors.get(project) ?? 0)) {
      this.cursors.set(project, id);
      this.revision++;
    }
  }

  async headId(): Promise<number> {
    return this.messages.length ? (this.messages[this.messages.length - 1] as Message).id : 0;
  }

  private drop(keep: (m: Message) => boolean): number {
    const before = this.messages.length;
    this.messages = this.messages.filter(keep);
    this.byId = new Map(this.messages.map((m) => [m.id, m]));
    const n = before - this.messages.length;
    if (n) this.revision++;
    return n;
  }

  async purgeOlderThan(ms: number): Promise<number> {
    return this.drop((m) => m.createdAt >= ms);
  }

  async trimToLimit(max: number): Promise<number> {
    if (this.messages.length <= max) return 0;
    const cutoff = max <= 0 ? Infinity : (this.messages[this.messages.length - max] as Message).id;
    return this.drop((m) => m.id >= cutoff);
  }
}
