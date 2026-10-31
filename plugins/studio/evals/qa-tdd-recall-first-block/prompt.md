---
description: "recall STUDIO findings-block QA-R1: a findings checker validates the first fenced block, not the last"
tags: [qa-tdd, recall, p1, src-studio, by-agent]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. CI runs this on every design review to make sure it ends with a valid findings block. Ready to go, tests pass. Can you check it before I merge?

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`check-review.mjs`:
```js
// Validates the ```findings block a design review must end with.
const VERDICT = /^verdict: (ready|not ready)$/;
const FINDING = /^[A-Z]+-R\d+ \| P[012] \| [^|]+ \| [^|]+$/;

export function checkReview(md) {
  const block = md.match(/```findings\n([\s\S]*?)```/);
  if (!block) return { ok: false, errors: ["no ```findings block"] };
  const [first, ...rest] = block[1].trim().split("\n");
  const errors = [];
  if (!VERDICT.test(first)) errors.push(`first line must be a verdict, got: ${first}`);
  for (const line of rest) if (!FINDING.test(line)) errors.push(`bad finding: ${line}`);
  return { ok: errors.length === 0, errors };
}
```

`check-review.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkReview } from "./check-review.mjs";
const fence = "```";
test("REV-1 a well-formed findings block passes", () => {
  const md = `Review text.\n\n${fence}findings\nverdict: not ready\nUX-R1 | P1 | home | button too small\n${fence}\n`;
  assert.deepEqual(checkReview(md), { ok: true, errors: [] });
});
test("REV-2 a review with no block fails", () => {
  assert.equal(checkReview("Looks fine.").ok, false);
});
```
