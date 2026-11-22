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
Score it like ux-reviewer recall: overall (n of 9) and by priority.

**Results (2026-10-31, 1 run per arm, $2.07):**

| Slice | With qa-tdd | Plain session |
|---|---|---|
| Overall | 8 of 8 | 0 of 8 |
| P1 | 5 of 5 | 0 of 5 |
| P2 | 3 of 3 | 0 of 3 |

Read this carefully: **the plain session spotted the gap in every case too** and said "don't merge yet". It failed because it never wrote and ran a failing test for the gap, which the grader requires. So these cases measure test-first follow-through on a found gap, not detection. Next: harder cases where the gap isn't visible in 20 lines (a gap that only shows when two files interact, or a P0), and a P0 case, so detection itself separates the arms.

## qa-tdd miss cases
Thirty-six `qa-tdd-miss-*` cases (nine in `qa-tdd-cases.mjs`, eleven fresh held-out ones in `qa-tdd-cases-batch2.mjs`, ten unread held-out ones in `qa-tdd-cases-batch3.mjs`, six tool-dependent held-out ones with extra fixture files in `qa-tdd-cases-batch4.mjs`) turn real misses from `evals/agent-misses/README.md` into recall cases, built from one spec: `evals/agent-misses/qa-tdd-cases.mjs`. Same shape as the recall cases above (a passing `node:test` suite around a tiny module with one gap, a `criteria` grader that needs the gap named at its priority, a failing test run red and the source left unfixed), plus tags for the miss pattern and a `split-dev` or `split-heldout` tag. Held-out cases are run once per change and never read while tuning `qa-tdd.md`; dev cases may be used to tune.

Do not edit the generated folders by hand. Change the spec, then:
```bash
node tools/eval-miss-cases.mjs            # regenerate the case folders
node tools/eval-miss-cases.mjs --check    # fails if any folder is stale or orphaned (tests/check.sh runs this)
node tools/eval-miss-cases.mjs --verify   # proves each repro: shipped test green, gap test red
```

