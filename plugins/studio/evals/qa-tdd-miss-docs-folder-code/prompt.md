---
description: "miss PS-Q7 (tool-tests-missed-edge-cases), docs-folder-code"
tags: [qa-tdd, miss, p1, src-ps, tool-tests-missed-edge-cases, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. A PR check lets a PR skip the failing-test step when it changes only docs or config files. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`may-skip.mjs`:
```js
// True when every changed file is docs or config, so a PR may say "qa-tdd skipped".
export function maySkipQa(files) {
  return files.length > 0 && files.every((f) => /\.(md|json|ya?ml)$/.test(f) || f.startsWith("docs/"));
}
```

`may-skip.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { maySkipQa } from "./may-skip.mjs";
test("SKIP-1 a README change may skip", () => assert.equal(maySkipQa(["README.md"]), true));
test("SKIP-2 a source change may not", () => assert.equal(maySkipQa(["src/app.mjs", "README.md"]), false));
test("SKIP-3 an empty change may not", () => assert.equal(maySkipQa([]), false));
```
