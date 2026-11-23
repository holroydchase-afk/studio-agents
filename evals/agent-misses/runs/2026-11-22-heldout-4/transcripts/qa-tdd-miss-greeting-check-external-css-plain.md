Verdict: do not merge. HOME-7 passes falsely.

The real site breaks the rule it is meant to enforce. `site/site.css` gives `.greeting` `animation: drift 3s ease-in-out infinite`, and the greeting drifts 12px. `checkHome` still returns `[]`, so HOME-7c is green.

Cause: `greetingAnimates` reads only inline `<style>` blocks and `style="..."` attributes in index.html. `index.html` loads its CSS through `<link rel="stylesheet" href="site.css">`, and `checkHome` never opens that file. The existing tests only cover inline CSS (7a, 7b) plus the real folder (7c), so none could catch this. HOME-7c passing is the false green.

Red tests added in `check-home.external.test.mjs` (the original files are untouched):
- HOME-7d: a linked stylesheet with `.greeting { animation }` must be flagged. FAILS.
- HOME-7e: a linked stylesheet with `.greeting { transition }` must be flagged. FAILS.
- HOME-7f: a linked stylesheet without motion must pass. Passes, guards against over-flagging.

`node --test`: 6 tests, 4 pass, 2 fail (7d, 7e). HOME-7c only goes red once the checker is fixed, because the real site.css animates.

Next step for engineer:
1. In `checkHome`, parse `<link rel="stylesheet" href>` tags in `index.html`.
2. Read each local file relative to `dir` and add its text to the CSS that `greetingAnimates` scans.
3. Skip remote URLs (no network).
4. The site must then fail HOME-7c until `site.css` loses the animation.
5. Remove the animation, or replace it with `prefers-reduced-motion`-safe static styling, per Chase.

Other gaps worth tests: `@import` inside CSS, `.greeting` in a selector list, `@keyframes`/`animation` set on a parent, and a `<style>` inside an `@media` block. The `[^}]*` regex also stops at a nested `}`, so rules inside `@media` can be missed.

Files are in /tmp/claude-0/-home-user/c832bced-9bf3-59b2-8f2e-2441f39b921e/scratchpad/h4/sand/qa-tdd-miss-greeting-check-external-css-plain
