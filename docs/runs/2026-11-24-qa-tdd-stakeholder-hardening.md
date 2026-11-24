# qa-tdd run, stakeholder hardening (STK-PS-R3..R9), pre-build

```agentrun
date: 2026-11-24
agent: qa-tdd
product: studio-agents
tier: supervised
model: claude-sonnet-5-5
tokens: 0
cost_usd: 0
input: failing tests for STK-PS-R3 to R9 (HANDOFF.md, Stakeholder plugin review)
tool: agent-guard | ok | kill qa-tdd
tool: agent-memory | ok | searched stakeholder hardening proto, no matching past finding
tool: Bash | ok | qa-run3 stakeholder-hardening 3x red (7 pass, 18 fail), stakeholder 3x green
tool: agent-guard | ok | only-tests --base f3f1a7b
verdict: red
findings: 4
p0: 0
artifact: tests/stakeholder-hardening.test.mjs
escalated: yes
escalation_reason: harness showed no token or cost count
```

QA-R1 | P1 | tests/stakeholder.test.mjs SKP-15 | line 277 pins ship with zero findings and zero subagents as exit 0, which STK-PS-R6 reverses | tests/stakeholder-hardening.test.mjs
QA-R2 | P1 | tests/stakeholder.test.mjs SKP-13, SKP-22 | pin --json findings on stdout with exit 1, which STK-PS-R8 reverses | tests/stakeholder-hardening.test.mjs
QA-R3 | P2 | plugins/stakeholder/scripts/sync-audience.sh | SKP-7..9 use a file:// base through real curl; the engineer must keep file:// working once --proto =https is added (drop it for the file/localhost override) | tests/stakeholder-hardening.test.mjs
QA-R4 | P2 | STK-PS-R3 | "starts with http://localhost" read literally accepts http://localhost.evil.example; tests require the host to end at the localhost or 127.0.0.1 label | tests/stakeholder-hardening.test.mjs
