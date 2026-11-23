# Lazy-prompt eval, with the job, done test and stop rule block (2026-11-23)

Same 8 prompts, same context pack, same plain replies as the baseline; the agent was re-run with the new block in `staff-pm.md`. Fresh Opus graders, one per prompt, blind to arm.

| Split | Agent wins | Plain wins |
|---|---|---|
| Dev (4) | 3 | 1 |
| Held-out (4) | 4 | 0 |
| All (8) | 7 | 1 |

Baseline (before the block) was 4 to 4. Plain won only shifts-and-ratio this time.

What changed in the replies: more explicit reuse-over-build calls, a named owner and session for the next step (for example "the Role Radar thread, tonight"), and one ask with a recommendation. Graders still marked down leftover `lint-ok` waiver lines, a role intro, and repo facts the context pack did not contain (both arms did that).

Limits (read before quoting any number):
- 8 prompts, one run per arm, one grader per prompt. 7 of 8 is a sign-test p of about 0.07 two-sided, so it is suggestive, not proven.
- The plain arm was not re-run, and graders differ between this run and the baseline.
- I saw the held-out baseline before this run, so held-out is not clean. The block came from Chase's design, not from tuning on these prompts.
- Neither arm could open the real repos; prompts are from Oct 20 to 21 but the context is late November; I chose the prompts and the rubric.
- Chase has not yet spot-checked any pairs; the grader is a model, not him.
No public claim until Chase's spot-check and a repeat run (3 per arm).
