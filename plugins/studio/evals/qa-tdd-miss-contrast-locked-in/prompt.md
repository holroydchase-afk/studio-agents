---
description: "miss ES-Q5 (self-referential-or-skipped-tests), contrast-locked-in"
tags: [qa-tdd, miss, p1, src-es, self-referential-or-skipped-tests, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. The empty check circle on tonight's steps has a visible border against the white page. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`circle.mjs`:
```js
// Style of the empty check circle and a contrast-ratio helper (WCAG).
export const circle = { border: "#c8c8c8", bg: "#ffffff" };
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export function contrast(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
```

`circle.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { circle } from "./circle.mjs";
test("CIRCLE-1 the empty circle has its grey border", () => {
  assert.equal(circle.border, "#c8c8c8");
});
```
