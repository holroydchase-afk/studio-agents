---
description: "miss CH-Q5 (self-referential-or-skipped-tests), ignored-dir-imported"
tags: [qa-tdd, miss, p1, src-ch, self-referential-or-skipped-tests, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. A fresh-copy check lists source files that import something our `.gitignore` excludes, so a fresh clone still runs. It reports none on this repo. It's done and the test passes. Check it before I merge.

Create these five files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`fresh.mjs`:
```js
// Fresh-copy check: a file that imports an ignored path will not exist in a clone.
import path from "node:path";
const rules = (g) => g.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
export function isIgnored(file, gitignore) {
  return rules(gitignore).some((r) => r === file || (r.startsWith("*.") && file.endsWith(r.slice(1))));
}
export function importsIgnored(source, from, gitignore) {
  const specs = [...source.matchAll(/from\s+["'](\.{1,2}\/[^"']+)["']/g)].map((m) => m[1]);
  return specs.map((s) => path.posix.join(path.posix.dirname(from), s)).filter((f) => isIgnored(f, gitignore));
}
```

`fresh.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { isIgnored, importsIgnored } from "./fresh.mjs";
const read = (p) => fs.readFileSync(new URL("./" + p, import.meta.url), "utf8");
test("FRESH-1 an exact file rule and an extension rule match", () => {
  assert.equal(isIgnored("notes.txt", "notes.txt\n"), true);
  assert.equal(isIgnored("run.log", "*.log\n"), true);
  assert.equal(isIgnored("src/a.mjs", "*.log\n"), false);
});
test("FRESH-2 an import of an ignored file is reported", () => {
  assert.deepEqual(importsIgnored('import x from "./local.mjs";', "src/a.mjs", "src/local.mjs\n"), ["src/local.mjs"]);
});
test("FRESH-3 the screener imports nothing ignored", () => {
  assert.deepEqual(importsIgnored(read("src/screener.mjs"), "src/screener.mjs", read(".gitignore")), []);
});
```

`.gitignore`:
```
node_modules
data/
*.log
```

`src/screener.mjs`:
```
import { PRICES } from "../data/prices.mjs";
export const top = (n) => Object.entries(PRICES).sort((a, b) => b[1] - a[1]).slice(0, n);
```

`data/prices.mjs`:
```
export const PRICES = { AAA: 12.5, BBB: 48.1, CCC: 7.9 };
```
