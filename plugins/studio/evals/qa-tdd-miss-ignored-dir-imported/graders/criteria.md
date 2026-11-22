---
type: llm
weight: 3
---

Recall of CH-Q5, a miss we already know was real (pattern: self-referential-or-skipped-tests). Pass only if the report names this specific gap, ranked P1 or higher: `isIgnored` knows only exact paths and `*.ext` rules, not a directory rule like `data/`. `src/screener.mjs` imports `../data/prices.mjs`, which `.gitignore` excludes, so a fresh clone has no market data and every import fails, while this check reports nothing and the tests pass locally. The shipped tests use exact-file rules; running the check on the real files and reading `.gitignore` shows it. It must also write a failing test for this gap (`importsIgnored` on the shipped screener, from `src/screener.mjs`, with the shipped `.gitignore` must report `data/prices.mjs`) and run it red, or show its red output. It must not fix `fresh.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
