# SPEC-EVAL-PIPELINE: one shared eval pipeline for staff-pm, qa-tdd, ux-reviewer and stakeholder

New tool `tools/eval-pipeline.mjs`, suite configs in `evals/suites/`, a runbook skill, a CI job. It extends `tools/eval-protocol.mjs` (SPEC-EVAL-PROTOCOL, already built) and imports its functions; it does not copy or rewrite them. Lane: logic. Touches nothing live. IDs `EVPL-n`.

Chase approved Nov 25: one pipeline, four agents, each with its own task set and rubric.

## Why

Four agents have four hand-built evals: lazy prompts (staff-pm), agent-misses cases (qa-tdd, staff-pm), UX build (ux-reviewer) and stakeholder. They differ in how grading, freezing, held-out use and token logging work, and only lazy prompts has the v2 protocol. Every new agent edit means re-learning which script to run. No eval has a human answer key with measured agreement, so none can back a public claim.

Bet: Chase runs the same few commands for any agent and reads one report with intervals, models and tokens. It worked when all four agents have a suite config, one held-out run per change is enforced by code, and `report --claim` refuses until Chase's marks reach 20 pairs.

## Constraint: no paid API key

Model calls run as Claude Code subagents inside a session. So the pipeline never calls a model. It is job-list-out, results-in:

1. `jobs` writes a list of generation jobs, then (after `collect`) a list of grading jobs. Each job is a small file: id, input, model to use, input hash.
2. The session runs each job as a subagent and writes one result file per job.
3. `collect` validates what came back and builds `run.json`. `report` and `calibrate` compute from it.

A key-gated CI job that runs the same jobs through the API is a later add-on (P4) and never required.

## Suite config: `evals/suites/<agent>.json`

An agent with two suites uses `<agent>.<name>.json` (staff-pm: pairwise lazy prompts, plus `staff-pm.cases.json`). Fields: `agent`, `kind` (`pairwise` or `cases`), `tasks` (file), `rubric` (file), `split` (counts: dev, heldout), `arms` (subset of agent, plain, plain-rules; plain required), `runs` (per task and arm; odd for `cases`), `votes_per_order` (pairwise, default 3), `votes` (cases, odd, default 3), `grader_model`, `agent_model`, `key` (answer key path), `strip` (patterns removed from outputs before grading, e.g. the spec block). Paths are repo-relative; every output shows basenames only.

Task file entries: `id`, `split` (dev or heldout), `text`, plus kind-specific fields. Existing task files are read as they are through a small per-suite adapter; they are not rewritten.

## Commands (all exit 0 ok, 1 problems, 2 usage)

- `init --agent A --kind K`: scaffold a config with defaults. Refuses to overwrite.
- `check-suite <config>`: validate a config and the files it names.
- `freeze --suite S`: runs the eval-protocol freeze on tasks and rubric, and also hashes the suite config and the key file's path into `evals/suites/<agent>.frozen.json` (schema 1 stays readable by `eval-protocol verify`).
- `jobs --suite S --phase dev|heldout --change ID [--stage gen|grade|sheet]`: emit jobs. Refuses if verify fails. Held-out: one emit per change id, recorded in `evals/suites/<agent>.ledger.json`; a second emit for the same id is refused (a `--reissue` for only the missing job ids of the same run is allowed and logged).
- `collect --run DIR [--partial]`: validate returned results and write `run.json` in the v2 shape that `eval-protocol check-run` accepts (`cases` runs add `cases[]`).
- `sheet`: a blind A/B sheet of up to N pairs for Chase to mark; the arm mapping stays in a sealed file.
- `key-add --suite S --marks "id=A,id=tie"`: Chase's marks; the blind map turns A/B into arms.
- `calibrate --suite S`: raw agreement and Cohen's kappa of grader verdicts against Chase's marks, writes `calibration.json` with `claim_ok`.
- `report --suite S [--json] [--claim]`: both kinds, plus a labeled legacy v1 section.
- `import-v1 --suite S --run DIR`: register an old run as v1, read-only.
- `status --suite S`: which stage is next and the exact command (the one-command entry for a session).

