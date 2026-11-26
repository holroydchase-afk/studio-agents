// SPDX-License-Identifier: MIT
// Local runner for trials and tests. INBOX_TOKENS from the environment; MemoryStore; optional INBOX_FILE for JSON persistence.
// Binds 127.0.0.1 only. Prints the port, never tokens or URLs.
import { createServer } from 'node:http';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { LIMITS } from './types.ts';
import { createHandler } from './handler.ts';
import { MemoryStore } from './store-memory.ts';
import type { MemoryState } from './store-memory.ts';

const file = process.env.INBOX_FILE;
let store: MemoryStore;
try {
  store = new MemoryStore(file && existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as MemoryState) : undefined);
} catch {
  process.stderr.write('INBOX_FILE could not be read as an inbox snapshot.\n');
  process.exit(1);
}

let handler: (r: Request) => Promise<Response>;
try {
  handler = createHandler({ tokens: process.env.INBOX_TOKENS ?? '', store });
} catch (e) {
  process.stderr.write(`${e instanceof Error ? e.message : 'INBOX_TOKENS is invalid'}\n`);
  process.exit(1);
}

let saved = store.revision;
function persist(): void {
  if (!file || store.revision === saved) return;
  saved = store.revision;
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(store.snapshot()), { mode: 0o600 });
  renameSync(tmp, file);
}

const server = createServer(async (req, res) => {
  try {
    // DNS-rebinding guard: only answer requests addressed to the loopback name we listen on.
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const host = (req.headers.host ?? '').toLowerCase();
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
      res.writeHead(403, { 'content-type': 'application/json', 'x-content-type-options': 'nosniff' });
      res.end('{"error":"forbidden_host"}');
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      for await (const c of req as AsyncIterable<Buffer>) {
        size += c.length;
        if (size > LIMITS.requestBytesMax + 1) break; // enough for the handler to answer 413
        chunks.push(c);
      }
    }
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
    headers.delete('content-length');
    const init: RequestInit = { method: req.method ?? 'GET', headers };
    if (chunks.length || (req.method !== 'GET' && req.method !== 'HEAD')) init.body = Buffer.concat(chunks);
    const out = await handler(new Request(`http://127.0.0.1${req.url ?? '/'}`, init));
    persist();
    res.writeHead(out.status, Object.fromEntries(out.headers));
    res.end(Buffer.from(await out.arrayBuffer()));
  } catch {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end('{"error":"internal"}');
  }
});

server.listen(Number(process.env.PORT ?? 8787), '127.0.0.1', () => {
  const addr = server.address();
  process.stdout.write(`studio-inbox listening on port ${typeof addr === 'object' && addr ? addr.port : '?'}\n`);
});
