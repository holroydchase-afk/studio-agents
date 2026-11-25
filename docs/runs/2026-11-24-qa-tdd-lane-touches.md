# qa-tdd run: lane and touches red tests (LANE-1..17)

Wrote tests/lane-touches.test.mjs (17 node:test cases) for pipeline-plan build step 2. Wired into tests/check.sh. Red: 16 fail, 1 passes by design (LANE-9, the backward-compatibility guard for existing specs). Run 3 times, same result each time.

QA-R1 | P2 | docs/pipeline-plan.md | spec says nothing on a lane: or touches: value that disagrees with the paths of the change (e.g. lane: docs but a tools/ file changes); only `pipeline-run class` decides merge class, nothing cross-checks lane | none
QA-R2 | P2 | check-spec contract | brief says unknown values are errors but not whether lane/touches values are case-insensitive; LANE-2 assumes yes (as verdict is) | tests/lane-touches.test.mjs LANE-2
QA-R3 | P2 | check-spec contract | check-spec must export LANES and TOUCHES (LANE-8 requires it); the brief only said the lists must equal pipeline-run's, so a shared import is one way to build it | tests/lane-touches.test.mjs LANE-8

```agentrun
date: 2026-11-24
agent: qa-tdd
product: studio-agents
tier: supervised
model: claude-sonnet-5-5
tokens: 0
cost_usd: 0
input: failing tests for lane: and touches: spec keys, init --spec, staff-pm docs (LANE-1..17)
tool: agent-guard | ok | kill qa-tdd, only-tests --base b53a41e
tool: agent-memory | ok | searched check-spec lane touches, no prior finding
verdict: red
findings: 3
p0: 0
artifact: tests/lane-touches.test.mjs
escalated: yes
escalation_reason: harness showed no token or cost count
```
