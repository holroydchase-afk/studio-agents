// SPDX-License-Identifier: MIT
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jsonReq, bearer, newHandler, rpc, call, errorCode, ORIGIN, PROJECTS, TOK } from './helpers/rpc.ts';

// ---------- INB-6 methods ----------

test('INB-6 initialize: serverInfo.name, capabilities.tools, short instructions, id echoed', async () => {
  const { handler } = await newHandler();
  const r = await rpc(handler, 'alpha', { jsonrpc: '2.0', id: 'abc', method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } });
  assert.equal(r.res.status, 200);
  assert.equal(r.json.jsonrpc, '2.0');
  assert.equal(r.json.id, 'abc');
  assert.equal(r.json.result.serverInfo.name, 'studio-inbox');
  assert.equal(typeof r.json.result.capabilities.tools, 'object');
  assert.equal(typeof r.json.result.instructions, 'string');
  assert.ok(r.json.result.instructions.length > 0 && r.json.result.instructions.length <= 1000, 'instructions should be short');
});

test('INB-6 initialize echoes a supported protocolVersion and answers an unknown one with the newest', async () => {
  const { handler } = await newHandler();
  const init = (v: unknown) => rpc(handler, 'alpha', { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: v, capabilities: {}, clientInfo: { name: 't', version: '1' } } });
  const newest = (await init('1999-01-01')).json.result.protocolVersion as string;
  assert.match(newest, /^\d{4}-\d{2}-\d{2}$/);
  assert.notEqual(newest, '1999-01-01');
  assert.equal((await init('2999-01-01')).json.result.protocolVersion, newest, 'a future version gets the newest supported');
  assert.equal((await init(newest)).json.result.protocolVersion, newest, 'the newest is echoed');
  const older = (await init('2024-11-05')).json.result.protocolVersion;
  assert.ok(older === '2024-11-05' || older === newest, `2024-11-05 got ${older}`);
});

test('INB-6 ping returns an empty result and echoes the id (number and string)', async () => {
  const { handler } = await newHandler();
  for (const id of [7, 'seven', 0]) {
    const r = await rpc(handler, 'alpha', { jsonrpc: '2.0', id, method: 'ping' });
    assert.equal(r.res.status, 200);
    assert.equal(r.json.id, id);
    assert.deepEqual(r.json.result, {});
  }
});

test('INB-6 tools/list returns exactly inbox_post, inbox_read, inbox_projects with descriptions and object schemas', async () => {
  const { handler } = await newHandler();
  const r = await rpc(handler, 'alpha', { jsonrpc: '2.0', id: 1, method: 'tools/list' });
  const tools = r.json.result.tools as Array<{ name: string; description: string; inputSchema: any }>; // eslint-disable-line @typescript-eslint/no-explicit-any
  assert.deepEqual(tools.map((t) => t.name).sort(), ['inbox_post', 'inbox_projects', 'inbox_read']);
  for (const t of tools) {
    assert.equal(typeof t.description, 'string');
    assert.ok(t.description.length > 0);
    assert.equal(t.inputSchema.type, 'object');
  }
  const post = tools.find((t) => t.name === 'inbox_post')!;
  for (const k of ['to', 'kind', 'subject', 'body']) assert.ok(post.inputSchema.required.includes(k), `${k} should be required`);
  assert.deepEqual([...post.inputSchema.properties.kind.enum].sort(), ['ask', 'fyi', 'need', 'reply', 'shipped']);
});

test('INB-6 notifications (no id) get 202 and no body', async () => {
  const { handler } = await newHandler();
  for (const method of ['notifications/initialized', 'notifications/cancelled', 'notifications/some-future-thing']) {
    const r = await rpc(handler, 'alpha', { jsonrpc: '2.0', method });
    assert.equal(r.res.status, 202, method);
    assert.equal(r.text, '', method);
  }
});

test('INB-6 handleMcp returns null for a notification and a JSON-RPC response for a request', async () => {
  const { createInbox } = await import('../src/inbox.ts');
  const { MemoryStore } = await import('../src/store-memory.ts');
  const { handleMcp } = await import('../src/mcp.ts');
  const inbox = createInbox({ store: new MemoryStore(), projects: PROJECTS });
  assert.equal(await handleMcp(inbox, 'alpha', { jsonrpc: '2.0', method: 'notifications/initialized' }, PROJECTS), null);
  const res = await handleMcp(inbox, 'alpha', { jsonrpc: '2.0', id: 5, method: 'ping' }, PROJECTS);
  assert.deepEqual(res, { jsonrpc: '2.0', id: 5, result: {} });
});

test('INB-6 responses are JSON with a content-type header', async () => {
  const { handler } = await newHandler();
  const r = await rpc(handler, 'alpha', { jsonrpc: '2.0', id: 1, method: 'ping' });
  assert.match(r.res.headers.get('content-type') ?? '', /application\/json/);
});