Run folders: `evals/runs/<agent>/<date>-<change>/` with `jobs/`, `results/`, `run.json`. Old runs stay where they are.

## Grading rules, by kind

**pairwise**: arm vs plain, blind A/B, each pair graded in both orders with `votes_per_order` fresh graders. Pair verdict, order majority, flips, per-task tally, sign test, Wilson, verdict and cost per win are exactly eval-protocol's `report` (called, not copied).

**cases**: each case has a pass or fail check per arm per run (deterministic code check where the case file has one, else `votes` fresh grader votes, majority). A case's result for an arm is pass when it passes more than half its runs. Noise per case: runs passed out of runs; a case is noisy when that is neither 0 nor all. Paired sign test over cases: win = agent passes and plain fails, loss = the reverse, both-pass and both-fail drop out; `signP` and `wilson` from `tools/studio-scorecard.mjs`. Verdict: "not proven" if fewer than 10 cases or p >= 0.05, else "edge shown" when wins > losses, "arm worse" otherwise.

**plain-rules**: plain Claude given the agent's rules as a prompt. For `cases` the agent vs plain-rules comparison is free (same outputs), so the report prints it as "design effect". For `pairwise` it needs direct pairs, so it is off unless the config sets `direct: true` and otherwise prints "not measured".

## Fixtures

P (pairwise): the F1 run from SPEC-EVAL-PROTOCOL, 5 tasks x 3 runs, arm agent only.

C1 (cases): 12 cases, 3 runs each, arms agent and plain.
- c1 to c8: agent passes 3 of 3, plain 0 of 3.
- c9: agent 2 of 3, plain 0 of 3.
- c10: agent 3 of 3, plain 3 of 3.
- c11: agent 0 of 3, plain 2 of 3.
- c12: both 0 of 3.

K1 (calibration): 20 marked pairs. Chase marks 10 agent and 10 plain. The grader verdict matches on 9 of the agent pairs and 9 of the plain pairs, and flips on 1 of each.

## Risks that shape the order

The pipeline can look rigorous and still hide a grader the human disagrees with; calibration is the guard and it costs Chase time. Held-out reuse is the quiet way evals go dishonest; the ledger is the guard. Rewriting four old evals could break what already works; import-v1 and read-only legacy runs are the guard.

