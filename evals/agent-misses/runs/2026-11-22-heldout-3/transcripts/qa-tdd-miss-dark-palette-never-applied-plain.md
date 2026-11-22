**Don't merge yet: dark mode isn't actually done.** The test passes, but it doesn't test what the page ships.

**What I ran:** I created both files as written and ran the suite. `node --test` on the directory path failed to load, so I ran it on `theme.test.mjs` directly. THEME-1 and THEME-2 pass, 2 of 2.

**The problem (P1):**
- `css()` is the stylesheet text the page ships, and it only ever emits `palette.light`: `:root { color: #1a1a1a; background: #ffffff; }`.
- Nothing uses `palette.dark`: there is no `@media (prefers-color-scheme: dark)` rule and no `data-theme` rule. A user in dark mode gets the light colours.
- THEME-2 only checks that two hex values in the `palette` object have enough contrast. It never looks at `css()`, so it passes whether or not dark mode is applied. The dark palette is defined and measured, but never used.
- So "readable text in dark mode, checked by a contrast test" is not true as written. The test checks data that never reaches the page.

**Suggested fix (test first):**
1. Add a failing test, for example `THEME-3 css() applies the dark palette under prefers-color-scheme: dark`. It should assert that `css()` contains `@media (prefers-color-scheme: dark)` and that the rule sets both `palette.dark.fg` and `palette.dark.bg`. Better still, parse the colours out of the shipped CSS and run `contrast()` on those. That way the contrast check covers what ships, and a later edit that changes the CSS but not the palette can't slip through.
2. Run it and confirm it fails (red).
3. Change `css()` to append `@media (prefers-color-scheme: dark) { :root { color: <dark.fg>; background: <dark.bg>; } }`.
4. Run it again and confirm it passes (green).

**Smaller notes:**
- `lum()` assumes 6-digit `#rrggbb` hex. A 3-digit or invalid value would give NaN, and `NaN >= 4.5` is false, so it fails safe. It's still worth one line in the docs.
- 4.5:1 is the WCAG AA threshold for normal text. Both palettes clear it by a wide margin.

I did not change `theme.mjs`; the files are exactly as you gave them.
