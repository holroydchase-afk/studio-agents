# Spec: check the weekly demo rebuild

Answer: the build writes build-info.json with built_on, and a separate daily check fails when the deployed demo is older than 8 days.
Rollback: revert the merge commit; the previous demo build stays deployed.

```spec
verdict: ready
bet: A stale demo is caught within a day; it worked when the check fails before a visitor sees old data
step: M1.1 | build-info.json with built_on | DEMO-7 green | 0.5 session
step: M1.2 | Daily staleness check | DEMO-8 green | 1 session
criterion: DEMO-7 | auto | Given a build on a clock of 2026-11-22T06:00Z, then build-info.json has built_on "2026-11-22"
criterion: DEMO-8 | auto | Given a clock of 2026-11-22T06:00Z and built_on 2026-11-13, then the check exits 1
criterion: DEMO-9 | auto | Given a clock of 2026-11-22T06:00Z and built_on 2026-11-15, then the check exits 0
criterion: DEMO-10 | auto | Given build-info.json is unreachable, then the check exits 1 and counts the demo as "stale"
risk: The rebuild stops and nobody notices | DEMO-8
handoff: qa-tdd | failing tests for DEMO-7 to DEMO-10 | red for the right reason
```
