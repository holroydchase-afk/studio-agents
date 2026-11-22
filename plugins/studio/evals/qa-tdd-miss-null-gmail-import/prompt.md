---
description: "miss RR-Q3 (matching-and-sorting-edges), null-gmail-import"
tags: [qa-tdd, miss, p1, src-rr, matching-and-sorting-edges, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. The Gmail import turns each email into a tracker row with the sender and subject. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`import.mjs`:
```js
// Turns emails from the Gmail connector into tracker rows.
export function toRow(email) {
  return { from: email.from.toLowerCase(), subject: email.subject.trim() };
}
export function importAll(emails) {
  return emails.map(toRow);
}
```

`import.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { importAll } from "./import.mjs";
test("IMPORT-1 maps two emails", () => {
  const rows = importAll([{ from: "A@X.com", subject: " Hi " }, { from: "b@y.com", subject: "Yo" }]);
  assert.deepEqual(rows, [{ from: "a@x.com", subject: "Hi" }, { from: "b@y.com", subject: "Yo" }]);
});
```
