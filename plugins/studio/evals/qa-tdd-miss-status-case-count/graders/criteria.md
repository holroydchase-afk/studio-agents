---
type: llm
weight: 3
---

Recall of RR-Q4, a miss we already know was real (pattern: public-demo-shipped-with-defects). Pass only if the report names this specific gap, ranked P1 or higher: `summary` matches the status text exactly, but the form saves it capitalised ("Applied"), so every real role is skipped and the public page says "applied 0". The test feeds lowercase statuses that nothing in the app produces. It must also write a failing test for this gap (`summary([{status:"Applied"},{status:"Interview"}])` must count one applied and one interview) and run it red, or show its red output. It must not fix `summary.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
