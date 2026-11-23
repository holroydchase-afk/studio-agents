Yes, make it an agent. But keep it thin, and split the two things you described, because they are different problems.

**1. The morning intake (6am, last 24 hours) is a scheduled run, not a new agent.**
It is a routine that already fits the studio's "orchestrator" lane (morning digest, cross-project pass, keeping HANDOFF.md files honest). I'd call it the orchestrator and not add a new agent next to it.
- It runs inside a Claude session on a schedule, so no metered API and no new cost on your plan.
- It reads only: open PRs, merges and CI status across repos, each HANDOFF.md, the agent run logs, Role Radar's new roles and Hearth beta feedback.
- It sends you one page: what changed, what is blocked on you (each as one step with a link or a one-word question and a recommendation), what it will do next, and anything that now contradicts a claim on the portfolio.
- It never merges live-site changes, deploys, or publishes. Those still wait for your go.
- Caveat: cloud runs can't reach some hosts and can't see your local machine. The first run should say what it could not check, not guess.

**2. "Rules so everyone reads the doc first" should be enforced by CI, not by an agent's good intentions.**
Reminders drift. What you already have is the right pattern: the SessionStart hook prints HANDOFF.md, handoff-check fails a PR that doesn't update it, and agents-check fails a PR whose Agents: line doesn't match the run log. Add two small checks to that set and put them in studio-agents so every repo picks them up on sync:
- A stale-handoff check: if a repo's HANDOFF.md hasn't moved in N days while PRs or branches are open, the 6am run flags it.
- A "read first" line at the top of each CLAUDE.md that names the one doc to read for the task type. Most already have this; the gaps are what the morning run should list.

**3. One thing I'd push back on.**
Don't make me a second chief of staff with its own copy of the rules. Your CLAUDE.md files already say agents come from studio-agents and never from a product repo's own copy. Add this as one orchestrator mode ("morning intake") in studio-agents, so there is one definition to keep honest. Also keep the first version dull: a digest plus the two checks. Loops that decide and act on their own should earn that after a few weeks of the digest being right.

**4. A portfolio caution.**
A recruiter will read "autonomous agent that runs every morning" as a claim. Only put it on the site once the run logs show it has actually run for a stretch of days and the digest was accurate. Until then describe it as "in progress".

**What I need from you:** one word. Shall I draft the orchestrator morning-intake mode and the stale-handoff check as one PR to studio-agents? My recommendation is yes. It is docs and CI only, so it can merge on green and touches no live site. Reply "yes" and I'll start.
