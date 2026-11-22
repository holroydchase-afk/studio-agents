---
type: llm
weight: 3
---

Recall of CO-Q3, a miss we already know was real (pattern: rename-and-coverage-gaps). Pass only if the report names this specific gap, ranked P1 or higher: The dark-mode contrast test reads the dark palette constant, but `css()` never emits a dark-mode rule, so the shipped page has no dark colours at all. The test passes with the rule missing because it checks the numbers, not what the page ships. It must also write a failing test for this gap (`css()` must contain a `prefers-color-scheme: dark` rule that uses the dark background colour) and run it red, or show its red output. It must not fix `theme.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
