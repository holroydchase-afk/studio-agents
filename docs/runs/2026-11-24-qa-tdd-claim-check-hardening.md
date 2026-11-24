# qa-tdd run: claim-check hardening (STK-PS-R20..R27), red

```agentrun
date: 2026-11-24
agent: qa-tdd
product: studio-agents
tier: supervised
model: claude-sonnet-5-5
tokens: 0
cost_usd: 0
input: failing tests for privacy-security review of claim-check (STK-PS-R20, R21, R22, R23, R24, R27)
tool: agent-memory | ok | not run separately; no earlier finding for these IDs in the review text
tool: agent-guard | ok | kill qa-tdd, exit 0
tool: agent-guard | failed | only-tests: tree already held uncommitted non-test edits from the build thread before this run (HANDOFF.md, README, agent docs, claim-check.mjs); this run touched only tests/check.sh and the new test file
tool: Bash | ok | node --test on the new file: 4 pass, 33 fail; old claim-check file 75 pass
tool: Bash | ok | bash tests/check.sh: only the new check fails
verdict: red
findings: 5
p0: 0
artifact: tests/stakeholder-claim-check-hardening.test.mjs
escalated: yes
escalation_reason: harness showed no token or cost count
```

QA-R1 | P2 | tests/stakeholder-claim-check.test.mjs "R11-class a 3000-quote index" | reverses under STK-PS-R20 (over 2,000 quotes is refused) | tests/stakeholder-claim-check-hardening.test.mjs
QA-R2 | P2 | tests/stakeholder-claim-check.test.mjs SKT-13 hedge tests, SKT-15 --text | pin hedge-skipping; all single-clause so should stay green, re-run after the build and reverse any that fail | tests/stakeholder-claim-check-hardening.test.mjs
QA-R3 | P2 | plugins/stakeholder/README.md line 72 | says a hedged sentence is not a claim; reverses under STK-PS-R21 | tests/stakeholder-claim-check-hardening.test.mjs
QA-R4 | P2 | tests/stakeholder-claim-check-hardening.test.mjs | "140,000 built." test already passes on the current tool (kept as a regression guard) | none
QA-R5 | P2 | spec STK-PS-R20 | the 60,000-row register example is over the 5,000-row cap, so that case ends as a refusal, not a run | none
