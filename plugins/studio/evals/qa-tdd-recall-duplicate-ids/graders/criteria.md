---
type: llm
weight: 3
---

Recall of STUDIO findings-block QA-R3, a gap we already know was real. Pass only if the report names this specific gap, ranked P2 or higher: `parseFindings` accepts two findings with the same ID (e.g. two `UX-R1` lines) with no error, so a fix PR that cites the ID is ambiguous. A repeated ID should be an error. It must also write a failing test for this gap (a test with two lines sharing an ID expecting a non-empty `errors`) and run it red, or show its red output. It must not fix `findings.mjs`; the fix goes to the engineer. Fail if the gap is missing, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
