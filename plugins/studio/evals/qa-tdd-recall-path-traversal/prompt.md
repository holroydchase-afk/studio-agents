---
description: "recall STUDIO review-rounds QA-R1: installSkill removes join(dest, name) with no check on name, so ../ escapes dest"
tags: [qa-tdd, recall, p2, src-studio, by-agent]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. Our sync step uses this to refresh a skill folder in each product repo. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`install.mjs`:
```js
import * as realFs from "node:fs";
import { join } from "node:path";

// Replaces one skill folder in a product repo with the studio's copy.
// `fs` is injectable so tests don't touch the disk.
export function installSkill(dest, name, { fs = realFs, from = "plugins/studio/skills" } = {}) {
  const target = join(dest, name);
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(join(from, name), target, { recursive: true });
  return target;
}
```

`install.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { installSkill } from "./install.mjs";
const fakeFs = () => {
  const calls = [];
  return { calls, rmSync: (p) => calls.push(["rm", p]), cpSync: (a, b) => calls.push(["cp", a, b]) };
};
test("SKILL-1 replaces the skill folder with the studio copy", () => {
  const fs = fakeFs();
  const target = installSkill(".claude/skills", "review-rounds", { fs });
  assert.equal(target, ".claude/skills/review-rounds");
  assert.deepEqual(fs.calls, [
    ["rm", ".claude/skills/review-rounds"],
    ["cp", "plugins/studio/skills/review-rounds", ".claude/skills/review-rounds"],
  ]);
});
```
