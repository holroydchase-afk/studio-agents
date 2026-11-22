---
description: "miss PS-Q5 (tool-tests-missed-edge-cases), percent-radius"
tags: [qa-tdd, miss, p2, src-ps, tool-tests-missed-edge-cases, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. A design check decides whether an element is a circle from its border radius and width. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`circle-check.mjs`:
```js
// An element is a circle when its border radius is at least half its width.
export function isCircle(borderRadius, widthPx) {
  return parseFloat(borderRadius) >= widthPx / 2;
}
```

`circle-check.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { isCircle } from "./circle-check.mjs";
test("CIRC-1 a 12px radius on a 24px box is a circle", () => assert.equal(isCircle("12px", 24), true));
test("CIRC-2 a 4px radius on a 24px box is not", () => assert.equal(isCircle("4px", 24), false));
```
