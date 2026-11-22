---
description: "miss PS-Q6 (tool-tests-missed-edge-cases), bullet-styles"
tags: [qa-tdd, miss, p2, src-ps, tool-tests-missed-edge-cases, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. A checker reads the "- key: value" lines of a story-keeper log entry into fields. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`entry.mjs`:
```js
// Reads the bullet lines of a log entry ("- key: value") into an object.
export function parseEntry(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^- ([a-z]+): (.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
```

`entry.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEntry } from "./entry.mjs";
test("ENTRY-1 reads two fields", () => {
  assert.deepEqual(parseEntry("- call: ship it\n- why: cheaper"), { call: "ship it", why: "cheaper" });
});
test("ENTRY-2 ignores lines that are not bullets", () => {
  assert.deepEqual(parseEntry("Notes\n- call: ship it"), { call: "ship it" });
});
```
