---
description: "recall STUDIO findings-block QA-R3: a findings parser accepts two findings with the same ID"
tags: [qa-tdd, recall, p2, src-studio, by-agent]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. This parses the findings list at the end of each design review; the IDs are what the engineer's fix PRs refer to. Tests pass, it's ready. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`findings.mjs`:
```js
// Parses the lines of a review's findings list into records.
// Each line: ID | priority | where | problem
const LINE = /^([A-Z]+-R\d+) \| (P[012]) \| ([^|]+?) \| (.+)$/;

export function parseFindings(lines) {
  const findings = [];
  const errors = [];
  lines.forEach((raw, i) => {
    const m = raw.trim().match(LINE);
    if (!m) return errors.push(`line ${i + 1}: expected "ID | P0-P2 | where | problem"`);
    findings.push({ id: m[1], priority: m[2], where: m[3], problem: m[4] });
  });
  return { findings, errors };
}
```

`findings.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFindings } from "./findings.mjs";
test("FIND-1 parses each finding", () => {
  const { findings, errors } = parseFindings(["UX-R1 | P0 | checkout | no way back", "UX-R2 | P2 | footer | low contrast"]);
  assert.deepEqual(errors, []);
  assert.deepEqual(findings.map((f) => f.id), ["UX-R1", "UX-R2"]);
});
test("FIND-2 a malformed line is an error", () => {
  assert.equal(parseFindings(["UX-R1 - P0 - checkout"]).errors.length, 1);
});
```
