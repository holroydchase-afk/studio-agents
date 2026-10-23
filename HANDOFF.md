# Handoff

## Done
- Shared studio agents and skills as a Claude Code plugin (`plugins/studio`), with `scripts/sync.sh` to copy them into product repos.
- License audit (2026-10-21): added `LICENSE` (MIT) and a License section in the README.
- `focus-coach` agent and `focus-check` skill (2026-10-21): the "you are procrastinating" check against the job-hunt tracker.

- ux-reviewer and ux-review upgrade (2026-10-22, draft PR): visual pass with Playwright screenshots at phone and laptop width, Nielsen + WCAG 2.2 AA sweep, a "showcase review" mode for recruiter-facing work (recruiter and hiring-manager personas, one story across page/demo/README, honest demo, credibility), P0/P1/P2 priorities with evidence, and an iterate-until-clean loop. Built from the Oct 22 recruiter-ready review of the portfolio.

- `night-prep` skill (2026-10-23, draft PR): the evening prep before each project's 2:15am night shift. Lists what Chase can unblock in under 15 minutes, foreseen blockers (allowed hosts, logins, red CI, unmerged dependencies, missing schedule), and tonight's goal with the default "harden existing features with qa-tdd and ux-reviewer". Saves the goal to project memory (`tonight`) at once so silence runs the default; `tonight: <goal>` overrides it any time. Modeled on Power Hour; sits between the 9:30pm evening brief and the 10:30pm cutoff.
- `digest` skill (2026-10-23, same PR): the orchestrator's morning digest on demand in any project. Studio-wide in Product Studio, this project's repos elsewhere. It shows the digest-carry list without clearing it and sends no push, so the scheduled 6:30am digest keeps working unchanged.
- Agents used by default (2026-10-23): every studio agent's description says when to use it proactively; README has a "When to use which agent" table; `templates/CLAUDE-agents.md` is the section each product pastes into its CLAUDE.md, including an `Agents:` line in every PR. Planning codes CHL (Charlie) and CRW (Crew Clock) added. Linked from pm-tools `docs/ONBOARDING.md`, the new-project kit.
- `onboard` skill (2026-10-23): runs pm-tools `docs/ONBOARDING.md` in any project. Checks the repo against the kit, sets up what's missing in one PR (`M0.1: studio setup`, or `studio refresh`), schedules shifts, starts the Atlas Story, writes the INTAKE for Product Studio, and hands Chase the project-instructions paste. Safe to re-run. First users: Charlie and Crew Clock.

- Checks (night shift, 2026-10-23): `tests/check.sh`, run by `.github/workflows/checks.yml`, has 36 checks. They cover agent and skill frontmatter (each name matches its file), the README listing every agent, plugin and marketplace JSON agreeing, `sync.sh` and `install-rules.sh` against a temp repo (including that they never overwrite), the SessionStart hook with and without HANDOFF.md, the handoff-check step run on a throwaway git history, and no claude.ai links or trigger ids. It caught that `sync.sh` with a misspelled agent name failed with a bare `cp` error. It now names the unknown agent and copies nothing.

## In progress
- Nothing.

## Exact next step
- Merge the night-prep and digest PR, then re-run `scripts/sync.sh` in each product repo. Chase also saves the skill to his account from the Product Studio thread so `/night-prep` and `/digest` work in every project.
- After this merges, each product project re-runs `scripts/sync.sh` and pastes `templates/CLAUDE-agents.md` into its CLAUDE.md (pm-tools `docs/ONBOARDING.md` has the paste for existing projects).
- Merge the ux-reviewer upgrade, then re-run `scripts/sync.sh` in each product repo (the recruiter-ready sprint paste tells each project to do it).
- Merge the focus-coach PR, then merge the open "Add shared studio agents" PRs in ccwatts, Role Radar and Energy Scanner.

## Decisions to review
- night-prep hands tonight's goal to the run through project memory (`tonight.md` plus an index line) instead of rewriting the scheduled run's prompt, because the run's GOAL line already says Chase's steer wins and memory loads into every session.
- Planning codes for the new projects: CHL (Charlie) and CRW (Crew Clock). Rename in place if Chase prefers others.
- "Use proactively" wording in descriptions makes Claude Code delegate without being asked; if it over-triggers (for example ux-reviewer on internal-only changes), trim the description, not the table.
- focus-coach reads a tracker at a default project-files path; any project can point it elsewhere via CLAUDE.md or memory.
- MIT, like the other public studio repos, so others can reuse the agents.

## Blockers
- None.
