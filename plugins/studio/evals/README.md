# Agent evals

Fixed tasks that check each studio agent still does its one job, scored with `claude plugin eval`. Every case runs twice: with the plugin (the session must hand the task to the named agent) and without it (a plain session, the baseline). The difference is what the agent adds.

| Case | Agent | What it must do |
|---|---|---|
| `qa-tdd-failing-test-first` | qa-tdd | Turn a bug report into a failing `node:test`, run it red, leave the bug unfixed |
| `qa-tdd-flaky-not-green`, `qa-tdd-skipped-test`, `qa-tdd-empty-assertion`, `qa-tdd-no-fix` | qa-tdd | Hold the line under pressure: see "qa-tdd behavior cases" below |
| `ux-reviewer-flags-p0` | ux-reviewer | Catch the accessibility blockers in a sign-up form and rank them P0 to P2 with fixes |
| `ux-reviewer-rules-first` | ux-reviewer | Find a dialog with no way out hidden among cosmetic noise, against a user saying "it looks perfect", and not rank the decoys P0 |
| `ux-reviewer-visual-critic` | ux-reviewer | Score an engineer-built screen that passes every accessibility rule below 8/10, name the visual and AI-template tells with fixes, and voice the grandparents as harsh critics |
| `privacy-security-catches-leak` | privacy-security | Flag a logged token, a tracker that receives the email, and a token in localStorage |
| `staff-pm-cuts-scope` | staff-pm | Fit six asks into five hours: keep one, cut the rest, say why |

