# Session rules

Every agent, thread and scheduled run in the studio follows these, in every repo. A repo's `CLAUDE.md` hard rules still win where they say more.

## Before you start
1. Read the repo's `CLAUDE.md` and `HANDOFF.md`. If `HANDOFF.md` is missing, create it from the template below before any other change.
2. Read the doc `CLAUDE.md` points to for the work in front of you (plan, spec, anchors, design system), and only the section you need.
3. Check open PRs and branches so you resume where the last session stopped instead of redoing it.

## Every commit or PR that makes progress
- Updates `HANDOFF.md` in the same commit or PR: done, in progress, exact next step, decisions to review, blockers.
- The `handoff-check` workflow fails a PR that changes files without touching `HANDOFF.md`. Put `[skip handoff]` in the PR title only for changes that don't move the work (typo fixes, dependency bumps).

## Before you stop
- `HANDOFF.md`'s "Exact next step" is specific enough that a cold session can start on it without asking.

## How it's enforced
`scripts/install-rules.sh <repo>` copies two files into a repo:
- `.claude/settings.json`: a SessionStart hook that prints `HANDOFF.md` into every Claude Code session, so it's always read.
- `.github/workflows/handoff-check.yml`: the PR check above.

## HANDOFF.md template
```markdown
# Handoff

## Done
## In progress
## Exact next step
## Decisions to review
## Blockers
```