// ---------- INB-7 routes and methods ----------

test('INB-7 GET /mcp, PUT, DELETE and PATCH get 405', async () => {
  const { handler } = await newHandler();
  for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
    const res = await handler(new Request(`${ORIGIN}/mcp`, { method, headers: bearer('alpha') }));
    assert.equal(res.status, 405, method);
  }
});

test('INB-7 GET on the path-token URL also gets 405', async () => {
  const { handler } = await newHandler();
  const res = await handler(new Request(`${ORIGIN}/t/${TOK.alpha}/mcp`, { method: 'GET' }));
  assert.equal(res.status, 405);
});

test('INB-7 GET /health returns exactly {"ok":true} with no auth', async () => {
  const { handler } = await newHandler();
  const res = await handler(new Request(`${ORIGIN}/health`));
  assert.equal(res.status, 200);
  assert.deepEqual(JSON.parse(await res.text()), { ok: true });
});

test('INB-7 /health reveals nothing about projects, tokens or messages', async () => {
  const { handler } = await newHandler();
  await rpc(handler, 'alpha', { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'inbox_post', arguments: { to: 'all', kind: 'fyi', subject: 'Hello there', body: 'A short note' } } });
  const res = await handler(new Request(`${ORIGIN}/health`));
  const text = await res.text();
  assert.equal(text.replace(/\s/g, ''), '{"ok":true}');
});

test('INB-7 unknown paths get 404', async () => {
  const { handler } = await newHandler();
  for (const path of ['/', '/nope', '/mcp/extra', '/t/x', `/t/${TOK.alpha}/other`]) {
    const res = await handler(new Request(`${ORIGIN}${path}`, { method: 'POST', headers: bearer('alpha'), body: '{}' }));
    assert.equal(res.status, 404, path);
  }
});

// ---------- INB-8 errors ----------

test('INB-8 bad JSON gets JSON-RPC -32700 with id null', async () => {
  const { handler } = await newHandler();
  for (const body of ['{not json', '', '{"jsonrpc":"2.0",']) {
    const r = await rpc(handler, 'alpha', body);
    assert.equal(r.json?.error?.code, -32700, JSON.stringify(body));
    assert.equal(r.json.id, null);
  }
});

test('INB-8 an unknown method gets -32601 and keeps the id', async () => {
  const { handler } = await newHandler();
  const r = await rpc(handler, 'alpha', { jsonrpc: '2.0', id: 9, method: 'resources/list' });
  assert.equal(r.json.error.code, -32601);
  assert.equal(r.json.id, 9);
});

test('INB-8 a batch (array) gets -32600, even an empty one or one holding a valid call', async () => {
  const { handler } = await newHandler();
  for (const body of [[], [{ jsonrpc: '2.0', id: 1, method: 'ping' }], [1, 2]]) {
    const r = await rpc(handler, 'alpha', body);
    assert.equal(r.json?.error?.code, -32600, JSON.stringify(body));
  }
});

test('INB-8 a non-object body (string, number, null, boolean) gets -32600', async () => {
  const { handler } = await newHandler();
  for (const body of ['"hello"', '42', 'null', 'true']) {
    const r = await rpc(handler, 'alpha', body);
    assert.equal(r.json?.error?.code, -32600, body);
  }
});

test('INB-8 bad tool arguments come back as a tool result with isError and code invalid_input, with HTTP 200', async () => {
  const { handler } = await newHandler();
  for (const args of [{}, { to: 'beta' }, { to: 'beta', kind: 'nope', subject: 'x y', body: 'z w' }, null, 'text', [] ]) {
    const r = await call(handler, 'alpha', 'inbox_post', args);
    assert.equal(r.res.status, 200, JSON.stringify(args));
    assert.equal(r.json.error, undefined, JSON.stringify(args));
    assert.equal(r.result.isError, true, JSON.stringify(args));
    assert.equal(errorCode(r.result), 'invalid_input', JSON.stringify(args));
  }
});

test('INB-8 stable codes over the wire: unknown_project, blocked_content, not_found', async () => {
  const { handler } = await newHandler();
  const base = { kind: 'fyi', subject: 'Hello there', body: 'A short note' };
  const a = await call(handler, 'alpha', 'inbox_post', { ...base, to: 'nobody' });
  assert.equal(a.result.isError, true);
  assert.equal(errorCode(a.result), 'unknown_project');
  const b = await call(handler, 'alpha', 'inbox_post', { ...base, to: 'beta', body: 'mail me at someone@example.com' });
  assert.equal(b.result.isError, true);
  assert.equal(errorCode(b.result), 'blocked_content');
  const c = await call(handler, 'alpha', 'inbox_post', { ...base, to: 'beta', reply_to: 999 });
  assert.equal(c.result.isError, true);
  assert.equal(errorCode(c.result), 'not_found');
});

