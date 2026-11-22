---
type: llm
weight: 3
---

Recall of RR-Q2, a miss we already know was real (pattern: matching-and-sorting-edges). Pass only if the report names this specific gap, ranked P2 or higher: `sortSkipped` compares the dates as text, so unpadded days sort wrongly: "2026-11-9" ranks above "2026-11-10" and an older skip lands above today's. The only test uses zero-padded dates. It should parse to numbers or dates before comparing. It must also write a failing test for this gap (`2026-11-10` must sort before `2026-11-9` in newest-first order) and run it red, or show its red output. It must not fix `skipped.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P2, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
