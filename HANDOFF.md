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

- Shared checks from Hearth's intake (2026-10-27): `install-rules.sh` now also installs `scripts/check-agents.sh` (CLAUDE.md agent table matches `.claude/agents/`), `scripts/check-logs.mjs` (no keys, URLs, emails or raw errors in `console.*` calls) and a starter `studio-checks.json` (log roots and extra banned words). Canonical copies in `templates/scripts/`; the log check has its own test (`tests/check_logs_test.sh`, 12 cases) and `tests/check.sh` grew to 45 checks. Generalized from Hearth: Hearth-only words (caption, kek) and roots moved to config; the generic check still passes Hearth's real code (109 files). `templates/CLAUDE-agents.md` gained `focus-coach` and `orchestrator` rows, because a fresh repo failed the roster check without them.

- `architect` agent (2026-10-27, Chase's go): one stack across products. Reviews any stack-crossing change (new dependency, vendor, paid service, schema change, CI or deploy workflow, a move up the pm-tools STACK.md ladder), checks reuse before build, keeps `docs/architecture/` honest against the pm-tools template, and runs a weekly drift sweep in studio projects. Engineer rule 4 now needs architect's OK on fit and staff-pm's on cost and scope. Listed in the README and `templates/CLAUDE-agents.md`; plugin 0.4.0. Paired pm-tools PR adds it to ONBOARDING.md and the STACK.md gate.

- Agents forced, not just suggested (2026-10-28, Chase: "qa-tdd isn't being used"): recent product PRs (ccwatts #42-#45, Role Radar #37-#40, Crew Clock #22, Energy Scanner #33) had no qa-tdd, and ccwatts, Role Radar and Energy Scanner never got the Studio agents section or architect. New `templates/agents-check.yml` (installed by `install-rules.sh`) fails a PR without an `Agents:` line, fails a code PR whose line doesn't name `qa-tdd` (or `qa-tdd skipped: why`), and runs `check-agents.sh`. `templates/CLAUDE-agents.md` now opens with Hearth's chief-of-staff rule (main session delegates, one lane at a time) and the review-rounds habit from Energy Scanner (finding IDs, a failing test per fix). `sync.sh` skips orchestrator and focus-coach unless named, so the template no longer lists them and the roster check passes in product repos (Crew Clock and Charlie would have failed). 54 checks.

- Own kit applied here (2026-10-28, PR "studio refresh: agents by default"): this repo didn't follow its own rules (no CLAUDE.md, SessionStart hook, handoff-check or agents-check). Now it has `CLAUDE.md` (hard rules, session rules, the Studio agents section with the orchestrator and focus-coach rows), `.claude/settings.json`, `handoff-check.yml` and `agents-check.yml` copied from `templates/`, and `.claude/agents/` as symlinks to `plugins/studio/agents/` (no second copy to drift). `tests/check.sh` (57 checks) fails if those copies drift from the templates, an agent lacks a link, or the roster check fails. `scripts/check-agents.sh` isn't installed here (the shared checks stay in `templates/scripts/`), so agents-check skips its roster step and `tests/check.sh` covers it instead.

## In progress
- Each product project runs the refresh paste in pm-tools `docs/ONBOARDING.md` (one PR per repo: sync, install-rules, new CLAUDE.md section).

## Exact next step
- Merge the architect PR (and its pm-tools pair), then each product project re-runs `scripts/sync.sh` and pastes the new `architect` row of `templates/CLAUDE-agents.md`, or `check-agents.sh` fails. The Sunday drift sweep goes into the Product Studio night shift prompt when that shift is turned back on.
- Merge the shared-checks PR, then each product project re-runs `scripts/install-rules.sh`, sets its roots in `studio-checks.json`, adds both checks to its test script and CI, and pastes the two new rows of `templates/CLAUDE-agents.md`. Hearth swaps its own copies for these and keeps `caption` and `kek` in its config.
- Merge the night-prep and digest PR, then re-run `scripts/sync.sh` in each product repo. Chase also saves the skill to his account from the Product Studio thread so `/night-prep` and `/digest` work in every project.
- After this merges, each product project re-runs `scripts/sync.sh` and pastes `templates/CLAUDE-agents.md` into its CLAUDE.md (pm-tools `docs/ONBOARDING.md` has the paste for existing projects).
- Merge the ux-reviewer upgrade, then re-run `scripts/sync.sh` in each product repo (the recruiter-ready sprint paste tells each project to do it).
- Merge the focus-coach PR, then merge the open "Add shared studio agents" PRs in ccwatts, Role Radar and Energy Scanner.

## Decisions to review
- architect is synced to product repos (unlike orchestrator and focus-coach) so each project can review its own stack changes; the cross-repo drift sweep only runs from Product Studio and sends INTAKE blocks, never edits.
- The shared checks live in `templates/scripts/`, not `scripts/`, because `scripts/` holds studio-agents' own tools and these get copied into product repos (same as `templates/handoff-check.yml`). The config file is `studio-checks.json` with one section per check; the coming shared privacy check is meant to add a `private` section there instead of a second file.
- night-prep hands tonight's goal to the run through project memory (`tonight.md` plus an index line) instead of rewriting the scheduled run's prompt, because the run's GOAL line already says Chase's steer wins and memory loads into every session.
- Planning codes for the new projects: CHL (Charlie) and CRW (Crew Clock). Rename in place if Chase prefers others.
- "Use proactively" wording in descriptions makes Claude Code delegate without being asked; if it over-triggers (for example ux-reviewer on internal-only changes), trim the description, not the table.
- focus-coach reads a tracker at a default project-files path; any project can point it elsewhere via CLAUDE.md or memory.
- MIT, like the other public studio repos, so others can reuse the agents.

## Blockers
- None.