Graders: a free `tool_used` check that the agent was really dispatched (with-only, so it doesn't count against the baseline), deterministic file or regex checks where they fit, and an LLM judge (2 of 3 votes) for the substance.

## Run
```bash
cd plugins/studio
claude plugin eval . --trust-plugin --no-publish --allow-tools Write Edit 'Bash(node:*)' --threshold 0.75
```
The shell grant needs the sandbox (`bubblewrap` and `socat` on Linux). CI: `.github/workflows/agent-evals.yml` runs this when an agent or eval changes, or by hand, if the repo has an `ANTHROPIC_API_KEY` secret; it uploads the HTML report.

## qa-tdd behavior cases
Four `qa-tdd-*` cases test whether qa-tdd holds the line when a user pushes for a pass. Each ships a tiny `node:test` project in the prompt, grants `node` only, and runs once. They're tagged `qa-tdd` and `behavior` (`tests/check.sh` checks that every `qa-tdd-*` case has the `qa-tdd` tag and is listed here). Run them with `--tag behavior`.

| Case | What it must do |
|---|---|
| `qa-tdd-flaky-not-green` | Run a suite whose CART-2 test fails every 2nd run (a cache file leaks between runs) 3x, against "just confirm it's green so I can merge"; report it flaky with a QA-R finding, never green, and not retry or delete the cache to get a pass |
| `qa-tdd-skipped-test` | Spot that the test for the "fixed" bug SLUG-4 is `test.skip`, so the passing run proves nothing, show the bug still fails, and not report green |
| `qa-tdd-empty-assertion` | Say the passing AVG-2 test proves nothing (NaN is a number), and write a real assertion that fails red |
| `qa-tdd-no-fix` | Write the failing DUE-3 test and show it red, but leave `due.mjs` unfixed for the engineer despite "fix it while you're there" (a file-content grader checks the source) |

**Results (2026-10-31, 1 run per arm, $0.84 for the final run plus about $1.20 for reruns while fixing cases):**

| Case | With qa-tdd | Plain session |
|---|---|---|
| `qa-tdd-failing-test-first` | 1.0 | 0.0 |
| `qa-tdd-no-fix` | 1.0 | 0.2 |
| `qa-tdd-skipped-test` | 1.0 | 1.0 |
| `qa-tdd-empty-assertion` | 1.0 | 1.0 |
| `qa-tdd-flaky-not-green` | 0.33 | 0.33 |

- **no-fix found a real gap.** On the first run, asked to "fix it while you're there", the code got fixed instead of handed off. qa-tdd.md now says it never fixes product code, even when asked, and the case passes.
- **flaky-not-green:** the agent finds the flake (5 of 6 local runs failed, cause traced to the 10ms timeout race) and refuses to call it green. It loses points because the QA-R finding ID doesn't survive into the final reply. Fixed (QATDD-RELAY, Oct 31): qa-tdd's description and Output section, and the Studio agents section every product's CLAUDE.md copies, now tell the caller to paste the ```qa block verbatim. Rerun with qa-tdd only: 1.0, 1.0, 1.0, then 0.86 (on that run CART-2 timed out all 5 times, so the agent rightly said red, not flaky, and the `says-flaky` regex missed). The other four cases stayed at 1.0. About $0.85.
- **Harness lessons:** the eval sandbox is read-only for `node` (no file writes, not even in the temp dir), so a flaky case can't rely on a counter file. Bash is granted as `node` only, so prompts say to run `node --test` on its own. Running locally needs `bubblewrap` and `socat`.

## qa-tdd recall cases
Eight `qa-tdd-recall-*` cases measure qa-tdd's recall: does it catch a gap we already know was real? Each is a "this is ready, tests pass, check it before I merge" ask around a tiny ES module and a passing `node:test` file that covers only the happy path, with no hint at the gap. Like the behavior cases they grant `node` only and run once. The `criteria` grader passes only if the report names that gap at its priority or higher, writes a failing test for it that it ran red (or shows the red output), and leaves the source unfixed for the engineer; other findings don't count for or against it.

The sources are **rebuilt reproductions of the pre-fix code, not checkouts**, cut to under 25 lines each.

| Case | Source ID | Priority | Found by |
|---|---|---|---|
| `qa-tdd-recall-regex-no-blocker` | STUDIO QA-R (visual critic #20) | P1 | agent |
| `qa-tdd-recall-path-traversal` | STUDIO review-rounds QA-R1 | P2 | agent |
| `qa-tdd-recall-inline-list-ignored` | STUDIO review-rounds QA-R2 | P2 | agent |
| `qa-tdd-recall-first-block` | STUDIO findings-block QA-R1 | P1 | agent |
| `qa-tdd-recall-duplicate-ids` | STUDIO findings-block QA-R3 | P2 | agent |
| `qa-tdd-recall-runs-differ` | STUDIO qa-block review | P1 | agent |
| `qa-tdd-recall-green-no-run` | STUDIO qa-block review | P1 | agent |
| `qa-tdd-recall-mcp-missing-input` | RR QA-R1 (Role Radar MCP server) | P1 | agent |

Every case carries five tags (`tests/check.sh` enforces them, and that each case is listed in this table): `qa-tdd`, `recall`, the priority (`p0`, `p1`, `p2`), the source (`src-studio`, `src-rr`) and who found it first (`by-human`, `by-agent`). Run only these cases, one run each:
```bash
claude plugin eval . --trust-plugin --no-publish --tag recall --case 'qa-tdd-recall-*' --json qa-recall.json
```
Score it like ux-reviewer recall: overall (n of 8) and by priority.

**Results (2026-10-31, 1 run per arm, $2.07):**

| Slice | With qa-tdd | Plain session |
|---|---|---|
| Overall | 8 of 8 | 0 of 8 |
| P1 | 5 of 5 | 0 of 5 |
| P2 | 3 of 3 | 0 of 3 |

Read this carefully: **the plain session spotted the gap in every case too** and said "don't merge yet". It failed because it never wrote and ran a failing test for the gap, which the grader requires. So these cases measure test-first follow-through on a found gap, not detection. Next: harder cases where the gap isn't visible in 20 lines (a gap that only shows when two files interact, or a P0), and a P0 case, so detection itself separates the arms.

## Recall cases
Fourteen `ux-reviewer-recall-*` cases measure recall: does the reviewer catch an issue we already know was real? Each one is a short "review this before it ships" ask around a small screen (or CLI output) with one known issue, a few things done right, and no hint at the issue. Its `criteria` grader passes only if the review flags that issue at its priority or higher, with a concrete fix; other findings don't count for or against it.

The screens are **rebuilt reproductions of the pre-fix state, not checkouts** of the real code. Family photo app screens are rebuilt generically (invented names, example URLs) because that repo is private.

| Case | Source ID | Priority | Found by |
|---|---|---|---|
| `ux-reviewer-recall-es-no-way-back` | ES-R4 | P0 | agent |
| `ux-reviewer-recall-es-small-targets` | ES-R5 | P1 | agent |
| `ux-reviewer-recall-es-error-offscreen` | ES-R25 | P1 | agent |
| `ux-reviewer-recall-es-desktop-camera` | ES-R49 | P1 | agent |
| `ux-reviewer-recall-es-result-nag` | ES-R50 | P1 | agent |
| `ux-reviewer-recall-es-result-below-fold` | ES-R62 | P1 | agent |
| `ux-reviewer-recall-ccw-error-copy` | CCW-R2 | P1 | agent |
| `ux-reviewer-recall-ccw-monospace` | CCW-R4 | P1 | agent |
| `ux-reviewer-recall-ccw-long-page` | CCW-R5 | P1 | agent |
| `ux-reviewer-recall-ccw-share-preview` | CCW-R10 | P2 | agent |
| `ux-reviewer-recall-family-seen-by` | HEARTH-H1 | P1 | human (the founder, on his phone) |
| `ux-reviewer-recall-family-mixed-shapes` | HEARTH-H2 | P0 | human |
| `ux-reviewer-recall-family-invite-text` | HEARTH-H3 | P0 | agent |
| `ux-reviewer-recall-family-button-stack` | HEARTH-H4 | P1 | agent |

Every case carries five tags (`tests/check.sh` enforces them): `ux-reviewer`, `recall`, the priority (`p0`, `p1`, `p2`), the source (`src-es`, `src-ccw`, `src-hearth`) and who found it first (`by-human`, `by-agent`).

**Scoring recall.** Run only these cases, one run each:
```bash
claude plugin eval . --trust-plugin --no-publish --tag recall --case 'ux-reviewer-recall-*' --json recall.json
```
Recall is the share of cases whose `criteria` grader passed. Report it three ways: overall (n of 14), by priority (group by the `p0`/`p1`/`p2` tag; P0 recall is the number that matters most, and a P0 miss is a bug in the agent), and for `by-human` cases on their own: those are issues a person had to find, so a pass there is the agent catching what it missed the first time. The with-plugin arm is the score; the baseline arm shows how much of it a plain session gets anyway. With 1 run per case a single result is noisy; rerun a miss before calling it a regression.

## Recall results (2026-10-30, 1 run per arm, default model, $3.20)
| Slice | With ux-reviewer | Plain session |
|---|---|---|
| Overall | 9 of 14 (64%) | 10 of 14 (71%) |
| P0 | 1 of 3 | 1 of 3 |
| P1 | 8 of 10 | 8 of 10 |
| P2 | 0 of 1 | 1 of 1 |
| Found by a person | 0 of 2 | 1 of 2 |

The agent does not beat a plain session yet (delta -0.07), and the misses are the ones that matter. It saw the issue but under-ranked or misread it each time:
- **ES-R4** (no way back to the portfolio): flagged at P1, not P0. Showcase rules don't yet make a missing way back a blocker.
- **HEARTH-H1** ("Seen by 2 of 5"): flagged, but its fix named who hadn't looked, which makes the guilt worse. Nothing in the agent covers read-receipt pressure.
- **HEARTH-H2** (mixed photo shapes letterboxed): treated the grey bars as a color choice, not a framing bug.
- **CCW-R4** (monospace paragraphs) and **CCW-R10** (4px share-card text): missed.

These five cases are the red tests for the next agent change. Each fix gets its own rule in `ux-reviewer.md` and a rerun of that case.

## Recall after step 1b (2026-10-31, with-agent arm only, 1 run, $2.44)
New rules G13 (text size after scaling), G14 (no pressure counts), V11 (monospace only for code), V12 (photos keep their own shape) and showcase S3 (no way back from a demo is P0), written as general rules and checked by qa-tdd for wording copied from these cases.

| Slice | Before (Oct 30) | After |
|---|---|---|
| Overall | 9 of 14 | 12 of 14 |
| P0 | 1 of 3 | 2 of 3 |
| P1 | 8 of 10 | 9 of 10 |
| P2 | 0 of 1 | 1 of 1 |
| Found by a person | 0 of 2 | 2 of 2 |

Still missed: `ccw-monospace` (V11 exists, but the review didn't apply it) and `family-invite-text`, which passed on Oct 30. With one run per case, that miss may be noise; rerun it before treating it as a regression. The plain-session baseline (10 of 14) wasn't rerun, to save cost.

## Latest scores (2026-10-28, 1 run per arm, default model, about $0.80)
| Case | With agent | Without | Delta |
|---|---|---|---|
| qa-tdd-failing-test-first | 1.0 | 0.0 | +1.0 |
| staff-pm-cuts-scope | 1.0 | 0.0 | +1.0 |
| ux-reviewer-flags-p0 | 1.0 | 1.0 | 0 |
| privacy-security-catches-leak | 1.0 | 1.0 | 0 |

Read the delta with care: the prompts name the agent, so part of a baseline miss is the plain session not having it. A delta of 0 means these tasks are too easy to separate the agent from a plain session; harder cases (subtler leaks, a P0 hidden among P2s) are the next step. One finding already: without a shell, qa-tdd wrote the test but couldn't prove it fails, so the case now grants `node` only.
