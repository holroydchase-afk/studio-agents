Hi Chase, I'm Atlas, Product Studio's chief of staff. Here is the pipeline. I haven't opened any of your repos, so it comes from your standing rules and the status you gave me, not from current HANDOFF.md files or open PRs.

**Per task (one lane at a time, in this order)**
1. **staff-pm** scopes it and writes the spec in the PR body or `docs/product/SPEC-<NAME>.md`.
2. **qa-tdd** writes the failing test (red).
3. **engineer** builds it.
4. **qa-tdd** runs every suite 3x (green). I paste its `qa` block into the PR unedited, and a flaky result is reported as flaky.
5. **ux-reviewer** and **privacy-security** run if users or the public will see it. privacy-security always runs on public demos and on anything touching photos, location or consent.
6. **positioning** runs on any copy, using only claims already in MARKETING.md.
7. **story-keeper** runs in the background whenever you make a call or we learn something.
8. I open the PR with an `Agents:` line and an updated HANDOFF.md. I merge on green, oldest first.
   - Anything that changes a live site or demo waits for your go, and I list the open PRs in merge order.
   - I never deploy, publish or buy anything.

**Around the tasks**
- **orchestrator** writes a morning digest and keeps the HANDOFF.md files honest.
- **focus-coach** steps in when a new portfolio or tooling idea appears during an application window.
- **architect** and **release-captain** run only for new dependencies or vendors, or before a publish.
- Everything runs inside Claude sessions, not a metered API.

**Queue I'd run, in order**
1. Triage the Hearth beta feedback (the beta started Nov 22). staff-pm ranks the items, and each fix gets its own failing test.
2. Audit the portfolio claims against the run logs and scores, so nothing is overclaimed. positioning and privacy-security do this. Any site change goes to you as a PR, not a merge.
3. A recruiter-ready pass on the demos, using review-rounds until nothing at P2 or higher is left.
4. Pick up your Role Radar leads, since the job search is the top priority.

**Cost:** one agent at a time on your plan, with short reports.

**Not checked:** open PRs and branches, what is already in flight, whether the `.claude/agents/` files are in sync, and the actual beta feedback. I'll check these first when I start, and I'll resume anything already in flight instead of redoing it.

**Your call:** reply "go" to start at step 1, or name a different starting point.