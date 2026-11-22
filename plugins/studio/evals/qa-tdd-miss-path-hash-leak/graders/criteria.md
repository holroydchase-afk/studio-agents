---
type: llm
weight: 3
---

Recall of CC-Q5, a miss we already know was real (pattern: privacy-leak-not-tested). Pass only if the report names this specific gap, ranked P0 or higher: `buildReport` spreads every field of the stored record into the output, so the hash of the project's full path is printed. A path hash can be matched against guessed paths, and the product rule is that nothing written or shown carries path information. The test only checks the fields it expected to see, never what else comes out. It must also write a failing test for this gap (the output of `buildReport` for a record with `pathHash` "a1b2c3d4e5f6" must not contain that value) and run it red, or show its red output. It must not fix `report.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P0, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
