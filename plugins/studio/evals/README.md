# Agent evals

Fixed tasks that check each studio agent still does its one job, scored with `claude plugin eval`. Every case runs twice: with the plugin (the session must hand the task to the named agent) and without it (a plain session, the baseline). The difference is what the agent adds.

| Case | Agent | What it must do |
|---|---|---|
| `qa-tdd-failing-test-first` | qa-tdd | Turn a bug report into a failing `node:test`, run it red, leave the bug unfixed |
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
