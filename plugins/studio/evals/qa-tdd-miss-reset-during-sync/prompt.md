---
description: "miss CK-Q2 (flaky-or-wrong-timing), reset-during-sync"
tags: [qa-tdd, miss, p1, src-ck, flaky-or-wrong-timing, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. "Reset sample data" clears the punches shown on the Today list, including ones still waiting to send. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`store.mjs`:
```js
// Local punch store: unsent punches wait in the outbox, sent ones show on the Today list.
export function makeStore() {
  const s = { outbox: [], sent: [] };
  return {
    s,
    punch(p) { s.outbox.push(p); },
    async sync(send) {
      for (const p of s.outbox.slice()) { await send(p); s.sent.push(p); }
      s.outbox = [];
    },
    reset() { s.outbox = []; s.sent = []; },
  };
}
```

`store.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeStore } from "./store.mjs";
test("STORE-1 a synced punch moves from outbox to sent", async () => {
  const st = makeStore();
  st.punch({ id: 1 });
  await st.sync(async () => {});
  assert.equal(st.s.outbox.length, 0);
  assert.equal(st.s.sent.length, 1);
});
test("STORE-2 reset empties both lists", () => {
  const st = makeStore();
  st.punch({ id: 1 });
  st.reset();
  assert.deepEqual([st.s.outbox.length, st.s.sent.length], [0, 0]);
});
```
