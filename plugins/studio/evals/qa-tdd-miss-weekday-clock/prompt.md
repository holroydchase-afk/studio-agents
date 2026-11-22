---
description: "miss CC-Q1 (date-clock), weekday-clock"
tags: [qa-tdd, miss, p1, src-cc, date-clock, split-dev]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. Our pace page shows how many days are left in the week (Monday to Sunday). It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`pace.mjs`:
```js
// Days left in the Monday-to-Sunday week after today. Sunday has none.
export function daysLeftInWeek(now = new Date()) {
  return 7 - now.getDay();
}
```

`pace.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { daysLeftInWeek } from "./pace.mjs";
test("PACE-1 four days left on a Wednesday", () => {
  assert.equal(daysLeftInWeek(new Date("2026-11-18T12:00:00")), 4);
});
test("PACE-2 six days left on a Monday", () => {
  assert.equal(daysLeftInWeek(new Date("2026-11-16T12:00:00")), 6);
});
```
