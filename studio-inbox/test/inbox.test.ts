// SPDX-License-Identifier: MIT
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROJECTS, T0, words } from './helpers/rpc.ts';
import type { Result } from '../src/types.ts';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;

async function setup(projects: readonly string[] = PROJECTS) {
  const { createInbox } = await import('../src/inbox.ts');
  const { MemoryStore } = await import('../src/store-memory.ts');
  const store = new MemoryStore();
  const clock = { t: T0 };
  const inbox = createInbox({ store, projects, now: () => clock.t });
  const make = () => createInbox({ store, projects, now: () => clock.t });
  const send = (from: string, to: string, over: Record<string, unknown> = {}) =>
    inbox.post(from, { to, kind: 'fyi', subject: 'Hello there', body: 'A short note', ...over });
  return { inbox, store, clock, send, make };
}

function ok<T>(r: Result<T>): T {
  assert.equal(r.ok, true, JSON.stringify(r));
  return (r as { ok: true; value: T }).value;
}
function fail<T>(r: Result<T>) {
  assert.equal(r.ok, false, 'expected a failure, got ' + JSON.stringify(r));
  return (r as { ok: false; error: { code: string; message: string } }).error;
}
const ids = (v: { messages: Array<{ id: number }> }) => v.messages.map((m) => m.id);

// ---------- INB-9 recipient ----------

test('INB-9 post returns id, to, kind and an ISO created_at taken from the clock', async () => {
  const { send, clock } = await setup();
  clock.t = T0 + 1234;
  const v = ok(await send('alpha', 'beta', { kind: 'need' }));
  assert.equal(v.id, 1);
  assert.equal(v.to, 'beta');
  assert.equal(v.kind, 'need');
  assert.equal(new Date(v.created_at).getTime(), T0 + 1234);
  assert.equal(new Date(v.created_at).toISOString(), v.created_at);
});

test('INB-9 ids ascend by one per post', async () => {
  const { send } = await setup();
  assert.deepEqual([ok(await send('alpha', 'beta')).id, ok(await send('beta', 'alpha')).id, ok(await send('alpha', 'all')).id], [1, 2, 3]);
});

test('INB-9 to must be a configured project: an unknown name gives unknown_project and stores nothing', async () => {
  const { send, store } = await setup();
  assert.equal(fail(await send('alpha', 'nobody')).code, 'unknown_project');
  assert.equal(await store.headId(), 0);
});

test('INB-9 project names are case-sensitive: "Beta" and "ALL" are not recipients', async () => {
  const { send } = await setup();
  assert.equal(fail(await send('alpha', 'Beta')).code, 'unknown_project');
  assert.equal(fail(await send('alpha', 'ALL')).code, 'unknown_project');
});

test('INB-9 to "all" is accepted', async () => {
  const { send } = await setup();
  assert.equal(ok(await send('alpha', 'all')).to, 'all');
});

test('INB-9 posting to yourself is refused (invalid_input or unknown_project) and stores nothing', async () => {
  const { send, store } = await setup();
  const e = fail(await send('alpha', 'alpha'));
  assert.ok(['invalid_input', 'unknown_project'].includes(e.code), e.code);
  assert.equal(await store.headId(), 0);
});

test('INB-9 a caller who is not a configured project cannot post or read (unknown_project)', async () => {
  const { send, inbox } = await setup();
  assert.equal(fail(await send('mallory', 'beta')).code, 'unknown_project');
  assert.equal(fail(await inbox.read('mallory', {})).code, 'unknown_project');
});

// ---------- INB-4 / INB-8 validation (inbox level) ----------

test('INB-4 an unknown property is invalid_input and nothing is stored (from, and any other key)', async () => {
  const { send, store } = await setup();
  for (const extra of [{ from: 'gamma' }, { sender: 'gamma' }, { id: 5 }, { createdAt: 1 }, { replyTo: 1 }]) {
    assert.equal(fail(await send('alpha', 'beta', extra)).code, 'invalid_input', JSON.stringify(extra));
  }
  assert.equal(await store.headId(), 0);
});

test('INB-4 inbox_read and the other readers also reject unknown properties', async () => {
  const { inbox } = await setup();
  assert.equal(fail(await inbox.read('alpha', { as: 'beta' })).code, 'invalid_input');
  assert.equal(fail(await inbox.read('alpha', { project: 'beta' })).code, 'invalid_input');
});

