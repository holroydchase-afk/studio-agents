// SPDX-License-Identifier: MIT
// Token configuration and authentication. Web-standard APIs only.
import { LIMITS } from './types.ts';

const NAME_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]+$/;

/**
 * Parses INBOX_TOKENS ("project:token,project:token") into a map of token -> project.
 * Error messages name the problem and the entry number; they never contain a token.
 */
export function parseTokens(raw: string): Map<string, string> {
  if (typeof raw !== 'string' || raw.trim() === '') throw new Error('INBOX_TOKENS is empty: expected project:token,project:token');
  const out = new Map<string, string>();
  const names = new Set<string>();
  raw
    .trim()
    .split(',')
    .forEach((entry, i) => {
      const n = i + 1;
      const e = entry.trim();
      if (e === '') throw new Error(`INBOX_TOKENS entry ${n} is empty (stray comma?)`);
      const colon = e.indexOf(':');
      if (colon < 0) throw new Error(`INBOX_TOKENS entry ${n} has no colon: expected project:token`);
      const name = e.slice(0, colon);
      const token = e.slice(colon + 1);
      if (!NAME_RE.test(name)) {
        throw new Error(`INBOX_TOKENS entry ${n}: project name must match ^[a-z0-9][a-z0-9-]{0,31}$`);
      }
      if (token.length < LIMITS.tokenMinLength || !TOKEN_RE.test(token)) {
        throw new Error(`INBOX_TOKENS entry ${n} (${name}): token must be at least ${LIMITS.tokenMinLength} characters of A-Z a-z 0-9 _ -`);
      }
      if (names.has(name)) throw new Error(`INBOX_TOKENS has a duplicate project name: ${name}`);
      if (out.has(token)) throw new Error(`INBOX_TOKENS entry ${n} (${name}) reuses another project's token`);
      names.add(name);
      out.set(token, name);
    });
  return out;
}

const enc = new TextEncoder();

async function sha256(s: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)));
}

/** Constant-time over equal-length digests. */
function digestsEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/** Returns a function mapping a presented token to its project (or null). Compares against every configured token, no early exit. */
export function createAuthenticator(tokens: Map<string, string>): (candidate: string | null) => Promise<string | null> {
  const table = Promise.all([...tokens].map(async ([token, project]) => ({ digest: await sha256(token), project })));
  return async (candidate) => {
    const presented = await sha256(candidate ?? '');
    let found: string | null = null;
    for (const entry of await table) {
      if (digestsEqual(entry.digest, presented)) found = entry.project;
    }
    return candidate ? found : null;
  };
}

/** The token from `Authorization: Bearer <token>`, or null. */
export function bearerToken(req: Request): string | null {
  const m = /^Bearer\s+(\S+)\s*$/i.exec(req.headers.get('authorization') ?? '');
  return m ? (m[1] as string) : null;
}
