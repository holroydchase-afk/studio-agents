Yes to the job, no to a new agent. Build it as a scheduled run of what already exists, not a new "me".

**Goal fit:** serves your top priority (the job) by keeping the portfolio honest and your hour a night on the one step that needs you. It also covers the rule that agents read the docs before they proceed.

**Buy, reuse, build or skip:** reuse. The studio `orchestrator` agent already owns "morning digest, cross-project pass, keeping HANDOFF.md files honest". The `digest` skill and the `morning` skill exist. A second orchestrator would be a duplicate. I stay what I am, the staff-pm that scopes and hands off per project. I'm the planner, not the cron job. Rejected: a new always-on "chief" agent. It costs a file to maintain, drifts from studio-agents, and adds a lane with no new capability.

**What to build (two small pieces):**
1. **6am intake.** A scheduled trigger runs `orchestrator` inside a Claude session. That fits your plan, with no metered API. It reads the last 24 hours across repos: merged and open PRs, HANDOFF.md changes, run logs, Role Radar's scan. It posts one short digest: what shipped, what is blocked on you (one step each), what runs tonight. It reports "no activity" instead of inventing any. It never merges, deploys or publishes. Anything live waits for your go.
2. **Read-the-doc rules, enforced instead of asked.** Most of this already exists: the SessionStart hook prints HANDOFF.md, and `handoff-check` and `agents-check` run in CI. The gap is staleness. Add one check to the 6am run: any repo with commits in 24 hours but no HANDOFF.md change gets flagged in the digest. Tooling has to catch it. Trusting agents to remember has already failed here.

**Risk:** the digest claims more than the logs show. Every line cites a PR, a log file or a commit, and anything uncited is dropped. This matches your rule on overclaiming.

**Not doing:** a new agent file, any API route, auto-merging from the 6am run, and a dashboard. A digest in your inbox or chat is enough to prove the bet.

**One thing for you:** "6am weekdays only, or 7 days?" I recommend weekdays. Role Radar already scans on weekdays, and weekends are your family time. If you say nothing I'll go with weekdays.

**Next step:** orchestrator writes the digest prompt and the stale-HANDOFF check, tested on the last 24 hours of real repo activity as a dry run, with nothing posted. Target is this week's first night session, and I'll report what it flagged. It needs one go from you to schedule it live.

Rollback: delete the scheduled trigger; nothing else changes, because the run only reads and posts.
lint-ok: SL-7 no README, landing or portfolio claim changes; this is internal tooling only.

```spec
verdict: needs-decision
bet: Chase reads a 6am digest cut from the last 24 hours of repo activity and acts on its blocked-on-you list; it worked when no repo goes a day with commits and a stale HANDOFF.md without being flagged
step: M1.1 | Orchestrator digest prompt: last 24h of PRs, HANDOFF changes and run logs, every line cited | dry run on real activity posts nothing and every line cites a source | 1 session
step: M1.2 | Stale-HANDOFF check: repos with commits but no HANDOFF.md change are flagged | dry run flags a seeded stale repo | 0.5 session
step: M1.3 | Schedule the 6am trigger after Chase's go | first live digest arrives and review shows no uncited claim | 0.5 session
criterion: ORCH-1 | auto | Given a repo with a commit at 2026-11-22 20:00 and no HANDOFF.md change in the same 24h window, then the digest lists that repo as stale
criterion: ORCH-2 | auto | Given a window with zero commits and zero PRs across all repos, then the digest says "no activity" and lists 0 shipped items
criterion: ORCH-3 | auto | Given a digest line with no PR, commit or log citation, then the check rejects the digest with 1 uncited line reported
criterion: ORCH-4 | manual | Run the digest once on a pinned clock of 2026-11-23 06:00 -> no merge, deploy or publish action occurs and the digest is posted only after Chase's go
cut: New orchestration agent | orchestrator already covers the digest and HANDOFF honesty lane
cut: Metered API route | Chase's plan has no API budget; runs stay inside Claude sessions
cut: Auto-merge from the scheduled run | live changes wait for Chase's go
risk: Digest overclaims beyond what logs show | ORCH-3
risk: One repo failing to read takes the whole digest down | ORCH-2
decision: Weekdays only or 7 days for the 6am run? | Weekdays only
handoff: qa-tdd | failing tests for ORCH-1 to ORCH-3 | red for the right reason
handoff: orchestrator | write the digest prompt and the stale-HANDOFF check (M1.1, M1.2) | ORCH-1 to ORCH-3 green 3x
```
