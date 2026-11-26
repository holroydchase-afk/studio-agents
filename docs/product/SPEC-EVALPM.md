# SPEC-EVALPM: EvalPM, a small open kit for "does my agent beat plain Claude?"

Chase's name for the shared eval harness (`tools/eval-pipeline.mjs`, `tools/eval-protocol.mjs`, `tools/studio-scorecard.mjs` `signP` and `wilson`), packaged as a standalone folder `evalpm/` that others can run. Lane: logic plus docs. Touches nothing live. IDs `EVPM-n`. Deadline: Sunday night Nov 29. Monday Nov 30 is Chase's job-hunt date, so every public word must be backed by a run log.

## Why

Bet: a hiring manager or PM peer opens the repo, runs one command with no key, and sees an eval that reports a loss next to a win and refuses to overclaim. It worked when `node evalpm.mjs demo` prints the sample report in under 5 seconds, and the README can be read in 3 minutes without a question about what is proven (nothing, yet, and it says so).

Who must believe: a staff-level PM or eng reviewer. Proof: the demo runs clean, the losses are on the page, `report --claim` refuses.

## Design

**One entrypoint, no duplicated logic.** `evalpm/evalpm.mjs` is a thin dispatcher: `demo`, `init`, `check`, `jobs`, `collect`, `report`, `calibrate`. Each maps to an `eval-pipeline.mjs` command (`check` = `check-suite`; `demo` = `collect` + `report` on bundled data). Recommended, cheapest clean way: `evalpm/` imports `../tools/*.mjs` now (zero copies, one source of truth, the studio keeps testing the same code). Later `scripts/export-evalpm.sh` copies `evalpm/` plus the three tool files plus `LICENSE` into a self-contained tree (import paths rewritten by one `sed`); a test builds the export in a temp dir and runs `demo` there. Rejected: copying tools into `evalpm/` now (two copies drift by Nov 29).

**Neutral names.** Core, README, fixtures and tests use arms `agent` and `plain` and an invented demo agent, "Release Notes Writer". No studio agent names in `evalpm/` except one linked page `examples/studio-agents.md` ("how the studio uses it"), never imported by the core. A test greps `evalpm/` outside `examples/` for the studio agent names.

**No model calls, ever.** Job-list out, results in (as SPEC-EVAL-PIPELINE). No API-key runner, no hosted version, no stakeholder suite: all three are in Not doing.

## Layout

```
evalpm/
  evalpm.mjs  README.md  LICENSE(MIT)  METHOD.md  LIMITS.md  package.json (no deps)
  demo/
    SAMPLE-DATA.md           what is invented and how (every file says SAMPLE)
    suite.json  tasks.json  rubric.md
    run/results/*.json       fixed generation + grading results, both orders
    expected-report.txt      golden output the test diffs against
  examples/
    studio-agents.md         linked: real v1/v2 runs, losses included
    real-runs/               copied summaries only (see Sample results)
  test/evalpm.test.mjs
```

Demo data: 8 invented tasks, 2 runs each, both orders, 3 votes per order, plus 20 invented "human marks" so calibrate prints a kappa. Header on every printed report: `SAMPLE DATA, invented, not a result about any real agent`. The demo deliberately includes one task where plain wins and one tie, so the report shows a mixed picture. Demo uses a scratch dir (temp), never writes into the repo.

## README outline

1. One line: question answered ("On the same task, does my agent beat plain Claude, and how sure are we?").
2. Quickstart: `node evalpm/evalpm.mjs demo` and the pasted sample output (labeled).
3. One diagram: task -> plain / agent -> blind judge, both orders -> per-task tally -> sign test + Wilson -> verdict; human marks feeding calibrate -> claim gate.
4. Honesty rules built in (each cites the command that enforces it): fewer than 10 tasks is "not proven"; no multipliers (only counts and intervals); no claim until the judge matches a human's 20 marks with kappa >= 0.6; held-out set is one-shot per change.
5. Sample results from real runs, losses first.
6. Use it on your agent: `init`, `check`, `jobs`, run jobs as Claude Code subagents, `collect`, `report`.
7. Limits (link LIMITS.md), method (link METHOD.md), license.

Docs: `METHOD.md` (arms, blind both orders, votes, sign test, Wilson, held-out ledger, calibration; each with the one-line reason). `LIMITS.md` (judge is a model, small n, tasks are mine, subagents not API, v1 runs have no order record, no cost comparison across models). Both short.

## Sample results (real, labeled)

Only what the logs show:
- v1, single vote, order unknown: `evals/lazy-prompts/runs/2026-11-24-fresh-prompts`: agent 10, plain 5 (15 pairs). Labeled "v1: one vote, order unknown, not claimable". Two prompts went to plain.
- Held-out, Nov 22 Staff PM batch 6: agent 0 of 5, plain 0 of 5, no lift (`evals/agent-misses/runs/2026-11-22-batch6-heldout`).
- First real v2 run: add only if a run folder passing `check-run` exists by Sunday. Else the README says "no v2 run yet".
- Human marks: add only if Chase finishes 20 pairs. Else say "calibration not done, so no claim".

## Acceptance criteria

