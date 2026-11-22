---
description: "miss PS-Q3 (guard-written-after-the-bug), unescape-order"
tags: [qa-tdd, miss, p1, src-ps, guard-written-after-the-bug, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. The notes field shows saved text with its HTML escapes turned back into plain characters. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`unescape.mjs`:
```js
// Turns escaped text from the saved notes back into plain characters.
export function unescapeHtml(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
```

`unescape.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { unescapeHtml } from "./unescape.mjs";
test("UNESC-1 turns &lt; and &gt; into characters", () => {
  assert.equal(unescapeHtml("a &lt; b &gt; c"), "a < b > c");
});
test("UNESC-2 turns &amp; into &", () => {
  assert.equal(unescapeHtml("Fish &amp; chips"), "Fish & chips");
});
```
