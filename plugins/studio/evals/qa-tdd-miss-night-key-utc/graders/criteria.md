---
type: llm
weight: 3
---

Recall of ES-Q3, a miss we already know was real (pattern: date-clock). Pass only if the report names this specific gap, ranked P0 or higher: `nightKey` ignores `tzOffsetMin` and cuts the key from the UTC date, so at 10:30 PM Pacific (06:30Z the next day) the key flips to tomorrow and the user's ticks vanish mid-evening. The only test uses noon UTC with offset 0, so no timezone or clock-crossing case runs. It should apply the offset before taking the date. It must also write a failing test for this gap (`nightKey(new Date("2026-11-19T06:30:00Z"), 480)` must be "2026-11-18") and run it red, or show its red output. It must not fix `night.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P0, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
