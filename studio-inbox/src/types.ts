// SPDX-License-Identifier: MIT
// The contract between the pieces. See docs/product/SPEC-STUDIO-INBOX.md.

export const KINDS = ['shipped', 'need', 'ask', 'reply', 'fyi'] as const;
export type Kind = (typeof KINDS)[number];

export interface Message {
  id: number;
  from: string;
  to: string; // a project name or 'all'
  kind: Kind;
  subject: string;
  body: string;
  ref: string | null;
  replyTo: number | null;
  createdAt: number; // epoch ms
}

export type NewMessage = Omit<Message, 'id'>;

export interface ListOptions {
  afterId: number;
  limit: number;
  from?: string;
  kind?: Kind;
}

/** Storage. Messages are visible to `project` when to === project or to === 'all', and from !== project. */
export interface Store {
  insert(m: NewMessage): Promise<Message>;
  get(id: number): Promise<Message | null>;
  /** Ascending id. Visibility as above. */
  listFor(project: string, opts: ListOptions): Promise<Message[]>;
  /** How many visible messages have id > afterId (no limit). */
  countFor(project: string, afterId: number): Promise<number>;
  /** Posts by `from` with createdAt >= sinceMs. */
  countFrom(from: string, sinceMs: number): Promise<number>;
  getCursor(project: string): Promise<number>;
  /** Only ever moves forward; a lower id is ignored. */
  setCursor(project: string, id: number): Promise<void>;
  /** Highest message id, 0 when empty. */
  headId(): Promise<number>;
  /** Deletes messages with createdAt < ms. Returns how many. */
  purgeOlderThan(ms: number): Promise<number>;
  /** Keeps the newest `max` messages. Returns how many were dropped. */
  trimToLimit(max: number): Promise<number>;
}

export const LIMITS = {
  subjectMax: 120,
  bodyMax: 2000,
  refMax: 300,
  readDefault: 20,
  readMax: 50,
  postsPerHour: 60,
  postsPerDay: 400,
  retentionMs: 30 * 24 * 60 * 60 * 1000,
  maxStored: 5000,
  requestBytesMax: 16 * 1024,
  tokenMinLength: 32,
} as const;

export type ErrorCode = 'invalid_input' | 'unknown_project' | 'rate_limited' | 'blocked_content' | 'not_found';

export type Result<T> = { ok: true; value: T } | { ok: false; error: { code: ErrorCode; message: string } };

export interface PostInput {
  to: string;
  kind: Kind;
  subject: string;
  body: string;
  ref?: string;
  reply_to?: number;
}
export interface ReadInput {
  limit?: number;
  since_id?: number;
  from?: string;
  kind?: Kind;
  ack?: boolean;
}

export interface Inbox {
  /** `input` is untrusted JSON: validate strictly (unknown keys are invalid_input). */
  post(from: string, input: unknown): Promise<Result<{ id: number; to: string; kind: Kind; created_at: string }>>;
  read(me: string, input: unknown): Promise<Result<{ messages: Message[]; unread_remaining: number; cursor: number; notice: string }>>;
  projects(me: string): Promise<Result<{ you: string; projects: string[]; cursor: number; head_id: number }>>;
}

export interface InboxOptions {
  store: Store;
  projects: readonly string[];
  now?: () => number;
}

export type JsonRpcId = string | number | null;
export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string };
}

/** D1's surface that D1Store uses. */
export interface D1Like {
  prepare(sql: string): D1StatementLike;
}
export interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ meta: { changes?: number; last_row_id?: number } }>;
}

/** Signatures the tests rely on:
 *  parseTokens(raw: string): Map<string, string>              token -> project; throws Error
 *  scanText(text: string): string | null                       a reason code, or null when clean
 *  createInbox(opts: InboxOptions): Inbox                      (src/inbox.ts)
 *  handleMcp(inbox: Inbox, project: string, body: unknown, projects: readonly string[]): Promise<JsonRpcResponse | null>
 *  createHandler(opts: { tokens: string; store: Store; now?: () => number }): (req: Request) => Promise<Response>
 *  new MemoryStore()                                           (src/store-memory.ts)
 *  new D1Store(db: D1Like)                                     (src/store-d1.ts)
 */
