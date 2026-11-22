---
description: "miss HE-Q1 (real-device-gap), storage-throws"
tags: [qa-tdd, miss, p1, src-he, real-device-gap, split-dev]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. The Easy view switch remembers its setting in browser storage. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`easy.mjs`:
```js
// Remembers the Easy view switch. `storage` is localStorage in the browser.
export function saveEasy(storage, on) {
  storage.setItem("easyView", JSON.stringify(on));
  return true;
}
```

`easy.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { saveEasy } from "./easy.mjs";
test("EASY-1 saves the switch", () => {
  const m = new Map();
  const storage = { setItem: (k, v) => m.set(k, v) };
  assert.equal(saveEasy(storage, true), true);
  assert.equal(m.get("easyView"), "true");
});
```
