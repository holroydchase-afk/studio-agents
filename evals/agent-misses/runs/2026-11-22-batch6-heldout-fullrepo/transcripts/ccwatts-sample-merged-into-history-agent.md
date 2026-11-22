# History: daily rollups that outlive Claude Code's log cleanup

**Answer.** History is already built and merged (CCW-M1.4, Oct 21; D12 added `outputContext` Oct 22). Do not rebuild it. What is left is one hardening task, CCW-M1.4.1 (one session), plus a real-machine check only Chase can start (CCW-M2.1). Recommendation: do the hardening before the npm publish (M2.2), because "history survives cleanup" is the claim friends will test.

## What the repo shows (from files)
- `packages/core/src/history.ts`: daily rows keyed by date+source+model+project, counts only. `mergeHistory` keeps the row with the larger token total, so reruns cannot double-count and pruned logs cannot shrink a day. `packages/cli/src/store.ts` writes `~/.ccwatts/history.jsonl` via temp file + rename. Tests cover rerun, log deletion, partial pruning, malformed lines.
- PLAN M1.4 done-when ("deleting logs doesn't erase history; two runs give identical totals") is met by `store.test.ts`.
- In flight: M2.2 (npm publish waits on Chase's go); plugin PR #21 (ships after npm, ANCHORS D11). Nothing else touches history.
- Hard rules that apply: counts only, no full paths, no network, every number a range plus method version.
- Not yet checked: any real local Claude Code install. `cleanupPeriodDays` is unconfirmed (core/README Retention). The only real-log run was a cloud session. So "survives cleanup" is merged and tested on fixtures, not checked on a real machine.

## Gaps found
- PM-R1 | P1 | `parseHistory` + `writeHistory` | A bad line in `history.jsonl` is skipped on read, then the file is rewritten without it, so one corrupt line permanently loses that day. | Keep a `history.jsonl.bak` of the last good file and say so when lines were skipped.
- PM-R2 | P1 | first run | A user installing after cleanup has no history before today and nothing says so; the "all" window looks complete. | One plain line on first run: history starts on <date>, older logs are already deleted.
- PM-R3 | P2 | `mergeHistory` | "Larger total wins" could drop a stored day if a boundary-day file is pruned while a new same-day session is added. Unlikely, but untested. | Add a test with a pinned clock; decide a rule only if it fails.
- PM-R4 | P2 | `writeHistory` | One shared `.tmp` name; two simultaneous runs (CLI plus a statusline) can clash. | Unique temp name per process.
- PM-R5 | P2 | docs | README/playground claims of surviving cleanup are unchecked on a real install. | Wording stays "designed to" until CCW-M2.1 passes.

## Critical path
1. CCW-M1.4.1 Hardening (R1, R2, R4, R3 test): done when HIST-1..HIST-4 are green 3x. 1 session. Also updates README and core/README (docs, README wording).
2. CCW-M2.1 Real run on Chase's Mac once he uses local Claude Code: record `cleanupPeriodDays`, delete one old log, rerun, totals unchanged. Done when recorded in core/README. Blocked on Chase, not on the build.
3. Update HANDOFF, core/README Retention, README claim wording. Same PR as step 1.

## Done also means
Stale after this change: core/README Retention and History rows sections, the README claim about surviving cleanup, HANDOFF. Rollback: revert the merge commit; the `.bak` file is harmless and history.jsonl format is unchanged (schema 1). Merged, tested on fixtures and checked on a real install are separate states, recorded in HANDOFF.

lint-ok: SL-5 no safety or accuracy rate is claimed; the criteria are exact-value tests.
lint-ok: SL-6 history is a single-user local file with no sign-in, owner-only or multi-account behavior.

## Not doing
- Per-message ID storage: the larger-count merge already makes reruns safe, and it would store more per message than counts.
- Pricing or showing `outputContext`: D12 says not until the energy model can price it.
- Syncing history across machines, cloud/team rollups: P3, no demand signal yet.
- A `history prune`/delete command: add only if a friend asks.
- Showing energy in history rows: energy is recomputed from counts by design.

## Biggest risk
Claiming "survives cleanup" publicly before a real-machine check. Handled by HIST-5 and PM-R5 wording: merged, tested on fixtures and checked on a real install are three separate states, recorded in HANDOFF.

## Decisions for Chase
- Ship the npm publish before or after CCW-M1.4.1? Recommend after; it is one session.
- Real-machine check: use Claude Code locally for a few days, then one run. Recommend yes; nothing else unblocks M2.1.

## Handoffs
- qa-tdd: failing tests for HIST-1..HIST-4, red for the right reason.
- engineer: build M1.4.1 once red.
- privacy-security: confirm the backup file holds counts only and no paths.
- positioning: hold "survives cleanup" wording until M2.1.

```spec
verdict: ready
bet: A Claude Code user keeps their usage history after Claude Code deletes old logs; it worked when a friend deletes logs and reruns with unchanged totals, and a damaged history file never silently loses days
step: M1.4.1 | History hardening: backup before rewrite, first-run note, unique temp file | HIST-1 to HIST-4 and HIST-6 green 3x | 1 session
step: M2.1 | Real run on Chase's Mac, record cleanupPeriodDays, delete an old log and rerun | totals unchanged and value recorded in core README | 0.5 session
criterion: HIST-1 | auto | Given history.jsonl with 3 valid rows and 1 corrupt line, when a run rewrites it, then history.jsonl.bak contains all 4 original lines and the run prints "skipped 1 line"
criterion: HIST-2 | auto | Given no history file and a pinned clock of 2026-11-16, when the history command runs, then output contains "History starts 2026-11-16"
criterion: HIST-3 | auto | Given two writeHistory calls started at the same time, when both finish, then history.jsonl parses with 0 skipped lines and both days present
criterion: HIST-4 | auto | Given stored day 2026-10-01 with 100 tokens and fresh logs for the same day with 90 tokens plus a new session, when merged, then the day total is 100 or more and never lower than stored
criterion: HIST-6 | auto | Given an empty history file and no logs, when ccwatts history runs, then it exits 0 and prints "No history yet" with 0 rows
criterion: HIST-7 | manual | Given the released npm version, when the README's history commands are run, then each exits 0 and the survives-cleanup wording matches the HIST-5 result
criterion: HIST-5 | manual | Given a real local install, when one log older than 7 days is deleted and ccwatts reruns, then the all-time total is unchanged
cut: Per-message ID storage | larger-count merge already prevents double counting
cut: Pricing outputContext | D12 says not until the model can price it
cut: Cross-machine sync | P3, no demand signal
cut: History prune command | no one has asked
risk: Public claim of surviving cleanup before a real-machine check | HIST-5
risk: Corrupt history line silently dropped on rewrite | HIST-1
decision: Publish to npm before or after M1.4.1 | after, it is one session
decision: Use local Claude Code for a few days so M2.1 can run | yes, it is the only thing that unblocks M2.1
handoff: qa-tdd | failing tests for HIST-1 to HIST-4 | red for the right reason
handoff: engineer | build M1.4.1 | HIST-1 to HIST-4 green 3x
handoff: privacy-security | review the backup file for counts-only and no paths | no P0 or P1
handoff: positioning | hold the survives-cleanup wording until HIST-5 | wording reviewed
```
