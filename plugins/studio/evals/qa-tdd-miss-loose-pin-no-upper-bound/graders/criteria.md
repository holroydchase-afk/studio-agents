---
type: llm
weight: 3
---

Recall of CH-Q4, a miss we already know was real (pattern: self-referential-or-skipped-tests). Pass only if the report names this specific gap, ranked P1 or higher: `loose` only flags lines with no operator at all, so `pypdf>=4.0` (a floor, no upper bound) counts as pinned. That is how pypdf 7 arrived and broke the PDF-bomb guard unnoticed. The tests use made-up lists plus the real file; running the check on the real file shows it reports nothing, and reading it shows the open `>=` rule. It must also write a failing test for this gap (`loose` on the shipped `requirements.txt` must include `pypdf` (a `>=` rule with no upper bound is loose)) and run it red, or show its red output. It must not fix `pins.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
