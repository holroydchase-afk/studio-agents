---
description: "miss PS-Q1 (guard-written-after-the-bug), greeting-check-external-css"
tags: [qa-tdd, miss, p1, src-ps, guard-written-after-the-bug, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. The home page check HOME-7 flags a greeting that animates or drifts. It runs against the `site` folder and passes. It's done and the test passes. Check it before I merge.

Create these four files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`check-home.mjs`:
```js
// HOME-7: the home greeting must not animate or drift.
import fs from "node:fs";
export function greetingAnimates(html) {
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
  return /\.greeting[^{]*\{[^}]*(animation|transition)/i.test(css) || /class="greeting"[^>]*style="[^"]*(animation|transition)/i.test(html);
}
export function checkHome(dir) {
  const html = fs.readFileSync(dir + "/index.html", "utf8");
  return greetingAnimates(html) ? ["HOME-7 greeting animates"] : [];
}
```

`check-home.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { greetingAnimates, checkHome } from "./check-home.mjs";
test("HOME-7a an inline style block with an animation is flagged", () => {
  assert.equal(greetingAnimates('<style>.greeting { animation: drift 2s infinite; }</style><h1 class="greeting">Hi</h1>'), true);
});
test("HOME-7b a plain greeting passes", () => {
  assert.equal(greetingAnimates('<h1 class="greeting">Hi</h1>'), false);
});
test("HOME-7c the site folder passes", () => {
  assert.deepEqual(checkHome(new URL("./site", import.meta.url).pathname), []);
});
```

`site/index.html`:
```
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Chase</title>
<link rel="stylesheet" href="site.css">
</head>
<body>
<h1 class="greeting">Hey there, I'm Chase.</h1>
</body>
</html>
```

`site/site.css`:
```
body { font-family: system-ui, sans-serif; }
.greeting { font-size: 2rem; animation: drift 3s ease-in-out infinite; }
@keyframes drift { from { transform: translateX(0); } to { transform: translateX(12px); } }
```
