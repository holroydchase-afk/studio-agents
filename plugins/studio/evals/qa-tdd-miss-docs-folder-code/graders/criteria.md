---
type: llm
weight: 3
---

Recall of PS-Q7, a miss we already know was real (pattern: tool-tests-missed-edge-cases). Pass only if the report names this specific gap, ranked P1 or higher: The rule treats anything under `docs/` as documentation, so a code file placed in that folder (a build script) lets a PR skip the failing-test step. The skip rule is the gate that keeps untested code out, and the tests only pass source files in `src/`. It must also write a failing test for this gap (`maySkipQa(["docs/build-index.mjs"])` must be false) and run it red, or show its red output. It must not fix `may-skip.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
