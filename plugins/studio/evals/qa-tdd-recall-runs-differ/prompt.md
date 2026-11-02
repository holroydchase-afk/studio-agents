---
description: "recall STUDIO qa-block review: a qa-report checker accepts green when a suite's 3 runs differ"
tags: [qa-tdd, recall, p1, src-studio, by-agent]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. This checks the verdict at the end of our QA reports before a PR can be marked ready. Tests are green; it's ready. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`qa-report.mjs`:
```js
// Checks the verdict at the end of a QA report against its suite lines.
// suite: <name> | <command> | <passed>/<failed> x3 runs
export function checkQaReport(md) {
  const verdict = md.match(/^verdict: (green|red|flaky|blocked)$/m)?.[1];
  if (!verdict) return ["missing verdict"];
  const suites = [...md.matchAll(/^suite: ([^|]+) \| [^|]+ \| (.+)$/gm)].map((m) => ({
    name: m[1].trim(),
    runs: m[2].trim().split(/\s+/).map((r) => r.split("/").map(Number)),
  }));
  if (suites.length === 0) return ["no suite lines"];
  const errors = [];
  for (const s of suites) {
    if (s.runs.length !== 3) errors.push(`${s.name}: needs 3 runs`);
    const [, failedLast] = s.runs.at(-1);
    if (verdict === "green" && failedLast > 0) errors.push(`${s.name}: green but the latest run failed`);
  }
  return errors;
}
```

`qa-report.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkQaReport } from "./qa-report.mjs";
test("QAREP-1 green with three passing runs is valid", () => {
  assert.deepEqual(checkQaReport("verdict: green\nsuite: unit | npm test | 9/0 9/0 9/0\n"), []);
});
test("QAREP-2 green whose latest run failed is invalid", () => {
  assert.equal(checkQaReport("verdict: green\nsuite: unit | npm test | 9/0 9/0 8/1\n").length, 1);
});
test("QAREP-3 a report needs a verdict", () => {
  assert.deepEqual(checkQaReport("suite: unit | npm test | 9/0 9/0 9/0\n"), ["missing verdict"]);
});
```
