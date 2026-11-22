---
description: "miss ES-Q2 (real-device-gap), palm-wide-layout"
tags: [qa-tdd, miss, p1, src-es, real-device-gap, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. At 900px and wider the photo result sits beside the picture with its text left-aligned. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`layout.mjs`:
```js
// Text alignment of the result panel by mode ("photo" or "palm") and screen width.
export function resultAlign(mode, width) {
  return width >= 900 ? "left" : "center";
}
```

`layout.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { resultAlign } from "./layout.mjs";
test("LAYOUT-1 photo mode at 1200px is left-aligned", () => assert.equal(resultAlign("photo", 1200), "left"));
test("LAYOUT-2 photo mode at 400px is centred", () => assert.equal(resultAlign("photo", 400), "center"));
```
