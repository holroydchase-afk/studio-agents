# qa-tdd run: stamp-run failing tests (STAMP-1..13)

```agentrun
date: 2026-11-22
agent: qa-tdd
product: studio-agents
tier: supervised
model: claude-sonnet-5-5
tokens: 0
cost_usd: 0
input: failing tests for new tools/stamp-run.mjs (STAMP-1 to STAMP-13) and check-agent-run stamped-key acceptance
tool: agent-memory | ok | searched stamp transcript, no matches
tool: agent-guard | ok | kill qa-tdd not tripped
tool: agent-guard | ok | only-tests --base 99965eff1077f07cf6f9e9a2239eba945517f19f
tool: Write | ok | tests/stamp-run.test.mjs
tool: Bash | ok | qa-run3 on stamp-run suite, 1/25 each run; check-agent-run suite 22/0
verdict: red
findings: 3
p0: 0
artifact: tests/stamp-run.test.mjs
escalated: yes
escalation_reason: harness showed no token or cost count
```

QA-R1 | P1 | tools/check-agent-run.mjs | does not know stamped/stamp_* keys, does not check stamp_sha (40 hex) or tokens == sum of the four stamp counts; engineer must extend it | tests/stamp-run.test.mjs
QA-R2 | P2 | spec | silent on: run.md with no agentrun block, a transcript record with no message.id, and cost_usd after a priced stamp is followed by an unpriced re-stamp (stale) | none
QA-R3 | P2 | spec | stamp_test format when counts are unparseable not specified; test STAMP-8c only requires it not to invent counts | tests/stamp-run.test.mjs
