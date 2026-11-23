---
description: "miss RR-Q7 (ci-environment-drift), runner-list-form"
tags: [qa-tdd, miss, p1, src-rr, ci-environment-drift, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. A CI lint flags jobs that run on a moving runner image such as ubuntu-latest, so a runner change can't break the browser install overnight. It passes on our workflow. It's done and the test passes. Check it before I merge.

Create these three files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`ci-lint.mjs`:
```js
// CI lint: jobs must run on a pinned runner image.
export function floating(yaml) {
  return yaml.split("\n").filter((l) => /^\s*runs-on:\s*(ubuntu|macos|windows)-latest\s*$/.test(l)).map((l) => l.trim());
}
```

`ci-lint.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { floating } from "./ci-lint.mjs";
test("CILINT-1 a plain latest runner is flagged", () => {
  assert.deepEqual(floating("jobs:\n  t:\n    runs-on: ubuntu-latest\n"), ["runs-on: ubuntu-latest"]);
});
test("CILINT-2 a pinned runner passes", () => {
  assert.deepEqual(floating("jobs:\n  t:\n    runs-on: ubuntu-22.04\n"), []);
});
test("CILINT-3 our workflow passes", () => {
  assert.deepEqual(floating(fs.readFileSync(new URL("./.github/workflows/ci.yml", import.meta.url), "utf8")), []);
});
```

`.github/workflows/ci.yml`:
```
name: ci
on: [push]
jobs:
  test:
    runs-on: [ubuntu-latest]
    steps:
      - uses: actions/checkout@v4
      - run: npx playwright install --with-deps chromium
      - run: node --test
```
