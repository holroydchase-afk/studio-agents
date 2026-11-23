# batch5 noise runs (2026-11-22), not a scored run

Two repeat agent-arm runs of each of the 6 held-out batch-5 cases, graded by fresh Opus subagents that saw only the criteria file and the saved reports (run labels shuffled). The scorer allows one result per case and arm, so the grades are kept in `noise-grades.json` and this is not rendered by `eval-miss-score`.

| Case | First run (heldout) | Repeat 1 | Repeat 2 | Passes of 3 |
|---|---|---|---|---|
| four-demo-issues-already-in-flight | pass | pass | pass | 3 |
| phone-font-again | pass | pass | pass | 3 |
| demo-criteria-unconfigured | pass | pass or fail (one each) | | 2 |
| dream-roles-live-page-ahead | fail | pass or fail (one each) | | 1 |
| console-page-built-then-hidden | pass | fail | fail | 1 |
| empty-state-no-action | pass | fail | fail | 1 |

Agent arm overall: 11 of 18 runs pass (the first-run score of 5 of 6 was on the high side). Plain was not repeated, so this says nothing about lift.

Limits: several repeat runs said they could not see the repo docs (empty-state, console, four-demo) or were told not to read outside their sandbox, so those fails may reflect a thin fixture view, not the agent. Cases written by me. Repeat reports are the transcripts.
