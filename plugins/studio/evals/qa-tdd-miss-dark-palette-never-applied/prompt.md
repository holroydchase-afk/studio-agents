---
description: "miss CO-Q3 (rename-and-coverage-gaps), dark-palette-never-applied"
tags: [qa-tdd, miss, p1, src-co, rename-and-coverage-gaps, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. The page needs readable text in dark mode too, checked by a contrast test. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`theme.mjs`:
```js
// Colour palettes and the stylesheet text the page ships. Contrast follows WCAG.
export const palette = { light: { fg: "#1a1a1a", bg: "#ffffff" }, dark: { fg: "#f2f2f2", bg: "#121212" } };
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export function contrast(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
export function css() {
  return ":root { color: " + palette.light.fg + "; background: " + palette.light.bg + "; }";
}
```

`theme.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { palette, contrast } from "./theme.mjs";
test("THEME-1 the light palette has 4.5:1 contrast", () => {
  assert.ok(contrast(palette.light.fg, palette.light.bg) >= 4.5);
});
test("THEME-2 the dark palette has 4.5:1 contrast", () => {
  assert.ok(contrast(palette.dark.fg, palette.dark.bg) >= 4.5);
});
```
