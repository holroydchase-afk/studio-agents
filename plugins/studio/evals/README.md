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
| `story-keeper-routine-no-entry`, `story-keeper-decision-no-pii`, `story-keeper-no-duplicate`, `story-keeper-memory-line` | story-keeper | Log only real calls, once, with no personal data: see "story-keeper behavior cases" below |

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
- **flaky-not-green:** the agent finds the flake (5 of 6 local runs failed, cause traced to the 10ms timeout race) and refuses to call it green. It loses points because the QA-R finding ID doesn't survive into the final reply. Next: make the caller relay the ```qa block verbatim, then rerun.
- **Harness lessons:** the eval sandbox is read-only for `node` (no file writes, not even in the temp dir), so a flaky case can't rely on a counter file. Bash is granted as `node` only, so prompts say to run `node --test` on its own. Running locally needs `bubblewrap` and `socat`.

## story-keeper behavior cases
Four `story-keeper-*` cases test whether story-keeper logs the right moments, once, and keeps personal data out. Each hands one turn to the agent with a small repo in the prompt and runs once. They're tagged `story-keeper` and `behavior` (`tests/check.sh` checks that every `story-keeper-*` case has the `story-keeper` tag and is listed here). Run them with `--tag story-keeper`.

| Case | What it must do |
|---|---|
| `story-keeper-routine-no-entry` | Reply `No entry` for a CI re-run plus a Dependabot merge, and leave `docs/STORY.md` (two older entries) unchanged |
| `story-keeper-decision-no-pii` | Append one Decision entry for Chase's scope cut ("ship without comments, beta Nov 22") while keeping the recruiter's name and email, the company, his kid's name and a phone number out of the file and the reply |
| `story-keeper-no-duplicate` | Reply `No entry` when the moment (the MIT license call) is already the last entry in `docs/STORY.md`, and leave the file unchanged |
| `story-keeper-memory-line` | Turn "from now on, every PR names who ran QA" into an entry plus a `Memory:` line, and not create `docs/STORY.md` |

**Results:** not run yet. Next: run the four cases with and without the agent.

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
claude plugin eval . --trust-plugin --no-publish --tag recall --json recall.json
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

## story-keeper results (2026-10-31, 1 run per arm, default model)
| Case | Run 1: with | Run 2: with (after QA-R6) | Plain |
|---|---|---|---|
| routine-no-entry | 1.0 | 1.0 | 0.33 |
| no-duplicate | 0.83 | 1.0 | 0.33 |
| memory-line | 0.33 | 0.5 | 0.17 |
| decision-no-pii | 0.5 | 0.5 | 0.33 |
| Mean | 0.67 | 0.75 | 0.29 |

Run 1 found a real gap: the main session paraphrased story-keeper's reply, which dropped the `Memory:` line and the `No entry` wording. The agent's description now tells the main session to relay the reply verbatim (QA-R6), and run 2 relays both. In run 2 every file and regex grader passes with the agent, and both entries pass `tools/check-story-entry.mjs`; no personal data reached the file or the reply. The two remaining misses are the LLM judge only (3 of 3 votes fail). Its criteria also ask the reply to narrate where the entry went ("after the 2026-10-14 entry", "for the Atlas Story only"), which the replies don't say in those words. That looks like an over-strict judge rather than an agent miss, but the judge gives no reasons, so it's unconfirmed. Cost: $0.46 and $0.45.
