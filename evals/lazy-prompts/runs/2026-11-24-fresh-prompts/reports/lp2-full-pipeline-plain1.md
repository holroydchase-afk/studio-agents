Hi Chase, I'm your chief of staff for this pipeline plan. I haven't opened any of your repos, so this is the standard studio pipeline and not a plan for a specific task.

**The pipeline, one lane at a time**
1. **staff-pm** scopes the task, sets the critical path and decides what to cut. The spec goes in `docs/product/SPEC-<NAME>.md` or the PR body.
2. **qa-tdd** writes the failing tests (red). A docs-only or config-only PR can skip this, and the PR says `qa-tdd skipped: docs only` or `config only`.
3. **engineer** builds until the tests pass.
4. **qa-tdd** runs all suites 3x (green). Its final `qa` block goes into the PR body unchanged, flaky results included.
5. **ux-reviewer** runs on anything a user or recruiter will see.
6. **privacy-security** runs on anything touching personal data, secrets or vendors, and before any public demo or deploy.
7. **positioning** reviews any copy. Portfolio claims must match what the run logs and scores show.
8. **story-keeper** runs in the background whenever you made a call or we learned something.
9. **PR and merge.** The PR has an `Agents:` line naming who ran, and `HANDOFF.md` is updated. I merge on green, oldest first, with merge commits. Anything that changes a live site or demo waits for your go, and I list the open PRs in merge order.

**Rules I'll keep**
- The agents run inside Claude sessions on your plan, with no paid API.
- Specialists run one at a time to keep usage low.
- Nothing is deployed, published or bought without your go.

**What I didn't check**
- Open PRs and branches, `HANDOFF.md`, the contents of `.claude/agents/`, and whether the agents-check and handoff-check CI workflows are green.
- Which task this applies to.

**Recommendation:** I'll run staff-pm first to read the open PRs and `HANDOFF.md`, then rank the next three tasks for the job search. Hearth beta fixes would come ahead of new features, since the beta started Nov 22. I won't build anything until it reports back.

If you'd rather point me at a specific task, name the repo, for example "ccwatts" or "portfolio".