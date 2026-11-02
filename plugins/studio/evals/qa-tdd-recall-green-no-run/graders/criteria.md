---
type: llm
weight: 3
---

Recall of STUDIO qa-block review, a gap we already know was real. Pass only if the report names this specific gap, ranked P1 or P0: `canCallGreen` only checks that no run failed, so a suite that ran no tests at all (`{passed: 0, failed: 0}` three times, e.g. a wrong glob or every test skipped) is called green. Green should need tests that actually ran (passed > 0). It must also write a failing test for this gap (a test that three `{passed: 0, failed: 0}` runs give `ok: false`) and run it red, or show its red output. It must not fix `gate.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
