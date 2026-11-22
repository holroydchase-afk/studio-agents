---
type: llm
weight: 3
---

Recall of CK-S3, a miss we already know was real (pattern: undefined-rule). Pass only if the report names this specific gap, ranked P1 or higher: the week total rounds the raw sum while each day rounds on its own, so the page can show seven days of 2.3 (16.1) beside a total of 16.4. There is no single rounding rule, and the test only uses whole hours so the two always agree. The total must equal the sum of the displayed days (or the days must visibly say they are rounded). It must also write a failing test for this gap (for seven days of 2.34, the sum of `dayLabels` must equal `weekTotal`) and run it red, or show its red output. It must not fix `hours.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
