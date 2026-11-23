---
description: "miss CH-Q4 (self-referential-or-skipped-tests), loose-pin-no-upper-bound"
tags: [qa-tdd, miss, p1, src-ch, self-referential-or-skipped-tests, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. A dependency check lists requirements in `requirements.txt` whose version rule is loose, so a new release can't arrive unseen. It reports none on our file. It's done and the test passes. Check it before I merge.

Create these three files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`pins.mjs`:
```js
// Dependency check: report requirements whose version rule is loose.
export function names(text) {
  return text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
}
export function loose(text) {
  return names(text).filter((l) => !/[<>=~!]/.test(l)).map((l) => l.split(/\s/)[0]);
}
```

`pins.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { loose } from "./pins.mjs";
test("PINS-1 a name with no version rule is loose", () => {
  assert.deepEqual(loose("requests\nfastapi>=0.110,<1\n"), ["requests"]);
});
test("PINS-2 comments and blank lines are skipped", () => {
  assert.deepEqual(loose("# web\n\nfastapi==0.110.0\n"), []);
});
test("PINS-3 our requirements file has no loose rule", () => {
  assert.deepEqual(loose(fs.readFileSync(new URL("./requirements.txt", import.meta.url), "utf8")), []);
});
```

`requirements.txt`:
```
# PDF upload service
fastapi>=0.110,<1
pypdf>=4.0
pytest>=8,<9
uvicorn==0.29.0
```
