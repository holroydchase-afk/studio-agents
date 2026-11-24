# Receipts fix for Staff PM, 2026-11-24

Chase's ask: the blind graders marked Staff PM down for tool-check claims it couldn't have run, extra decisions and stray lint lines. What tools did it need?

**Diagnosis.** The agent told the reader "check-spec and spec-lint exit 0", "the guard did not trip" and "the run log passes" in prose, and ended with `lint-ok:` waiver lines. A grader reading only the reply cannot tell a real run from an invented one, so a true claim and a made-up claim look the same. It also listed 2 to 6 `decision:` lines when only a call that is truly Chase's should be one.

**Tool it needed:** `tools/pm-receipts.mjs` (tests `tests/pm-receipts.test.mjs`, PMR-1..7, written first). It runs the kill switch, `check-spec` and `spec-lint` itself and writes the real exit codes to a file (`--out`). Nothing is ever reported ok without a process that ran.

Two prompts sets: the 5 earlier "fresh" prompts (now dev, because they were used to find the problems) plus 3 new real asks (held out). 2 agent runs and 2 plain runs per prompt, one blind Opus grader per pair (16 pairs per round). Agent arm ran with the studio tools in its working folder and no repos.

| Round | Agent change | Agent | Plain |
|---|---|---|---|
| Earlier (PR 137, before this fix) | none | 10 of 15 | 5 |
| 1 | receipts printed in the chat reply as a `Checks:` line, max one decision, no lint-ok lines in chat | 2 of 16 | 14 |
| 2 | receipts written to a file, chat never mentions checks or tools | 9 of 16 | 7 |

**What it shows.**
- Round 1 failed: printing real receipts in chat made it worse. Graders read "Checks: all 3 passed" as one more unbackable claim, and counted the block as clutter.
- Round 2 removes the complaint: graders no longer cite tool claims, and the agent is back to roughly even with plain (9 of 16, same range as the earlier 10 of 15). It did not beat the earlier version.
- Still lost: "optimize-rule" (0 of 2), where plain's one pasteable line beat a plan with a qa-tdd step; and replies that assert which repos have which rule.
- Limits: model graders only, a model-written reply mix, 16 pairs, the 5 old prompts were used to tune so they are not held out, no repo access. Differences of 9 vs 7 are noise. Not a multiplier.

Files: `round1-receipts-in-chat/`, `round2-receipts-in-file/` (replies and tallies), `verdicts-round1/`, `verdicts-round2/` (grader reasons).
