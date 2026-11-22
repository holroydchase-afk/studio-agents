---
description: "miss CK-Q1 (real-device-gap), stale-cache-name"
tags: [qa-tdd, miss, p1, src-ck, real-device-gap, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. The service worker caches the app so it opens with no signal, and phones should pick up a new build. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`sw-cache.mjs`:
```js
// Name of the service-worker cache. A new name makes phones drop the old copy.
export function cacheName(buildId) {
  return "crew-clock-v1";
}
```

`sw-cache.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { cacheName } from "./sw-cache.mjs";
test("CACHE-1 the name starts with the app name", () => {
  assert.match(cacheName("abc123"), /^crew-clock/);
});
```
