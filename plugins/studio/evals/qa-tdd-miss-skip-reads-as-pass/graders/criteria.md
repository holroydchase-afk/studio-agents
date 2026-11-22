---
type: llm
weight: 3
---

Recall of CH-Q3, a miss we already know was real (pattern: self-referential-or-skipped-tests). Pass only if the report names this specific gap, ranked P1 or higher: `verdict` counts only failures, so a security test that was skipped in CI (the browser was missing) still prints PASS. A skip looks the same as a pass and nobody notices the check never ran. The tests use only passing and failing results. It must also write a failing test for this gap (`verdict` for results where one test has status "skip" must not be "PASS") and run it red, or show its red output. It must not fix `verdict.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
