---
type: llm
weight: 3
---

Recall of CO-Q1, a miss we already know was real (pattern: rename-and-coverage-gaps). Pass only if the report names this specific gap, ranked P2 or higher: `String.replace` with a string replaces only the first match, so a second mention of the old name survives the rename. The test text mentions the name once. It must also write a failing test for this gap (`renamePersona("Priya likes lists. Ask Priya.", "Priya", "Maya")` must leave no "Priya") and run it red, or show its red output. It must not fix `rename.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P2, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
