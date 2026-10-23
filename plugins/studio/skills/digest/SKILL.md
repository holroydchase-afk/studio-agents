---
name: digest
description: Chase's studio digest on demand: today's applications, blockers to clear (one step each), results from other threads, shipped, running and tonight. Use when Chase says "digest" or runs /digest in any project.
---

# Digest

You are the studio orchestrator (studio-agents `plugins/studio/agents/orchestrator.md`, "The morning digest"), writing the digest now instead of at the scheduled 6:30am run. Chase reads it on his phone. Don't ask questions and don't start new work. Cover the last 24 hours, or since the last digest in this thread if that's sooner.

## Scope
- **Product Studio** (the project with `/mnt/project-files/pmo/`): the whole studio, every repo in the "Who owns which repo" table of `STUDIO-STATUS.md` in holroydchase-afk/pm-tools.
- **Any other project**: this project's repos and threads, plus `STUDIO-STATUS.md` for studio-wide items waiting on Chase. Say in one line that other projects' threads aren't visible from here.

## 1. Gather (cheaply)
- **Focus**: `/mnt/project-files/pmo/job-hunt/tracker.md` if you can reach it. On a weekday with no row for today, add it: Due = 3 + the last weekday's shortfall, capped at 6; Done = 0; Gate = closed. Re-read the file just before writing. If today's row exists, only read it.
- **Repos**: PRs merged or opened in the last 24h, PRs waiting on Chase's review, CI red on the default branch, and HANDOFF.md "Exact next step" and "Blockers". Also the latest "Feedback loop <date>" block in HANDOFF.md and issues or PRs labeled feedback, needs-chase or suspicious.
- **Runs**: scheduled tasks (list_triggers): the last run of each, flagging any failed or missed.
- **Threads**: anything blocked on Chase, and threads that went done or review_ready (read the latest result, newest first, limit 3).
- **Carry list** (Product Studio): `/mnt/project-files/pmo/shifts/digest-carry.md`. Show its items, but don't clear them; the 6:30am digest clears them.
- **Artifacts**: "Atlas Intake:" or "Atlas Story:" updated in the last 24h.
- **Tonight**: the `tonight` memory file or `/mnt/project-files/pmo/shifts/tonight.md`, if present.
- **Studio status**: if anything you gathered moved and `STUDIO-STATUS.md` doesn't show it, open one docs-only PR updating it, unless one is already open; list it first under Blockers.

Studio rules for Done and Waiting: anything listed as Done in `STUDIO-STATUS.md` stays off the list; anything under "Waiting on Chase" goes on once, without re-asking.

## 2. Post ONE message (one phone screen)
Line 1: anything you couldn't reach, plainly ("I couldn't reach X, so this is untested"). Then, dropping empty sections:
1. **Today**: apps due, done, carryover, week total, gate.
2. **Blockers to clear**: everything waiting on Chase, quickest first. Each is one step: a link, a copy box formatted for its field with the click path, or a one-word question with your recommendation. Add minutes.
3. **From other threads**: headline and link each.
4. **Shipped**: merged PRs and finished milestones, one line each.
5. **Running and blocked**: open PRs, what each scheduled run did, HANDOFF blockers.
6. **Scheduled tonight**: which runs fire and their goals (suggest `/night-prep` in the evening if none is set).
Feedback loop: shipped fixes go under Shipped, anything waiting on Chase under Blockers, and spam and suspicious counts in one line.

## 3. Then
- When Chase replies with a number, walk through that item only, and update HANDOFF.md and `STUDIO-STATUS.md` when it's done.
- No push notification when run on demand; Chase is already reading.
- Don't change the scheduled 6:30am digest task or its prompt.

## Rules
Studio rules apply: copy boxes for anything Chase pastes, one-step asks, a recommendation on every question, "verified" only for what you ran. No secrets, ids or personal data in any PR.
