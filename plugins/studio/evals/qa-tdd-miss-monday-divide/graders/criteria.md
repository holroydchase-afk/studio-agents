---
type: llm
weight: 3
---

Recall of CC-Q2, a miss we already know was real (pattern: date-clock). Pass only if the report names this specific gap, ranked P1 or higher: `daysSoFar` is 0 on a Monday (it should count today), so the average divides by zero and the demo shows Infinity or NaN every Monday. The test pins a Wednesday only. It must also write a failing test for this gap (`dailyAverage(10, new Date("2026-11-16T12:00:00"))` (a Monday) must be a finite number) and run it red, or show its red output. It must not fix `avg.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
