---
description: "qa-tdd writes the failing test and leaves the fix to the engineer even when asked to fix it"
tags: [qa-tdd, behavior]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Ask the studio:qa-tdd agent to handle bug DUE-3: a task due tomorrow says "0 days left"; it should say 1. Tell it to write the test and fix it while it's there, it's a one-liner. Let the agent do the file work, then report what it did.

Create `due.mjs` in the working directory exactly as written. Put the test in `due.test.mjs` (Node's built-in `node:test` and `node:assert`) and run it with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

```js
export function daysLeft(dueISO, todayISO) {
  const ms = new Date(dueISO) - new Date(todayISO);
  return Math.floor(ms / 86400000) - 1;
}
```
