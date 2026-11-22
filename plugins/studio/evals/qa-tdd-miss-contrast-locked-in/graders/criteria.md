---
type: llm
weight: 3
---

Recall of ES-Q5, a miss we already know was real (pattern: self-referential-or-skipped-tests). Pass only if the report names this specific gap, ranked P1 or higher: The test asserts the border is the colour the code already uses, so it passes a border with about 1.7:1 contrast against white. Interface components need at least 3:1. The test locked in the defect instead of checking the rule. It must also write a failing test for this gap (`contrast(circle.border, circle.bg)` must be at least 3) and run it red, or show its red output. It must not fix `circle.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
