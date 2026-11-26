// SPDX-License-Identifier: MIT
// INB-19: one suite, run against MemoryStore and D1Store (through a node:sqlite D1 shim).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createD1Shim } from './helpers/d1-shim.ts';
import type { NewMessage, Store } from '../src/types.ts';

const nm = (over: Partial<NewMessage> = {}): NewMessage => ({
  from: 'alpha',
  to: 'beta',
  kind: 'fyi',
  subject: 'Hello there',
  body: 'A short note',
  ref: null,
  replyTo: null,
  createdAt: 1_000,
  ...over,
});

const factories: Array<[string, () => Promise<Store>]> = [
  ['MemoryStore', async () => new (await import('../src/store-memory.ts')).MemoryStore()],
  ['D1Store', async () => new (await import('../src/store-d1.ts')).D1Store(createD1Shim())],
];

for (const [name, make] of factories) {
  describe(`INB-19 ${name} conformance`, () => {
    test('INB-19 empty store: headId 0, get null, counts 0, cursor 0, lists empty', async () => {
      const s = await make();
      assert.equal(await s.headId(), 0);
      assert.equal(await s.get(1), null);
      assert.equal(await s.countFor('beta', 0), 0);
      assert.equal(await s.countFrom('alpha', 0), 0);
      assert.equal(await s.getCursor('beta'), 0);
      assert.deepEqual(await s.listFor('beta', { afterId: 0, limit: 10 }), []);
    });

    test('INB-19 insert assigns ids 1, 2, 3 and returns the full message', async () => {
      const s = await make();
      const a = await s.insert(nm());
      const b = await s.insert(nm({ subject: 'Second' }));
      assert.deepEqual(a, { id: 1, ...nm() });
      assert.equal(b.id, 2);
      assert.equal(await s.headId(), 2);
    });

    test('INB-19 get returns a stored message and null for a missing id', async () => {
      const s = await make();
      const a = await s.insert(nm({ ref: 'https://example.com/x', replyTo: null }));
      assert.deepEqual(await s.get(a.id), a);
      assert.equal(await s.get(99), null);
      assert.equal(await s.get(0), null);
    });

    test('INB-19 ref and replyTo round-trip as string/number and null', async () => {
      const s = await make();
      const first = await s.insert(nm());
      const b = await s.insert(nm({ ref: 'https://example.com/x', replyTo: first.id }));
      const got = await s.get(b.id);
      assert.equal(got?.ref, 'https://example.com/x');
      assert.equal(got?.replyTo, first.id);
      assert.equal((await s.get(first.id))?.ref, null);
      assert.equal((await s.get(first.id))?.replyTo, null);
    });

    test('INB-19 awkward text round-trips unchanged: quotes, SQL, newlines, emoji, unicode, percent signs', async () => {
      const s = await make();
      const subject = `O'Brien "quoted"; DROP TABLE messages; -- 100% \\ done`;
      const body = 'line 1\nline 2\ttabbed\n\u{1F680} café 你好 ?1 :name $x';
      const m = await s.insert(nm({ subject, body }));
      const got = await s.get(m.id);
      assert.equal(got?.subject, subject);
      assert.equal(got?.body, body);
      assert.equal(await s.headId(), 1, 'table still there and one row');
    });

    test('INB-19 createdAt keeps millisecond precision beyond 32 bits', async () => {
      const s = await make();
      const t = Date.UTC(2026, 10, 26, 12, 0, 0, 123);
      const m = await s.insert(nm({ createdAt: t }));
      assert.equal((await s.get(m.id))?.createdAt, t);
    });

    test('INB-19 listFor visibility: to the project or to all, never the project\'s own, never others\' direct messages', async () => {
      const s = await make();
      await s.insert(nm({ from: 'alpha', to: 'beta' })); // 1
      await s.insert(nm({ from: 'alpha', to: 'gamma' })); // 2
      await s.insert(nm({ from: 'alpha', to: 'all' })); // 3
      await s.insert(nm({ from: 'beta', to: 'all' })); // 4
      await s.insert(nm({ from: 'beta', to: 'alpha' })); // 5
      const idsFor = async (p: string) => (await s.listFor(p, { afterId: 0, limit: 50 })).map((m) => m.id);
      assert.deepEqual(await idsFor('beta'), [1, 3]);
      assert.deepEqual(await idsFor('gamma'), [2, 3, 4]);
      assert.deepEqual(await idsFor('alpha'), [4, 5]);
    });

    test('INB-19 listFor is ascending by id, honors afterId (exclusive) and limit', async () => {
      const s = await make();
      for (let i = 0; i < 6; i++) await s.insert(nm({ to: 'all', subject: `M${i}` }));
      const ids = async (o: { afterId: number; limit: number }) => (await s.listFor('beta', o)).map((m) => m.id);
      assert.deepEqual(await ids({ afterId: 0, limit: 50 }), [1, 2, 3, 4, 5, 6]);
      assert.deepEqual(await ids({ afterId: 2, limit: 50 }), [3, 4, 5, 6]);
      assert.deepEqual(await ids({ afterId: 2, limit: 2 }), [3, 4]);
      assert.deepEqual(await ids({ afterId: 6, limit: 5 }), []);
      assert.deepEqual(await ids({ afterId: 100, limit: 5 }), []);
      assert.deepEqual(await ids({ afterId: 0, limit: 1 }), [1]);
    });

    test('INB-19 listFor filters by from and kind, together and apart', async () => {
      const s = await make();
      await s.insert(nm({ from: 'alpha', to: 'beta', kind: 'need' })); // 1
      await s.insert(nm({ from: 'gamma', to: 'beta', kind: 'fyi' })); // 2
      await s.insert(nm({ from: 'alpha', to: 'all', kind: 'shipped' })); // 3
      await s.insert(nm({ from: 'gamma', to: 'all', kind: 'need' })); // 4
      const ids = async (o: { from?: string; kind?: 'need' | 'fyi' | 'shipped' }) => (await s.listFor('beta', { afterId: 0, limit: 50, ...o })).map((m) => m.id);
      assert.deepEqual(await ids({ from: 'alpha' }), [1, 3]);
      assert.deepEqual(await ids({ kind: 'need' }), [1, 4]);
      assert.deepEqual(await ids({ from: 'gamma', kind: 'need' }), [4]);
      assert.deepEqual(await ids({ from: 'beta' }), []);
    });

    test('INB-19 an undefined from/kind filter is "no filter" (not matched against NULL)', async () => {
      const s = await make();
      await s.insert(nm({ to: 'beta' }));
      const got = await s.listFor('beta', { afterId: 0, limit: 10, from: undefined, kind: undefined });
      assert.equal(got.length, 1);
    });

    test('INB-19 countFor counts every visible message after afterId, with no limit', async () => {
      const s = await make();
      for (let i = 0; i < 70; i++) await s.insert(nm({ to: 'all' }));
      await s.insert(nm({ to: 'gamma' }));
      await s.insert(nm({ from: 'beta', to: 'all' }));
      assert.equal(await s.countFor('beta', 0), 70);
      assert.equal(await s.countFor('beta', 60), 10);
      assert.equal(await s.countFor('beta', 72), 0);
      assert.equal(await s.countFor('gamma', 0), 72);
    });

    test('INB-19 countFrom counts posts by a sender with createdAt >= sinceMs', async () => {
      const s = await make();
      await s.insert(nm({ from: 'alpha', createdAt: 100 }));
      await s.insert(nm({ from: 'alpha', createdAt: 200 }));
      await s.insert(nm({ from: 'alpha', createdAt: 300 }));
      await s.insert(nm({ from: 'beta', createdAt: 300 }));
      assert.equal(await s.countFrom('alpha', 0), 3);
      assert.equal(await s.countFrom('alpha', 200), 2, 'boundary is inclusive');
      assert.equal(await s.countFrom('alpha', 201), 1);
      assert.equal(await s.countFrom('alpha', 301), 0);
      assert.equal(await s.countFrom('beta', 0), 1);
      assert.equal(await s.countFrom('gamma', 0), 0);
    });

    test('INB-19 cursors start at 0, are per project, and only move forward', async () => {
      const s = await make();
      assert.equal(await s.getCursor('beta'), 0);
      await s.setCursor('beta', 5);
      assert.equal(await s.getCursor('beta'), 5);
      await s.setCursor('beta', 3);
      assert.equal(await s.getCursor('beta'), 5, 'a lower id is ignored');
      await s.setCursor('beta', 5);
      assert.equal(await s.getCursor('beta'), 5);
      await s.setCursor('beta', 9);
      assert.equal(await s.getCursor('beta'), 9);
      assert.equal(await s.getCursor('gamma'), 0);
      await s.setCursor('gamma', 2);
      assert.equal(await s.getCursor('beta'), 9);
      assert.equal(await s.getCursor('gamma'), 2);
    });

    test('INB-19 setCursor to 0 on a fresh project is harmless and keeps 0', async () => {
      const s = await make();
      await s.setCursor('beta', 0);
      assert.equal(await s.getCursor('beta'), 0);
    });

    test('INB-19 purgeOlderThan deletes strictly older messages and returns the count', async () => {
      const s = await make();
      await s.insert(nm({ createdAt: 100 })); // 1
      await s.insert(nm({ createdAt: 200 })); // 2
      await s.insert(nm({ createdAt: 300 })); // 3
      assert.equal(await s.purgeOlderThan(200), 1);
      assert.equal(await s.get(1), null);
      assert.ok(await s.get(2));
      assert.equal(await s.purgeOlderThan(200), 0);
      assert.equal(await s.purgeOlderThan(1000), 2);
      assert.equal(await s.headId(), 0, 'empty again');
    });

    test('INB-19 trimToLimit keeps the newest max messages and returns how many were dropped', async () => {
      const s = await make();
      for (let i = 0; i < 5; i++) await s.insert(nm({ to: 'all', subject: `M${i}` }));
      assert.equal(await s.trimToLimit(10), 0);
      assert.equal(await s.trimToLimit(3), 2);
      assert.equal(await s.get(1), null);
      assert.equal(await s.get(2), null);
      assert.ok(await s.get(3));
      assert.equal(await s.headId(), 5);
      assert.equal(await s.countFor('beta', 0), 3);
      assert.equal(await s.trimToLimit(3), 0);
    });

    test('INB-19 ids keep rising after a trim (new ids are above the old head)', async () => {
      const s = await make();
      for (let i = 0; i < 3; i++) await s.insert(nm());
      await s.trimToLimit(1);
      const next = await s.insert(nm());
      assert.ok(next.id > 3, `reused an id: ${next.id}`);
    });

    test('INB-19 trimToLimit(0) empties the store', async () => {
      const s = await make();
      await s.insert(nm());
      await s.insert(nm());
      assert.equal(await s.trimToLimit(0), 2);
      assert.equal(await s.headId(), 0);
    });

    test('INB-19 cursors survive purge and trim (they are not messages)', async () => {
      const s = await make();
      await s.insert(nm());
      await s.setCursor('beta', 1);
      await s.purgeOlderThan(10_000);
      await s.trimToLimit(0);
      assert.equal(await s.getCursor('beta'), 1);
    });

    test('INB-19 returned messages are plain data with exactly the Message fields', async () => {
      const s = await make();
      const m = await s.insert(nm());
      const [listed] = await s.listFor('beta', { afterId: 0, limit: 1 });
      for (const x of [m, listed, await s.get(m.id)]) {
        assert.deepEqual(Object.keys(x as object).sort(), ['body', 'createdAt', 'from', 'id', 'kind', 'ref', 'replyTo', 'subject', 'to']);
      }
    });
  });
}

