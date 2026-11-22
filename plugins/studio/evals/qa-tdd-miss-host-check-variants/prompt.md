---
description: "miss PS-Q2 (guard-written-after-the-bug), host-check-variants"
tags: [qa-tdd, miss, p1, src-ps, guard-written-after-the-bug, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. A build check lists any hosts other than our own that a page loads scripts, styles or fonts from. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`hosts.mjs`:
```js
// Lists the hosts a page loads resources from (the build fails if any are not ours).
export function thirdPartyHosts(html) {
  const found = [];
  for (const m of html.matchAll(/(?:src|href)="https:\/\/([^/"]+)/g)) found.push(m[1]);
  return found;
}
```

`hosts.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { thirdPartyHosts } from "./hosts.mjs";
test("HOSTS-1 finds a script host", () => {
  assert.deepEqual(thirdPartyHosts('<script src="https://cdn.example.com/a.js"></script>'), ["cdn.example.com"]);
});
test("HOSTS-2 ignores our own relative files", () => {
  assert.deepEqual(thirdPartyHosts('<link href="/site.css">'), []);
});
```
