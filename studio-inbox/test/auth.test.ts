// SPDX-License-Identifier: MIT
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { TOK, TOKENS_RAW, ORIGIN, jsonReq, bearer, newHandler, rpc, call, captureConsole, errorCode } from './helpers/rpc.ts';
import type { Store } from '../src/types.ts';

const parse = async (raw: string) => (await import('../src/config.ts')).parseTokens(raw);
const ping = { jsonrpc: '2.0', id: 1, method: 'ping' };

// ---------- INB-1 parseTokens ----------

test('INB-1 parseTokens maps token -> project for a valid value', async () => {
  const m = await parse(TOKENS_RAW);
  assert.equal(m.size, 3);
  assert.equal(m.get(TOK.alpha), 'alpha');
  assert.equal(m.get(TOK.beta), 'beta');
  assert.equal(m.get(TOK.gamma), 'gamma');
});

test('INB-1 parseTokens accepts the boundaries: 32-char token, 32-char project name, name with hyphen/digit start', async () => {
  const name32 = 'a' + 'b'.repeat(31);
  const m = await parse(`${name32}:${'q'.repeat(32)},9-lives:${'r'.repeat(32)}`);
  assert.equal(m.get('q'.repeat(32)), name32);
  assert.equal(m.get('r'.repeat(32)), '9-lives');
});

test('INB-1 parseTokens tolerates whitespace around entries', async () => {
  const m = await parse(` alpha:${TOK.alpha} , beta:${TOK.beta}\n`);
  assert.equal(m.size, 2);
});

const badValues: Array<[string, (t: string) => string]> = [
  ['empty string', () => ''],
  ['no colon', (t) => `alpha${t}`],
  ['empty project name', (t) => `:${t}`],
  ['uppercase project name', (t) => `Alpha:${t}`],
  ['leading hyphen project name', (t) => `-alpha:${t}`],
  ['underscore in project name', (t) => `al_pha:${t}`],
  ['33-char project name', (t) => `${'a'.repeat(33)}:${t}`],
  ['31-char token', () => `alpha:${'k'.repeat(31)}`],
  ['empty token', () => 'alpha:'],
  ['duplicate project', (t) => `alpha:${t},alpha:${'y'.repeat(40)}`],
  ['duplicate token', (t) => `alpha:${t},beta:${t}`],
  ['trailing comma entry', (t) => `alpha:${t},`],
];
for (const [name, mk] of badValues) {
  test(`INB-1 parseTokens rejects ${name} with an Error that names the problem and never contains a token`, async () => {
    const token = 'z'.repeat(40);
    const raw = mk(token);
    const parseTokens = (await import('../src/config.ts')).parseTokens;
    assert.throws(
      () => parseTokens(raw),
      (e: unknown) => {
        assert.ok(e instanceof Error);
        assert.ok(e.message.length > 0);
        assert.ok(!e.message.includes(token), 'message leaked a token');
        assert.ok(!e.message.includes('k'.repeat(31)), 'message leaked a short token');
        assert.ok(!e.message.includes('y'.repeat(40)), 'message leaked a token');
        return true;
      },
    );
  });
}

test('INB-1 parseTokens error for a duplicate token does not echo the other tokens in the value either', async () => {
  const raw = `alpha:${TOK.alpha},beta:${TOK.beta},gamma:${TOK.beta}`;
  const parseTokens = (await import('../src/config.ts')).parseTokens;
  assert.throws(
    () => parseTokens(raw),
    (e: unknown) => {
      assert.ok(e instanceof Error);
      for (const t of Object.values(TOK)) assert.ok(!e.message.includes(t));
      return true;
    },
  );
});

// ---------- INB-2 authentication ----------

test('INB-2 Bearer header authenticates', async () => {
  const { handler } = await newHandler();
  const r = await rpc(handler, 'alpha', ping);
  assert.equal(r.res.status, 200);
  assert.equal(r.json.id, 1);
});

test('INB-2 path /t/<token>/mcp authenticates', async () => {
  const { handler } = await newHandler();
  const res = await handler(jsonReq(`/t/${TOK.beta}/mcp`, ping));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).id, 1);
});

test('INB-2 every configured token works, including the last one', async () => {
  const { handler } = await newHandler();
  for (const p of ['alpha', 'beta', 'gamma'] as const) {
    assert.equal((await rpc(handler, p, ping)).res.status, 200, p);
  }
});

