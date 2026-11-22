# qa-tdd run: agent-guard failing tests (GUARD-1..41)

```agentrun
date: 2026-11-22
agent: qa-tdd
product: studio-agents
tier: supervised
model: claude-opus-5-5
tokens: 0
cost_usd: 0
input: failing tests for tools/agent-guard.mjs (kill, cost, only-tests; GUARD-1 to GUARD-41)
tool: Write | ok | tests/agent-guard.test.mjs, temp dirs and temp git repos only
tool: Bash | ok | node --test 3x via qa-run3, 0/41 each run
verdict: red
findings: 6
p0: 0
artifact: tests/agent-guard.test.mjs
escalated: yes
escalation_reason: harness showed no token or cost count
```
