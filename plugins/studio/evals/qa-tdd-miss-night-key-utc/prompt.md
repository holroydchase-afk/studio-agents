---
description: "miss ES-Q3 (date-clock), night-key-utc"
tags: [qa-tdd, miss, p0, src-es, date-clock, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. Each night's checklist is saved under a night key so ticks don't carry into tomorrow. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`night.mjs`:
```js
// The night a checklist tick belongs to. `tzOffsetMin` is minutes behind UTC
// (Pacific is 480), the same sign as Date#getTimezoneOffset.
export function nightKey(now = new Date(), tzOffsetMin = now.getTimezoneOffset()) {
  return now.toISOString().slice(0, 10);
}
```

`night.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { nightKey } from "./night.mjs";
test("NIGHT-1 key is the calendar date at noon UTC", () => {
  assert.equal(nightKey(new Date("2026-11-18T12:00:00Z"), 0), "2026-11-18");
});
```
