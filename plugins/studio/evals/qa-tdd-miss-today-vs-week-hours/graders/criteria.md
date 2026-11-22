---
type: llm
weight: 3
---

Recall of CK-Q3, a miss we already know was real (pattern: real-device-gap). Pass only if the report names this specific gap, ranked P1 or higher: The two views round differently (`Math.round` on Today, `Math.ceil` on Week), so 505 minutes shows 8.4 on one screen and 8.5 on the other. Each view's own test passes on round numbers; nothing compares the two. Only a manual look at the live app showed it. It must also write a failing test for this gap (`weekHours([505])` must equal `todayHours(505)`) and run it red, or show its red output. It must not fix `hours.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
