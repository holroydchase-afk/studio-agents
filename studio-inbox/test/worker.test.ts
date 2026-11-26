// SPDX-License-Identifier: MIT
// INB-20: the Worker entry. env = { INBOX_TOKENS (secret), DB (D1 binding) }.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createD1Shim } from './helpers/d1-shim.ts';
import { ORIGIN, TOKENS_RAW, TOK, jsonReq, bearer, captureConsole } from './helpers/rpc.ts';

const ctx = { waitUntil() {}, passThroughOnException() {} };
const worker = async () => (await import('../src/worker.ts')).default;
const run = async (req: Request, env: Record<string, unknown>) => (await worker()).fetch(req, env, ctx);
const ping = { jsonrpc: '2.0', id: 1, method: 'ping' };
const postArgs = { to: 'beta', kind: 'fyi', subject: 'Hello there', body: 'A short note' };
const tool = (name: string, args: unknown) => ({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });

test('INB-20 the default export has a fetch function', async () => {
  assert.equal(typeof (await worker()).fetch, 'function');
});

test('INB-20 a missing INBOX_TOKENS secret returns 500 {"error":"not_configured"} and logs nothing', async () => {
  const cap = captureConsole();
  try {
    for (const env of [{ DB: createD1Shim() }, { INBOX_TOKENS: '', DB: createD1Shim() }, { INBOX_TOKENS: undefined, DB: createD1Shim() }]) {
      const res = await run(jsonReq('/mcp', ping, bearer('alpha')), env);
      assert.equal(res.status, 500);
      assert.deepEqual(JSON.parse(await res.text()), { error: 'not_configured' });
    }
  } finally {
    cap.restore();
  }
  assert.deepEqual(cap.lines, []);
});

test('INB-20 an invalid INBOX_TOKENS value returns 500 and neither the response nor the console shows the token', async () => {
  const bad = 'x'.repeat(40);
  const cap = captureConsole();
  let text = '';
  let status = 0;
  try {
    const res = await run(jsonReq('/mcp', ping, { authorization: `Bearer ${bad}` }), { INBOX_TOKENS: `Bad_Name:${bad}`, DB: createD1Shim() });
    status = res.status;
    text = await res.text();
  } finally {
    cap.restore();
  }
  assert.equal(status, 500);
  assert.ok(!text.includes(bad));
  assert.ok(!cap.lines.join('\n').includes(bad));
});

test('INB-20 a configured worker authenticates, serves /health and refuses a bad token', async () => {
  const env = { INBOX_TOKENS: TOKENS_RAW, DB: createD1Shim() };
  assert.equal((await run(jsonReq('/mcp', ping, bearer('alpha')), env)).status, 200);
  assert.equal((await run(jsonReq(`/t/${TOK.beta}/mcp`, ping), env)).status, 200);
  assert.equal((await run(jsonReq('/mcp', ping, { authorization: `Bearer ${'d'.repeat(40)}` }), env)).status, 401);
  const h = await run(new Request(`${ORIGIN}/health`), env);
  assert.equal(h.status, 200);
  assert.deepEqual(JSON.parse(await h.text()), { ok: true });
});

test('INB-20 messages go to the D1 binding named DB and are readable by the recipient across requests', async () => {
  const db = createD1Shim();
  const env = { INBOX_TOKENS: TOKENS_RAW, DB: db };
  const sent = await run(jsonReq('/mcp', tool('inbox_post', postArgs), bearer('alpha')), env);
  assert.equal(sent.status, 200);
  const row = db.raw.prepare('SELECT count(*) AS n FROM messages').get() as { n: number };
  assert.equal(row.n, 1, 'the message is in the D1 messages table');
  const read = await run(jsonReq('/mcp', tool('inbox_read', {}), bearer('beta')), env);
  const msgs = JSON.parse(await read.text()).result.structuredContent.messages;
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].from, 'alpha');
});

test('INB-20 state lives in D1, not in the worker: a second env on the same DB sees the same inbox (restart)', async () => {
  const db = createD1Shim();
  await run(jsonReq('/mcp', tool('inbox_post', postArgs), bearer('alpha')), { INBOX_TOKENS: TOKENS_RAW, DB: db });
  const read = await run(jsonReq('/mcp', tool('inbox_read', { ack: true }), bearer('beta')), { INBOX_TOKENS: TOKENS_RAW, DB: db });
  assert.equal(JSON.parse(await read.text()).result.structuredContent.messages.length, 1);
  const proj = await run(jsonReq('/mcp', tool('inbox_projects', {}), bearer('beta')), { INBOX_TOKENS: TOKENS_RAW, DB: db });
  assert.equal(JSON.parse(await proj.text()).result.structuredContent.cursor, 1);
});

test('INB-20 a worker with a different DB shows a different inbox (no shared module state between bindings)', async () => {
  const a = { INBOX_TOKENS: TOKENS_RAW, DB: createD1Shim() };
  const b = { INBOX_TOKENS: TOKENS_RAW, DB: createD1Shim() };
  await run(jsonReq('/mcp', tool('inbox_post', postArgs), bearer('alpha')), a);
  const read = await run(jsonReq('/mcp', tool('inbox_read', {}), bearer('beta')), b);
  assert.equal(JSON.parse(await read.text()).result.structuredContent.messages.length, 0);
});

test('INB-20 a normal request logs nothing to the console', async () => {
  const env = { INBOX_TOKENS: TOKENS_RAW, DB: createD1Shim() };
  const cap = captureConsole();
  try {
    await run(jsonReq(`/t/${TOK.alpha}/mcp`, tool('inbox_post', postArgs)), env);
    await run(jsonReq('/mcp', ping, { authorization: 'Bearer nope' }), env);
  } finally {
    cap.restore();
  }
  assert.deepEqual(cap.lines, []);
});
