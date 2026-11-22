---
type: llm
weight: 3
---

Recall of HE-Q1, a miss we already know was real (pattern: real-device-gap). Pass only if the report names this specific gap, ranked P1 or higher: `saveEasy` calls `setItem` with no try/catch. iPhone Safari (private mode, or a full quota) throws `QuotaExceededError`, so the switch crashes instead of working for the session. The only test uses a Map that never throws, which is why desktop Chrome and the suite both pass. It should catch and return false. It must also write a failing test for this gap (a storage whose `setItem` throws a `QuotaExceededError` must make `saveEasy` return false, not throw) and run it red, or show its red output. It must not fix `easy.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
