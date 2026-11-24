# qa-tdd run: repo-check hardening failing tests (STK-PS-R10, R11, R12, R15, R16)

Pre-build run. 27 tests in tests/stakeholder-repo-check-hardening.test.mjs, registered in tests/check.sh. Red: 25 fail, 2 pass (the root-skipped unreadable-file test and the --allow-unscanned usage guard). Rest of tests/check.sh stays green (941 passed, 1 failed, the new suite).

QA-R1 | P2 | tests/stakeholder-repo-check.test.mjs SKT-4 "secrets in a skipped file do not stop the run" | pinned the old fail-open; STK-PS-R10 reverses it | tests/stakeholder-repo-check-hardening.test.mjs
QA-R2 | P2 | SKT-8 "symlink, binary, unreadable workflow, 1 MB+1 file" uses ok() | binary and oversize files now refuse unless --allow-unscanned | tests/stakeholder-repo-check-hardening.test.mjs
QA-R3 | P2 | SKT-8 ".git and node_modules are not read" | top-level node_modules is now scanned; only a top-level .git is skipped | tests/stakeholder-repo-check-hardening.test.mjs
QA-R4 | P2 | SKT-7 root clutter test, 1 MB+1 file | oversize file now refuses the run, so the S3.2 finding cannot be reached without --allow-unscanned | tests/stakeholder-repo-check-hardening.test.mjs
QA-R5 | P2 | R10 spec gap | cap numbers for depth, directories and symlinks were not given; tests pin depth 200, directories 5000, symlinks 5000, skipped cap 100 with skipped_omitted | tests/stakeholder-repo-check-hardening.test.mjs

```agentrun
date: 2026-11-24
agent: qa-tdd
product: studio-agents
tier: supervised
model: claude-sonnet-5-5
tokens: 0
cost_usd: 0
input: failing tests for repo-check hardening (STK-PS-R10, R11, R12, R15, R16)
tool: agent-memory | ok | searched repo-check hardening
tool: agent-guard | ok | kill qa-tdd, not tripped
tool: agent-guard | failed | only-tests tripped on files that were already uncommitted before this run (HANDOFF.md, guard.mjs, repo-check.mjs and others); this run added only the test file, the run log and one tests/check.sh line
verdict: red
findings: 5
p0: 0
artifact: tests/stakeholder-repo-check-hardening.test.mjs
escalated: yes
escalation_reason: harness showed no token or cost count
```
