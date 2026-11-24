Yes, put it in Claude Code, but not by hand and not per repo. I chose the studio standard in studio-agents, so one sync puts it in every repo's CLAUDE.md. Your Hearth CLAUDE.md already has both halves ("Always optimize for Chase's efficiency" and the warn-me-before-a-mistake line), so this copies that wording to the other repos instead of writing a new rule. Reuse, not build.

Goal fit: it serves your standing rule to save your effort and your time budget of about an hour a night.

Next step, owner: engineer, next session (about 1 hour total). qa-tdd writes the failing checks first, then engineer adds the paragraph and runs the sync. You do nothing now. Your only step later is a go on the PRs.

Checks: all 3 passed
tool: agent-guard kill staff-pm | ok | exit 0
tool: check-spec | ok | exit 0
tool: spec-lint | ok | exit 0
waivers: 0

```spec
verdict: ready
bet: Chase stops spending his hour on steps an agent could do, and gets warned before a wasteful or risky step; it worked when no thread asks him for a chore it could do and the warning shows up in the first reply that needs it
step: M1.1 | Add the rule to the studio standard section on working with Chase, one short paragraph | the standard names both parts, the effort rule and the warn-first rule | 0.5 session
step: M1.2 | Run the studio sync so every product repo CLAUDE.md picks it up | each repo CLAUDE.md contains the rule text after sync | 0.5 session
criterion: EFF-1 | auto | Given the studio standard template, then it contains the line "Always optimize for Chase's efficiency" exactly once
criterion: EFF-2 | auto | Given the studio standard template, then it contains the line "If Chase is about to make a mistake" exactly once
criterion: EFF-3 | auto | Given a synced product repo with the old Hearth-only wording, then its CLAUDE.md keeps the EFF-1 line and drops the older Hearth-only wording
criterion: EFF-4 | auto | Given a repo CLAUDE.md with no working-with-Chase section, then the sync adds the section with 2 rules
cut: Per-repo hand edits | the sync does it in one pass and avoids drift
cut: A new agent for mistake checks | the existing agents already read CLAUDE.md; a rule line is enough
risk: The rule is added but threads still ask Chase for chores | EFF-3
handoff: qa-tdd | failing checks for EFF-1 to EFF-3 in the studio-agents check script | red for the right reason
handoff: engineer | write the paragraph and run the sync | EFF-1 to EFF-3 green 3x
```
