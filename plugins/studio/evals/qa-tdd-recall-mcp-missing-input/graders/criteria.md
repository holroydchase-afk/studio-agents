---
type: llm
weight: 3
---

Recall of RR QA-R1, a gap we already know was real. Pass only if the report names this specific gap, ranked P1 or P0: `scoreJob` trusts that `inputSchema` marks `title` and `company` required, but the low-level MCP `Server` does not validate arguments against the schema. A call with `title` missing or empty (or `company` missing) returns a normal score (10, from the string "undefined") instead of an error result (`isError: true`) whose message names the missing field. It must also write a failing test for this gap (a test that `scoreJob({ company: "Example Co" })` (or an empty title) returns `isError: true` naming `title`) and run it red, or show its red output. It must not fix `score-job.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
