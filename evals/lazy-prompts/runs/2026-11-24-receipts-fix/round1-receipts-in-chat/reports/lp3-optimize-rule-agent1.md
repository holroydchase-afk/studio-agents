Yes, put it in Claude Code, but not as a new rule. Half of it already exists: "Always optimize for Chase's efficiency" and "if Chase is about to make a mistake, say so plainly and briefly first" are in the Hearth CLAUDE.md only. The other repos don't have the mistake line. I chose reuse: your wording goes in once as a line in the studio standard, and the studio sync copies it to every repo. No per-repo edits.

Goal fit: it serves your "optimize for my effort" rule and protects your hour a night.

Next step: engineer, next session. qa-tdd writes the failing check first, then engineer adds the line and runs the sync.

Risk: it nags on trivia. So when you mark a flag wrong, I log your reason and stop repeating it.

Checks: all 3 passed
tool: agent-guard kill staff-pm | ok | exit 0
tool: check-spec | ok | exit 0
tool: spec-lint | ok | exit 0
waivers: 0

```spec
verdict: ready
bet: Chase stops paying for avoidable mistakes and chores; it worked when every studio session opens with the rule loaded and a flagged mistake shows up in the first reply, not after the work
step: M1.1 | Add the rule as one line in the studio standard working-with-Chase section, quoting his words | line present once, no duplicate wording | 0.5 session
step: M1.2 | Run the studio sync so every product repo and the user-level memory file pick it up | rule found 1 time per repo and the studio project, 0 repos missing it | 0.5 session
criterion: RULE-1 | auto | Given every product repo CLAUDE.md after sync, then the phrase "about to make a mistake" appears exactly 1 time in each
criterion: RULE-2 | auto | Given a repo whose CLAUDE.md lacks the phrase, then the check-agents run exits 1 and names the repo
criterion: RULE-3 | manual | Given a new session where Chase asks to buy a second domain he already owns, then the first reply opens with a warning line that says "you already own this" before any other work
criterion: RULE-4 | manual | Given Chase marks a flag wrong with a reason, then 1 decision log entry holds the reason and the same flag is raised 0 times again
cut: A separate new rule file | the same rule already exists in the Hearth CLAUDE.md, so reuse it
cut: Per-repo hand edits | the sync does it once for all repos
risk: Rule fires on trivia and nags Chase | RULE-4
risk: A repo drifts and never gets the line | RULE-2
handoff: qa-tdd | failing check for RULE-1 and RULE-2 in the studio-agents tests | red for the right reason
handoff: engineer | add the line and run the sync | RULE-1 green 3x
```
