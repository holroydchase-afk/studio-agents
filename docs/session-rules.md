# Session rules

Every agent, thread and scheduled run in the studio follows these, in every repo. A repo's `CLAUDE.md` hard rules still win where they say more.

## Before you start
1. Read the repo's `CLAUDE.md` and `HANDOFF.md`. If `HANDOFF.md` is missing, create it from the template below before any other change.
2. Read the doc `CLAUDE.md` points to for the work in front of you (plan, spec, anchors, design system), and only the section you need.
3. Check open PRs and branches so you resume where the last session stopped instead of redoing it. Before opening a new PR, check the repo's open ones (see "Pull requests" below).

## Talking to Chase
- The first message to Chase in any thread, chat or scheduled-run report opens with who you are, by role: "Hi Chase, I'm Charlie's chief of staff" (or "Hearth's staff PM", "Product Studio's chief of staff"). Then lead with the answer, warm and short, never robotic.
- The same rule is the TONE line of the STUDIO RULES project instructions (pm-tools `docs/ONBOARDING.md`) and sits in every repo's CLAUDE.md through `templates/CLAUDE-agents.md`, so it holds even where a project's instructions are stale.

## Every commit or PR that makes progress
- Updates `HANDOFF.md` in the same commit or PR: done, in progress, exact next step, decisions to review, blockers.
- Updates the status header at the top of `HANDOFF.md` with every HANDOFF update: `stage` (idea, building, beta, live or parked), `goal` (a pm-tools `goals.json` id), `milestone`, `now`, `next`, `waiting_on_chase` and `blockers`. The Studio Console reads this header, not the sections, so a stale header shows the wrong state. Keep it within the first 15 lines and closed by `-->`.
- The `handoff-check` workflow fails a PR that changes files without touching `HANDOFF.md`. Put `[skip handoff]` in the PR title only for changes that don't move the work (typo fixes, dependency bumps).

## Pull requests: keep the queue short
Chase reviews and merges from his phone, so a pile of open PRs across threads turns into an orchestration job (Charlie once had 6 to 8 open across 4 threads). New PRs are fine and keep work clean; these rules keep them from stacking up.
- **One task per PR, small.** Every PR body has the project-thread line (who owns it) and a `Merge after:` line: the PR it depends on, or `none`.
- **You own what you open, and you merge it.** Merge your own PRs yourself once they're green, oldest first, without asking Chase (Chase, Oct 31). Close anything superseded the moment it is, and say which PR replaced it.
- **The one gate: live demo or live product.** If merging changes what a live demo or live product shows or does (a merge to `main` that deploys a site or demo, a store or npm release, a live app page or its data), ask Chase first and show the queue. Everything else merges on green. This replaces any "never merge" line in a repo's `CLAUDE.md`; update that line on your next studio refresh.
- **Older PRs go first.** Before merging #N, list the repo's other open PRs. Merge older ones first when they're green and not gated. If an older one is gated, red, a draft, or another thread's unfinished work, tell Chase before merging #N: "Heads up: #33 is still open (title, owned by <its thread link from the PR body>, or Dependabot). Merge 33 then 34, or just 34?" with your recommendation.
- **Every merge ask shows the queue.** Whenever you ask Chase to merge, include that repo's open PRs in merge order: number and link, title, owning thread, ready or not.
- **Dependency bumps don't wait on Chase.** Merge green Dependabot PRs oldest first on your next run (security fixes first), unless the bump changes a live deploy; if one breaks the build, say so in HANDOFF.md.

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
