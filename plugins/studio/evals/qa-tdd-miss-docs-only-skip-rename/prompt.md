---
description: "miss CC-Q6 (tool-tests-missed-edge-cases), docs-only-skip-rename"
tags: [qa-tdd, miss, p1, src-cc, tool-tests-missed-edge-cases, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. The PR gate lets a PR say "qa-tdd skipped: docs only" when every changed file is a doc (a .md file, anything under docs/, or LICENSE). It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`skipcheck.mjs`:
```js
// PR gate: "qa-tdd skipped: docs only" is allowed only if every changed file is a doc.
import { spawnSync } from "node:child_process";
const isDoc = (f) => /\.md$/.test(f) || f.startsWith("docs/") || f === "LICENSE";
export function changedFiles(base, head, cwd) {
  const r = spawnSync("git", ["diff", "--name-only", base + "..." + head], { cwd, encoding: "utf8" });
  return r.stdout.split("\n").filter(Boolean);
}
export function skipAllowed(agentsLine, files) {
  if (!/qa-tdd skipped: *docs only/i.test(agentsLine)) return true;
  return files.every(isDoc);
}
```

`skipcheck.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { changedFiles, skipAllowed } from "./skipcheck.mjs";
const git = (cwd, ...a) => spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "-c", "commit.gpgsign=false", ...a], { cwd, encoding: "utf8" }).stdout.trim();
function repo(steps) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skip-"));
  git(dir, "init", "-q");
  fs.mkdirSync(path.join(dir, "src")); fs.mkdirSync(path.join(dir, "docs"));
  fs.writeFileSync(path.join(dir, "README.md"), "hello\n");
  git(dir, "add", "-A"); git(dir, "commit", "-q", "-m", "base");
  const base = git(dir, "rev-parse", "HEAD");
  steps(dir);
  git(dir, "add", "-A"); git(dir, "commit", "-q", "-m", "change");
  return { dir, base, head: git(dir, "rev-parse", "HEAD") };
}
const LINE = "Agents: qa-tdd skipped: docs only";
test("SKIP-1 a docs-only change may skip", () => {
  const r = repo((d) => fs.writeFileSync(path.join(d, "docs", "a.md"), "notes\n"));
  assert.equal(skipAllowed(LINE, changedFiles(r.base, r.head, r.dir)), true);
});
test("SKIP-2 a new code file may not skip", () => {
  const r = repo((d) => fs.writeFileSync(path.join(d, "src", "b.py"), "print(1)\n"));
  assert.equal(skipAllowed(LINE, changedFiles(r.base, r.head, r.dir)), false);
});
```
