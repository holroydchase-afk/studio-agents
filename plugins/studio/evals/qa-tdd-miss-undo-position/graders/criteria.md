---
type: llm
weight: 3
---

Recall of PS-Q4, a miss we already know was real (pattern: tool-tests-missed-edge-cases). Pass only if the report names this specific gap, ranked P2 or higher: `undo` appends the card to the end of the column instead of restoring its position, so removing the first card and undoing moves it to the bottom. The test removes the last card, where the two look the same. It must also write a failing test for this gap (removing "a" from [a, b, c] and calling `undo` must give [a, b, c] again) and run it red, or show its red output. It must not fix `column.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P2, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
