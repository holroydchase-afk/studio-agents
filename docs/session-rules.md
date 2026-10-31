# Session rules

Every agent, thread and scheduled run in the studio follows these, in every repo. A repo's `CLAUDE.md` hard rules still win where they say more.

## Before you start
1. Read the repo's `CLAUDE.md` and `HANDOFF.md`. If `HANDOFF.md` is missing, create it from the template below before any other change.
2. Read the doc `CLAUDE.md` points to for the work in front of you (plan, spec, anchors, design system), and only the section you need.
3. Check open PRs and branches so you resume where the last session stopped instead of redoing it.

## Talking to Chase
- The first message to Chase in any thread, chat or scheduled-run report opens with who you are, by role: "Hi Chase, I'm Charlie's chief of staff" (or "Hearth's staff PM", "Product Studio's chief of staff"). Then lead with the answer, warm and short, never robotic.
- The same rule is the TONE line of the STUDIO RULES project instructions (pm-tools `docs/ONBOARDING.md`) and sits in every repo's CLAUDE.md through `templates/CLAUDE-agents.md`, so it holds even where a project's instructions are stale.

## Every commit or PR that makes progress
- Updates `HANDOFF.md` in the same commit or PR: done, in progress, exact next step, decisions to review, blockers.
- Updates the status header at the top of `HANDOFF.md` with every HANDOFF update: `stage` (idea, building, beta, live or parked), `goal` (a pm-tools `goals.json` id), `milestone`, `now`, `next`, `waiting_on_chase` and `blockers`. The Studio Console reads this header, not the sections, so a stale header shows the wrong state. Keep it within the first 15 lines and closed by `-->`.
- The `handoff-check` workflow fails a PR that changes files without touching `HANDOFF.md`. Put `[skip handoff]` in the PR title only for changes that don't move the work (typo fixes, dependency bumps).

## Before you stop
- `HANDOFF.md`'s "Exact next step" is specific enough that a cold session can start on it without asking.

## How it's enforced
`scripts/install-rules.sh <repo>` copies these into a repo:
- `.claude/settings.json`: a SessionStart hook that prints `HANDOFF.md` into every Claude Code session, so it's always read.
- `.github/workflows/handoff-check.yml`: the PR check above, plus `scripts/check-handoff-status.sh`, which warns (never fails) when the status header, a key or a known stage is missing, or the goal isn't in the optional `STUDIO_GOALS` repo variable.
- `.github/workflows/agents-check.yml` with `scripts/check-agent-runs.sh`, and a PreToolUse hook in `.claude/settings.json` that logs every Agent call to `.claude/agent-runs/<branch>.log`: a PR's `Agents:` line is checked against what really ran, and qa-tdd's suites rerun 3x on CI.

## HANDOFF.md template
Also at `templates/HANDOFF.md`.
```markdown
# Handoff
<!-- status
stage: building
goal: <goal id from pm-tools goals.json>
milestone: <planning id, e.g. ABC-M1>
now: <the task in progress>
next: <the exact next step>
waiting_on_chase:
  - <a call only Chase can make>
blockers: []
-->

## Done
## In progress
## Exact next step
## Decisions to review
## Blockers
```