test('INB-4 the stored sender is the argument given to post, never the input', async () => {
  const { send, store } = await setup();
  await send('alpha', 'beta');
  assert.equal((await store.get(1))?.from, 'alpha');
});

test('INB-8 post input that is not an object is invalid_input (null, array, string, number)', async () => {
  const { inbox } = await setup();
  for (const input of [null, [], 'text', 5, undefined]) {
    assert.equal(fail(await inbox.post('alpha', input)).code, 'invalid_input', String(JSON.stringify(input)));
  }
});

test('INB-8 post rejects missing or mistyped fields', async () => {
  const { send } = await setup();
  const cases: Array<Record<string, unknown>> = [
    { to: undefined },
    { to: 5 },
    { kind: undefined },
    { kind: 'urgent' },
    { kind: 'FYI' },
    { subject: undefined },
    { subject: 5 },
    { subject: '' },
    { body: undefined },
    { body: '' },
    { body: ['a'] },
  ];
  for (const c of cases) {
    assert.equal(fail(await send('alpha', 'beta', c)).code, 'invalid_input', JSON.stringify(c));
  }
});

test('INB-8 subject boundaries: 1 and 120 characters are fine, 121 is not', async () => {
  const { send } = await setup();
  ok(await send('alpha', 'beta', { subject: 'x' }));
  ok(await send('alpha', 'beta', { subject: words(120) }));
  assert.equal(fail(await send('alpha', 'beta', { subject: words(121) })).code, 'invalid_input');
});

test('INB-8 body boundaries: 1 and 2000 characters are fine, 2001 is not', async () => {
  const { send } = await setup();
  ok(await send('alpha', 'beta', { body: 'x' }));
  ok(await send('alpha', 'beta', { body: words(2000) }));
  assert.equal(fail(await send('alpha', 'beta', { body: words(2001) })).code, 'invalid_input');
});

test('INB-8 every kind is accepted', async () => {
  const { send } = await setup();
  for (const kind of ['shipped', 'need', 'ask', 'reply', 'fyi']) ok(await send('alpha', 'beta', { kind }));
});

test('INB-8 reply_to must be a positive integer: 0, -1, 1.5, "1", null are invalid_input', async () => {
  const { send } = await setup();
  ok(await send('beta', 'alpha'));
  for (const reply_to of [0, -1, 1.5, '1', null, NaN]) {
    assert.equal(fail(await send('alpha', 'beta', { reply_to })).code, 'invalid_input', String(reply_to));
  }
});

test('INB-8 read rejects bad limit (0, 51, -1, 1.5, "5"), since_id (-1, 1.5, "1"), kind, from type and ack type', async () => {
  const { inbox } = await setup();
  const bad: Array<Record<string, unknown>> = [
    { limit: 0 }, { limit: 51 }, { limit: -1 }, { limit: 1.5 }, { limit: '5' },
    { since_id: -1 }, { since_id: 1.5 }, { since_id: '1' },
    { kind: 'urgent' }, { from: 5 }, { ack: 'yes' }, { ack: 1 },
  ];
  for (const b of bad) assert.equal(fail(await inbox.read('alpha', b)).code, 'invalid_input', JSON.stringify(b));
});

test('INB-8 read accepts an empty object, null-less input, and the boundary limits 1 and 50', async () => {
  const { inbox } = await setup();
  ok(await inbox.read('alpha', {}));
  ok(await inbox.read('alpha', { limit: 1 }));
  ok(await inbox.read('alpha', { limit: 50 }));
  ok(await inbox.read('alpha', { since_id: 0 }));
});

// ---------- INB-10 reply_to ----------

test('INB-10 reply_to may name a message sent to me, to all, or by me', async () => {
  const { send } = await setup();
  const toMe = ok(await send('beta', 'alpha')).id;
  const toAll = ok(await send('gamma', 'all')).id;
  const byMeToOther = ok(await send('alpha', 'gamma')).id;
  for (const reply_to of [toMe, toAll, byMeToOther]) {
    ok(await send('alpha', 'beta', { kind: 'reply', reply_to }));
  }
});

