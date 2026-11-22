---
description: "miss HE-Q7 (privacy-leak-not-tested), name-denylist-case"
tags: [qa-tdd, miss, p0, src-he, privacy-leak-not-tested, split-dev]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. A pre-push check scans text for real family names without keeping the names in the repo: it stores only hashes of the names. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`names.mjs`:
```js
import { createHash } from "node:crypto";
// Returns the words in `text` whose sha256 is in `bannedHashes` (hashes of lowercase names).
const sha = (w) => createHash("sha256").update(w).digest("hex");
export function leaks(text, bannedHashes) {
  return text.split(/\W+/).filter((w) => bannedHashes.includes(sha(w)));
}
```

`names.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { leaks } from "./names.mjs";
const banned = [createHash("sha256").update("quill").digest("hex")];
test("NAMES-1 flags a banned name", () => {
  assert.deepEqual(leaks("thanks to quill for the photos", banned), ["quill"]);
});
test("NAMES-2 clean text has no leaks", () => {
  assert.deepEqual(leaks("thanks for the photos", banned), []);
});
```
