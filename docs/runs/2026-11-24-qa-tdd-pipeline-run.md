# qa-tdd run: pipeline-run red tests (PIPE-1..43)

Wrote tests/pipeline-run.test.mjs (44 node:test cases, 43 IDs; PIPE-9 runs for docs and config). All red: tools/pipeline-run.mjs is missing. Wired into tests/check.sh.

QA-R1 | P2 | docs/pipeline-plan.md | verify done accepts any valid qa block, including verdict red or flaky; plan silent on whether a non-green verdict may complete verify | none
QA-R2 | P1 | docs/pipeline-plan.md class C | "package manifest (package.json etc.)" and "auth, privacy or data segments" leave open pyproject.toml, requirements.txt, lockfiles and substring names; a missed manifest self-merges as class A | tests/pipeline-run.test.mjs (PIPE-34..36 cover package.json and segments only)
QA-R3 | P2 | docs/pipeline-plan.md | no ledger rule for rounds on the logic lane build stage, or for start on an already-started stage | none

```agentrun
date: 2026-11-24
agent: qa-tdd
product: studio-agents
tier: supervised
model: claude-sonnet-5-5
tokens: 0
cost_usd: 0
input: failing tests for tools/pipeline-run.mjs (PIPE-1..43)
tool: agent-guard | ok | kill qa-tdd, only-tests --base e26571f
tool: agent-memory | ok | searched pipeline-run, no prior finding
verdict: red
findings: 3
p0: 0
artifact: tests/pipeline-run.test.mjs
escalated: yes
escalation_reason: harness showed no token or cost count
```
