---
type: llm
weight: 3
---

Recall of PS-Q6, a miss we already know was real (pattern: tool-tests-missed-edge-cases). Pass only if the report names this specific gap, ranked P2 or higher: The pattern accepts only a bullet that starts with a hyphen in the first column. Entries written with `*` or `+`, or with an indented bullet, are silently dropped, so the checker reports fields as missing (or passes an entry whose fields it never saw). The tests use one bullet style. It must also write a failing test for this gap (`parseEntry("* call: ship it\n  - why: cheaper\n+ owner: me")` must return all three fields) and run it red, or show its red output. It must not fix `entry.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P2, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
