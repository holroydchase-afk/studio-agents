# History feature plan (CCW-M1.4 follow-ups)

Note: I could only read this repo and did not run the tests (no node_modules installed). Everything below comes from reading the code and docs.

## Answer
History is already built and merged (CCW-M1.4, PR `s4-history`). The plan is to harden it, not build it. Two gaps can lose real data, and each fits in one evening.

## What exists
- Core `packages/core/src/history.ts`: `rollup`, `mergeHistory`, `serializeHistory`, `parseHistory`, `weekly`.
- CLI `packages/cli/src/store.ts`: `~/.ccwatts/history.jsonl` (`CCWATTS_HOME` overrides the folder), atomic temp-file-then-rename write, mode 0600.
- Every CLI run merges fresh rollups into the stored file. `--no-history` opts out. `ccwatts history` and `--export csv` read from it.
- Rows are one day x source x model x project, counts only, plus `outputContext` (ANCHORS D12).
- The merge keeps the row with more tokens, so reruns can't double-count and pruned logs can't shrink history.
- Tests cover surviving log deletion, identical totals on a rerun, partial pruning, and skipping malformed lines.
- PLAN's "done when" for History is met.

## Gaps, ranked
1. **P1 data loss: a failed history read is followed by an overwrite.**
   - In `packages/cli/src/index.ts` lines 85-95, a read error is caught and treated as `[]`. The run then merges against nothing and calls `writeHistory`. A transient read failure would replace the whole history with only the logs still on disk.
   - Fix: if the read fails for any reason other than ENOENT, skip the write for that run.
2. **P1 data loss: malformed lines are dropped silently, then rewritten away.**
   - `parseHistory` skips bad lines, and the next write saves the file without them.
   - Fix: copy the old file to `history.jsonl.bak` before writing whenever lines were skipped, and say so on stderr. The schema header isn't checked yet. Refuse to write over a file whose `schema` is newer than ours.
3. **P1 coverage: history only updates when the user runs the CLI.**
   - If they don't run it within `cleanupPeriodDays` (believed to be 30 days), the days in between are lost for good.
   - This is the biggest product risk. The fix is a quiet capture trigger.
   - Option: a `ccwatts sync` command that prints nothing, wired as a Claude Code SessionEnd hook by the plugin (PR #21).
   - Decision needed from Chase: whether a hook that writes to `~/.ccwatts` on every session is acceptable. It stays offline and counts-only, so it fits the hard rules, but it is new behaviour.
   - Until then, tell people in the README to run it at least monthly.
4. **P2: `cleanupPeriodDays` is still unconfirmed.** This is M2.1 and needs a local Claude Code install on Chase's Mac. It sets how often a capture is needed, so it matters for gap 3.
5. **P2: concurrent runs can race.** Two runs at once can each write a stale merge. The rename keeps the file intact, but one run's update can be lost. The next run recovers it, because the logs still exist while they are within retention. Low priority; note it in the README.
6. **P2: dates and weeks are UTC.** `timestamp.slice(0,10)` means a late-evening session in the US lands on the next day. Document it in METHODOLOGY or switch to local time. Switching changes keys already stored, so it needs a migration and a decision from Chase.

## Evening plan (about 1 hour each)
- **Evening 1, gaps 1 and 2 (code PR, needs qa-tdd):**
  - Write failing tests in `packages/cli/test/store.test.ts` and `packages/core/test/history.test.ts` for: a non-ENOENT read error leaves the file untouched; skipped lines produce a `.bak`; a newer schema is refused.
  - Then the fix, then 3x green. Update HANDOFF.
  - The core stays pure. All file handling lives in `cli`.
- **Evening 2, gap 3, after Chase's call:** add the quiet `ccwatts sync`. Hooking it into the plugin waits for PR #21 to be rebased.
- **Whenever Chase has a local install:** M2.1 and the `cleanupPeriodDays` value into `packages/core/README.md`.

## Decisions for Chase
- Is an automatic hook-based sync OK (gap 3)? Recommendation: yes. Without it, history has a hole whenever he doesn't run the tool for a month.
- Keep UTC day boundaries for now (gap 6)? Recommendation: keep them, document it, and revisit after the beta.

## Hard-rules check
All of this stays counts-only with no network calls. No full paths are stored. The history format and core purity are unchanged.
