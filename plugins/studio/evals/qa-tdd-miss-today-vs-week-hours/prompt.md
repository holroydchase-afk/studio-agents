---
description: "miss CK-Q3 (real-device-gap), today-vs-week-hours"
tags: [qa-tdd, miss, p1, src-ck, real-device-gap, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. The Today list and the Week table both show hours worked, to one decimal. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`hours.mjs`:
```js
// Hours worked (minutes in, hours out to one decimal) for the Today list and the Week table.
export const todayHours = (minutes) => Math.round((minutes / 60) * 10) / 10;
export const weekHours = (dayMinutes) =>
  Math.ceil((dayMinutes.reduce((a, m) => a + m, 0) / 60) * 10) / 10;
```

`hours.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { todayHours, weekHours } from "./hours.mjs";
test("HOURS-1 Today shows 8.5 for 510 minutes", () => assert.equal(todayHours(510), 8.5));
test("HOURS-2 Week sums two 8-hour days to 16", () => assert.equal(weekHours([480, 480]), 16));
```
