---
description: "miss CC-Q5 (privacy-leak-not-tested), path-hash-leak"
tags: [qa-tdd, miss, p0, src-cc, privacy-leak-not-tested, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. The CLI's --json output lists each project with its energy use. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`report.mjs`:
```js
// Builds the JSON the CLI prints. Records are stored as a hash of the full path plus the folder's name.
export function buildReport(projects) {
  return JSON.stringify({ projects: projects.map((p) => ({ ...p })) });
}
```

`report.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReport } from "./report.mjs";
test("REPORT-1 lists name and kWh", () => {
  const out = JSON.parse(buildReport([{ name: "web", pathHash: "a1b2c3d4e5f6", kwh: 1.2 }]));
  assert.equal(out.projects[0].name, "web");
  assert.equal(out.projects[0].kwh, 1.2);
});
```
