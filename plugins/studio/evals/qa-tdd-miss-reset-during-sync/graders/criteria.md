---
type: llm
weight: 3
---

Recall of CK-Q2, a miss we already know was real (pattern: flaky-or-wrong-timing). Pass only if the report names this specific gap, ranked P1 or higher: `sync` copies the outbox and keeps sending after `reset` runs, then pushes the punch onto the sent list. A reset pressed while a sync is in flight leaves the punch behind. Both tests run the two actions one after the other and never overlap them. It must also write a failing test for this gap (start `sync` with a send that waits, call `reset`, let the send finish, and the sent list must be empty) and run it red, or show its red output. It must not fix `store.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