test('INB-10 reply_to naming a direct message between two other projects is not_found', async () => {
  const { send, store } = await setup();
  const dm = ok(await send('beta', 'gamma')).id;
  assert.equal(fail(await send('alpha', 'beta', { kind: 'reply', reply_to: dm })).code, 'not_found');
  assert.equal(await store.headId(), dm, 'nothing stored on failure');
});

test('INB-10 reply_to naming a message that does not exist is not_found', async () => {
  const { send } = await setup();
  assert.equal(fail(await send('alpha', 'beta', { reply_to: 999 })).code, 'not_found');
});

test('INB-10 not_found for a hidden message looks the same as for a missing one (no existence leak)', async () => {
  const { send } = await setup();
  const dm = ok(await send('beta', 'gamma')).id;
  const hidden = fail(await send('alpha', 'beta', { reply_to: dm }));
  const missing = fail(await send('alpha', 'beta', { reply_to: dm + 100 }));
  assert.equal(hidden.code, missing.code);
  assert.equal(hidden.message, missing.message);
});

test('INB-10 the stored message keeps replyTo', async () => {
  const { send, store } = await setup();
  const first = ok(await send('beta', 'alpha')).id;
  const reply = ok(await send('alpha', 'beta', { kind: 'reply', reply_to: first })).id;
  assert.equal((await store.get(reply))?.replyTo, first);
  assert.equal((await store.get(first))?.replyTo, null);
});

// ---------- INB-11 content scan at post ----------

const SK = 'sk-' + 'a'.repeat(32);
test('INB-11 a secret in the body, the subject or the ref is blocked_content, stores nothing, and the reason never echoes it', async () => {
  const { send, store } = await setup();
  const attempts: Array<Record<string, unknown>> = [
    { body: `use ${SK} now` },
    { subject: `key ${SK}` },
    { ref: `https://example.com/page?k=${SK}` },
    { body: 'mail me at someone@example.com' },
    { subject: 'call 555-123-4567' },
    { body: '-----BEGIN PRIVATE KEY-----' },
    { body: 'ghp_' + 'a'.repeat(36) },
  ];
  for (const a of attempts) {
    const e = fail(await send('alpha', 'beta', a));
    assert.equal(e.code, 'blocked_content', JSON.stringify(a));
    for (const secret of [SK, 'someone@example.com', '555-123-4567', 'ghp_' + 'a'.repeat(36), 'BEGIN PRIVATE KEY']) {
      assert.ok(!e.message.includes(secret), `reason echoes the match: ${e.message}`);
    }
  }
  assert.equal(await store.headId(), 0);
});

test('INB-11 clean ordinary text, PR numbers, a short hash and an https ref are accepted', async () => {
  const { send } = await setup();
  ok(await send('alpha', 'beta', { subject: 'Shipped PR #123', body: 'Merged abc1234 into main. See #45 and issue 67.', ref: 'https://github.com/example/repo/pull/123' }));
});

// ---------- INB-12 ref ----------

test('INB-12 an https ref is stored; absent ref is null', async () => {
  const { send, store } = await setup();
  const a = ok(await send('alpha', 'beta', { ref: 'https://example.com/docs/page' })).id;
  const b = ok(await send('alpha', 'beta')).id;
  assert.equal((await store.get(a))?.ref, 'https://example.com/docs/page');
  assert.equal((await store.get(b))?.ref, null);
});

test('INB-12 http, ftp, javascript, data, file, relative and non-URL refs are invalid_input', async () => {
  const { send } = await setup();
  for (const ref of ['http://example.com/x', 'ftp://example.com/x', 'javascript:alert(1)', 'data:text/plain,hello', 'file:///etc/hosts', '/relative/path', 'not a url', '', 'example.com/x', 5]) {
    assert.equal(fail(await send('alpha', 'beta', { ref })).code, 'invalid_input', String(ref));
  }
});

test('INB-12 a ref with credentials in it is refused (user, user:pass; invalid_input or blocked_content)', async () => {
  const { send, store } = await setup();
  for (const ref of ['https://user:secret@docs.example/page', 'https://user@docs.example/page', 'https://:secret@docs.example/page']) {
    const e = fail(await send('alpha', 'beta', { ref }));
    assert.ok(['invalid_input', 'blocked_content'].includes(e.code), `${ref}: ${e.code}`);
    assert.ok(!e.message.includes('secret'), 'message echoes the credential');
  }
  assert.equal(await store.headId(), 0);
});

