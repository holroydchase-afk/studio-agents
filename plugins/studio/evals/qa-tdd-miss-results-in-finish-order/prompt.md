---
description: "miss CK-Q5 (flaky-or-wrong-timing), results-in-finish-order"
tags: [qa-tdd, miss, p1, src-ck, flaky-or-wrong-timing, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. `loadAll` loads each teammate's punches in parallel and returns them in the order the teammates were listed. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`loadall.mjs`:
```js
// Loads every teammate's punches in parallel; results come back in the order the teammates were listed.
export async function loadAll(teammates, fetchPunches) {
  const out = [];
  await Promise.all(teammates.map(async (t) => { out.push({ who: t, punches: await fetchPunches(t) }); }));
  return out;
}
```

`loadall.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadAll } from "./loadall.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slowSometimes = async (t) => { await sleep(t === "Ana" && Math.random() < 0.12 ? 20 : 1); return [t.length]; };
test("LOAD-1 every teammate is loaded", async () => {
  const r = await loadAll(["Ana", "Ben"], async (t) => [t.length]);
  assert.equal(r.length, 2);
});
test("LOAD-2 results follow the listed order", async () => {
  const r = await loadAll(["Ana", "Ben"], slowSometimes);
  assert.deepEqual(r.map((x) => x.who), ["Ana", "Ben"]);
});
```
