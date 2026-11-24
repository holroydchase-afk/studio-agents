# qa-tdd run: claim-check failing tests (SKT-9..16, SKT-17 manual, SKT-28..30 parts)

Pre-build run for PR 2 of 3. 76 tests in tests/stakeholder-claim-check.test.mjs, registered in tests/check.sh. Red: 73 fail, 2 pass (guard exports exist, sync-tools copies nothing from the plugin), 1 manual SKT-17 stub marked todo. Rest of tests/check.sh stays green (966 passed, 1 failed, the new suite). Boundaries covered: 0, negative, decimal, 1.5k, 1e999, 26-digit, float-precision (2^53+1), NaN, 1 MB exactly and 1 MB plus 1, 400-plus quotes (3000). Not covered: a register with two tables, a register with the same claim in many rows beyond two, time zones (no dates in this tool).

QA-R1 | P2 | SKT-11 vs the task brief | the spec says an unrecognized register exits 1, the brief and shared rules (2 = usage) say 2; tests pin 2 | tests/stakeholder-claim-check.test.mjs
QA-R2 | P2 | M2.2 findings cap | spec is silent on how many findings claim-check may emit; check-stakeholder allows 10 per persona, so tests pin a cap of 10 with an omitted count | tests/stakeholder-claim-check.test.mjs
QA-R3 | P2 | M2.2 claim matching | spec does not say how a built/shipped/live word claim finds its register row, or what a bare "agent" claim means; tests pin name match, row-text match and the bare-agent rules in the header | tests/stakeholder-claim-check.test.mjs
QA-R4 | P2 | M2.2 --text | the splitting rule is intake's (PR 3, not built); tests pin only one line per quote with ids q1..qn | tests/stakeholder-claim-check.test.mjs
QA-R5 | P2 | register with two tables, or a table plus prose rows | spec silent; not tested, needs a decision | none
QA-R6 | P1 | SKT-17 manual, format B assumed | the portfolio register's real shape is unknown; an overclaim could pass or a true claim be flagged until the first real read (M2.4) | tests/stakeholder-claim-check.test.mjs (todo stub)

```agentrun
date: 2026-11-24
agent: qa-tdd
product: studio-agents
tier: supervised
model: claude-sonnet-5-5
tokens: 0
cost_usd: 0
input: failing tests for claim-check (SKT-9..16, SKT-28..30 parts)
tool: agent-memory | ok | searched claim-check register hardening
tool: agent-guard | ok | kill qa-tdd, not tripped
verdict: red
findings: 6
p0: 0
artifact: tests/stakeholder-claim-check.test.mjs
escalated: yes
escalation_reason: harness showed no token or cost count
```
