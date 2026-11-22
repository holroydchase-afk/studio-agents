---
description: "miss CC-Q2 (date-clock), monday-divide"
tags: [qa-tdd, miss, p1, src-cc, date-clock, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. The demo's pace line shows the average kWh per day so far this Monday-to-Sunday week. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`avg.mjs`:
```js
// Average kWh per day so far this week. Monday is the first day.
export function dailyAverage(totalKwh, now = new Date()) {
  const daysSoFar = (now.getDay() + 6) % 7;
  return totalKwh / daysSoFar;
}
```

`avg.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyAverage } from "./avg.mjs";
test("AVG-1 ten kWh by Wednesday", () => {
  assert.equal(dailyAverage(10, new Date("2026-11-18T12:00:00")), 5);
});
```
