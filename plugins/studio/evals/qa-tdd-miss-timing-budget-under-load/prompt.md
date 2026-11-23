---
description: "miss RR-Q6 (flaky-or-wrong-timing), timing-budget-under-load"
tags: [qa-tdd, miss, p1, src-rr, flaky-or-wrong-timing, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. Building the roles index is fast: it finishes in under 50 ms. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`index-build.mjs`:
```js
// Builds the roles index; the work takes 2 ms, or about 60 ms when the machine is busy.
export function buildIndex(items) {
  const busy = Math.random() < 0.1 ? 60 : 2;
  const t = Date.now();
  while (Date.now() - t < busy) { /* spin */ }
  return new Map(items.map((i) => [i.id, i]));
}
```

`index-build.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndex } from "./index-build.mjs";
test("INDEX-1 the index holds every role by id", () => {
  const m = buildIndex([{ id: 1 }, { id: 2 }]);
  assert.equal(m.get(2).id, 2);
});
test("INDEX-2 building the index takes under 50 ms", () => {
  const t = Date.now();
  buildIndex(Array.from({ length: 100 }, (_, i) => ({ id: i })));
  assert.ok(Date.now() - t < 50, "too slow");
});
```
