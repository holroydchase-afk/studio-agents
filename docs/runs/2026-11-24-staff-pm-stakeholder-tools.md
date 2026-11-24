# staff-pm run: stakeholder tools spec

```agentrun
date: 2026-11-24
agent: staff-pm
product: studio-agents
tier: advisory
model: claude-sonnet-5-5
tokens: 0
cost_usd: 0
input: spec repo-check, claim-check and stakeholder-intake for the stakeholder plugin
tool: agent-guard | ok | kill staff-pm
tool: agent-memory | ok | stakeholder intake claim repo-check quote index: no direct match
tool: check-spec | ok | docs/product/SPEC-STAKEHOLDER-TOOLS.md
tool: spec-lint | ok | docs/product/SPEC-STAKEHOLDER-TOOLS.md, 3 waived
verdict: ready
findings: 3
p0: 0
artifact: docs/product/SPEC-STAKEHOLDER-TOOLS.md
escalated: yes
escalation_reason: harness showed no token or cost count
```

PM-R1 | P1 | docs/repo-standards.md | checklist bullets have no ids, so a sibling edit could shift which check judges which rule | derive S<section>.<n> ids with a per-line hash pin; changed lines go to unmapped (SKT-2)
PM-R2 | P1 | portfolio claims register | format not in this repo or any local clone | claim-check refuses unknown shapes (SKT-11), first real read is a manual gate (SKT-17)
PM-R3 | P2 | plugin install | installed plugin has no docs/ folder | repo-check requires --standards outside this repo, no bundled copy