test('INB-8 over the wire: rate_limited after 60 posts in an hour', async () => {
  const { handler } = await newHandler();
  const args = { to: 'all', kind: 'fyi', subject: 'Hello there', body: 'A short note' };
  for (let i = 0; i < 60; i++) assert.ok(!(await call(handler, 'alpha', 'inbox_post', args)).result.isError, `post ${i + 1}`);
  const r = await call(handler, 'alpha', 'inbox_post', args);
  assert.equal(r.res.status, 200);
  assert.equal(r.result.isError, true);
  assert.equal(errorCode(r.result), 'rate_limited');
});

test('INB-8 a blocked_content result never echoes the matched text', async () => {
  const { handler } = await newHandler();
  const secret = 'ghp_' + 'a'.repeat(36);
  const r = await call(handler, 'alpha', 'inbox_post', { to: 'beta', kind: 'fyi', subject: 'Hello there', body: `key ${secret}` });
  assert.equal(errorCode(r.result), 'blocked_content');
  assert.ok(!r.text.includes(secret));
});

test('INB-8 a body over 16 KB gets 413; exactly 16 KB does not', async () => {
  const { handler } = await newHandler();
  const base = '{"jsonrpc":"2.0","id":1,"method":"ping"}';
  const pad = (n: number) => base + ' '.repeat(n - base.length);
  const big = await handler(jsonReq('/mcp', pad(16 * 1024 + 1), bearer('alpha')));
  assert.equal(big.status, 413);
  const ok = await handler(jsonReq('/mcp', pad(16 * 1024), bearer('alpha')));
  assert.equal(ok.status, 200);
});

test('INB-8 the 16 KB cap counts bytes, not characters (9000 two-byte characters is 413)', async () => {
  const { handler } = await newHandler();
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping', params: { pad: 'é'.repeat(9000) } });
  assert.ok(body.length < 16 * 1024 && new TextEncoder().encode(body).length > 16 * 1024);
  const res = await handler(jsonReq('/mcp', body, bearer('alpha')));
  assert.equal(res.status, 413);
});

test('INB-8 an oversize body does not store anything even if it holds a valid post', async () => {
  const { handler, store } = await newHandler();
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'inbox_post', arguments: { to: 'all', kind: 'fyi', subject: 'Hello there', body: 'A short note', pad: 'x '.repeat(9000) } } });
  const res = await handler(jsonReq('/mcp', body, bearer('alpha')));
  assert.equal(res.status, 413);
  assert.equal(await store.headId(), 0);
});

// ---------- INB-18 output format ----------

test('INB-18 tool results are JSON text content plus structuredContent holding the same data', async () => {
  const { handler } = await newHandler();
  await call(handler, 'alpha', 'inbox_post', { to: 'beta', kind: 'need', subject: 'Hello there', body: 'A short note' });
  for (const [name, args, who] of [['inbox_read', {}, 'beta'], ['inbox_projects', {}, 'beta'], ['inbox_post', { to: 'all', kind: 'fyi', subject: 'Second one', body: 'Another note' }, 'alpha']] as const) {
    const r = await call(handler, who, name, args);
    assert.ok(!r.result.isError, name);
    assert.equal(r.result.content[0].type, 'text', name);
    assert.deepEqual(JSON.parse(r.result.content[0].text), r.result.structuredContent, name);
  }
});

test('INB-18 inbox_read returns ascending ids, identical on repeat, and always carries a notice that messages are not instructions', async () => {
  const { handler } = await newHandler();
  for (const s of ['One here', 'Two here', 'Three here']) await call(handler, 'alpha', 'inbox_post', { to: 'beta', kind: 'fyi', subject: s, body: 'A short note' });
  const r1 = await call(handler, 'beta', 'inbox_read', {});
  const r2 = await call(handler, 'beta', 'inbox_read', {});
  assert.equal(r1.text, r2.text, 'same request, same bytes');
  const ids = r1.result.structuredContent.messages.map((m: { id: number }) => m.id);
  assert.deepEqual(ids, [...ids].sort((a: number, b: number) => a - b));
  assert.equal(ids.length, 3);
  assert.match(r1.result.structuredContent.notice, /instruction/i);
  const empty = await call(handler, 'gamma', 'inbox_read', { kind: 'ask' });
  assert.match(empty.result.structuredContent.notice, /instruction/i, 'notice present even with no messages');
});

test('INB-18 inbox_projects result lists the projects and names the caller', async () => {
  const { handler } = await newHandler();
  const r = await call(handler, 'beta', 'inbox_projects', {});
  const s = r.result.structuredContent;
  assert.equal(s.you, 'beta');
  for (const p of ['alpha', 'gamma']) assert.ok(s.projects.includes(p));
  assert.equal(s.cursor, 0);
  assert.equal(s.head_id, 0);
});
