# Where to run the studio's agents on a schedule

**Recommendation: run them as scheduled Claude Code cloud sessions (claude.ai routines/triggers) on the owner's existing flat plan. Incremental cash cost: $0. Do not use GitHub Actions or any host that needs an API key.**

## Why
- The repo says the owner is on a flat monthly plan with no paid API route. Any runner that calls the Anthropic API directly (GitHub Actions with `ANTHROPIC_API_KEY`, a hosted VM, a serverless function) needs a metered key, which breaks that constraint. These are ruled out.
- Agent runs today happen inside the owner's own coding sessions, so the agents, CLAUDE.md files and `.claude/agents/` already work in that environment. A scheduled cloud session is the same thing started by a timer, so nothing needs porting.
- The project files already assume this shape: they refer to scheduled runs, trigger ids kept out of the repo, and a night shift. Those are the ingredients of scheduled cloud sessions.

## Options compared
| Option | Needs paid API? | Cash cost | Verdict |
|---|---|---|---|
| Scheduled cloud session (claude.ai trigger/routine) | No, draws on the plan | $0 extra | Recommended |
| Owner's machine, cron running `claude -p` signed in with the plan | No | $0 extra | Fallback; only runs while the machine is on and awake |
| GitHub Actions cron calling the API | Yes | Metered | Rejected, breaks the stated constraint |
| Hosted VM or serverless | Yes | Metered plus hosting | Rejected |

## Cost estimate
- **Cash: $0 beyond the current plan.** This is the figure I can stand behind.
- **Real cost is plan usage, not dollars.** Scheduled runs use the same usage allowance as the owner's interactive sessions, so heavy scheduling can leave less for daytime work. I have no measured per-run usage, so I am not giving a token or dollar figure; any number would be invented. Estimate it by running the first schedule for a week and reading the plan's usage meter.
- Starting point: one run per weekday per project for the cheapest useful job (the morning digest or HANDOFF check), a single agent lane at a time as the repos already require. Add the heavier night-shift job only if the meter shows headroom.

## Guardrails
- Scheduled runs must follow each repo's hard rules: no merging to a live branch, no deploys, no force-push. Runs should open PRs and update HANDOFF.md, nothing more.
- Keep trigger and environment ids out of the public repos (several CLAUDE.md files forbid them).
- Cap the schedule at a few jobs at first and stagger them overnight.

## What I could not verify
- Current plan limits and whether the plan includes a given number of scheduled runs; check the plan page and the environment docs before enabling more than one job.
- Actual per-run usage (see above).

## Next step
Create one weekday trigger for the digest job, let it run a week, then decide from the usage meter whether to add more.
