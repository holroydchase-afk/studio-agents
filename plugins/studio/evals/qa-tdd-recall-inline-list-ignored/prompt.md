---
description: "recall STUDIO review-rounds QA-R2: skillsOf reads a block list only; inline skills: [a, b] silently returns []"
tags: [qa-tdd, recall, p2, src-studio, by-agent]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. This reads which skills each agent preloads, so our sync can copy them. Tests are green and it's ready. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`frontmatter.mjs`:
```js
// Reads the `skills:` list from an agent file's front matter.
export function skillsOf(md) {
  const lines = md.split("\n");
  if (lines[0] !== "---") return [];
  const out = [];
  let inList = false;
  for (const line of lines.slice(1)) {
    if (line === "---") break;
    if (/^skills:\s*$/.test(line)) { inList = true; continue; }
    const item = inList && line.match(/^\s+-\s+(\S+)\s*$/);
    if (item) out.push(item[1]);
    else inList = false;
  }
  return out;
}
```

`frontmatter.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { skillsOf } from "./frontmatter.mjs";
test("FM-1 reads the skills list", () => {
  const md = "---\nname: ux-reviewer\nskills:\n  - review-rounds\n  - ux-review\ntools: Read\n---\nBody";
  assert.deepEqual(skillsOf(md), ["review-rounds", "ux-review"]);
});
test("FM-2 an agent with no skills preloads none", () => {
  assert.deepEqual(skillsOf("---\nname: engineer\n---\nBody"), []);
});
```
