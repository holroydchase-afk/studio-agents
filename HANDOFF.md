# Handoff

## Done
- Shared studio agents and skills as a Claude Code plugin (`plugins/studio`), with `scripts/sync.sh` to copy them into product repos.
- License audit (2026-10-21): added `LICENSE` (MIT) and a License section in the README.
- `focus-coach` agent and `focus-check` skill (2026-10-21): the "you are procrastinating" check against the job-hunt tracker.

- ux-reviewer and ux-review upgrade (2026-10-22, draft PR): visual pass with Playwright screenshots at phone and laptop width, Nielsen + WCAG 2.2 AA sweep, a "showcase review" mode for recruiter-facing work (recruiter and hiring-manager personas, one story across page/demo/README, honest demo, credibility), P0/P1/P2 priorities with evidence, and an iterate-until-clean loop. Built from the Oct 22 recruiter-ready review of the portfolio.

## In progress
- Nothing.

## Exact next step
- Merge the ux-reviewer upgrade, then re-run `scripts/sync.sh` in each product repo (the recruiter-ready sprint paste tells each project to do it).
- Merge the focus-coach PR, then merge the open "Add shared studio agents" PRs in ccwatts, Role Radar and Energy Scanner.

## Decisions to review
- focus-coach reads a tracker at a default project-files path; any project can point it elsewhere via CLAUDE.md or memory.
- MIT, like the other public studio repos, so others can reuse the agents.

## Blockers
- None.
