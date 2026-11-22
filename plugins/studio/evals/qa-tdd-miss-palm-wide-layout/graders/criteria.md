---
type: llm
weight: 3
---

Recall of ES-Q2, a miss we already know was real (pattern: real-device-gap). Pass only if the report names this specific gap, ranked P1 or higher: The wide-screen rule ignores the mode, so the palm reading, which has no picture beside it, is left-aligned at 900px and wider too. The rule should apply to photo mode only. The tests check photo mode at both widths and never open palm mode on a wide screen. It must also write a failing test for this gap (`resultAlign("palm", 1200)` must be "center") and run it red, or show its red output. It must not fix `layout.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
