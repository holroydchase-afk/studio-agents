# qa-tdd run: pipeline-run post-build tests (PIPE-44..72)

Added 29 cases. Against the tool as first built, 5 failed (BUG-1..5, one commit each, tagged `[qa:red BUG-n]`). The tool file changed under me at 04:30 (not by qa-tdd); after that all 73 pass 3 of 3 runs.

QA-R4 | P1 | tools/pipeline-run.mjs class | "./.github/..." (leading ./) classified A, so a workflow edit could self-merge | tests/pipeline-run.test.mjs PIPE-50 (BUG-1)
QA-R5 | P2 | tools/pipeline-run.mjs class | lower-case claude.md classified A | tests/pipeline-run.test.mjs PIPE-51 (BUG-2)
QA-R6 | P2 | tools/pipeline-run.mjs loadLedger | ledger with version != 1 was trusted | tests/pipeline-run.test.mjs PIPE-62 (BUG-3)
QA-R7 | P2 | tools/pipeline-run.mjs | hand-edited ledger (stage missing, bad state) crashed with a stack trace | tests/pipeline-run.test.mjs PIPE-63 (BUG-4)
QA-R8 | P2 | tools/pipeline-run.mjs done | --block pointing at a directory crashed with a stack trace | tests/pipeline-run.test.mjs PIPE-72 (BUG-5)

```agentrun
date: 2026-11-24
agent: qa-tdd
product: studio-agents
tier: supervised
model: claude-sonnet-5-5
tokens: 0
cost_usd: 0
input: post-build tests for tools/pipeline-run.mjs (PIPE-44..72)
tool: agent-guard | ok | kill qa-tdd, only-tests --base 84e2325
tool: agent-memory | ok | searched pipeline-run, found QA-R1..R3 from the pre-build run
verdict: green
findings: 5
p0: 0
artifact: tests/pipeline-run.test.mjs
escalated: yes
escalation_reason: harness showed no token or cost count
```