const unauth: Array<[string, () => Request]> = [
  ['no token', () => jsonReq('/mcp', ping)],
  ['wrong token of the right length', () => jsonReq('/mcp', ping, { authorization: `Bearer ${'d'.repeat(40)}` })],
  ['prefix of a real token', () => jsonReq('/mcp', ping, { authorization: `Bearer ${'a'.repeat(39)}` })],
  ['real token plus one character', () => jsonReq('/mcp', ping, { authorization: `Bearer ${'a'.repeat(41)}` })],
  ['empty bearer', () => jsonReq('/mcp', ping, { authorization: 'Bearer ' })],
  ['wrong scheme', () => jsonReq('/mcp', ping, { authorization: `Basic ${TOK.alpha}` })],
  ['token without a scheme', () => jsonReq('/mcp', ping, { authorization: TOK.alpha })],
  ['wrong token in the path', () => jsonReq(`/t/${'d'.repeat(40)}/mcp`, ping)],
  ['empty token in the path', () => jsonReq('/t//mcp', ping)],
  ['very long garbage token (5000 chars)', () => jsonReq('/mcp', ping, { authorization: `Bearer ${'x'.repeat(5000)}` })],
  ['one-character token', () => jsonReq('/mcp', ping, { authorization: 'Bearer x' })],
];
const bodies: string[] = [];
for (const [name, mk] of unauth) {
  test(`INB-2 ${name} gets 401 with WWW-Authenticate: Bearer and a JSON body`, async () => {
    const { handler } = await newHandler();
    const res = await handler(mk());
    assert.equal(res.status, 401);
    assert.match(res.headers.get('www-authenticate') ?? '', /^Bearer/);
    const text = await res.text();
    const json = JSON.parse(text); // must be JSON
    assert.equal(typeof json, 'object');
    bodies.push(text);
  });
}

test('INB-2 the 401 body is identical whatever was wrong (no hint about which part)', async () => {
  const { handler } = await newHandler();
  const texts = new Set<string>();
  for (const [, mk] of unauth) texts.add(await (await handler(mk())).text());
  assert.equal(texts.size, 1, `401 bodies differ: ${[...texts].join(' | ')}`);
});

test('INB-2 the 401 body does not name a project or say "unknown project" or "token"', async () => {
  const { handler } = await newHandler();
  const text = (await (await handler(jsonReq('/mcp', ping, { authorization: `Bearer ${'d'.repeat(40)}` }))).text()).toLowerCase();
  for (const word of ['alpha', 'beta', 'gamma', 'unknown', 'expired', 'invalid token', 'wrong']) {
    assert.ok(!text.includes(word), `401 body mentions "${word}": ${text}`);
  }
});

// ---------- INB-3 constant-time comparison ----------

test('INB-3 tokens of any length are compared without throwing (equal-length digests): 1-char and 5000-char tokens get 401, not 500', async () => {
  const { handler } = await newHandler();
  for (const len of [1, 7, 39, 41, 64, 5000]) {
    const res = await handler(jsonReq('/mcp', ping, { authorization: `Bearer ${'a'.repeat(len)}` }));
    assert.equal(res.status, 401, `length ${len}`);
  }
});

test('INB-3 the source compares digests with a constant-time primitive (static check: timingSafeEqual or a digest-and-XOR loop)', () => {
  const dir = new URL('../src/', import.meta.url);
  const src = readdirSync(dir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => readFileSync(new URL(f, dir), 'utf8'))
    .join('\n');
  assert.match(src, /timingSafeEqual|subtle\.digest|createHash/, 'no digest or constant-time compare found in src/');
});

test('INB-3 a token that differs from a real one only in its last character is refused (full comparison, not a prefix match)', async () => {
  const { handler } = await newHandler();
  const near = 'a'.repeat(39) + 'z';
  assert.equal((await handler(jsonReq('/mcp', ping, { authorization: `Bearer ${near}` }))).status, 401);
});

// ---------- INB-4 identity only from the token ----------

test('INB-4 tools/list schemas have no from property and are strict (additionalProperties false)', async () => {
  const { handler } = await newHandler();
  const r = await rpc(handler, 'alpha', { jsonrpc: '2.0', id: 2, method: 'tools/list' });
  const tools = r.json.result.tools as Array<{ name: string; inputSchema: any }>; // eslint-disable-line @typescript-eslint/no-explicit-any
  assert.equal(tools.length, 3);
  for (const t of tools) {
    assert.equal(t.inputSchema.type, 'object');
    assert.equal(t.inputSchema.additionalProperties, false, t.name);
    assert.ok(!('from' in (t.inputSchema.properties ?? {})) || t.name === 'inbox_read', `${t.name} exposes from`);
  }
  const post = tools.find((t) => t.name === 'inbox_post');
  assert.ok(post);
  assert.ok(!('from' in post.inputSchema.properties));
});

