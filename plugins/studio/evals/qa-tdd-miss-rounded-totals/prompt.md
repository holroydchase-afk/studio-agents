---
description: "miss CK-S3 (undefined-rule), rounded-totals"
tags: [qa-tdd, miss, p1, src-ck, undefined-rule, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. The week view lists hours per day and a week total, all to one decimal. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`hours.mjs`:
```js
// One-decimal display for hours.
export const fmt = (h) => Math.round(h * 10) / 10;
export const dayLabels = (days) => days.map(fmt);
export function weekTotal(days) {
  return fmt(days.reduce((a, b) => a + b, 0));
}
```

`hours.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { dayLabels, weekTotal } from "./hours.mjs";
test("HOURS-1 a plain week", () => {
  assert.deepEqual(dayLabels([8, 8, 8, 8, 8]), [8, 8, 8, 8, 8]);
  assert.equal(weekTotal([8, 8, 8, 8, 8]), 40);
});
```
