# Handoff

## Done
- Shared studio agents and skills as a Claude Code plugin (`plugins/studio`), with `scripts/sync.sh` to copy them into product repos.
- License audit (2026-10-21): added `LICENSE` (MIT) and a License section in the README.
- `focus-coach` agent and `focus-check` skill (2026-10-21): the "you are procrastinating" check against the job-hunt tracker.

- ux-reviewer and ux-review upgrade (2026-10-22, draft PR): visual pass with Playwright screenshots at phone and laptop width, Nielsen + WCAG 2.2 AA sweep, a "showcase review" mode for recruiter-facing work (recruiter and hiring-manager personas, one story across page/demo/README, honest demo, credibility), P0/P1/P2 priorities with evidence, and an iterate-until-clean loop. Built from the Oct 22 recruiter-ready review of the portfolio.

- `night-prep` skill (2026-10-23, draft PR): the evening prep before each project's 2:15am night shift. Lists what Chase can unblock in under 15 minutes, foreseen blockers (allowed hosts, logins, red CI, unmerged dependencies, missing schedule), and tonight's goal with the default "harden existing features with qa-tdd and ux-reviewer". Saves the goal to project memory (`tonight`) at once so silence runs the default; `tonight: <goal>` overrides it any time. Modeled on Power Hour; sits between the 9:30pm evening brief and the 10:30pm cutoff.
- `digest` skill (2026-10-23, same PR): the orchestrator's morning digest on demand in any project. Studio-wide in Product Studio, this project's repos elsewhere. It shows the digest-carry list without clearing it and sends no push, so the scheduled 6:30am digest keeps working unchanged.

## In progress
- Nothing.

## Exact next step
- Merge the night-prep and digest PR, then re-run `scripts/sync.sh` in each product repo. Chase also saves the skill to his account from the Product Studio thread so `/night-prep` and `/digest` work in every project.
- Merge the ux-reviewer upgrade, then re-run `scripts/sync.sh` in each product repo (the recruiter-ready sprint paste tells each project to do it).
- Merge the focus-coach PR, then merge the open "Add shared studio agents" PRs in ccwatts, Role Radar and Energy Scanner.

## Decisions to review
- night-prep hands tonight's goal to the run through project memory (`tonight.md` plus an index line) instead of rewriting the scheduled run's prompt, because the run's GOAL line already says Chase's steer wins and memory loads into every session.
- focus-coach reads a tracker at a default project-files path; any project can point it elsewhere via CLAUDE.md or memory.
- MIT, like the other public studio repos, so others can reuse the agents.

## Blockers
- None.
