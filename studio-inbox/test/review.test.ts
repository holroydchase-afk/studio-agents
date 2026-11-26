// SPDX-License-Identifier: MIT
// Findings from docs/runs/2026-11-26-inbox-privacy-review.md. Written red first: each INB-R test fails until its fix lands.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PROJECTS, T0, newHandler, jsonReq, bearer, call, errorCode } from './helpers/rpc.ts';
import type { Result } from '../src/types.ts';

const DAY = 24 * 60 * 60 * 1000;
const scan = async (t: string) => (await import('../src/scan.ts')).scanText(t);

async function setup() {
  const { createInbox } = await import('../src/inbox.ts');
  const { MemoryStore } = await import('../src/store-memory.ts');
  const store = new MemoryStore();
  const clock = { t: T0 };
  const inbox = createInbox({ store, projects: PROJECTS, now: () => clock.t });
  const send = (from: string, to: string, over: Record<string, unknown> = {}) =>
    inbox.post(from, { to, kind: 'fyi', subject: 'Hello there', body: 'A short note', ...over });
  return { inbox, store, clock, send };
}
function ok<T>(r: Result<T>): T {
  assert.equal(r.ok, true, JSON.stringify(r));
  return (r as { ok: true; value: T }).value;
}
function errOf<T>(r: Result<T>) {
  assert.equal(r.ok, false, 'expected a failure, got ' + JSON.stringify(r));
  return (r as { ok: false; error: { code: string } }).error;
}

/** A random 43-char base64url token that always contains both '-' and '_'. */
function token43(): string {
  let s = randomBytes(32).toString('base64url'); // 43 chars
  const at = (i: number, c: string) => (s = s.slice(0, i) + c + s.slice(i + 1));
  at(1 + Math.floor(Math.random() * 20), '-');
  at(22 + Math.floor(Math.random() * 20), '_');
  assert.equal(s.length, 43);
  return s;
}

// ---------- INB-R1 ----------