test('INB-4 inbox_post with a from property is rejected as invalid_input and stores nothing', async () => {
  const { handler, store } = await newHandler();
  const r = await call(handler, 'alpha', 'inbox_post', { to: 'beta', kind: 'fyi', subject: 'Hi there', body: 'Short note', from: 'gamma' });
  assert.equal(r.res.status, 200);
  assert.equal(r.result.isError, true);
  assert.equal(errorCode(r.result), 'invalid_input');
  assert.equal(await store.headId(), 0);
});

test('INB-4 the sender is the token owner: alpha posts, beta reads from === "alpha"', async () => {
  const { handler } = await newHandler();
  await call(handler, 'alpha', 'inbox_post', { to: 'beta', kind: 'fyi', subject: 'Hi there', body: 'Short note' });
  const r = await call(handler, 'beta', 'inbox_read', {});
  const msgs = r.result.structuredContent.messages;
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].from, 'alpha');
});

test('INB-4 the sender is the same whichever way the token arrives (path token)', async () => {
  const { handler } = await newHandler();
  const res = await handler(
    jsonReq(`/t/${TOK.gamma}/mcp`, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'inbox_post', arguments: { to: 'all', kind: 'fyi', subject: 'Hi there', body: 'Short note' } },
    }),
  );
  assert.equal(res.status, 200);
  const r = await call(handler, 'alpha', 'inbox_read', {});
  assert.equal(r.result.structuredContent.messages[0].from, 'gamma');
});

// ---------- INB-5 no leaks ----------

function assertNoLeak(haystack: string, what: string) {
  for (const t of Object.values(TOK)) assert.ok(!haystack.includes(t), `${what} contains a token`);
  assert.ok(!haystack.includes('/t/'), `${what} contains a token URL path`);
}

test('INB-5 nothing reaches the console for good, bad, malformed and unknown-path requests, and no response echoes the token or URL', async () => {
  const { handler } = await newHandler();
  const cap = captureConsole();
  const texts: string[] = [];
  try {
    const reqs: Request[] = [
      jsonReq(`/t/${TOK.alpha}/mcp`, ping),
      jsonReq(`/t/${TOK.alpha}/mcp`, '{not json'),
      jsonReq(`/t/${TOK.alpha}/mcp`, { jsonrpc: '2.0', id: 1, method: 'nope' }),
      jsonReq(`/t/${TOK.alpha}/nope`, ping),
      jsonReq(`/t/${'d'.repeat(40)}/mcp`, ping),
      jsonReq('/mcp', ping, { authorization: `Bearer ${'d'.repeat(40)}` }),
      jsonReq('/mcp', ping, bearer('beta')),
      new Request(`${ORIGIN}/t/${TOK.alpha}/mcp`, { method: 'GET' }),
      jsonReq(`/t/${TOK.alpha}/mcp`, 'x'.repeat(20000)),
    ];
    for (const rq of reqs) {
      const res = await handler(rq);
      texts.push(await res.text(), [...res.headers.entries()].flat().join(' '));
    }
  } finally {
    cap.restore();
  }
  assert.deepEqual(cap.lines, [], `console was written to: ${cap.lines.join(' || ')}`);
  for (const t of texts) {
    for (const tok of [TOK.alpha, 'd'.repeat(40)]) assert.ok(!t.includes(tok), 'response leaked a token');
    assert.ok(!t.includes('/t/'), 'response leaked a URL path');
  }
});

test('INB-5 stored messages never contain a token or the request URL', async () => {
  const { handler, store } = await newHandler();
  await handler(
    jsonReq(`/t/${TOK.alpha}/mcp`, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'inbox_post', arguments: { to: 'all', kind: 'fyi', subject: 'Hello there', body: 'A short note' } },
    }),
  );
  const dump = JSON.stringify([await store.get(1), await store.listFor('beta', { afterId: 0, limit: 50 })]);
  assertNoLeak(dump, 'store');
  assert.ok(!dump.includes(ORIGIN));
});

test('INB-5 a failing store does not leak the token or URL into the response body or console', async () => {
  const { MemoryStore } = await import('../src/store-memory.ts');
  const inner = new MemoryStore();
  const boom = (): never => {
    throw new Error('db down');
  };
  const broken: Store = { ...inner, insert: boom, get: boom, listFor: boom, countFor: boom, countFrom: boom, getCursor: boom, setCursor: boom, headId: boom, purgeOlderThan: boom, trimToLimit: boom } as unknown as Store;
  const { handler } = await newHandler(broken);
  const cap = captureConsole();
  let text = '';
  try {
    const res = await handler(
      jsonReq(`/t/${TOK.alpha}/mcp`, {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'inbox_post', arguments: { to: 'all', kind: 'fyi', subject: 'Hello there', body: 'A short note' } },
      }),
    );
    text = await res.text();
  } finally {
    cap.restore();
  }
  assertNoLeak(text, 'error body');
  assertNoLeak(cap.lines.join('\n'), 'console');
});