| Case | Miss | Pattern | Priority | Split |
|---|---|---|---|---|
| `qa-tdd-miss-weekday-clock` | CC-Q1 | date-clock | P1 | dev |
| `qa-tdd-miss-night-key-utc` | ES-Q3 | date-clock | P0 | heldout |
| `qa-tdd-miss-storage-throws` | HE-Q1 | real-device-gap | P1 | dev |
| `qa-tdd-miss-stale-demo-family` | HE-Q2 | real-device-gap | P1 | heldout |
| `qa-tdd-miss-substring-match` | RR-Q1 | matching-and-sorting-edges | P1 | dev |
| `qa-tdd-miss-text-sorted-dates` | RR-Q2 | matching-and-sorting-edges | P2 | heldout |
| `qa-tdd-miss-risk-bad-inputs` | CH-Q1 | unhandled-input-edges | P1 | dev |
| `qa-tdd-miss-rounded-totals` | CK-S3 | undefined-rule | P1 | heldout |
| `qa-tdd-miss-name-denylist-case` | HE-Q7 | privacy-leak-not-tested | P0 | dev |
| `qa-tdd-miss-path-hash-leak` | CC-Q5 | privacy-leak-not-tested | P0 | heldout |
| `qa-tdd-miss-null-gmail-import` | RR-Q3 | matching-and-sorting-edges | P1 | heldout |
| `qa-tdd-miss-status-case-count` | RR-Q4 | public-demo-shipped-with-defects | P1 | heldout |
| `qa-tdd-miss-monday-divide` | CC-Q2 | date-clock | P1 | heldout |
| `qa-tdd-miss-zero-close-price` | CH-Q2 | unhandled-input-edges | P1 | heldout |
| `qa-tdd-miss-contrast-locked-in` | ES-Q5 | self-referential-or-skipped-tests | P1 | heldout |
| `qa-tdd-miss-host-check-variants` | PS-Q2 | guard-written-after-the-bug | P1 | heldout |
| `qa-tdd-miss-double-click-trade` | CH-Q2 | unhandled-input-edges | P1 | heldout |
| `qa-tdd-miss-percent-radius` | PS-Q5 | tool-tests-missed-edge-cases | P2 | heldout |
| `qa-tdd-miss-stale-cache-name` | CK-Q1 | real-device-gap | P1 | heldout |
| `qa-tdd-miss-rename-first-only` | CO-Q1 | rename-and-coverage-gaps | P2 | heldout |
| `qa-tdd-miss-skip-reads-as-pass` | CH-Q3 | self-referential-or-skipped-tests | P1 | heldout |
| `qa-tdd-miss-reset-during-sync` | CK-Q2 | flaky-or-wrong-timing | P1 | heldout |
| `qa-tdd-miss-dark-palette-never-applied` | CO-Q3 | rename-and-coverage-gaps | P1 | heldout |
| `qa-tdd-miss-voice-default-lost` | CO-Q2 | rename-and-coverage-gaps | P2 | heldout |
| `qa-tdd-miss-unescape-order` | PS-Q3 | guard-written-after-the-bug | P1 | heldout |
| `qa-tdd-miss-undo-position` | PS-Q4 | tool-tests-missed-edge-cases | P2 | heldout |
| `qa-tdd-miss-bullet-styles` | PS-Q6 | tool-tests-missed-edge-cases | P2 | heldout |
| `qa-tdd-miss-docs-folder-code` | PS-Q7 | tool-tests-missed-edge-cases | P1 | heldout |
| `qa-tdd-miss-palm-wide-layout` | ES-Q2 | real-device-gap | P1 | heldout |
| `qa-tdd-miss-today-vs-week-hours` | CK-Q3 | real-device-gap | P1 | heldout |
| `qa-tdd-miss-docs-only-skip-rename` | CC-Q6 | tool-tests-missed-edge-cases | P1 | heldout |
| `qa-tdd-miss-greeting-check-external-css` | PS-Q1 | guard-written-after-the-bug | P1 | heldout |
| `qa-tdd-miss-loose-pin-no-upper-bound` | CH-Q4 | self-referential-or-skipped-tests | P1 | heldout |
| `qa-tdd-miss-ignored-dir-imported` | CH-Q5 | self-referential-or-skipped-tests | P1 | heldout |
| `qa-tdd-miss-runner-list-form` | RR-Q7 | ci-environment-drift | P1 | heldout |
| `qa-tdd-miss-merge-gate-red-main` | RR-Q9 | ci-environment-drift | P1 | heldout |

Run and score (needs `ANTHROPIC_API_KEY`; not run yet, so there are no results):
```bash
claude plugin eval . --trust-plugin --no-publish --tag miss --case 'qa-tdd-miss-*' --allow-tools Write Edit 'Bash(node:*)' --json qa-miss.json
```
Report recall overall (n of 9), by `split-*` tag (held-out is the number to trust), by priority and by pattern tag, for the with-plugin arm and the baseline. A plain session finds most gaps and skips the red test (see the recall results above), so also count how often the grader's failure was "found but no red test". Rerun a miss before calling it a regression.

Next: the pattern families that don't fit a 20-line repro (CC-Q4 and HE-Q5 real-device screenshots, CC-Q5 privacy leak found by review) need a browser or a second file and wait for a harder case format.

## staff-pm miss cases
Thirty-four `staff-pm-miss-*` cases (eight in `staff-pm-cases.mjs`, sixteen fresh held-out ones in `staff-pm-cases-batch2.mjs`, ten unread held-out ones in `staff-pm-cases-batch3.mjs`, the last four with a TDD mindset: the test input that would have caught a QA-TDD miss) turn real spec misses from `evals/agent-misses/README.md` into recall cases, built from `evals/agent-misses/staff-pm-cases.mjs` by the same tool as the qa-tdd ones (`node tools/eval-miss-cases.mjs`, checked by `tests/check.sh`). Each is one short spec ask plus the repo notes a PM would have, written without a hint at the miss (the tool rejects hint words). The `criteria` grader passes only if the spec or answer explicitly covers the missed criterion with something testable; generic criteria don't count. Tagged `staff-pm`, `miss`, priority, source, pattern and `split-dev` or `split-heldout`.