test('INB-12 ref length: 300 characters is accepted, 301 is not', async () => {
  const { send } = await setup();
  const prefix = 'https://example.com/';
  const mk = (n: number) => prefix + 'doc-'.repeat(100).slice(0, n - prefix.length);
  assert.equal(mk(300).length, 300);
  ok(await send('alpha', 'beta', { ref: mk(300) }));
  assert.equal(fail(await send('alpha', 'beta', { ref: mk(301) })).code, 'invalid_input');
});

// ---------- INB-13 rate limits ----------

test('INB-13 60 posts in an hour are accepted and the 61st is rate_limited with a retry hint', async () => {
  const { send } = await setup();
  for (let i = 0; i < 60; i++) ok(await send('alpha', 'all', { subject: `Post number ${i}` }));
  const e = fail(await send('alpha', 'all'));
  assert.equal(e.code, 'rate_limited');
  assert.match(e.message, /retry|try again|minute|second|hour/i);
});

test('INB-13 the hourly window slides: still limited at 59 minutes, allowed again after 61', async () => {
  const { send, clock } = await setup();
  for (let i = 0; i < 60; i++) ok(await send('alpha', 'all'));
  clock.t = T0 + 59 * MIN;
  assert.equal(fail(await send('alpha', 'all')).code, 'rate_limited');
  clock.t = T0 + 61 * MIN;
  ok(await send('alpha', 'all'));
});

test('INB-13 the limit is per sender: alpha limited, beta can still post', async () => {
  const { send } = await setup();
  for (let i = 0; i < 60; i++) ok(await send('alpha', 'all'));
  assert.equal(fail(await send('alpha', 'all')).code, 'rate_limited');
  ok(await send('beta', 'all'));
});

test('INB-13 the daily cap is 400: the 401st post in 24 hours is rate_limited even when each hour is under 60', async () => {
  const { send, clock } = await setup();
  let n = 0;
  for (let h = 0; h < 7 && n < 400; h++) {
    for (let i = 0; i < 60 && n < 400; i++) {
      ok(await send('alpha', 'all'));
      n++;
    }
    clock.t += 61 * MIN;
  }
  assert.equal(n, 400);
  assert.ok(clock.t - T0 < DAY);
  assert.equal(fail(await send('alpha', 'all')).code, 'rate_limited');
  clock.t = T0 + DAY + 61 * MIN;
  ok(await send('alpha', 'all'));
});

test('INB-13 the limit is measured from the store, so a new inbox on the same store is still limited (survives restart)', async () => {
  const { send, make } = await setup();
  for (let i = 0; i < 60; i++) ok(await send('alpha', 'all'));
  const restarted = make();
  const e = fail(await restarted.post('alpha', { to: 'all', kind: 'fyi', subject: 'Hello there', body: 'A short note' }));
  assert.equal(e.code, 'rate_limited');
});

test('INB-13 rejected posts (invalid or blocked) do not count against the limit', async () => {
  const { send } = await setup();
  for (let i = 0; i < 30; i++) fail(await send('alpha', 'all', { body: '' }));
  for (let i = 0; i < 30; i++) fail(await send('alpha', 'all', { body: 'x@example.com' }));
  for (let i = 0; i < 60; i++) ok(await send('alpha', 'all'));
});

// ---------- INB-14 retention ----------

test('INB-14 messages older than 30 days are purged on post; exactly 30 days is kept', async () => {
  const { send, store, clock } = await setup();
  const old = ok(await send('alpha', 'all')).id;
  clock.t = T0 + 29 * DAY;
  ok(await send('beta', 'all'));
  assert.ok(await store.get(old), 'kept at 29 days');
  clock.t = T0 + 30 * DAY;
  ok(await send('beta', 'all'));
  assert.ok(await store.get(old), 'kept at exactly 30 days');
  clock.t = T0 + 30 * DAY + 1;
  ok(await send('beta', 'all'));
  assert.equal(await store.get(old), null, 'purged just past 30 days');
});

