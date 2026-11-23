```agentrun
date: 2026-11-23
agent: qa-tdd
product: studio-agents
tier: supervised
model: claude-sonnet-5-5
tokens: 0
cost_usd: 0
input: review of a6ec3b1 CLEAN-1..5 (library, cite check, eval, agent wording)
tool: agent-memory | ok | checked clean CLEAN open
tool: agent-guard | ok | kill
tool: agent-guard | ok | only-tests --base a6ec3b1
tool: Bash | ok | tests/check.sh 3x green on HEAD (931 passed each)
verdict: red
findings: 5
p0: 0
artifact: tests/ux-refs-clean.test.mjs
escalated: yes
escalation_reason: harness showed no token or cost count
```

QA-R1 | P2 | eval checked-line.md | regex needs CLEAN-1..5 in order on one line | tests/ux-refs-clean.test.mjs
QA-R2 | P2 | eval checked-line.md | CLEAN-1 matches CLEAN-10 | tests/ux-refs-clean.test.mjs
QA-R3 | P1 | tools/ux-refs.mjs cite | no --topics means no clean enforcement | tests/ux-refs-clean.test.mjs
QA-R4 | P1 | tools/ux-refs.mjs accounted | "CLEAN-n open" satisfies a fetched hard rule | tests/ux-refs-clean.test.mjs
QA-R5 | P2 | HANDOFF.md, SPEC-UX-REFERENCES.md, NOT-LOADED note | stale blocked/pending wording | tests/ux-refs-clean.test.mjs
