---
description: "miss CO-Q1 (rename-and-coverage-gaps), rename-first-only"
tags: [qa-tdd, miss, p2, src-co, rename-and-coverage-gaps, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. A script renames a persona across the docs text (Priya becomes Maya). It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`rename.mjs`:
```js
// Replaces a persona's old name with the new one in a doc's text.
export function renamePersona(text, from, to) {
  return text.replace(from, to);
}
```

`rename.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { renamePersona } from "./rename.mjs";
test("RENAME-1 renames the name", () => {
  assert.equal(renamePersona("Priya likes lists.", "Priya", "Maya"), "Maya likes lists.");
});
```
