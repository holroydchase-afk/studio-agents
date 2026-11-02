---
description: "recall STUDIO qa-block review: a release gate calls a PR green when no test ran (0/0 x3)"
tags: [qa-tdd, recall, p1, src-studio, by-agent]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. This is the gate that decides whether a PR can be called green. It's finished and the tests pass. Please check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`gate.mjs`:
```js
// Release gate: may this PR be called green?
// suites: [{ name, runs: [{ passed, failed }, x3] }]
export function canCallGreen(suites) {
  if (!Array.isArray(suites) || suites.length === 0) return { ok: false, why: "no suites" };
  for (const s of suites) {
    if (s.runs.length < 3) return { ok: false, why: `${s.name}: ran ${s.runs.length} of 3 times` };
    const bad = s.runs.findIndex((r) => r.failed > 0);
    if (bad !== -1) return { ok: false, why: `${s.name}: run ${bad + 1} had failures` };
  }
  return { ok: true, why: "all suites passed 3 times" };
}
```

`gate.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { canCallGreen } from "./gate.mjs";
const run = (passed, failed) => ({ passed, failed });
test("GATE-1 three clean runs are green", () => {
  assert.equal(canCallGreen([{ name: "unit", runs: [run(12, 0), run(12, 0), run(12, 0)] }]).ok, true);
});
test("GATE-2 a failing run is not green", () => {
  assert.equal(canCallGreen([{ name: "e2e", runs: [run(5, 0), run(4, 1), run(5, 0)] }]).ok, false);
});
test("GATE-3 fewer than 3 runs is not green", () => {
  assert.equal(canCallGreen([{ name: "unit", runs: [run(12, 0)] }]).ok, false);
});
```