describe('INB-19 D1Store specifics', () => {
  test('INB-19 schema.sql applies to an empty database and defines what D1Store needs', () => {
    const db = createD1Shim();
    const row = db.raw.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type = 'table'").get() as { n: number };
    assert.ok(row.n >= 1, 'schema.sql created no tables');
  });

  test('INB-19 two D1Store instances on one database see the same messages and cursors (survives a restart)', async () => {
    const { D1Store } = await import('../src/store-d1.ts');
    const db = createD1Shim();
    const a = new D1Store(db);
    const m = await a.insert(nm({ to: 'all' }));
    await a.setCursor('beta', 1);
    const b = new D1Store(db);
    assert.deepEqual(await b.get(m.id), m);
    assert.equal(await b.getCursor('beta'), 1);
    assert.equal(await b.headId(), 1);
  });

  test('INB-19 D1Store never binds undefined (D1 refuses it): optional filters and null ref/replyTo work through the shim', async () => {
    const { D1Store } = await import('../src/store-d1.ts');
    const s = new D1Store(createD1Shim());
    await s.insert(nm({ ref: null, replyTo: null }));
    assert.equal((await s.listFor('beta', { afterId: 0, limit: 5 })).length, 1);
    assert.equal(await s.purgeOlderThan(0), 0);
  });

  test('INB-19 D1Store purge and trim report counts from meta.changes', async () => {
    const { D1Store } = await import('../src/store-d1.ts');
    const s = new D1Store(createD1Shim());
    for (let i = 0; i < 4; i++) await s.insert(nm({ createdAt: i }));
    assert.equal(await s.purgeOlderThan(2), 2);
    assert.equal(await s.trimToLimit(1), 1);
  });
});