```spec
verdict: ready
bet: Chase runs status, jobs, collect and report the same way for any of the four agents, and trusts the result because held-out use is enforced, grading is blind in both orders, and no public claim passes until his marks agree with the grader on at least 20 pairs; it worked when staff-pm's first v2 dev run prints a per-task verdict with intervals and tokens, and report --claim refuses until claim_ok
lane: logic
touches: non-live
step: M1.1 | P1 failing tests and fixtures P, C1, K1 for check-suite, init, freeze, jobs, collect, ledger, calibrate, key-add, report | EVPL-1 to EVPL-18 red for the right reason (no tools/eval-pipeline.mjs), EVP-1 to EVP-12 still green | 1 session
step: M1.2 | P1 refactor eval-protocol.mjs so its freeze, verify, check-run and report logic are exported functions behind an is-main guard with no behavior change, then build init, check-suite and freeze | EVPL-1 to EVPL-3 green 3x and EVP-1 to EVP-12 green 3x | 1 session
step: M1.3 | P1 build jobs, blind map, collect and the held-out ledger | EVPL-4 to EVPL-9 green 3x | 1 session
step: M1.4 | P1 build report for both kinds, key-add, sheet, calibrate, status and the claim refusal | EVPL-10 to EVPL-18 green 3x, PR 1 ready | 1 session
step: M2.1 | P2 import-v1, staff-pm and qa-tdd suite configs and adapters over the existing task and case files | EVPL-19 to EVPL-21 green 3x | 1 session
step: M2.2 | P2 wire reply-checks into collect for staff-pm and run one dev suite end to end through subagents | EVPL-22 green, one real dev run.json passes check-run and report | 1 session
step: M3.1 | P3 ux-reviewer suite with render step and attachments, plus import of the Nov 24 UX results as v1 | EVPL-23 and EVPL-25 green 3x | 1 session
step: M3.2 | P3 stakeholder suite with equal call counts across arms | EVPL-24 green 3x | 1 session
step: M4.1 | P4 CI workflow with a no-key check job and a key-gated run job | EVPL-26 green 3x | 1 session
step: M4.2 | P4 runbook skill, updates to the four eval READMEs and the docs/agent-training-plan.md log | EVPL-27 to EVPL-29 green 3x | 1 session
criterion: EVPL-1 | auto | Given a suite config with kind "triple", no rubric field and runs 2 on a cases suite, then check-suite exits 1 and prints 3 problem lines naming kind, rubric and runs; a complete pairwise config with plain in arms exits 0
criterion: EVPL-2 | auto | Given init --agent demo --kind cases, then evals/suites/demo.json has arms agent, plain and plain-rules, runs 3, votes 3, a key path and a heldout split field and check-suite exits 0; a second init for demo exits 1 and leaves the file unchanged
criterion: EVPL-3 | auto | Given freeze on a suite then verify exits 0, and given one byte appended to the suite config then verify exits 1 naming the config only, and jobs for that suite exits 1 without writing any job file
criterion: EVPL-4 | auto | Given a pairwise suite of 5 tasks, 3 runs and arms agent, plain and plain-rules, then jobs --stage gen writes 45 jobs each with an id, task, arm, run, model and input sha256, and after collect of all 45 jobs --stage grade writes 180 grading jobs (15 task-runs x 2 compared arms x 2 orders x 3 votes); with arms agent and plain only it writes 90
criterion: EVPL-5 | auto | Given any grading job, then its text holds only the labels "A" and "B" and the rubric, contains none of the strings "agent", "plain-rules", the agent model id or any strip pattern, the AB and BA jobs of one pair place the same two outputs in opposite slots, and the arm mapping exists only in the sealed blind-map file and not in jobs
criterion: EVPL-6 | auto | Given valid results for all 45 generation jobs, then collect exits 0, writes run.json with schema 2 and the frozen hashes, and eval-protocol check-run on that file exits 0
criterion: EVPL-7 | auto | Given results with an unknown job id, a duplicate id, a missing model, tokens "lots", an input sha256 that differs from the job and a grader answer "C", then collect exits 1 and prints 6 problem lines each naming the job id and the field; given a missing job without --partial it lists the missing id and exits 1
criterion: EVPL-8 | auto | Given jobs --phase heldout --change c1 then the first call exits 0 and the ledger holds c1, a second call for c1 exits 1 with "held-out already run for change c1", a call for c2 exits 0, dev phase can be emitted any number of times, and --reissue for c1 emits only the ids still missing and logs it
criterion: EVPL-9 | auto | Given a tasks file with 5 dev and 3 heldout tasks, then jobs --phase dev emits tasks from the 5 dev only and jobs --phase heldout from the 3 only; given a suite with no heldout tasks, heldout jobs exits 1
criterion: EVPL-10 | auto | Given the pairwise run built from fixture P, then report --json gives the same pair counts (agent wins 9, losses 3, ties 3), prompt tallies, sign p 0.625, Wilson 0.30 to 0.95 (within 0.01), flip rate 1/15 and verdict "not proven" as eval-protocol report on the same file, and the pipeline imports the protocol functions rather than defining its own
criterion: EVPL-11 | auto | Given fixture C1, then report --json shows wins 9, losses 1, both-pass 1, both-fail 1, sign p 0.021 (within 0.002), Wilson 0.60 to 0.98 (within 0.01), noisy cases c9 and c11 (2 of 12), verdict "edge shown", and design effect "not measured" when no plain-rules arm exists
criterion: EVPL-12 | auto | Given C1 with only the first 9 cases, then the verdict is "not proven" because there are 9 cases; given 12 cases with 5 wins and 5 losses, then sign p is 1.0 and the verdict is "not proven"
criterion: EVPL-13 | auto | Given a cases run with a plain-rules arm where agent and plain-rules pass the same cases, then design effect prints "not proven" with wins 0 and losses 0 and report states the agent edge over plain may come from the rules alone
criterion: EVPL-14 | auto | Given fixture K1, then calibrate prints raw agreement 0.90, kappa 0.80 and n 20 with claim_ok true; given the same data cut to 19 pairs, then claim_ok is false with reason "fewer than 20 marked pairs"; given 20 pairs with agreement 0.60 and kappa 0.20, then claim_ok is false with reason "kappa below 0.6"; given all marks identical, kappa prints "undefined" and claim_ok is false
criterion: EVPL-15 | auto | Given claim_ok false or no calibration.json, then report --claim exits 1 printing the reason and no verdict line, and given claim_ok true and verdict "edge shown" it exits 0
criterion: EVPL-16 | auto | Given sheet with a sealed blind map, then key-add --marks "p-03=A,p-04=tie" stores the arm that label A hid for each pair, an unknown pair id exits 1 and writes nothing, and re-marking an existing pair without --replace exits 1; with --replace it keeps the old mark in a history field
criterion: EVPL-17 | auto | Given a run with arm tokens agent 90000 and plain 30000 and 9 pair wins, then report shows tokens per arm and cost per win 10000 for agent; given tokens "not measured" it prints "not measured" and never a number; every report prints grader model, agent model, run count, votes and change id
criterion: EVPL-18 | auto | Given a suite that holds an imported v1 run, then report prints its stored tally under the label "v1: single vote, order unknown, not recomputed", prints no derived pair verdict, flip rate or interval for it, and lists v2 runs above it
criterion: EVPL-19 | auto | Given import-v1 on evals/lazy-prompts/runs/2026-11-24-fresh-prompts, then the suite index records the run as v1 with the stored tally agent 10 and plain 5, the sha256 of its results.json and basenames only, no file in that run folder changes, and a later byte change to results.json makes report print "legacy file changed" and exit 1
criterion: EVPL-20 | auto | Given staff-pm.json and staff-pm.cases.json, then check-suite exits 0 for both, the pairwise tasks are the prompts in evals/lazy-prompts/prompts.json with their dev and heldout split kept, and the cases tasks equal the staff-pm cases in evals/agent-misses with dev plus heldout equal to the total
criterion: EVPL-21 | auto | Given qa-tdd.json, then check-suite exits 0, its task count equals the qa-tdd cases in evals/agent-misses, the cross arm from old runs is accepted as an extra arm compared against plain only, and node tools/eval-miss-score.mjs --check-all still exits 0 unchanged
criterion: EVPL-22 | auto | Given collect on a staff-pm pairwise run, then each generation output gets reply-checks counts (dated_next_step, asks, lint_ok_lines, words) stored in run.json and a reply with lint_ok_lines 1 is flagged in the report without changing the verdict
criterion: EVPL-23 | auto | Given ux-reviewer.json, then tasks are the 8 prompts of evals/ux-build/prompts.json with 3 heldout, collect accepts a generation result only when its HTML has no external URL and its 390x844 and 1280x800 PNG files exist, and the Nov 24 UX results import as v1 with their change id burned in the ledger
criterion: EVPL-24 | auto | Given stakeholder.json, then the agent arm job lists 3 persona steps plus one merge step, plain and plain-rules jobs also list 3 calls and the same merge step, and collect exits 1 naming the arm when call counts differ
criterion: EVPL-25 | auto | Given an imported held-out run for a change id, then jobs --phase heldout for that change id exits 1, so old held-out runs count as used
criterion: EVPL-26 | auto | Given the CI workflow, then the no-key check job runs check-suite, verify, ledger and stale-report checks and exits 0 on the repo, and the key-gated run job with the key unset prints "skipped: no key" and exits 0
criterion: EVPL-27 | auto | Given plugins/studio, then a runbook skill exists whose text names status, jobs, collect, sheet, key-add, calibrate and report in that order and says each job runs as "one subagent", and tests/check.sh exits 0
criterion: EVPL-28 | auto | Given the four eval READMEs, then each names its suite config path and says old runs stay v1, and docs/agent-training-plan.md has an update-log line for each of P1 to P4 as they merge
criterion: EVPL-29 | auto | Given any run.json, calibration.json, ledger or report output, then it holds basenames and 0 full paths, no prompt text beyond task ids, and 0 matches for the LEAKS patterns in tools/check-story-entry.mjs
criterion: EVPL-30 | manual | Given the first 20 staff-pm pairs on a sheet, when Chase marks them, then calibrate reports his agreement and kappa and he reads the number before any claim is made
cut: The UX rounds-to-good loop and Opus stand-in feedback | stays in tools/ux-build-eval.mjs; this pipeline covers the first-build comparison only
cut: Calling models or the API from the pipeline | no paid key; only the optional P4 job does, and only with a key
cut: Rewriting or recomputing any v1 run | v1 has one vote and unknown order; import is read-only
cut: Agent vs plain-rules pairs for pairwise by default | triples the grading cost; flip on direct: true per suite
cut: Plugin-level evals under plugins/studio/evals (claude plugin eval) | a different tool and a separate check that agents are dispatched; leave as is
cut: Web dashboard or charts | one text report is enough to decide
cut: Calibrating all four agents before P2 starts | marks cost Chase hours; staff-pm first
risk: A new tool duplicates eval-protocol and the two drift | EVPL-10
risk: Held-out set quietly reused after an edit | EVPL-8
risk: Grader leaks arm names or position into judgments | EVPL-5
risk: Grader disagrees with Chase and nobody notices | EVPL-14
risk: A public claim made before calibration | EVPL-15
risk: Old runs get recomputed or edited and history is lost | EVPL-19
risk: Stakeholder arms get unequal calls again | EVPL-24
risk: Refactoring eval-protocol breaks the 12 passing protocol criteria | M1.2
risk: Chase's marking time stalls the claim | EVPL-30
decision: Kappa floor for claim_ok besides 20 pairs | 0.6 (substantial agreement); drop to 0.4 only if Chase says so after seeing K1-like data
decision: Does a burned held-out change id ever reopen | No; a new change id is a new edit, and a harness failure uses --reissue for missing jobs only
decision: Marking load | Calibrate staff-pm first (20 pairs), reuse the same method for the others later; the other suites keep claim_ok false until their own 20 are marked
decision: Votes for cases suites | 3 for model-graded cases, 1 for cases with a deterministic code check
decision: Held-out change ids are burned when jobs are emitted, not when results come back | Yes, so an abandoned run still counts and nobody peeks and retries
decision: Agent vs plain-rules for pairwise suites | Off by default; on for the first staff-pm held-out run only, to learn whether the rules alone explain the edge
handoff: qa-tdd | failing tests and fixtures P, C1, K1 for EVPL-1 to EVPL-18, then EVPL-19 to EVPL-29 per PR | red for the right reason (no tools/eval-pipeline.mjs), EVP-1 to EVP-12 untouched
handoff: engineer | P1 refactor and build of tools/eval-pipeline.mjs (M1.2 to M1.4); P2 to P4 per step | each PR green 3x with its criterion IDs
handoff: privacy-security | review of run.json, ledger, sheet and results folders for personal data and full paths, and of the key-gated CI job | EVPL-29 green and no secret or key id in the workflow
handoff: architect | the CI workflow and the optional API runner, and the dependency question for the render step (Playwright already used by ux-build-eval) | one-line reason recorded, no new runtime dependency
handoff: ux-reviewer | read the sheet and report wording Chase sees on a phone | no line over 80 characters and a plain verdict line first
handoff: positioning | claim wording allowed after claim_ok (wins out of N, never a multiplier) | copy matches the report text
```

## Added design notes (coordinator, 2026-11-25; not built in P1)
- Extra arms: suite config should allow named extra arms such as `ablate:<component>` (agent minus one component) and `orchestrated` (Staff PM single agent vs orchestrated). Each is just another arm compared against plain or agent; P2 loosens check-suite's fixed arm list.
- Tool count per run: results may carry an optional `tool_calls` number, reported per arm beside tokens ("not measured" when absent). Planned for P2 with the Staff PM and QA-TDD migration.
