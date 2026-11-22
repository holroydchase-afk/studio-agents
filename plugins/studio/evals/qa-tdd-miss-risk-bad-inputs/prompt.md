---
description: "miss CH-Q1 (unhandled-input-edges), risk-bad-inputs"
tags: [qa-tdd, miss, p1, src-ch, unhandled-input-edges, split-dev]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. This sizes the worst-case loss on an options idea from price, strike and implied volatility. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`risk.mjs`:
```js
// Worst-case dollar loss for one idea. Premium is a simple estimate: price * iv * 0.4.
const round2 = (n) => Math.round(n * 100) / 100;
export function maxLoss({ price, strike, iv, contracts = 1 }) {
  const premium = price * iv * 0.4;
  return round2(Math.min(premium, strike) * 100 * contracts);
}
```

`risk.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { maxLoss } from "./risk.mjs";
test("RISK-1 matches the premium formula", () => {
  const input = { price: 50, strike: 55, iv: 0.3, contracts: 2 };
  const premium = input.price * input.iv * 0.4;
  assert.equal(maxLoss(input), Math.round(Math.min(premium, input.strike) * 100 * 2 * 100) / 100);
});
```
