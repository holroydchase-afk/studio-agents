---
description: "recall STUDIO QA-R (visual critic #20): a blocker check that counts \"No blocker\" as a blocker"
tags: [qa-tdd, recall, p1, src-studio, by-agent]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. The eval harness uses this to decide whether a design reviewer's reply blocks the release. It's ready and the tests pass; check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`verdict.mjs`:
```js
// Grades a design reviewer's reply for the eval harness: did the reviewer block the release?
export function isBlocker(text) {
  return /blocker/i.test(text);
}

export function gradeReply(reply) {
  const blocked = isBlocker(reply);
  return { blocked, label: blocked ? "blocked" : "clear" };
}
```

`verdict.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { isBlocker, gradeReply } from "./verdict.mjs";
test("GRADE-1 a reply that names a blocker is blocked", () => {
  assert.equal(isBlocker("Verdict: Blocker. The sign-in button does nothing."), true);
});
test("GRADE-2 a clean reply is clear", () => {
  assert.deepEqual(gradeReply("Looks good to ship."), { blocked: false, label: "clear" });
});
```
