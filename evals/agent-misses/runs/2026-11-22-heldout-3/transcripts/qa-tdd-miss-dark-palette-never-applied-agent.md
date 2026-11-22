Do not merge yet. The dark palette passes its contrast test, but the page never uses it.

- **The gap:** `css()` in `theme.mjs` only emits the light colors (`:root { color: #1a1a1a; background: #ffffff; }`). There is no `prefers-color-scheme: dark` rule and no use of `palette.dark`. A visitor in dark mode still gets dark text on a white page.
- **Why THEME-2 passed:** it only checks that the dark colors contrast with each other (`#f2f2f2` on `#121212`). It never looks at the stylesheet the page ships.
- **New test, red:** I added `THEME-3 the shipped stylesheet applies the dark palette under prefers-color-scheme: dark` to `theme.test.mjs`. It checks that `css()` contains a `prefers-color-scheme: dark` rule and both dark colors. It fails 3 of 3 runs, for the right reason: the stylesheet is just the light rule.
- **Fix for the engineer:** make `css()` also emit `@media (prefers-color-scheme: dark) { :root { color: ...; background: ... } }` from `palette.dark`. I did not touch product code.
- **Not tested:** no real browser or OS dark-mode toggle (no browser here), the explicit "forced light/dark" case, and component-level colors beyond `:root` (the page has none yet). The contrast boundary cases (zero, negative, missing) do not apply. The only inputs are fixed hex strings. `contrast()` assumes 6-digit `#rrggbb` and a malformed value gives NaN.
- **Run notes:** `node --test` with no path also picks up the studio tools' own tests and runs past 120 seconds, so I ran the theme file alone with `tools/qa-run3.mjs`. The `only-tests` guard exits 1 because `theme.mjs` and the pre-installed `tools/` files are untracked non-test files on the base commit. I edited neither, other than creating `theme.mjs` as you specified. The kill guard passed. Memory lookup found no prior finding (`tool: agent-memory | ok | dark palette css`). I did not run `check-qa-report`, and the run log was skipped as instructed.

```qa
verdict: red
red: THEME-3 fails: css() ships only the light :root rule, with no prefers-color-scheme: dark media query and no dark colors
suite: theme | node --test theme.test.mjs | 2/1 2/1 2/1
QA-R1 | P1 | theme.mjs css() | the dark palette is never applied; the stylesheet has no prefers-color-scheme: dark rule, so dark-mode users get the light page, and THEME-2 only checked the palette values | theme.test.mjs
QA-R2 | P2 | theme.mjs contrast() | malformed or 3-digit hex gives NaN and the >=4.5 assertion fails with no clear message; not covered | none
```
