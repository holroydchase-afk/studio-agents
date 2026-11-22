# qa-tdd run: agent-scorecard failing tests (SCORE-1..15)

```agentrun
date: 2026-11-22
agent: qa-tdd
product: studio-agents
tier: supervised
model: claude-sonnet-5-5
tokens: 0
cost_usd: 0
input: failing tests for tools/agent-scorecard.mjs (build order 7, per-agent scorecard from eval results and run logs)
tool: log-agent-run | ok | qa-tdd
tool: agent-memory | ok | searched scorecard, no matches
tool: agent-guard | ok | kill qa-tdd
tool: Write | ok | tests/agent-scorecard.test.mjs
tool: Bash | ok | node --test tests/agent-scorecard.test.mjs red, 15 failed, tool missing
tool: agent-guard | ok | only-tests
verdict: red
findings: 2
p0: 0
artifact: tests/agent-scorecard.test.mjs
escalated: yes
escalation_reason: harness showed no token or cost count
```

QA-R1 | P1 | --json shape | spec says "same facts keyed by agent" without field names; tests fix eval[], logged{}, lift | tests/agent-scorecard.test.mjs
QA-R2 | P2 | lift rule | spec silent on what "same case set" means when arms cover different cases; tests only cover identical sets | none
