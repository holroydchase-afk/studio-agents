# qa-tdd run: agent-memory failing tests (AMEM-1..13)

```agentrun
date: 2026-11-22
agent: qa-tdd
product: studio-agents
tier: supervised
model: claude-sonnet-5-5
tokens: 0
cost_usd: 0
input: failing tests for tools/agent-memory.mjs (build order 6, generic state and search for qa-tdd and staff-pm)
tool: log-agent-run | ok | qa-tdd
tool: agent-guard | ok | kill qa-tdd
tool: Write | ok | tests/agent-memory.test.mjs
tool: Bash | ok | node --test tests/agent-memory.test.mjs red, module not found
tool: agent-guard | ok | only-tests
verdict: red
findings: 2
p0: 0
artifact: tests/agent-memory.test.mjs
escalated: yes
escalation_reason: harness showed no token or cost count
```

QA-R1 | P1 | contract | agentrun block holds only a findings count, so run docs need finding lines elsewhere; tests assume QA-R/PM-R lines after the block | tests/agent-memory.test.mjs
QA-R2 | P2 | dedupe | spec silent on whether the threshold is inclusive; tests avoid the boundary | none
