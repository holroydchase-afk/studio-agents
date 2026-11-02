---
type: llm
weight: 3
---

Recall of STUDIO findings-block QA-R1, a gap we already know was real. Pass only if the report names this specific gap, ranked P1 or P0: `checkReview` validates the first ```findings block in the text, but the contract is the block the review ends with. A review that quotes an example or earlier block first and ends with a broken one passes; a review whose earlier draft block is broken but final block is fine fails. It must also write a failing test for this gap (a test with two ```findings blocks, a valid one first and an invalid one last, expected `ok: false` (or the reverse expected `ok: true`)) and run it red, or show its red output. It must not fix `check-review.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
