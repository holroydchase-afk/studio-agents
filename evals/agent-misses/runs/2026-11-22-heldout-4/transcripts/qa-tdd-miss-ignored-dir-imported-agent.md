Not ready to merge: the check is wrong, and the claim "reports none" is false. `src/screener.mjs` imports `../data/prices.mjs`, and `.gitignore` has `data/`, so a fresh clone breaks (the file is missing). The check misses it because `isIgnored` only handles exact paths and `*.ext` rules. It ignores directory rules (`data/`) and bare names at any depth (`node_modules`), so FRESH-3 passes for the wrong reason.

Wrote (tests only, no product code touched): /tmp/claude-0/-home-user/c832bced-9bf3-59b2-8f2e-2441f39b921e/scratchpad/h4/sand/qa-tdd-miss-ignored-dir-imported-agent/fresh.dir.test.mjs
- FRESH-4: `data/` rule must ignore `data/prices.mjs` and `data/x/y.mjs`, not `database.mjs`. Red.
- FRESH-5: bare `node_modules` rule must ignore `node_modules/x/index.mjs`. Red.
- FRESH-6: the screener's import must be reported as `["data/prices.mjs"]` against the real .gitignore. Red.
Existing FRESH-1..3 stay green (3 pass, 3 fail), 1 run each, after the fix I would run 3x. Hand to engineer: make isIgnored match directory rules (trailing `/`) and bare names by path segment. FRESH-3 as written should then fail, so it needs to change (or the screener import must be removed from the ignored dir).
Not covered: negation (`!`) rules, rooted `/` rules, `**` globs, imports without `from` (bare `import "./x"`, dynamic import, require), and extensionless specifiers. Memory/guard tools skipped (no tools/ dir).

```qa
verdict: red
red: FRESH-4/5/6 fail: isIgnored ignores directory rules and bare names, so the screener's import of the ignored data/prices.mjs goes unreported
suite: node-test | node --test | 3/3 fail on first run (3 pass, 3 fail)
QA-R1 | P1 | fresh.mjs isIgnored | directory rule `data/` and bare-name rules never match, so the fresh-copy check reports none while src/screener.mjs imports ignored data/prices.mjs and a fresh clone breaks | fresh.dir.test.mjs (FRESH-4, FRESH-6)
QA-R2 | P2 | fresh.mjs isIgnored | bare name rule `node_modules` does not match files beneath it | fresh.dir.test.mjs (FRESH-5)
QA-R3 | P2 | fresh.test.mjs FRESH-3 | asserts [] and passes for the wrong reason; it will need updating once the bug is fixed | fresh.dir.test.mjs (FRESH-6)
QA-R4 | P2 | fresh.mjs importsIgnored | only matches `from "./x"` imports; bare, dynamic and require imports, negation, rooted and ** rules untested | none
```
