---
description: "miss RR-Q1 (matching-and-sorting-edges), substring-match"
tags: [qa-tdd, miss, p1, src-rr, matching-and-sorting-edges, split-dev]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. Our inbox sync moves an application's status when an email subject names the company. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`match.mjs`:
```js
// Which tracked company does an email subject mention? First match wins.
export function matchCompany(subject, companies) {
  const s = subject.toLowerCase();
  return companies.find((c) => s.includes(c.toLowerCase())) ?? null;
}
```

`match.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchCompany } from "./match.mjs";
const tracked = ["Volt", "Acme"];
test("MATCH-1 finds a named company", () => {
  assert.equal(matchCompany("Interview with Volt on Friday", tracked), "Volt");
});
test("MATCH-2 no company, no match", () => {
  assert.equal(matchCompany("Your weekly newsletter", tracked), null);
});
```
