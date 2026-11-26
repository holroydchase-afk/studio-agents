// SPDX-License-Identifier: MIT
// Shared test helpers. Tokens are obviously fake: one repeated letter, 40 characters.
import type { Store } from '../../src/types.ts';

export const TOK = { alpha: 'a'.repeat(40), beta: 'b'.repeat(40), gamma: 'c'.repeat(40) } as const;
export type Proj = keyof typeof TOK;
export const PROJECTS: readonly string[] = ['alpha', 'beta', 'gamma'];
export const TOKENS_RAW = Object.entries(TOK)
  .map(([p, t]) => `${p}:${t}`)
  .join(',');
export const ORIGIN = 'https://inbox.test';
export const T0 = Date.UTC(2026, 10, 26, 12, 0, 0);

export function jsonReq(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(ORIGIN + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

export const bearer = (p: Proj): Record<string, string> => ({ authorization: `Bearer ${TOK[p]}` });

export async function newHandler(store?: Store) {
  const { createHandler } = await import('../../src/handler.ts');
  const { MemoryStore } = await import('../../src/store-memory.ts');
  const s: Store = store ?? new MemoryStore();
  const clock = { t: T0 };
  const handler = createHandler({ tokens: TOKENS_RAW, store: s, now: () => clock.t });
  return { handler, store: s, clock };
}

export async function rpc(handler: (r: Request) => Promise<Response>, p: Proj, msg: unknown) {
  const res = await handler(jsonReq('/mcp', msg, bearer(p)));
  const text = await res.text();
  let json: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json };
}

export async function call(handler: (r: Request) => Promise<Response>, p: Proj, name: string, args: unknown, id: number = 1) {
  const r = await rpc(handler, p, { jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });
  return { ...r, result: r.json?.result };
}

/** The stable error code of a tool result, wherever the server put it (structuredContent or the JSON text). */
export function errorCode(result: any): string | undefined { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!result) return undefined;
  if (result.structuredContent?.code) return result.structuredContent.code;
  try {
    return JSON.parse(result.content?.[0]?.text ?? 'null')?.code;
  } catch {
    return undefined;
  }
}

export function captureConsole() {
  const lines: string[] = [];
  const names = ['log', 'info', 'warn', 'error', 'debug'] as const;
  const saved = names.map((n) => console[n]);
  for (const n of names) {
    console[n] = (...args: unknown[]) => {
      lines.push(
        args.map((a) => (a instanceof Error ? `${a.stack ?? a.message}` : typeof a === 'string' ? a : (JSON.stringify(a) ?? String(a)))).join(' '),
      );
    };
  }
  return {
    lines,
    restore() {
      names.forEach((n, i) => {
        console[n] = saved[i] as never;
      });
    },
  };
}

/** Exactly n characters of ordinary words, ending in a letter. */
export function words(n: number): string {
  let s = 'lorem ipsum '.repeat(Math.ceil(n / 12) + 1).slice(0, n);
  if (s.endsWith(' ')) s = s.slice(0, -1) + 'x';
  return s;
}
