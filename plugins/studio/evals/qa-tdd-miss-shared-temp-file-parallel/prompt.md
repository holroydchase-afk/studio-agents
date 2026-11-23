---
description: "miss HE-Q6 (flaky-or-wrong-timing), shared-temp-file-parallel"
tags: [qa-tdd, miss, p1, src-he, flaky-or-wrong-timing, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. The outbox keeps queued items in a temp file; both test files check it. It's done and the test passes. Check it before I merge.

Create these three files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`outbox.mjs`:
```js
// Outbox queue kept in one temp file.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
export const file = () => path.join(os.tmpdir(), "outbox-queue.json");
export const reset = () => fs.writeFileSync(file(), "[]");
export const all = () => JSON.parse(fs.readFileSync(file(), "utf8"));
export const push = (x) => fs.writeFileSync(file(), JSON.stringify([...all(), x]));
```

`outbox.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { reset, push, all } from "./outbox.mjs";
test("OUTBOX-1 a pushed item is queued", () => {
  reset();
  for (let i = 0; i < 200; i++) push(i);
  assert.equal(all().length, 200);
});
```

`outbox-reset.test.mjs`:
```
import { test } from "node:test";
import assert from "node:assert/strict";
import { reset, push, all } from "./outbox.mjs";
test("OUTBOX-2 reset empties the queue", () => {
  push("x");
  reset();
  assert.deepEqual(all(), []);
});
```
