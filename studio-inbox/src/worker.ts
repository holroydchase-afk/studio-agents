// SPDX-License-Identifier: MIT
// Cloudflare module worker. Secret INBOX_TOKENS, D1 binding DB. Logs nothing.
import type { D1Like } from './types.ts';
import { createHandler } from './handler.ts';
import { D1Store } from './store-d1.ts';

/** The minimal environment this worker uses (declared here instead of pulling in Cloudflare's type package). */
export interface Env {
  INBOX_TOKENS?: unknown;
  DB?: unknown;
}

export default {
  async fetch(req: Request, env: Env, _ctx?: unknown): Promise<Response> {
    const tokens = env.INBOX_TOKENS;
    const notConfigured = (): Response => new Response(JSON.stringify({ error: 'not_configured' }), { status: 500, headers: { 'content-type': 'application/json' } });
    if (typeof tokens !== 'string' || tokens.trim() === '' || !env.DB) return notConfigured();
    let handler: (r: Request) => Promise<Response>;
    try {
      handler = createHandler({ tokens, store: new D1Store(env.DB as D1Like) });
    } catch {
      return notConfigured();
    }
    return handler(req);
  },
};
