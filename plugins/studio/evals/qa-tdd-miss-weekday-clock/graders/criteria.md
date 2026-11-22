---
type: llm
weight: 3
---

Recall of CC-Q1, a miss we already know was real (pattern: date-clock). Pass only if the report names this specific gap, ranked P1 or higher: `daysLeftInWeek` uses `7 - getDay()`, and `getDay()` is 0 on Sunday, so Sunday reports 7 days left instead of 0. The tests pin a Wednesday and a Monday only, so the suite passes six days a week and breaks on the seventh. It should treat Sunday as day 7 (or use a Monday-based index). It must also write a failing test for this gap (`daysLeftInWeek(new Date("2026-11-22T12:00:00"))` must be 0 (Nov 22 2026 is a Sunday)) and run it red, or show its red output. It must not fix `pace.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
