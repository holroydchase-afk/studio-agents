---
name: eval-runbook
description: Run one agent eval through the shared pipeline (tools/eval-pipeline.mjs) from status to report. Use for "run the eval", "score the agent", or "run the held-out set".
---

# Eval runbook

One pipeline for every agent. The tool never calls a model: it writes job files, and each job runs as **one subagent** in a Claude session (no API key). Results come back as files and `collect` checks them. Suite configs live in `evals/suites/`.

## Steps, in order
1. `status` tells you the next command for this suite and run.
2. `jobs` writes the job files. Use `--phase dev` while you tune. `--phase heldout` is one-shot per change id: a second emit is refused, so do not spend it on a trial.
3. Run every job as one subagent (generation jobs first, then grading jobs). Write each result to `results/<job id>.json`. Never put the arm name in a grading prompt.
4. `collect` validates the results. Fix every problem line it prints and re-run the missing jobs (`jobs --reissue`).
5. `sheet` makes the blind sheet of pairs for Chase to mark.
6. `key-add` stores his marks.
7. `calibrate` prints agreement and kappa. Below 20 marks or kappa 0.6, no claim.
8. `report` prints wins and losses per task with the sign test, the Wilson interval and cost per win. "Not proven" under 10 tasks or p of 0.05 or more. `report --claim` is blocked until calibration passes.

Old runs stay v1 and are never recomputed. Quote no multiplier. Before a pull request: `node tools/eval-pipeline.mjs ci-check`.