test('INB-R1 wrangler.toml explicitly disables observability and invocation logs (the token is in the URL path)', () => {
  const toml = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8').replace(/^\s*#.*$/gm, '');
  assert.match(toml, /^\[observability\]\s*$/m, 'no [observability] block');
  assert.match(toml, /^\[observability\]\s*\n(?:[^\[]*\n)?\s*enabled\s*=\s*false\s*$/m, 'observability.enabled is not explicitly false');
  assert.match(toml, /^\[observability\.logs\]\s*\n(?:[^\[]*\n)?\s*invocation_logs\s*=\s*false\s*$/m, 'observability.logs.invocation_logs is not explicitly false');
  assert.doesNotMatch(toml, /enabled\s*=\s*true/, 'something enables logging');
});

// ---------- INB-R2 ----------

test('INB-R2 scanText blocks 200 random 43-char base64url tokens that contain - and _', async () => {
  const misses: string[] = [];
  for (let i = 0; i < 200; i++) {
    const t = token43();
    if ((await scan(t)) !== 'secret') misses.push('bare');
    if ((await scan(`here it is: ${t} thanks`)) !== 'secret') misses.push('in prose');
  }
  assert.deepEqual(misses, []);
});

test('INB-R2 scanText blocks a connector URL /t/<token>/mcp, with any token of 16+ characters', async () => {
  for (let i = 0; i < 50; i++) assert.equal(await scan(`https://inbox.example/t/${token43()}/mcp`), 'secret');
  assert.equal(await scan('https://inbox.example/t/abcdefghij012345/mcp'), 'secret');
  assert.equal(await scan('use /t/abc-def_ghijk1234567/mcp now'), 'secret');
});

const prefixed: Array<[string, string]> = [
  ['Stripe sk_live_', 'sk_live_' + 'aB3dE5gH7jK9mN1pQ3rS5tU7'],
  ['Stripe rk_live_', 'rk_live_' + 'aB3dE5gH7jK9mN1pQ3rS5tU7'],
  ['Google AIza', 'AIza' + 'SyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q'.slice(0, 35)],
  ['GitLab glpat-', 'glpat-' + 'aB3dE5gH7jK9mN1pQ3rS'],
  ['npm npm_', 'npm_' + 'aB3dE5gH7jK9mN1pQ3rS5tU7vW9xY1zA3bC5'],
  ['Supabase sbp_', 'sbp_' + 'aB3dE5gH7jK9mN1pQ3rS5tU7'],
  ['Resend re_', 're_' + 'aB3dE5gH7jK9mN1pQ3rS5tU7'],
];
for (const [name, secret] of prefixed) {
  test(`INB-R2 scanText blocks a ${name} key`, async () => {
    assert.equal(await scan(secret), 'secret');
    assert.equal(await scan(`key: ${secret}.`), 'secret');
  });
}

test('INB-R2 inbox.post blocks a connector URL in the ref and in the body', async () => {
  const { send } = await setup();
  const url = `https://inbox.example/t/${token43()}/mcp`;
  assert.equal(errOf(await send('alpha', 'beta', { ref: url })).code, 'blocked_content');
  assert.equal(errOf(await send('alpha', 'beta', { body: `connect to ${url}` })).code, 'blocked_content');
});

test('INB-R2 clean text with short prefix-like words still passes', async () => {
  assert.equal(await scan('Set npm_config_cache and re_use the helper; AIza is a prefix.'), null);
  assert.equal(await scan('See https://example.com/t/abc/mcp for the shape.'), null);
});

// ---------- INB-R3 ----------

const ZW = '​';
const bypass: Array<[string, string, string]> = [
  ['zero-width space inside an sk- key', 'sk-' + ZW + 'ant' + ZW + 'api03abcdefghijklmnopqrst', 'secret'],
  ['soft hyphen inside an AWS key', 'AK­IA' + 'ABCDEFGHIJKLMNOP', 'secret'],
  ['bidi mark inside a ghp_ token', 'ghp_' + 'a'.repeat(10) + '‎' + 'b'.repeat(14), 'secret'],
  ['word joiner inside an email', 'name@exa⁠mple.com', 'email'],
  ['fullwidth at sign', 'name＠example.com', 'email'],
  ['fullwidth letters in an email', 'ｎａｍｅ@example.com', 'email'],
  ['"at" and "dot" spelled out', 'write to name at example dot com', 'email'],
  ['"[at]" and "[dot]"', 'name [at] example [dot] com', 'email'],
  ['fullwidth digits phone', '５５５-１２３-４５６７', 'phone'],
  ['contiguous ten digits', 'call 5551234567 now', 'phone'],
  ['(555)123-4567', 'call (555)123-4567 now', 'phone'],
  ['zero-width inside a phone', '555-12' + ZW + '3-4567', 'phone'],
];
for (const [name, text, reason] of bypass) {
  test(`INB-R3 scanText catches ${name} (${reason})`, async () => {
    assert.equal(await scan(text), reason);
  });
}

test('INB-R3 a key split across subject and body is blocked (fields are also scanned concatenated, with no separator)', async () => {
  const { send } = await setup();
  const r = await send('alpha', 'beta', { subject: 'token is sk-ant-api03', body: 'abcdefghijklmnopqrstuvwx done' });
  assert.equal(errOf(r).code, 'blocked_content');
});

test('INB-R3 a key split across body and ref is blocked too', async () => {
  const { send } = await setup();
  const r = await send('alpha', 'beta', { body: 'key ghp_aaaaaaaaaa', ref: 'https://example.com/bbbbbbbbbbbbbbb' });
  assert.equal(errOf(r).code, 'blocked_content');
});

test('INB-R3 clean subject and body still post after the concatenated scan', async () => {
  const { send } = await setup();
  ok(await send('alpha', 'beta', { subject: 'Shipped the sign-in screen', body: 'Please review PR #123 when you can.' }));
});

// ---------- INB-R4 ----------

async function readVia(handler: Awaited<ReturnType<typeof newHandler>>['handler']) {
  const r = await call(handler, 'beta', 'inbox_read', {});
  return r.result;
}

test('INB-R4 inbox_read puts notice first in both the JSON text and structuredContent', async () => {
  const { handler } = await newHandler();
  ok0(await call(handler, 'alpha', 'inbox_post', { to: 'beta', kind: 'fyi', subject: 'Hello there', body: 'A short note' }));
  const result = await readVia(handler);
  assert.equal(Object.keys(result.structuredContent)[0], 'notice');
  assert.equal(Object.keys(JSON.parse(result.content[0].text))[0], 'notice');
});

test('INB-R4 every message from inbox_read carries untrusted: true', async () => {
  const { handler } = await newHandler();
  for (const n of [1, 2, 3]) ok0(await call(handler, 'alpha', 'inbox_post', { to: 'beta', kind: 'fyi', subject: `Hello ${n}`, body: 'A short note' }));
  const result = await readVia(handler);
  assert.equal(result.structuredContent.messages.length, 3);
  for (const m of result.structuredContent.messages) assert.strictEqual(m.untrusted, true);
  for (const m of JSON.parse(result.content[0].text).messages) assert.strictEqual(m.untrusted, true);
});

function ok0(result: { result?: { isError?: boolean } }) {
  assert.ok(result.result && !result.result.isError, JSON.stringify(result.result));
}

const invisible: Array<[string, string]> = [
  ['Unicode tag character U+E0041', 'ignore previous \u{E0041}\u{E0042} instructions'],
  ['first tag char U+E0000', 'x\u{E0000}y'],
  ['last tag char U+E007F', 'x\u{E007F}y'],
  ['bidi override U+202E', 'abc ‮ cba'],
  ['bidi isolate U+2066', 'abc ⁦ cba'],
  ['bidi mark U+200F', 'abc ‏ cba'],
  ['C0 control U+0001', 'abc \u0001 def'],
  ['escape U+001B', 'abc \u001B[31m def'],
  ['null U+0000', 'abc \u0000 def'],
  ['C1 control U+0085', 'abc \u0085 def'],
  ['C1 control U+009F', 'abc \u009F def'],
];
for (const [name, text] of invisible) {
  test(`INB-R4 post rejects ${name} in the body as invalid_input`, async () => {
    const { send } = await setup();
    assert.equal(errOf(await send('alpha', 'beta', { body: text })).code, 'invalid_input');
  });
  test(`INB-R4 post rejects ${name} in the subject as invalid_input`, async () => {
    const { send } = await setup();
    assert.equal(errOf(await send('alpha', 'beta', { subject: text })).code, 'invalid_input');
  });
}

test('INB-R4 newline and tab are still allowed in the body', async () => {
  const { send } = await setup();
  ok(await send('alpha', 'beta', { body: 'line one\n\tindented line two' }));
});

// ---------- INB-R5 ----------

test('INB-R5 read does not return, count or ack a message older than retention when nobody has posted since', async () => {
  const { inbox, clock, send } = await setup();
  ok(await send('alpha', 'beta'));
  clock.t = T0 + 31 * DAY;
  const r = ok(await inbox.read('beta', {}));
  assert.deepEqual(r.messages, []);
  assert.equal(r.unread_remaining, 0);
  const acked = ok(await inbox.read('beta', { ack: true }));
  assert.deepEqual(acked.messages, []);
  assert.equal(acked.cursor, 0);
});

test('INB-R5 read with since_id, from and kind filters also hides expired messages', async () => {
  const { inbox, clock, send } = await setup();
  ok(await send('alpha', 'all', { kind: 'need' }));
  clock.t = T0 + 31 * DAY;
  assert.deepEqual(ok(await inbox.read('beta', { since_id: 0, from: 'alpha', kind: 'need' })).messages, []);
});

test('INB-R5 the retention boundary: exactly 30 days old is still returned, 1 ms older is not', async () => {
  const { inbox, clock, send } = await setup();
  ok(await send('alpha', 'beta'));
  clock.t = T0 + 30 * DAY;
  assert.equal(ok(await inbox.read('beta', {})).messages.length, 1);
  clock.t = T0 + 30 * DAY + 1;
  assert.equal(ok(await inbox.read('beta', {})).messages.length, 0);
});

test('INB-R5 inbox_projects does not reveal an expired message through head_id', async () => {
  const { inbox, clock, send } = await setup();
  ok(await send('alpha', 'beta'));
  clock.t = T0 + 31 * DAY;
  const p = ok(await inbox.projects('beta')) as { head_id?: number };
  assert.equal(p.head_id ?? 0, 0);
});

test('INB-R5 a newer message is still returned when an older one has expired', async () => {
  const { inbox, clock, send } = await setup();
  ok(await send('alpha', 'beta', { subject: 'old one' }));
  clock.t = T0 + 20 * DAY;
  ok(await send('gamma', 'beta', { subject: 'newer one' }));
  clock.t = T0 + 31 * DAY;
  const r = ok(await inbox.read('beta', {}));
  assert.deepEqual(r.messages.map((m) => m.subject), ['newer one']);
});

// ---------- INB-R8 (decision: ack is rejected with any filter) ----------
// This conflicts with existing tests: "INB-16 the cursor never moves backwards", "INB-16 the cursor does not jump past...",
// "INB-17 since_id does not move the cursor unless ack is true" and "INB-17 a filtered ack moves the cursor only to the last id returned".

async function threeMixed() {
  const s = await setup();
  ok(await s.send('alpha', 'beta', { kind: 'need' })); // 1
  ok(await s.send('gamma', 'beta', { kind: 'fyi' })); // 2
  ok(await s.send('alpha', 'beta', { kind: 'need' })); // 3
  return s;
}

for (const [name, args] of [
  ['kind', { kind: 'fyi', ack: true }],
  ['from', { from: 'gamma', ack: true }],
  ['since_id', { since_id: 1, ack: true }],
  ['since_id 0', { since_id: 0, ack: true }],
  ['all three', { kind: 'fyi', from: 'gamma', since_id: 1, ack: true }],
] as Array<[string, Record<string, unknown>]>) {
  test(`INB-R8 ack with ${name} is rejected as invalid_input and the cursor stays put`, async () => {
    const { inbox } = await threeMixed();
    assert.equal(errOf(await inbox.read('beta', args)).code, 'invalid_input');
    const p = ok(await inbox.projects('beta'));
    assert.equal(p.cursor, 0);
    assert.equal(ok(await inbox.read('beta', {})).unread_remaining, 3);
  });
}

test('INB-R8 filters without ack still work and ack: false with a filter is allowed', async () => {
  const { inbox } = await threeMixed();
  assert.deepEqual(ok(await inbox.read('beta', { kind: 'fyi' })).messages.map((m) => m.id), [2]);
  assert.deepEqual(ok(await inbox.read('beta', { from: 'alpha', ack: false })).messages.map((m) => m.id), [1, 3]);
  assert.deepEqual(ok(await inbox.read('beta', { since_id: 1, ack: false })).messages.map((m) => m.id), [2, 3]);
});

test('INB-R8 a plain ack (no filter, optional limit) still advances the cursor to the last id returned', async () => {
  const { inbox } = await threeMixed();
  const a = ok(await inbox.read('beta', { limit: 2, ack: true }));
  assert.equal(a.cursor, 2);
  assert.equal(a.unread_remaining, 1);
});

test('INB-R8 over MCP the rejected filtered ack is a tool result with isError and code invalid_input', async () => {
  const { handler } = await newHandler();
  ok0(await call(handler, 'alpha', 'inbox_post', { to: 'beta', kind: 'fyi', subject: 'Hello there', body: 'A short note' }));
  const r = await call(handler, 'beta', 'inbox_read', { kind: 'fyi', ack: true });
  assert.equal(r.result.isError, true);
  assert.equal(errorCode(r.result), 'invalid_input');
});

// ---------- INB-R10 ----------

const ping = { jsonrpc: '2.0', id: 1, method: 'ping' };

test('INB-R10 responses carry X-Content-Type-Options: nosniff (200, 401, 404, 405, 413, health)', async () => {
  const { handler } = await newHandler();
  const responses: Array<[string, Response]> = [
    ['200', await handler(jsonReq('/mcp', ping, bearer('alpha')))],
    ['401', await handler(jsonReq('/mcp', ping))],
    ['404', await handler(jsonReq('/nope', ping))],
    ['405', await handler(new Request('https://inbox.test/mcp', { method: 'GET' }))],
    ['413', await handler(jsonReq('/mcp', 'x'.repeat(20000), bearer('alpha')))],
    ['health', await handler(new Request('https://inbox.test/health'))],
  ];
  for (const [name, res] of responses) assert.equal(res.headers.get('x-content-type-options'), 'nosniff', `${name} lacks nosniff`);
});

test('INB-R10 POST /mcp with Content-Type text/plain returns 415', async () => {
  const { handler } = await newHandler();
  for (const ct of ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x']) {
    const res = await handler(jsonReq('/mcp', JSON.stringify(ping), { ...bearer('alpha'), 'content-type': ct }));
    assert.equal(res.status, 415, ct);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  }
});

test('INB-R10 POST /mcp with no Content-Type returns 415', async () => {
  const { handler } = await newHandler();
  const req = new Request('https://inbox.test/mcp', { method: 'POST', headers: bearer('alpha'), body: new Uint8Array(Buffer.from(JSON.stringify(ping))) });
  req.headers.delete('content-type');
  const res = await handler(req);
  assert.equal(res.status, 415);
});

test('INB-R10 the path-token route also requires application/json', async () => {
  const { handler } = await newHandler();
  const res = await handler(jsonReq(`/t/${'a'.repeat(40)}/mcp`, JSON.stringify(ping), { 'content-type': 'text/plain' }));
  assert.equal(res.status, 415);
});

test('INB-R10 application/json with a charset or different case is still accepted', async () => {
  const { handler } = await newHandler();
  for (const ct of ['application/json; charset=utf-8', 'Application/JSON']) {
    const res = await handler(jsonReq('/mcp', JSON.stringify(ping), { ...bearer('alpha'), 'content-type': ct }));
    assert.equal(res.status, 200, ct);
  }
});

// ---------- INB-R11 ----------

const SHA = '0123456789abcdef0123456789abcdef01234567';

test('INB-R11 a GitHub commit URL with a 40-hex SHA in ref is allowed', async () => {
  const { send } = await setup();
  ok(await send('alpha', 'beta', { ref: `https://github.com/example/repo/commit/${SHA}` }));
});

test('INB-R11 the same 40-hex SHA in the subject or body without a URL context is still blocked', async () => {
  const { send } = await setup();
  assert.equal(errOf(await send('alpha', 'beta', { body: `fixed in ${SHA}` })).code, 'blocked_content');
  assert.equal(errOf(await send('alpha', 'beta', { subject: `fixed in ${SHA}` })).code, 'blocked_content');
  assert.equal(errOf(await send('alpha', 'beta', { body: `commit ${SHA}` })).code, 'blocked_content');
});

test('INB-R11 a SHA exemption in ref does not let a bare SHA or other hex run through as the ref', async () => {
  const { send } = await setup();
  assert.equal(errOf(await send('alpha', 'beta', { ref: `https://example.com/page?x=${SHA}` })).code, 'blocked_content');
  assert.equal(errOf(await send('alpha', 'beta', { ref: `https://github.com/example/repo/commit/${SHA}`, body: `see ${SHA}` })).code, 'blocked_content');
});

// ---------- INB-R13 ----------

for (const [name, subject] of [
  ['one zero-width space', '​'],
  ['several zero-width characters', '​‌‍⁠﻿'],
  ['zero-width mixed with spaces', ' ​  ​ '],
] as Array<[string, string]>) {
  test(`INB-R13 a subject of ${name} only is rejected as invalid_input`, async () => {
    const { send } = await setup();
    assert.equal(errOf(await send('alpha', 'beta', { subject })).code, 'invalid_input');
  });
}

test('INB-R13 a subject with visible text and a zero-width character is not rejected for being empty', async () => {
  const { send } = await setup();
  ok(await send('alpha', 'beta', { subject: 'Hello​ there' }));
});
