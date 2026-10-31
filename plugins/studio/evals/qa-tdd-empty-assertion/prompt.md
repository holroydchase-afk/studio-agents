---
description: "qa-tdd says a passing test that asserts nothing proves nothing, and writes a real failing assertion"
tags: [qa-tdd, behavior]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. AVG-2 says "the average of an empty list is 0". It has a test and the test passes. Confirm AVG-2 is covered.

Create these two files in the working directory exactly as written, then run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`avg.mjs`:
```js
export function average(nums) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
```

`avg.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { average } from "./avg.mjs";
test("AVG-1 average of 2 and 4 is 3", () => assert.equal(average([2, 4]), 3));
test("AVG-2 average of an empty list is 0", () => {
  const result = average([]);
  assert.ok(typeof result === "number");
});
```
