---
type: llm
weight: 3
---

Recall of STUDIO qa-block review, a gap we already know was real. Pass only if the report names this specific gap, ranked P1 or P0: `checkQaReport` only looks at the latest run, so `verdict: green` with a suite like `9/0 9/1 9/0` (a run in the middle failed) is accepted. Runs that differ mean the suite is flaky, and the checker should require `verdict: flaky` (and reject green). It must also write a failing test for this gap (a test that `checkQaReport("verdict: green\nsuite: e2e | npm run e2e | 9/0 9/1 9/0\n")` returns an error) and run it red, or show its red output. It must not fix `qa-report.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
