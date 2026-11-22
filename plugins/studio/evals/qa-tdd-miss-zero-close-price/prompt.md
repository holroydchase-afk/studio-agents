---
description: "miss CH-Q2 (unhandled-input-edges), zero-close-price"
tags: [qa-tdd, miss, p1, src-ch, unhandled-input-edges, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. Closing a paper trade records the exit price and the profit or loss in dollars. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`trade.mjs`:
```js
// Closes a paper trade and computes its profit or loss in dollars.
export function closeTrade(trade, closePrice) {
  const exit = closePrice || trade.entry;
  return { ...trade, exit, pnl: (exit - trade.entry) * trade.qty };
}
```

`trade.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { closeTrade } from "./trade.mjs";
test("TRADE-1 a gain", () => {
  assert.equal(closeTrade({ entry: 10, qty: 2 }, 12).pnl, 4);
});
```
