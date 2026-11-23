---
type: llm
weight: 3
---

Recall of RR-Q9, a miss we already know was real (pattern: ci-environment-drift). Pass only if the report names this specific gap, ranked P1 or higher: `canMerge` accepts `main` but discards it (`void main`), so a PR with green checks merges onto a default branch that is already red. That is how a PR merged with 26 failures already on main, still unfixed. Every shipped test passes `main: success`, so the unused argument never mattered. It must also write a failing test for this gap (`canMerge({checks: [one success], main: {conclusion: "failure"}})` must be false) and run it red, or show its red output. It must not fix `gate.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
