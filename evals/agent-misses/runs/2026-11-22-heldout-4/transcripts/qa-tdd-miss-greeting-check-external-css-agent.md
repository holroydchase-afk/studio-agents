Not ready to merge. HOME-7c passes, but the check is blind to external stylesheets, and the real site is not clean.

Cause: `greetingAnimates` only reads `<style>` blocks and inline `style=` in index.html. `site/index.html` links `site.css`, and `site.css` has `.greeting { animation: drift 3s ... infinite; }`. The page animates and HOME-7c still says clean, so the green is a false pass.

Wrote `check-home.external-css.test.mjs` (your four files are unchanged; no product code touched):
- HOME-7d: the real `site` folder must return `["HOME-7 greeting animates"]`. Red: got `[]`.
- HOME-7e: a linked stylesheet with `transition` on `.greeting` is flagged. Red: got `[]`.
- HOME-7f: a linked stylesheet with no motion passes (guards against false positives). Green.
- HOME-7g: a missing linked stylesheet does not throw. Green today; it constrains the fix.

Fix for the engineer: have `checkHome` read each `<link rel="stylesheet" href>` file relative to `dir` and run the same regex over it. Then decide whether the site's greeting should really drift. If not, remove the animation from `site.css`; HOME-7c then stays green on its own.

Not covered: `@import` chains, remote stylesheet URLs, `.greeting` selectors split across rules, `prefers-reduced-motion` exceptions, and single-quoted `style='...'`. The current regex also misses `animation` set in a later rule with a different selector (e.g. `h1.greeting`, `.hero .greeting` are matched only by the prefix pattern). Green runs after the fix: none, since there is no fix yet. No tools/ dir, so no memory, guard or run-log steps.

```qa
verdict: red
red: HOME-7d and HOME-7e fail: checkHome returns [] although site/site.css animates .greeting (external stylesheets are never read)
suite: home7 | node --test check-home.test.mjs check-home.external-css.test.mjs | 5/2
QA-R1 | P1 | check-home.mjs checkHome | linked stylesheets are never scanned, so HOME-7c passes while site.css animates the greeting | check-home.external-css.test.mjs
QA-R2 | P2 | check-home.mjs greetingAnimates | single-quoted style attributes, @import and remote CSS are not handled; the spec is silent on them | none
```
