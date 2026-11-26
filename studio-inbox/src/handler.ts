// SPDX-License-Identifier: MIT
// HTTP routing, auth and framing. Web-standard Request/Response only. Never logs, never echoes tokens or URLs.
import { LIMITS } from './types.ts';
import type { JsonRpcResponse, Store } from './types.ts';
import { bearerToken, createAuthenticator, parseTokens } from './config.ts';
import { createInbox } from './inbox.ts';
import { handleMcp } from './mcp.ts';

const JSON_HEADERS = { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const json = (body: unknown, status = 200, extra: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extra } });
const rpcErr = (code: number, message: string, status = 200): Response =>
  json({ jsonrpc: '2.0', id: null, error: { code, message } } satisfies JsonRpcResponse, status);

/** Reads at most `max` bytes; null when the body is larger. */
async function readCapped(req: Request, max: number): Promise<Uint8Array | null> {
  const declared = Number(req.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > max) return null;
  if (!req.body) return new Uint8Array(0);
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

export function createHandler(opts: { tokens: string; store: Store; now?: () => number }): (req: Request) => Promise<Response> {
  const tokens = parseTokens(opts.tokens);
  const projects = [...new Set(tokens.values())].sort();
  const authenticate = createAuthenticator(tokens);
  const inbox = createInbox(opts.now ? { store: opts.store, projects, now: opts.now } : { store: opts.store, projects });
  const unauthorized = (): Response => json({ error: 'unauthorized' }, 401, { 'www-authenticate': 'Bearer' });

  return async (req) => {
    try {
      const path = new URL(req.url).pathname;
      if (path === '/health') {
        if (req.method !== 'GET' && req.method !== 'HEAD') return json({ error: 'method_not_allowed' }, 405, { allow: 'GET' });
        return json({ ok: true });
      }
      const pathMatch = /^\/t\/([^/]*)\/mcp$/.exec(path);
      if (path !== '/mcp' && !pathMatch) return json({ error: 'not_found' }, 404);
      if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { allow: 'POST' });

      const ct = (req.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase();
      if (ct !== 'application/json') return json({ error: 'unsupported_media_type' }, 415);

      const project = await authenticate(bearerToken(req) ?? (pathMatch ? (pathMatch[1] as string) : null));
      if (!project) return unauthorized();

      const bytes = await readCapped(req, LIMITS.requestBytesMax);
      if (!bytes) return json({ error: 'payload_too_large' }, 413);

      let parsed: unknown;
      try {
        parsed = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        return rpcErr(-32700, 'Parse error');
      }
      if (Array.isArray(parsed)) return rpcErr(-32600, 'Batches are not supported');

      const res = await handleMcp(inbox, project, parsed, projects);
      if (res === null) return new Response(null, { status: 202, headers: { 'x-content-type-options': 'nosniff' } });
      return json(res, res.error?.code === -32603 ? 500 : 200);
    } catch {
      return rpcErr(-32603, 'Internal error', 500);
    }
  };
}
