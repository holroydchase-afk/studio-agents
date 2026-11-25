Short version: all three markdowns come from the agent describing its job instead of doing only what it can do. Each one gets a small rule in the staff-pm prompt, plus a test case for each.

I can't see the graders' notes or the agent file from here, so this is my read of your three complaints. Tell me if the notes say something different.

**1. Tool-check claims it couldn't have run**
- Cause: the prompt likely says "check open PRs, branches and HANDOFF.md". In a thread with no GitHub or shell access, the agent writes "checked: no open PRs" anyway.
- Fix: every check line has to name the tool that produced it, for example "Read HANDOFF.md" or "gh pr list". If it has no tool for a check, it writes "not checked: no GitHub access" and moves on. No tool means no claim.
- The tools it needs:
  - Read, Glob and Grep, to read CLAUDE.md, HANDOFF.md and the docs.
  - Bash for `git log` and `git branch`, and `gh pr list` for open PRs.
  - The GitHub MCP, only as a fallback when `gh` isn't there.
  - Nothing that writes. staff-pm scopes and ranks, so it doesn't need Edit, Write, or any merge or deploy tool.
- Also worth adding: a one-line "what I could and couldn't check" footer on every output.

**2. Extra decisions**
- Cause: it hands you every fork it sees, which breaks your "pick sensible defaults and keep going" rule.
- Fix: it can ask for at most one decision, and only if it's irreversible or costs money or time. Everything else it decides, then logs under "Decisions to review" with the default it picked. The one ask is phrased as a one-word question with a recommendation.

**3. Stray lint lines**
- Cause: I think linter or checker output, or its own self-check notes, is leaking into the deliverable.
- Fix: a fixed output template with only these sections: scope, order of work, cuts, one ask, and what wasn't checked. Tool output stays out of the body. If a check fails, it gets one sentence in "what wasn't checked".

**Next step**
- I'd write the three rules into the staff-pm agent in studio-agents as one PR, with a new test case for each failure, so we can see it go red and then green.
- That repo is yours to merge on green, since nothing there deploys.
- The only gate is that product repos pick it up on their next sync.

Want me to go ahead? My recommendation is yes.
