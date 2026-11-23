---
type: llm
weight: 3
---

Recall of RR-Q6, a miss we already know was real (pattern: flaky-or-wrong-timing). Pass only if the report names this specific gap, ranked P1 or higher: INDEX-2 asserts a wall-clock budget on a build that sometimes takes about 60 ms on a busy machine, so it fails roughly one run in ten and passes on a rerun. The test measures machine load, not the code, and a single green run proves nothing. Repeated runs show it; the stable fix is to test the work done (or inject a clock) instead of elapsed time. It must also write a failing test for this gap (100 builds, the slowest must stay under the same 50 ms budget (red, because about 10% take 60 ms)) and run it red, or show its red output. It must not fix `index-build.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
