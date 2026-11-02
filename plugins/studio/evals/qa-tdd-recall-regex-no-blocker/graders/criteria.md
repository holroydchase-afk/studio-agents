---
type: llm
weight: 3
---

Recall of STUDIO QA-R, a gap we already know was real. Pass only if the report names this specific gap, ranked P1 or P0: `isBlocker` matches any text containing "blocker", so a reply that says there is no blocker ("No blocker", "no blockers found", "Blocker: none") is graded as blocked. The report must show a concrete negated phrase being misgraded. It must also write a failing test for this gap (a test such as `isBlocker("No blocker. Ship it.")` expected false) and run it red, or show its red output. It must not fix `verdict.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
