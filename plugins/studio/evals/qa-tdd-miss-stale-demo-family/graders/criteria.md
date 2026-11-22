---
type: llm
weight: 3
---

Recall of HE-Q2, a miss we already know was real (pattern: real-device-gap). Pass only if the report names this specific gap, ranked P1 or higher: `loadDemoFamily` returns whatever is stored and never compares `version`, so a returning visitor keeps the old demo family after the seed changes. Both tests start from an empty browser, so only first-time visitors are covered. A stored copy with an older version must be replaced by the seed. It must also write a failing test for this gap (storage holding `{version: 1}` with a seed of `{version: 2}` must return and store the seed) and run it red, or show its red output. It must not fix `demo.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
