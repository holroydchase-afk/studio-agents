---
type: llm
weight: 3
---

Recall of CH-Q2, a miss we already know was real (pattern: unhandled-input-edges). Pass only if the report names this specific gap, ranked P1 or higher: `closePrice || trade.entry` treats a close of $0 as "no price given" and falls back to the entry, so a trade that expires worthless reports a $0 loss instead of losing everything. The test closes at a positive price only. It must also write a failing test for this gap (`closeTrade({entry: 10, qty: 2}, 0).pnl` must be -20) and run it red, or show its red output. It must not fix `trade.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