test('INB-14 a purged message is no longer readable and reply_to it is not_found', async () => {
  const { send, clock, inbox } = await setup();
  const old = ok(await send('alpha', 'all')).id;
  clock.t = T0 + 31 * DAY;
  ok(await send('beta', 'all'));
  assert.equal(ids(ok(await inbox.read('gamma', { since_id: 0 }))).includes(old), false);
  assert.equal(fail(await send('gamma', 'beta', { reply_to: old })).code, 'not_found');
});

test('INB-14 the store never holds more than 5000 messages: the oldest is dropped first', async () => {
  const { send, store, clock } = await setup();
  for (let i = 0; i < 5000; i++) {
    await store.insert({ from: 'alpha', to: 'all', kind: 'fyi', subject: `Filler ${i}`, body: 'filler', ref: null, replyTo: null, createdAt: clock.t });
  }
  assert.equal(await store.countFor('gamma', 0), 5000);
  const v = ok(await send('beta', 'all'));
  assert.equal(v.id, 5001);
  assert.equal(await store.countFor('gamma', 0), 5000, 'still 5000 after the 5001st post');
  assert.equal(await store.get(1), null, 'oldest dropped');
  assert.ok(await store.get(2), 'second oldest kept');
  assert.ok(await store.get(5001), 'newest kept');
});

// ---------- INB-15 visibility ----------

test('INB-15 a direct message is read only by its recipient; all reaches everyone but the sender; nobody reads their own', async () => {
  const { send, inbox } = await setup();
  const dm = ok(await send('alpha', 'beta')).id;
  const all = ok(await send('alpha', 'all')).id;
  const back = ok(await send('beta', 'alpha')).id;
  assert.deepEqual(ids(ok(await inbox.read('beta', {}))), [dm, all]);
  assert.deepEqual(ids(ok(await inbox.read('gamma', {}))), [all]);
  assert.deepEqual(ids(ok(await inbox.read('alpha', {}))), [back]);
});

test('INB-15 a project never reads another project\'s direct messages, not even with since_id 0, a from filter or a kind filter', async () => {
  const { send, inbox } = await setup();
  const dm = ok(await send('alpha', 'beta', { kind: 'need' })).id;
  for (const input of [{}, { since_id: 0 }, { from: 'alpha' }, { kind: 'need' }, { since_id: 0, from: 'alpha', kind: 'need', limit: 50 }]) {
    assert.ok(!ids(ok(await inbox.read('gamma', input))).includes(dm), JSON.stringify(input));
  }
});

test('INB-15 the sender\'s own broadcast is excluded even with since_id 0 and from set to themselves', async () => {
  const { send, inbox } = await setup();
  ok(await send('alpha', 'all'));
  assert.deepEqual(ids(ok(await inbox.read('alpha', { since_id: 0 }))), []);
  assert.deepEqual(ids(ok(await inbox.read('alpha', { since_id: 0, from: 'alpha' }))), []);
});

test('INB-15 unread_remaining and projects().head_id do not reveal other projects\' direct messages in counts of what you can read', async () => {
  const { send, inbox } = await setup();
  ok(await send('alpha', 'beta'));
  ok(await send('alpha', 'beta'));
  const r = ok(await inbox.read('gamma', { ack: true }));
  assert.equal(r.unread_remaining, 0);
  assert.deepEqual(r.messages, []);
});

// ---------- INB-16 cursor ----------

async function fiveToBeta() {
  const s = await setup();
  for (let i = 1; i <= 5; i++) ok(await s.send('alpha', 'all', { subject: `Message ${i}` }));
  return s;
}

test('INB-16 a new project starts at cursor 0 and a read without ack leaves the cursor alone', async () => {
  const { inbox } = await fiveToBeta();
  assert.equal(ok(await inbox.projects('beta')).cursor, 0);
  const a = ok(await inbox.read('beta', { limit: 2 }));
  const b = ok(await inbox.read('beta', { limit: 2 }));
  assert.deepEqual(ids(a), [1, 2]);
  assert.deepEqual(ids(b), [1, 2]);
  assert.equal(ok(await inbox.projects('beta')).cursor, 0);
});

