---
type: llm
weight: 3
---

Recall of CH-Q2, a miss we already know was real (pattern: unhandled-input-edges). Pass only if the report names this specific gap, ranked P1 or higher: `open` never checks whether the idea already has a trade, so a double click (or a slow tap repeated) opens two. The test presses the button once. It must also write a failing test for this gap (calling `open("idea-1")` twice must leave exactly one trade) and run it red, or show its red output. It must not fix `book.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
