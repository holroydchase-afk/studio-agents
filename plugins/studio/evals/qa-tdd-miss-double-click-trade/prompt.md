---
description: "miss CH-Q2 (unhandled-input-edges), double-click-trade"
tags: [qa-tdd, miss, p1, src-ch, unhandled-input-edges, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. Pressing "Paper trade this idea" opens one paper trade for that idea. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`book.mjs`:
```js
// A paper-trade book: one trade per idea.
export function makeBook() {
  const trades = [];
  return {
    open(idea) { trades.push({ id: trades.length + 1, idea }); return trades.length; },
    all: () => trades.slice(),
  };
}
```

`book.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeBook } from "./book.mjs";
test("BOOK-1 opens a trade", () => {
  const b = makeBook();
  b.open("idea-1");
  assert.equal(b.all().length, 1);
});
```
