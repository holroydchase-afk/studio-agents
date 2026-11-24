# First run, 2026-11-24

**Result: plain Claude won 3 of 4, the persona agent won 1 of 4.** Four artifacts is far too few to say more, there was one grader per pair, and Chase has not checked any pair. Do not read this as the agent being worse or better in general.

| Artifact | Winner | One-line reason from the grader |
|---|---|---|
| Portfolio home page | plain | agent's points were sharper but repeated, and its fixes invented facts |
| ccwatts README | agent | sharper unique points, but plain's findings were real; the agent's P0 treated quote splitting as a rendering bug |
| persona-twins README | plain | concrete reader problems; the agent leaned on heavy asks |
| pm-tools README | plain | ten distinct lines with usable fixes; the agent repeated quotes and asked for placeholder metrics |

All 40 findings passed the quote-id check (every id is in the index); `check-stakeholder` does not check that a quote shows the problem.

## What went wrong for the agent arm (to fix, not to explain away)
1. The three personas repeat each other: the same quote (q43, q4, q5, q20 and others) came up two or three times in the merged 10. The merge has no de-duplication, and the agent file does not ask for it.
2. Fixes state facts that are not in the quote index (for example calling a product built, or giving a date or numbers). A fix must not add facts the owner did not give.
3. Findings treat the intake's one-quote-per-sentence splitting (line breaks, split table rows) as rendering bugs in the README. That is an intake defect, not the agent's.
4. The arms were not equal: the agent arm is a merge of 30 findings cut to 10 by round-robin.

## What was not tested
Round 2, `check-stakeholder --prev`, the verdict, the agreement table, the other persona sets, and any real reader. Arms used the same model for the reviewers (the default) and Opus for the grader.

## Next
Fix 1 to 3 test-first, then rerun on fresh artifacts and have Chase mark a few pairs.
