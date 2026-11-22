---
description: "miss CH-Q3 (self-referential-or-skipped-tests), skip-reads-as-pass"
tags: [qa-tdd, miss, p1, src-ch, self-referential-or-skipped-tests, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. CI prints one verdict line for the security browser tests: PASS or FAIL. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`verdict.mjs`:
```js
// Turns test-runner results into the verdict line CI prints for the security checks.
export function verdict(results) {
  const failed = results.filter((r) => r.status === "fail").length;
  return failed === 0 ? "PASS" : "FAIL (" + failed + ")";
}
```

`verdict.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { verdict } from "./verdict.mjs";
test("VERDICT-1 all passing prints PASS", () => {
  assert.equal(verdict([{ name: "a", status: "pass" }, { name: "b", status: "pass" }]), "PASS");
});
test("VERDICT-2 one failure prints FAIL (1)", () => {
  assert.equal(verdict([{ name: "a", status: "pass" }, { name: "b", status: "fail" }]), "FAIL (1)");
});
```
