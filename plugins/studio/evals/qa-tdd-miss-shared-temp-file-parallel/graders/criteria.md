---
type: llm
weight: 3
---

Recall of HE-Q6, a miss we already know was real (pattern: flaky-or-wrong-timing). Pass only if the report names this specific gap, ranked P1 or higher: Both test files use the same fixed temp file, and `node --test` runs files in parallel processes. One file's `reset()` can land between the other's `push` calls, so OUTBOX-1 fails now and then (and OUTBOX-2 can read a half-written file) and both pass when rerun. The shared state is the cause: every process computes the same path. Running the suite repeatedly shows the flake; reading the two files shows the shared path. It must also write a failing test for this gap (the queue file path must differ between two test processes (for example include the process id), red now because both resolve the same path) and run it red, or show its red output. It must not fix `outbox.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
