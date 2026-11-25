---
name: pipeline
description: Run one task through the agent pipeline (staff-pm, tests-pre, build, verify, pr) with a ledger, stop rules and a merge class. Use for "run the pipeline", a build or review that should follow the studio gates, or resuming a stopped run.
---

# Pipeline runbook

The main session runs this as chief of staff. The plan is `docs/pipeline-plan.md`; the ledger CLI is `tools/pipeline-run.mjs` (plain Node, writes only the ledger file). Every stage change goes through it, so rounds, budgets and stops are counted by a tool, not remembered.

## Start
1. Check the kill switch first: if `.claude/agents.off` exists, stop. `pipeline-run start` also refuses.
2. Run staff-pm. Its ```spec block carries `lane:` (ui, logic, docs, config, review) and `touches:` (live, non-live, hearth).
3. `node tools/pipeline-run.mjs init --ledger L.json --spec spec.md` (or `--lane` and `--touches`).
   - docs and config skip tests-pre and build.
   - review is for reviewing a codebase whose suites cannot run: it skips tests-pre and build, and verify may end red, flaky or blocked (the verdict is recorded).

## Each stage
`pipeline-run start <stage> --ledger L.json [--model sonnet]`, do the work, then `pipeline-run done <stage> --ledger L.json --block file.md [--tokens N --budget M]`.
- **staff-pm:** spec block (checked by check-spec). Max 1 round. A `blocked` or `cut` verdict ends the run.
- **tests-pre:** qa-tdd writes red tests first. Block must be non-empty.
- **build:** plain Claude builds inside qa-tdd's gates (no engineer agent). Max 3 rounds: `pipeline-run round build --ledger L.json`.
- **verify:** qa-tdd post-build tests, bugs become red tests then fixes, all suites green 3x. Paste the ```qa block verbatim. Max 2 fix rounds per bug: `pipeline-run round verify --bug BUG-1 --ledger L.json`. Outside the review lane only green passes.
- **pr:** PR body has the `Agents:` line, the qa block, and HANDOFF.md updated in the same PR.

## Stop rules (the tool enforces these)
- Kill switch `.claude/agents.off`.
- Round limits above; the next round trips and stops the run.
- Over 1.5x a stage's token budget stops the run. No dollar caps: Chase is on Max, bounded by rounds, budgets and the kill switch.
- Two failed validations of the same stage stop the run.
- Plan limit: `pipeline-run stop --reason plan-limit --ledger L.json`, later `pipeline-run resume --ledger L.json` (only a plan-limit stop resumes).
- A stopped run is reported to Chase in one message with the reason. Never retry past a stop.

## Merge class
`pipeline-run class --ledger L.json --files a,b,c [--feedback]` (comma-separated changed paths) prints A, B or C. A: the thread merges on green, oldest first. B: scoped auto-merge, only when the feedback gate passes (see below). C: live, hearth, `.github/`, CLAUDE.md, manifests, auth, privacy or data paths. Class C waits for Chase's go and is never merged by the pipeline. 
Feedback gate for class B: `node tools/feedback-merge-check.mjs --repo NAME --lines N <files>` must exit 0. `class --feedback` already prints C for live-site, secret and manifest paths.

Merging is not deploying: say when a republish is still owed.

## Status
`pipeline-run status --ledger L.json [--json]` shows lane, touches, each stage's state, tokens and rounds, and the verify verdict.

## Never
- Skip, delete or weaken a test to get green.
- Write to a product repo that the run only reviews (Hearth is review-only; fixes go to its intake issues).
- Summarize a qa verdict: paste the block as is.
