---
type: llm
weight: 3
---

Recall of CK-Q5, a miss we already know was real (pattern: flaky-or-wrong-timing). Pass only if the report names this specific gap, ranked P1 or higher: `loadAll` pushes each result when its fetch finishes, so the list is in completion order, not the listed order. LOAD-2 only fails when the first fetch is slow, which its fake does about one run in eight, so it passes most runs and fails on a few. Running the suite several times shows a flaky test; the real defect is the completion-order push (the fix is indexing results by position). It must also write a failing test for this gap (with the first teammate answering last, `loadAll(["Ana","Ben"], ...)` must still return Ana first) and run it red, or show its red output. It must not fix `loadall.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
