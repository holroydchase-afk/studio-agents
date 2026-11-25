```agentrun
date: 2026-11-25
agent: qa-tdd
product: studio-agents
tier: supervised
model: claude-sonnet-5-5
tokens: 0
cost_usd: 0
input: post-build QA of plugins/studio/skills/pipeline/SKILL.md against tools/pipeline-run.mjs (RUNBOOK-1..5), added RUNBOOK-6..10
tool: agent-memory | ok | searched pipeline runbook skill, found only earlier pipeline-run runs
tool: agent-guard | ok | kill qa-tdd
tool: Bash | ok | ran every documented pipeline-run command line in a temp dir; node --test 3x, bash tests/check.sh 3x
tool: agent-guard | ok | only-tests --base bd07c27
verdict: red
findings: 4
p0: 0
artifact: tests/runbook-skill.test.mjs
escalated: yes
escalation_reason: harness showed no token or cost count
```

Every documented command line (init --spec, start --model, round, done --tokens --budget, class, class --feedback, stop plan-limit, resume, status --json, kill switch) works as written. Findings:

QA-R1 | P1 | SKILL.md Merge class | class B says "only when feedback-merge-check passes" but never gives its command line (--repo, files) | tests/runbook-skill.test.mjs RUNBOOK-6
QA-R2 | P1 | tools/pipeline-run.mjs class --feedback | prints B for index.html, demo/a.js, secret/x.md, which feedback-merge-check refuses; a thread following the skill could self-merge a live-site path | tests/runbook-skill.test.mjs RUNBOOK-7
QA-R3 | P2 | SKILL.md Stop rules | says the tool enforces the kill switch, but only start checks it; round and done ignore .claude/agents.off | tests/runbook-skill.test.mjs RUNBOOK-8
QA-R4 | P2 | tests/runbook-skill.test.mjs RUNBOOK-3 | test bug: lane ui passes on the substring in "build", so it cannot fail; RUNBOOK-9 adds a whole-word check | tests/runbook-skill.test.mjs RUNBOOK-9
