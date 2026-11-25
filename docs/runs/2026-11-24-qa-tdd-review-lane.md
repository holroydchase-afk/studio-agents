# qa-tdd run: review lane red tests (REVIEW-1..17)

Wrote tests/review-lane.test.mjs (31 node:test cases; REVIEW-7 and REVIEW-11 are parameterised) and wired it into tests/check.sh. Red: 19 fail, 12 pass by design (REVIEW-11 regression: other lanes still refuse a non-green verify; true today). Single red run, before the fix.

QA-R1 | P2 | docs/pipeline-plan.md | spec silent on whether pr may merge or what the PR body says when the review lane's verify verdict is red, flaky or blocked (the verdict is recorded but nothing makes it visible downstream) | none
QA-R2 | P2 | pipeline-run contract | brief does not say whether status --json carries verdict on other stages; REVIEW-13 assumes only verify has the key | tests/review-lane.test.mjs REVIEW-13
QA-R3 | P2 | pipeline-run contract | brief does not say what a ledger with an invalid stored verdict does; REVIEW-17 assumes exit 2 like other bad fields | tests/review-lane.test.mjs REVIEW-17

```agentrun
date: 2026-11-24
agent: qa-tdd
product: studio-agents
tier: supervised
model: claude-sonnet-5-5
tokens: 0
cost_usd: 0
input: failing tests for the review lane (REVIEW-1..17)
tool: agent-guard | ok | kill qa-tdd, only-tests --base 3519b27
tool: agent-memory | ok | searched review lane pipeline, only lane-touches findings
verdict: red
findings: 3
p0: 0
artifact: tests/review-lane.test.mjs
escalated: yes
escalation_reason: harness showed no token or cost count
```
