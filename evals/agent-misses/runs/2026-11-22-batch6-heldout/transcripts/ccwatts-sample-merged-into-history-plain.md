# Plan: History (daily rollups that outlive Claude Code's log cleanup)

Basis: this repo holds only CLAUDE.md, PLAN.md and README.md (one commit, no code, no ANCHORS/HANDOFF/fixtures). The plan rests on those three files. I did not read anything outside the repo.

## Goal and done-when (from PLAN.md)
Each run appends/updates daily count rollups in `~/.ccwatts/history.jsonl`. Done when (1) deleting the Claude Code logs does not erase history, and (2) two runs give identical totals.

## Constraints (from CLAUDE.md)
- Counts only: no prompt/response text, no full paths. Projects stored as hash + folder basename.
- Every number shown carries a range and the method version.

## Design
**Record** (one JSON line per day + project + model):
`{"v":1,"day":"2026-11-20","project":"<hash>","name":"<basename>","model":"...","input":N,"output":N,"cache_read":N,"cache_write":N,"messages":N}`
Store raw token counts only, not kWh. Energy and its range are computed at display time from the current method version, so a later method revision restates history instead of freezing old numbers, and the range and version are always shown.

**Idempotency (the "two runs identical" rule).** Rollups are keyed by (day, project, model) and *replaced*, never added to. Run = read logs, aggregate per key, merge into the stored map, rewrite the file atomically (temp file, then rename), sorted by key. Same input gives byte-identical output.

**Survives cleanup.** Merge rule per key: if the logs still contain that key, take `max(stored, fresh)` per count field. A day the logs have partly deleted can never shrink history. Keys absent from the logs are kept untouched. History is never pruned.

**Reads.** Totals = history only (it already includes anything just merged), so output is the same whether or not logs exist.

**Layout.** Keep I/O out of core: `core` gets a pure `mergeRollups(stored, fresh)` and `aggregate(records)`; `cli` owns reading/writing `~/.ccwatts/history.jsonl`. Log parsing stays behind the adapter returning normalized usage records.

## Build order (each step is about one night, about 1 hour)
1. Night 1 - failing tests first: aggregate-by-day, merge idempotent (run twice = same), merge never shrinks, logs-deleted keeps totals, no-content/no-path assertion on the written file. Then pure `aggregate` and `mergeRollups`.
2. Night 2 - history file I/O (atomic write, tolerate missing/corrupt-line file, create `~/.ccwatts/`), wire into the run, end-to-end test with a temp HOME and deleting the fixture logs.
3. Night 3 - display: totals from history with range and method version; a `--history` flag or section; docs note on what is stored and the retention caveat.

## Risks and open questions for Chase
1. **Day boundary:** UTC or local time? Default UTC (stable if the machine's timezone changes); say if you prefer local.
2. **Retention caveat:** history only covers days that a run saw before cleanup. Days already deleted before first run are lost. Worth stating in the README.
3. **Partial days with max-merge:** rare edge, a day recorded, then logs deleted, then a bigger partial returns. Accepted as correct enough.
4. **Opt-out/delete:** a `ccwatts history --delete` path is probably wanted for the privacy story; I'd add it in night 3 unless you say no.
5. **Missing fixture:** README says to run with `--path` on a sample fixture file, but none exists in the repo. Tests will need one made up (counts only).
6. **Referenced docs absent:** the studio rules point to ANCHORS/HANDOFF/etc., which aren't in this copy, so conflicts with them could not be checked.
