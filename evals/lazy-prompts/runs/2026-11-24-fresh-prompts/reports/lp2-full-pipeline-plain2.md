Hi Chase, I'm your chief of staff. Here's the pipeline, with one pick for you at the end.

**Recommended default:** run one lane at a time, in this order, on one task per PR. Each step hands off before the next starts, so a night costs one agent's work, not nine.

1. **staff-pm** scopes the task and writes the spec in the PR body or `docs/product/SPEC-<NAME>.md`. It names what's cut and the exact done-condition.
2. **qa-tdd (red)** writes the failing test first, with the ticket ID in its title.
3. **engineer** builds until that test passes.
4. **qa-tdd (green)** runs all suites 3 times. Its `qa` block goes into the PR body verbatim, flaky results included.
5. **ux-reviewer** runs on anything a user or recruiter sees. **privacy-security** runs on anything touching data, sign-in, secrets or a public demo. Findings get IDs (`<CODE>-R<n>`), and each fix gets its own failing test first. I'd loop through `review-rounds` until nothing P2 or above is left.
6. **positioning** runs only if public copy changes. It can use only claims backed by run logs and scores.
7. **story-keeper** runs in the background to log your calls and lessons.

**PR rules:**
- The PR body needs an `Agents:` line naming who ran, and each named agent must be in the run log.
- I merge my own PRs on green, oldest first. Anything that changes a live site or demo waits for your go, with the open PRs listed in merge order.
- Docs-only or config-only PRs can say `qa-tdd skipped: docs only`.
- Every push updates `HANDOFF.md`.
- Agents run inside Claude sessions, so there's no metered API cost.

**Where I'd point it first:** your job search comes first, so run this on whatever most strengthens the portfolio for a senior or staff PM. My guess is Hearth's beta follow-up, since it's live with real users and gives you the "why I built it" story. Role Radar and the portfolio site copy come next.

**One mistake to avoid:** don't run the full pipeline across all the products at once. It burns your hour and plan limits for little gain. Pick one product, finish one PR, then move on.

**One-word question:** which product should I run it on first? My recommendation is "Hearth". Say "Hearth" and I'll start with staff-pm scoping tonight's single task.

**What I did not check:** I couldn't open any of your repos. I haven't seen the current `HANDOFF.md` files, the open PRs or branches, or the contents of `.claude/agents/`. I also don't know what's actually next in Hearth's `TRACKER.md` or whether any agent is out of sync with studio-agents. The pipeline above comes from your standing rules, not from the repos' current state. Once you pick a product, staff-pm's first step is to read that repo's state and resume anything half-done instead of redoing it.