| Case | Miss | Pattern | Priority | Split |
|---|---|---|---|---|
| `staff-pm-miss-rounding-rule` | CK-S3 | undefined-rule | P1 | dev |
| `staff-pm-miss-failed-load-saves-visit` | HE-S5 | missing-criteria | P1 | dev |
| `staff-pm-miss-windows-drive-root` | CC-S2 | missing-criteria | P2 | dev |
| `staff-pm-miss-done-includes-public-copy` | ES-S4 | done-without-done-check | P0 | dev |
| `staff-pm-miss-count-beyond-first-page` | HE-S4 | missing-criteria | P1 | heldout |
| `staff-pm-miss-removed-pages-redirect` | HE-S6 | missing-criteria | P1 | heldout |
| `staff-pm-miss-phone-first-screen-ci-fonts` | RR-S6 | missing-criteria | P1 | heldout |
| `staff-pm-miss-green-deploy-not-done` | ES-S5 | done-without-done-check | P1 | heldout |
| `staff-pm-miss-phone-page-height` | CC-S3 | overlong-page-or-ux-budget | P2 | heldout |
| `staff-pm-miss-sample-data-window-claim` | CC-S4 | ambiguous-wording-or-copy | P1 | heldout |
| `staff-pm-miss-readme-unreleased-features` | CC-S5 | ambiguous-wording-or-copy | P0 | heldout |
| `staff-pm-miss-san-francisco-remote` | RR-S3 | missing-criteria | P2 | heldout |
| `staff-pm-miss-recruiter-page-rollback` | RR-S7 | missing-criteria | P1 | heldout |
| `staff-pm-miss-easy-view-laptop` | HE-S3 | missing-criteria | P1 | heldout |
| `staff-pm-miss-banned-photos-replacement` | ES-S3 | missing-criteria | P0 | heldout |
| `staff-pm-miss-crew-app-single-backend` | CK-S4 | missing-criteria | P1 | heldout |
| `staff-pm-miss-geofence-fairness` | CK-S5 | missing-criteria | P1 | heldout |
| `staff-pm-miss-live-vs-saved-data` | CH-S1 | missing-criteria | P1 | heldout |
| `staff-pm-miss-weekly-rebuild-no-check` | CH-S3 | missing-criteria | P1 | heldout |
| `staff-pm-miss-cash-tying-risk-size` | CH-S4 | undefined-rule | P1 | heldout |
| `staff-pm-miss-tdd-zero-exit-price` | CH-Q2 | unhandled-input-edges | P1 | heldout |
| `staff-pm-miss-tdd-status-as-saved` | RR-Q4 | public-demo-shipped-with-defects | P1 | heldout |
| `staff-pm-miss-tdd-double-press` | CH-Q2 | unhandled-input-edges | P1 | heldout |
| `staff-pm-miss-tdd-week-boundaries` | CC-Q2 | date-clock | P1 | heldout |
| `staff-pm-miss-spec-over-inflight-rewrite` | CC-S1 | concurrent-work-collision | P1 | heldout |
| `staff-pm-miss-contradicting-copy-rules` | CK-S2 | concurrent-work-collision | P2 | heldout |
| `staff-pm-miss-new-pipeline-while-demo-defects-live` | CH-S5 | concurrent-work-collision | P1 | heldout |
| `staff-pm-miss-restyle-or-less-text` | ES-S1 | wrong-problem-scoped | P1 | heldout |
| `staff-pm-miss-license-holder-name` | CO-S1 | wrong-identity-detail | P1 | heldout |
| `staff-pm-miss-camera-already-native` | ES-S2 | built-then-cut | P1 | heldout |
| `staff-pm-miss-portrait-without-source-photo` | PS-S1 | built-then-cut | P2 | heldout |
| `staff-pm-miss-deploy-target-needs-paid-api` | PS-S6 | built-then-cut | P1 | heldout |
| `staff-pm-miss-autoselect-meaning` | HE-S2 | ambiguous-wording-or-copy | P2 | heldout |
| `staff-pm-miss-share-screen-feels-like-a-form` | HE-S1 | thrash-and-reversal | P2 | heldout |

