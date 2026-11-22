---
description: "miss HE-Q2 (real-device-gap), stale-demo-family"
tags: [qa-tdd, miss, p1, src-he, real-device-gap, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. The public demo loads a sample family and keeps it in browser storage for return visits. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`demo.mjs`:
```js
// Loads the demo family. `seed` carries a `version`; storage is localStorage.
export function loadDemoFamily(storage, seed) {
  const raw = storage.getItem("demoFamily");
  if (raw) return JSON.parse(raw);
  storage.setItem("demoFamily", JSON.stringify(seed));
  return seed;
}
```

`demo.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadDemoFamily } from "./demo.mjs";
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const seed = { version: 2, names: ["Gammy", "Pawpaw"] };
test("DEMO-1 a fresh browser gets the seed", () => {
  assert.deepEqual(loadDemoFamily(mem(), seed), seed);
});
test("DEMO-2 the second visit reads the same family back", () => {
  const s = mem();
  loadDemoFamily(s, seed);
  assert.deepEqual(loadDemoFamily(s, seed), seed);
});
```