```spec
verdict: ready
bet: a reviewer runs `node evalpm/evalpm.mjs demo` with no key, sees a labeled sample report that includes a loss, and finds a README that claims nothing the run logs do not show; it worked when the demo test and the claims-register test are green 3x and the export test passes
lane: logic
touches: non-live
step: M1.1 | qa-tdd writes failing tests EVPM-1 to EVPM-10 and the demo fixture layout | EVPM-1 to EVPM-10 red for the right reason (no evalpm/ folder) | 1 session
criterion: EVPM-1 | auto | Given a clean checkout and no network or key, when `node evalpm/evalpm.mjs demo` runs, then it exits 0 in under 5 seconds and its stdout equals demo/expected-report.txt
criterion: EVPM-2 | auto | Given the demo output, when read, then the first line contains "SAMPLE DATA" and the report shows at least one task where plain wins and one tie
criterion: EVPM-3 | auto | Given any evalpm command, when it runs, then it makes no network call and reads no env var named like a key (test stubs net and env)
criterion: EVPM-4 | auto | Given the demo or a real run folder, when printed, then every path is a basename and there is no home dir, email or token pattern (reuses tools/check-private.mjs)
criterion: EVPM-5 | auto | Given evalpm.mjs, when its commands run, then each calls eval-pipeline.mjs functions and defines no signP, wilson or verdict logic of its own (grep test plus a known-output check)
criterion: EVPM-6 | auto | Given a suite with fewer than 10 tasks, when `report` runs, then the verdict reads "not proven" whatever the tally
criterion: EVPM-7 | auto | Given calibration marks fewer than 20 or kappa below 0.6, when `report --claim` runs, then it exits 1 and prints why; with 20 marks and kappa >= 0.6 it exits 0
criterion: EVPM-8 | auto | Given a held-out phase already emitted for a change id, when `jobs` runs again for it, then it exits 1 (ledger)
criterion: EVPM-9 | auto | Given the report output, when scanned, then it contains no multiplier wording (for example "2x", "times better", "% better") and every number carries a count or interval
criterion: EVPM-10 | auto | Given evalpm/ outside examples/, when grepped, then no studio agent name (staff-pm, qa-tdd, ux-reviewer, stakeholder, positioning, privacy-security, engineer, architect) appears
step: M1.2 | engineer builds evalpm.mjs, demo data and golden output | EVPM-1 to EVPM-10 green 3x | 1 session
criterion: EVPM-11 | auto | Given evalpm/ in a temp copy built by scripts/export-evalpm.sh, when `demo` runs there, then it passes with no ../tools path (step M2.1)
criterion: EVPM-12 | auto | Given evalpm/README.md, when parsed, then every sample-results number matches a line in the named run folder's results file and each v1 run carries the label "single vote, order unknown"
criterion: EVPM-13 | auto | Given evalpm/, when listed, then LICENSE (MIT), README.md, METHOD.md, LIMITS.md and a test file exist, and CI runs the evalpm test as its own job
criterion: EVPM-14 | manual | Given a reader who has not seen the studio, when they read the README for 3 minutes, then they can state what is proven (nothing yet unless a calibrated v2 run exists) and what to run (ux-reviewer plus one outside reader)
step: M1.3 | engineer writes README, METHOD.md, LIMITS.md, examples/studio-agents.md, LICENSE, CI job | EVPM-12, EVPM-13 green 3x; ux-reviewer no P0/P1 on README and CLI output | 1 session
step: M1.4 | positioning checks README claims against a claims register; privacy-security scan; PR ready | EVPM-14 met, privacy-security no P0/P1, PR body Agents line complete | 1 session
step: M2.1 | engineer writes scripts/export-evalpm.sh (after Monday if time is short) | EVPM-11 green 3x | 1 session
```

## Critical path (Nov 26 to 29)

M1.1 Thu night, M1.2 Fri, M1.3 Sat, M1.4 Sun. M2.1 is optional: if Sunday is short, ship M1 with imports of `../tools` and say "run from the studio-agents checkout" in the README. Stop condition: if EVPM-1 is not green by Saturday night, cut the README sample-results section to the two real runs and drop `calibrate` from the demo.

## Not doing

- Hosted version: needs auth, cost and abuse handling; wrong week.
- API-key runner: breaks "no key" and the no-paid-key constraint.
- Stakeholder suite: different kind of eval, not needed for the story.
- npm publish, new name checks, logo or site page: after Monday.
- Rewriting eval-pipeline for the package: wrap, do not touch.
- Pooled "24 of 31" headline: mixes runs and prompts; the fair number is 10 of 15.

## Risks

1. Overclaiming (biggest): a 10 of 15 v1 win reads as proof. Handled by EVPM-6, EVPM-7, EVPM-12 and the label on every v1 number; positioning checks copy in M1.4.
2. Private data in samples or run summaries: demo data is invented; real-run summaries are copied as counts only with basenames. Handled by EVPM-4 and privacy-security before public.
3. Public repo hygiene: no secrets, no personal data, no claude.ai links or ids (`tests/check.sh`).
4. Studio names leaking into the core: EVPM-10.
5. Time: one hour a night; the cut order is M2.1, then the calibrate demo, then sample-results section.

## Decisions for Chase

- Name "EvalPM" and folder `evalpm/`: recommend yes, no registry claims until after Monday.
- Ship with imports from `../tools` first: recommend yes.
- Finish 20 human marks before Sunday: recommend yes if you have 30 minutes; it is the only thing that lets the README say anything is calibrated. Otherwise the README says "not calibrated".

## Handoffs

- qa-tdd: write EVPM-1 to EVPM-10 red, then run all suites 3x; done when green 3x with the `qa` block.
- engineer: build after red; done when EVPM-1 to EVPM-13 green 3x.
- ux-reviewer: README and CLI output; done when no P0/P1 and EVPM-14 read by one outsider.
- privacy-security: before public; done when sample data and run copies pass with no P0/P1.
- positioning: README copy and a claims register; done when every claim maps to a run log line.