test('INB-16 ack moves the cursor to the last id returned, not the head, and unread_remaining counts what is after it', async () => {
  const { inbox } = await fiveToBeta();
  const a = ok(await inbox.read('beta', { limit: 2, ack: true }));
  assert.deepEqual(ids(a), [1, 2]);
  assert.equal(a.cursor, 2);
  assert.equal(a.unread_remaining, 3);
  assert.equal(ok(await inbox.projects('beta')).cursor, 2);
  const b = ok(await inbox.read('beta', { ack: true }));
  assert.deepEqual(ids(b), [3, 4, 5]);
  assert.equal(b.cursor, 5);
  assert.equal(b.unread_remaining, 0);
});

test('INB-16 an empty read leaves the cursor where it was and still returns it', async () => {
  const { inbox } = await fiveToBeta();
  ok(await inbox.read('beta', { ack: true }));
  const e = ok(await inbox.read('beta', { ack: true }));
  assert.deepEqual(e.messages, []);
  assert.equal(e.cursor, 5);
  assert.equal(e.unread_remaining, 0);
});

test('INB-16 the cursor never moves backwards: a plain ack after a since_id read (no ack) leaves it at 5', async () => {
  const { inbox } = await fiveToBeta();
  ok(await inbox.read('beta', { ack: true }));
  const r = ok(await inbox.read('beta', { since_id: 0, limit: 2 }));
  assert.deepEqual(ids(r), [1, 2]);
  assert.equal(r.cursor, 5);
  const again = ok(await inbox.read('beta', { ack: true }));
  assert.deepEqual(ids(again), []);
  assert.equal(again.cursor, 5);
  assert.equal(ok(await inbox.projects('beta')).cursor, 5);
});

test('INB-16 the cursor does not jump past the last id returned when the limit cuts the list short', async () => {
  const { inbox } = await fiveToBeta();
  const r = ok(await inbox.read('beta', { limit: 2, ack: true }));
  assert.deepEqual(ids(r), [1, 2]);
  assert.equal(r.cursor, 2);
});

test('INB-16 cursors are per project', async () => {
  const { inbox } = await fiveToBeta();
  ok(await inbox.read('beta', { ack: true }));
  assert.equal(ok(await inbox.projects('gamma')).cursor, 0);
  assert.deepEqual(ids(ok(await inbox.read('gamma', {}))), [1, 2, 3, 4, 5]);
});

test('INB-16 the cursor stops at the last visible message, not at the head id, when others\' direct messages sit between', async () => {
  const { send, inbox } = await setup();
  ok(await send('alpha', 'gamma'));
  const visible = ok(await send('alpha', 'all')).id;
  ok(await send('alpha', 'gamma'));
  const r = ok(await inbox.read('beta', { ack: true }));
  assert.deepEqual(ids(r), [visible]);
  assert.equal(r.cursor, visible);
  assert.equal(r.unread_remaining, 0);
  const p = ok(await inbox.projects('beta'));
  assert.equal(p.cursor, visible);
  assert.equal(p.head_id, 3);
});

test('INB-16 messages arriving after the ack are unread and counted', async () => {
  const { send, inbox } = await fiveToBeta();
  ok(await inbox.read('beta', { ack: true }));
  const n = ok(await send('gamma', 'beta')).id;
  const r = ok(await inbox.read('beta', { limit: 1 }));
  assert.deepEqual(ids(r), [n]);
});

test('INB-16 default limit is 20 and max is 50, with unread_remaining counting the rest', async () => {
  const { send, inbox } = await setup();
  for (let i = 0; i < 55; i++) ok(await send('alpha', 'all', { subject: `Message ${i}` }));
  const d = ok(await inbox.read('beta', { ack: true }));
  assert.equal(d.messages.length, 20);
  assert.equal(d.unread_remaining, 35);
  const m = ok(await inbox.read('gamma', { limit: 50 }));
  assert.equal(m.messages.length, 50);
});

// ---------- INB-17 filters and since_id ----------

async function mixed() {
  const s = await setup();
  ok(await s.send('alpha', 'beta', { kind: 'need' })); // 1
  ok(await s.send('gamma', 'beta', { kind: 'fyi' })); // 2
  ok(await s.send('alpha', 'all', { kind: 'shipped' })); // 3
  ok(await s.send('gamma', 'all', { kind: 'need' })); // 4
  ok(await s.send('alpha', 'beta', { kind: 'ask' })); // 5
  return s;
}

