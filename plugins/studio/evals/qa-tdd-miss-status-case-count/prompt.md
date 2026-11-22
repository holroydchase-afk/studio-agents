---
description: "miss RR-Q4 (public-demo-shipped-with-defects), status-case-count"
tags: [qa-tdd, miss, p1, src-rr, public-demo-shipped-with-defects, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. The summary line counts roles by status: applied, interview and offer. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`summary.mjs`:
```js
// Counts roles by status for the summary line on the page.
export function summary(roles) {
  const out = { applied: 0, interview: 0, offer: 0 };
  for (const r of roles) if (r.status in out) out[r.status]++;
  return out;
}
```

`summary.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { summary } from "./summary.mjs";
test("SUM-1 counts each status", () => {
  const s = summary([{ status: "applied" }, { status: "applied" }, { status: "offer" }]);
  assert.deepEqual(s, { applied: 2, interview: 0, offer: 1 });
});
```
