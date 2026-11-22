---
description: "miss RR-Q2 (matching-and-sorting-edges), text-sorted-dates"
tags: [qa-tdd, miss, p2, src-rr, matching-and-sorting-edges, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. The skipped-roles list shows the most recently ruled-out role first. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`skipped.mjs`:
```js
// Newest ruled-out date first. `ruledOut` looks like "2026-11-9" (year-month-day).
export function sortSkipped(items) {
  return [...items].sort((a, b) => b.ruledOut.localeCompare(a.ruledOut));
}
```

`skipped.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { sortSkipped } from "./skipped.mjs";
test("SKIP-1 newest first across months", () => {
  const out = sortSkipped([
    { id: "a", ruledOut: "2026-10-30" },
    { id: "b", ruledOut: "2026-11-02" },
  ]);
  assert.deepEqual(out.map((x) => x.id), ["b", "a"]);
});
```