test('INB-17 the from filter narrows to one sender', async () => {
  const { inbox } = await mixed();
  assert.deepEqual(ids(ok(await inbox.read('beta', { from: 'alpha' }))), [1, 3, 5]);
  assert.deepEqual(ids(ok(await inbox.read('beta', { from: 'gamma' }))), [2, 4]);
});

test('INB-17 the kind filter narrows to one kind', async () => {
  const { inbox } = await mixed();
  assert.deepEqual(ids(ok(await inbox.read('beta', { kind: 'need' }))), [1, 4]);
  assert.deepEqual(ids(ok(await inbox.read('beta', { kind: 'reply' }))), []);
});

test('INB-17 from and kind combine, and from set to yourself returns nothing', async () => {
  const { inbox } = await mixed();
  assert.deepEqual(ids(ok(await inbox.read('beta', { from: 'alpha', kind: 'need' }))), [1]);
  assert.deepEqual(ids(ok(await inbox.read('beta', { from: 'beta' }))), []);
});

test('INB-17 since_id overrides the cursor', async () => {
  const { inbox } = await mixed();
  ok(await inbox.read('beta', { ack: true })); // cursor 5
  assert.deepEqual(ids(ok(await inbox.read('beta', {}))), []);
  assert.deepEqual(ids(ok(await inbox.read('beta', { since_id: 2 }))), [3, 4, 5]);
  assert.deepEqual(ids(ok(await inbox.read('beta', { since_id: 0 }))), [1, 2, 3, 4, 5]);
});

test('INB-17 since_id never moves the cursor (ack with since_id is rejected, see INB-R8)', async () => {
  const { inbox } = await mixed();
  ok(await inbox.read('beta', { since_id: 2 }));
  assert.equal(ok(await inbox.projects('beta')).cursor, 0);
  const r = ok(await inbox.read('beta', { since_id: 2, limit: 2 }));
  assert.deepEqual(ids(r), [3, 4]);
  assert.equal(r.cursor, 0);
  assert.equal(ok(await inbox.projects('beta')).cursor, 0);
});

test('INB-17 a filtered read does not move the cursor, and a plain ack with a limit moves it only to the last id returned', async () => {
  const { inbox } = await mixed();
  const f = ok(await inbox.read('beta', { kind: 'need', limit: 1 }));
  assert.deepEqual(ids(f), [1]);
  assert.equal(f.cursor, 0);
  const r = ok(await inbox.read('beta', { limit: 1, ack: true }));
  assert.deepEqual(ids(r), [1]);
  assert.equal(r.cursor, 1);
});

test('INB-17 since_id beyond the head returns nothing and leaves the cursor alone', async () => {
  const { inbox } = await mixed();
  const r = ok(await inbox.read('beta', { since_id: 999 }));
  assert.deepEqual(r.messages, []);
  assert.equal(r.cursor, 0);
});

// ---------- INB-18 determinism and notice (inbox level) ----------

test('INB-18 read results are ascending by id and identical when repeated, with a non-empty notice', async () => {
  const { inbox } = await mixed();
  const a = ok(await inbox.read('beta', { since_id: 0 }));
  const b = ok(await inbox.read('beta', { since_id: 0 }));
  assert.deepEqual(a, b);
  assert.deepEqual(ids(a), [...ids(a)].sort((x, y) => x - y));
  assert.equal(typeof a.notice, 'string');
  assert.match(a.notice, /instruction/i);
});

test('INB-18 messages carry id, from, to, kind, subject, body', async () => {
  const { inbox } = await mixed();
  const m = ok(await inbox.read('beta', {})).messages[0]!;
  assert.equal(m.id, 1);
  assert.equal(m.from, 'alpha');
  assert.equal(m.to, 'beta');
  assert.equal(m.kind, 'need');
  assert.equal(m.subject, 'Hello there');
  assert.equal(m.body, 'A short note');
});

test('INB-18 projects() lists projects in a stable sorted order, names the caller, and reports head_id across all messages', async () => {
  const { inbox, send } = await setup();
  ok(await send('alpha', 'gamma'));
  const p = ok(await inbox.projects('beta'));
  assert.equal(p.you, 'beta');
  assert.deepEqual(p.projects, [...p.projects].sort());
  assert.ok(p.projects.includes('alpha') && p.projects.includes('gamma'));
  assert.equal(p.head_id, 1);
});