Run and score (needs `ANTHROPIC_API_KEY`; not run yet, so there are no results):
```bash
claude plugin eval . --trust-plugin --no-publish --tag miss --case 'staff-pm-miss-*' --json pm-miss.json
```
Report recall overall (n of 8), by split (held-out is the number to trust), priority and pattern, with and without the agent. These cases test spec content only. The misses about thrash and rework (built, then cut or redone) and collisions between two in-flight PRs need repo history to judge and are not covered yet.

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
claude plugin eval . --trust-plugin --no-publish --tag recall --case 'ux-reviewer-recall-*' --json recall.json
```
Recall is the share of cases whose `criteria` grader passed. Report it three ways: overall (n of 14), by priority (group by the `p0`/`p1`/`p2` tag; P0 recall is the number that matters most, and a P0 miss is a bug in the agent), and for `by-human` cases on their own: those are issues a person had to find, so a pass there is the agent catching what it missed the first time. The with-plugin arm is the score; the baseline arm shows how much of it a plain session gets anyway. With 1 run per case a single result is noisy; rerun a miss before calling it a regression.

## Fresh human-miss cases (UX 7 to 9, 2026-11-22)
The 14 recall cases above are mostly saturated, so they cannot show a climb from 7 to 9. Eleven `ux-reviewer-fresh-*` cases come from 23 "UX eval miss" issues (studio-agents #47 to #69) filed by every product: things a review passed at 8/10 that Chase or a relative found later. They are rebuilt small screens with neutral prompts (no hint like "be harsh") and one known issue each. Tags: `ux-reviewer`, `fresh`, priority, source, `by-human`. Run: `claude plugin eval . --trust-plugin --no-publish --case 'ux-reviewer-fresh-*'`.

**What 7 and 9 mean (proposal):** 7 = fresh-set recall around 70%, P0 misses possible. 9 = at least 90% on the fresh set with every P0 caught, plus no review that scores a screen 8 or higher when a human later rated it 5 or lower.

**Baseline (with ux-reviewer, 1 run, $1.85):** 8 of 11 (73%). Misses: `keyboard-covers-comment` (P0: on-screen keyboard covers a pinned field, only desktop screenshots exist), `nav-reads-like-website` (six text links, no bottom tab bar), `heavy-dated-controls` (toolbar row, giant filled button, heavy selected blob). The same cases passed 10 of 11 when the prompts hinted at the issue, so hints must stay out. The three misses are the gaps for the next rule changes: real-device behaviour, app-versus-website navigation, and iPhone-native taste.

**After Layer D (rules D1 to D4 added to ux-reviewer.md, 12 cases incl. a dark-mode case, 1 run, $2.20):** 11 of 12 (92%). `keyboard-covers-comment` and `heavy-dated-controls` now pass; `nav-reads-like-website` still fails (1 of 3 judge votes). Caution: these rules were written from the same misses, so this is an in-sample score. The held-out check is the real before-screenshot cases and the new labelled shots. The dark-mode case passed 3 of 3 before any dark-mode rule, so the UX Design Institute research (D4) is kept as a guard, not credited with a gain.

Real-screenshot cases (4, `ux-reviewer-fresh-real-*`, from the Nov 19 before shots in PR #70) use a `case.yaml` with `context.scaffold_script: setup.sh`, which copies `screen.png` into the run; run them with `--scaffold`. First run 1 of 4: the agent scored them 4 to 5 out of 10 and found big problems, but the pass rules were stricter than the issue (to loosen).

**Real before-screenshot set (24 cases, `ux-reviewer-fresh-real-*`, run with `--scaffold`, 1 run each, about $3.50 a run).** 12 cases are issues Chase confirmed as P0/P1 (4 early, 8 more from the independent label pass) and 12 are P2 issues from the same independent pass (tag `by-agent`). Tall pages are pre-cut into 1,100px sections because the viewer shrinks a 4,000px page to about 170px wide. Results with Layer D (D1 to D6) and the cut-tall-screenshots rule: **13 of 24 (54%)**; the same set scored 14 of 24 on an earlier run, so expect plus or minus 2 from run noise. First score on screens the rules were not tuned for: 3 of 8 (38%) for the Chase-confirmed new ones, before D5 and D6.
Still missed most runs: ccwatts page issues (share block before data, own-logs chore, mixed units), a title that contradicts its heading (Today over "Yesterday"), cut-off wording on a modal button, and the Hearth Share start. The agent usually finds other real problems on those screens instead, so the next step is precision as well as recall: a fixed list per screen to score false alarms against.
**Scope and severity rule and the false-alarm check (Nov 22).** Four "clean screen" cases (a sign-in, an empty list, a settings page, a result screen; pass = no P0 and at most one P1) failed 0 of 8: before the rule the agent raised 5 P1s and sometimes a P0 on every one (missing doctype or viewport tag in a snippet, "nothing happens when you tap" on a static mock, a dark theme nobody asked for). After adding the "Scope and severity" paragraph to ux-reviewer.md it raised no P0 on most and its scores rose from 5 to 5 or 6, but it still found 2 to 5 P1s per screen, some fair (15px nav labels, links with no href), so the fixtures were not truly clean and the cases were not kept. Recall on the 24 real cases after the rule: 11 of 24, inside the 11 to 14 range of earlier runs, so no clear loss. Next: build clean fixtures a designer has validated (the ux-rules checker passing with zero findings) before using them to score false alarms.
**False-alarm set on screens an independent reviewer marked GOOD (Nov 22, 10 cases `ux-reviewer-fresh-good-*`, after-shots of current Hearth and ccwatts, 1 run each, $1.35).** Pass = no P0 and at most one P1. Result: **0 of 10 passed**. The agent never said Ready: scores 5 to 7 against a bar of 8, and 3 to 5 P1s per screen, one P0 on two Hearth screens. Two causes. First, Hearth's icon-only tab bar is an intended rule (Easy view adds labels, DEC-66) that sits in Hearth's CLAUDE.md, not in the screenshot, so it is flagged on every Hearth screen; give the agent the product's own rules and expect that to drop. Second, the agent still lists 2 to 4 small P1s (tap sizes by eye, faint ticks) per screen. Treat this as the precision baseline to beat, not a pass rate; the next rule change should aim at 5 of 10.
**Crew Clock added (Nov 22, 6 cases `ux-reviewer-fresh-good-crew-*`, restyled UI from PR 42, all 11 screens marked GOOD by an independent reviewer).** The agent passed **0 of 6**: 6 to 6.5 out of 10, 4 to 6 P1s per screen, and a P0 on the done screen for an offline state it inferred ("Sending..." under a green check) that the still image cannot show. Same pattern as Hearth and ccwatts, so the false-alarm baseline is **0 of 16** across three products. Old-UI (main) shots exist as the "before" side of this pair.
A run can also fail from the plan's usage limit ("5-hour limit"), which shows as an error, not a miss: check `error` before reading a score.

Superseded note: 4 cases that use the real "before" screenshots (evals/ux-baseline in PR #70) need `--scaffold` so the screenshot can be copied into the eval sandbox, which is blocked here without Chase's go.

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
