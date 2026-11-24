# qa-tdd run: repo-check failing tests (SKT-1..8)

Pre-build run for PR 1 of 3 in docs/product/SPEC-STAKEHOLDER-TOOLS.md. Red output kept: 45 of 46 tests fail because plugins/stakeholder/tools/repo-check.mjs and tools/lib/guard.mjs do not exist; the 1 passing test is the SKT-29 guard.

QA-R1 | P2 | SKT-5 spec | the 14-failing-items case cannot be reached by the listed local checks; test pins the cap at 10 with omitted at least 1 on an empty repo | tests/stakeholder-repo-check.test.mjs
QA-R2 | P2 | SKT-2 fixture | hash pinning needs real standards wording, so a frozen copy of docs/repo-standards.md is committed as a fixture, against the "no copied wording" brief | tests/fixtures/stakeholder/repo-standards.frozen.md

```agentrun
date: 2026-11-24
agent: qa-tdd
product: studio-agents
tier: supervised
model: claude-sonnet-5-5
tokens: 0
cost_usd: 0
input: failing tests for repo-check (SKT-1..8, SKT-28..30 parts)
tool: agent-memory | ok | searched stakeholder repo-check
tool: agent-guard | ok | kill qa-tdd, not tripped
tool: agent-guard | failed | only-tests tripped on the staff-pm spec file docs/product/SPEC-STAKEHOLDER-TOOLS.md, which was already untracked before this run; no source edited by qa-tdd
verdict: red
findings: 2
p0: 0
artifact: tests/stakeholder-repo-check.test.mjs
escalated: yes
escalation_reason: harness showed no token or cost count
```
