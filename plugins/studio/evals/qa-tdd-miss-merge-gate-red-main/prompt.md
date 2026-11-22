---
description: "miss RR-Q9 (ci-environment-drift), merge-gate-red-main"
tags: [qa-tdd, miss, p1, src-rr, ci-environment-drift, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. The merge gate says whether a PR may merge: yes when it has checks and every one succeeded. Check the gate before we merge a batch. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`gate.mjs`:
```js
// Merge gate: a PR may merge when it has checks and all of them succeeded.
// `main` is the latest check result on the default branch, when known.
export function canMerge({ checks, main }) {
  void main;
  return checks.length > 0 && checks.every((c) => c.conclusion === "success");
}
```

`gate.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { canMerge } from "./gate.mjs";
const ok = { name: "unit", conclusion: "success" };
const bad = { name: "unit", conclusion: "failure" };
test("GATE-1 all checks green may merge", () => assert.equal(canMerge({ checks: [ok, ok], main: { conclusion: "success" } }), true));
test("GATE-2 a failed check may not merge", () => assert.equal(canMerge({ checks: [ok, bad], main: { conclusion: "success" } }), false));
test("GATE-3 no checks may not merge", () => assert.equal(canMerge({ checks: [], main: { conclusion: "success" } }), false));
```
