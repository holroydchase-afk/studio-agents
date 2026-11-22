# Staff PM: History feature (daily rollups that outlive log cleanup)

**Answer:** Needs one decision from Chase (day boundary: UTC or local) before the build; everything else is ready. Real work is 3 sessions. The hard part is not writing the file. It is making two runs agree when Claude Code has deleted half of a day's log.

## What the repo says (and doesn't)
- PLAN.md: "On every run, write daily rollups of counts to ~/.ccwatts/history.jsonl. Done when deleting the Claude Code logs doesn't erase history and two runs give identical totals." (no README or docs change is named there)
- CLAUDE.md: "Every number shown has a range and the method version. Counts only; no content or full paths in anything written."
- Missing: no HANDOFF.md, ANCHORS.md, source code, tests or fixture. docs/ is empty. README.md tells people to run the CLI "with --path on the sample fixture file", but no fixture exists, so the quick start is already stale. The log field names are undocumented, so the feature can't be tied to real fields yet. Step M1.1 is the first real run for that reason.
- tools/agent-memory.mjs fails to start (imports tools/check-ux-run.mjs, which is not in the repo). The memory check did not run; the sync of tools is incomplete. Not blocking.
- Run log: docs/runs/2026-11-22-staff-pm.md (check-agent-run and cost guard pass). check-spec and spec-lint exit 0; SL-6 waived because ccwatts is a local single-user CLI with no accounts.

## Critical path
1. **M1.1** Confirm real log fields and write the fixture. Done when a fixture (a test input) of counts only (no prompt text, no paths) exists and the day/model/token fields are listed in docs and the README fixture mention is fixed. Run once against a real Claude Code log, not just the fixture. 1 session.
2. **M1.2** Rollup and merge in core, pure functions. Done when HIST-1..HIST-6 tests are green 3x and the README and docs wording is untouched until M1.3. 1 session.
3. **M1.3** Read/write `~/.ccwatts/history.jsonl` on every run (atomic write, bad lines skipped) and show history with range and method version. Done when HIST-7..HIST-10 are green and the real-log run reproduces totals. 1 session.
4. Done list also names every doc this makes stale: README.md quick start (add the fixture and a History line), HANDOFF.md (create it), PLAN.md done-when (point at HIST IDs), and the CLI help text. Each is checked against the built CLI: every README command exits 0 (HIST-12).

## Design rule that makes "identical totals" true
A day's record is keyed by day plus model, and is replaced, not appended. When a re-scan sees less than what is stored for that day (logs partly cleaned), the stored count wins, per field (max). So totals never shrink and a second run adds nothing.

## Not doing
- Per-project or per-session breakdown: privacy surface (paths) and not needed for the bet.
- Backfill from other tools or export/import: not now.
- Charts, trends, compaction or pruning of history: file stays small (one line per day per model).
- Storing energy numbers: store counts only and recompute with the current method, so a method change doesn't strand old data.

## Biggest risk
Partial-day loss: cleanup deletes some of a day's logs, a re-run recounts fewer messages and silently lowers history. Handled by the max-merge rule and HIST-3. Second: day boundary differs between runs or time zones (HIST-4, decision below).

## Decisions for Chase
- Day boundary: UTC or local time. Recommend UTC (stable if you travel; two runs always agree). Local is friendlier but can split one session across two days.
- Opt-out: always write history, or add `--no-history`. Recommend always write, since the PLAN says every run, plus a `--no-history` flag for tests only.

## Handoffs
- qa-tdd: failing tests for HIST-1..HIST-10 with the pinned-clock fixtures, red for the right reason.
- engineer: build M1.2 then M1.3 after red.
- privacy-security: check the written file has counts only, no paths, and the `~/.ccwatts` permissions.
- ux-reviewer: the History output words and the range/method-version display.

lint-ok: SL-6 local single-user CLI with no accounts or sign-in; the only access control is the OS file permission on the history folder, covered by the privacy-security handoff

```spec
verdict: needs-decision
bet: Chase keeps the energy totals he saw before Claude Code deleted old logs; it worked when deleting the logs and rerunning leaves every day's totals unchanged
step: M1.1 | Confirm real log fields and add a counts-only fixture | field list written down and one real-log run done | 1 session
step: M1.2 | Daily rollup and merge rule in core | HIST-1 to HIST-6 green 3x | 1 session
step: M1.3 | Read and write history file each run, show it with range and method version, and update README, HANDOFF.md and PLAN.md | HIST-7 to HIST-10 and HIST-12 green 3x and real-log run matches | 1 session
criterion: HIST-1 | auto | Given a fixture with 3 messages on 2026-11-02 and 2 on 2026-11-03, then the rollup has 2 days with message counts 3 and 2
criterion: HIST-2 | auto | Given the same fixture run twice with a clock pinned at 2026-11-04 00:00 UTC, then the second run leaves history.jsonl byte-identical and totals stay 5
criterion: HIST-3 | auto | Given history holds 2026-11-02 with 3 messages and the logs now hold only 1 message for that day, then the day still shows 3
criterion: HIST-4 | auto | Given a message at 2026-11-02T23:59:59Z and another at 2026-11-03T00:00:00Z, then they land on 2 separate days under the chosen day boundary
criterion: HIST-5 | auto | Given the log folder is empty and history holds 2 days, then the totals show 2 days and nothing is deleted
criterion: HIST-6 | auto | Given a first run with no history file and a clock of 2026-11-04, then the file is created with one line per day and model, and an empty log folder with no history file writes 0 lines and exits 0
criterion: HIST-7 | auto | Given a history file with one corrupt line and 2 good lines, then the run reports 2 days, skips 1 line and keeps the corrupt line untouched
criterion: HIST-8 | auto | Given the written file is read as text, then 0 lines contain a path starting with "/" or "~" or any prompt text, and each line has only day, model, counts and a record version
criterion: HIST-9 | auto | Given any history total printed, then it shows a low to high range and the method version, for example "1.2 to 3.4 kWh, method 1"
criterion: HIST-10 | auto | Given a write that fails halfway (simulated disk full), then the old history file is still intact with its 2 days
criterion: HIST-12 | auto | Given the README quick start commands on the released version, when run on the fixture with a clock pinned at 2026-11-04, then every command exits 0 and the History line matches real output
criterion: HIST-11 | manual | With a clock of 2026-11-04, run against a real Claude Code log, delete a copy of the older logs, run again -> totals for the deleted days are unchanged, difference 0
cut: Per-project breakdown | stores folder names, adds privacy risk, not needed for the bet
cut: Charts and trends | not needed to prove the bet
cut: Storing energy values | counts only, recompute with the current method so a method change doesn't strand history
cut: History pruning and export | file stays one line per day per model, not now
risk: Partial-day loss lowers stored totals after log cleanup | HIST-3
risk: Day boundary differs between runs or time zones | HIST-4
risk: Fixture only; real log fields unconfirmed | M1.1
decision: Day boundary UTC or local | UTC
decision: Always write history or allow --no-history | always write, with --no-history for tests only
handoff: qa-tdd | failing tests for HIST-1 to HIST-12 | red for the right reason
handoff: engineer | build M1.2 then M1.3 | HIST-1 to HIST-12 green 3x
handoff: privacy-security | review the written file and folder | no paths or content, HIST-8 green
handoff: ux-reviewer | history output wording and range display | no P0 or P1
```
