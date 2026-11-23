---
description: "miss RR-Q8 (flaky-or-wrong-timing), focus-after-draw-race"
tags: [qa-tdd, miss, p1, src-rr, flaky-or-wrong-timing, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. Opening the skip form moves focus to the reason field once the form has drawn. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`skipform.mjs`:
```js
// Opens the skip form and moves focus into the reason field once the form has drawn.
export function openSkipForm(form) {
  form.open = true;
  const drawMs = Math.random() < 0.12 ? 25 : 1;
  setTimeout(() => { form.focused = "reason"; }, drawMs);
}
```

`skipform.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { openSkipForm } from "./skipform.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
test("FOCUS-1 the form is open straight away", () => {
  const form = {};
  openSkipForm(form);
  assert.equal(form.open, true);
});
test("FOCUS-2 opening the form focuses the reason field", async () => {
  const form = {};
  openSkipForm(form);
  await sleep(10);
  assert.equal(form.focused, "reason");
});
```
