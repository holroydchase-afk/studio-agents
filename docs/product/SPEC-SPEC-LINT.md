# SPEC: spec-lint

Task S8 (build order 4 in `docs/agent-training-plan.md`). Scoped by staff-pm, Nov 22.

## Answer

Build `tools/spec-lint.mjs`: a pure keyword and structure linter for a staff-pm spec. `check-spec` says the block is well formed; `spec-lint` says the spec is not missing the things staff-pm has actually missed. No model, no network, no file writes.

## Bet

Staff-pm misses repeat (heldout-2: 12 of 16 passed, 4 failed on the same four gaps). A script that flags those gaps before the spec is handed back should turn those 4 into passes without a prompt change. Proof: rerun the 4 failing held-out cases through staff-pm with spec-lint in the loop; the target is 0 of 4 flagged-and-ignored, and no more than 1 finding on each of the 8 passing specs (false-positive budget).

## Input

A spec file: prose plus one final spec block (format in `tools/check-spec.mjs`). spec-lint calls `checkSpec` first. A spec that fails `check-spec` is not linted (exit 2, the check-spec errors printed), so the two tools never disagree about structure.

Lint scans two regions: the block's `criterion:` and `step:` lines, and the prose above the block. Each finding carries the line number of the first line that triggered it, or line 1 of the block when the rule fires because something is absent.

## Rules

Every rule is a trigger (keywords that make the rule apply), a requirement (what must also appear), and a finding when the trigger is present and the requirement is not. Keyword lists live in one table at the top of the script so a new miss is one new row.

| ID | Flags | Real miss it came from | Fails | Passes |
|---|---|---|---|---|
| SL-1 pinned-clock | A criterion that mentions today, now, this week, a weekday, a month or "per day" and no pinned clock (an ISO date, "pinned", "fixed clock", "clock of") in the same criterion | CC-Q1, CC-Q2, CC-Q3 date-clock; staff-pm case tdd-week-boundaries | `PACE-2 \| auto \| Given it is Monday, then the average is 0.40` | `PACE-2 \| auto \| Given a clock of Mon 2026-11-16 00:00, then the average is 0.40` |
| SL-2 empty-input | Spec handles numbers or lists (count, total, sum, average, list, rows, items, price) and no criterion mentions zero, empty, none, missing or "no items" | CH-Q1/Q2 zero exit price; HE-S4 count beyond first page; HE-S5 failed load | criteria only for 3 items and 10 items | adds `LIST-3 \| auto \| Given no items, then the card shows "0 items"` |
| SL-3 rollback | Spec says public, live, deploy, publish, release or Pages and has no rollback, revert, undo or "roll back" anywhere | RR-S7 recruiter page | "Deploy the page to Pages." and nothing else | adds "Rollback: revert the merge commit and redeploy." |
| SL-4 phone-budget | Spec mentions phone, mobile or a viewport width and no height or screen budget: a number next to px, screens, "tall", "scroll" or "above the fold" | CC-S3 phone page height (heldout-2 FAIL) | `PACE-15 \| manual \| ... at 360px, then the headline is visible` | adds `PACE-16 \| manual \| Given 360px by 640px, then the section is at most 2 screens tall` |
| SL-5 measured-bar | Spec makes a safety, fairness, accuracy or "works for" claim and no criterion has a rate, a percent, "share of" or "at least N of M" | CK-S5 geofence fairness (heldout-2 FAIL, agent and cross) | "A fair geofence for the crew" with only no-refusal checks | adds `GEO-9 \| manual \| Given 20 on-site punches, then at least 19 pass without a flag` |
| SL-6 auth-cases | Spec changes login, sign-in, privacy, owner-only or permission behavior and lacks a signed-out criterion or lacks a different-user (non-owner, another account) criterion; one finding per missing half | RR-S7 recruiter page (heldout-2 FAIL: no different-user case) | `AUTH-1 \| auto \| Given signed out, then the page redirects` | adds `AUTH-2 \| auto \| Given another signed-in user, then the owner page returns 403` |
| SL-7 claim-parity | A README, copy, docs or "quickstart" change with no criterion or step that checks the claim against the released version (registry, released, published, tag, npm) | CC-S5 README promised unreleased features | "Update the README quickstart." | adds `README-1 \| auto \| Given the released version, then every command in the quickstart exits 0` |
| SL-8 stale-artifacts | A done definition ("done when", "done list") that names code or tests but none of README, screenshot, docs, changelog, case study | ES-S4 done without public copy; the "done lists every stale artifact" rule in staff-pm.md | "Done when tests pass." | "Done when tests pass and the README, screenshots and docs page are updated." |
| SL-9 risk-rank | A prose line ranking a privacy, personal-data, secret, live-data or unreleased-claim risk as P1 or P2 | CC-S5 README risk ranked P1, below P0 (heldout-2 FAIL, agent and cross); the P0 rule for privacy leaks (CC-Q5, HE-Q7) | `Risk (P1): README names an unreleased command` | `Risk (P0): README names an unreleased command` |
| SL-10 feedback-loop | The spec adds a rule, penalty, flag, detector or classifier (red flag, penalty, scoring rule) but no criterion mentions marking a hit wrong, a reason, an override, feedback or a review of the hits | RR-S1 red-flag rule shipped with no feedback loop; skip reasons came next (batch 5 dev: agent and plain both lacked it) | `criterion: FLAG-1 \| auto \| Given a posting that says 5 days on site, then the score drops by 15` | the same plus `criterion: FLAG-2 \| manual \| ... the owner can mark the hit wrong with a reason ...` |
| SL-11 samples-only | The spec says the work leans on saved samples, sample files or fixtures and is about something live (live, adapter, feed, integration) but nothing names a first live run on a machine that can reach the real source | CH-S1 live adapter planned against saved samples only; first live run lost puts and one blocked symbol took all data offline (batch 5 dev: both arms missed the "which data the samples lack" check) | "The adapter is only tested against three saved samples." | the same plus a step "First live run on a machine that can reach the host" and a criterion naming calls and puts |

## CLI

```
node tools/spec-lint.mjs <spec.md> [--json] [--rules SL-1,SL-3]
```

- Exit 0: no findings. Exit 1: one or more findings. Exit 2: usage error, unreadable file, no spec block, or the block fails `check-spec` (those errors are printed).
- Stderr, one finding per line: `<file>:<line> SL-3 rollback: <message>`. Messages name the rule and what to add, and never quote a value that looks like an email, link or id.
- `--json` prints `{ findings: [{ rule, line, message }] }` on stdout. `--rules` limits the run to the listed rules.
- Waiver: a prose line `lint-ok: SL-3 <reason>` (reason required) silences one rule for the file and is listed in `--json` under `waived`, so a waiver stays visible.
- Same helper style as check-spec: it imports `checkSpec`, exports `lintSpec(text)` for tests, and runs the CLI only when it is the main script.

## Acceptance criteria

Each is a test qa-tdd writes red before the build. The block below holds them with IDs.

- SLINT-1: the passing and failing example for each of SL-1 to SL-9 in the table are fixtures; failing gives exactly that rule at the right line, passing gives none.
- SLINT-2: the 4 heldout-2 failures (SL-4, SL-5, SL-6, SL-9) are reproduced as fixtures and each is flagged by its rule.
- SLINT-3: the 8 passing heldout-2 specs (saved results) give at most 1 finding each.
- SLINT-4: a spec with no numbers or lists, nothing public and no phone raises no SL-2, SL-3 or SL-4 (the empty case: a docs-only spec lints clean). SL-7 does not fire on it either: SL-7 triggers on README, copy, landing, quickstart or claim words, never on a bare "docs", and never on a done-definition line (that is SL-8's job).
- SLINT-5: a block that fails `check-spec` exits 2 and prints the check-spec errors; no lint findings are printed.
- SLINT-6: a waiver line with a reason silences its rule and lists it under `waived`; a waiver with no reason is itself a finding.
- SLINT-7: the same input twice gives byte-identical output (no clock, no randomness), and the tool opens no network connection and writes no file.

## Not doing

- No model call or "judge the spec quality" pass. Rules are keywords; anything fuzzier is the qa-tdd or staff-pm eval, not a lint.
- No auto-fix. It names what to add; staff-pm writes it.
- No scoring or pass/fail threshold on spec quality. Findings are binary.
- No rules for misses staff-pm has not made. A new rule needs a real miss ID and a failing and passing fixture.
- No wiring into CI for product repos yet. First wire it into the staff-pm run (run it after `check-spec`, fix, rerun), then decide on CI after one real logged run.
- No product-prefixed IDs (known check-spec gap, tracked separately).
- No concurrent-work or thrash rules (CC-S1, RR-S2): they need repo and PR state, not the spec text.

## Biggest risk

False positives. Keyword rules will fire on specs that handled the case in other words, and a linter that cries wolf gets ignored. Handled by SLINT-3 (budget of 1 finding per known-good spec), the waiver line (SLINT-6), and keeping each trigger narrow.

## Decisions for Chase

- Advisory or blocking in the staff-pm run? Recommend advisory first (findings printed, staff-pm must answer each), blocking only after SLINT-3 holds on a second held-out set.
- Rule SL-9 reads P-levels from prose, so a spec that omits them is not checked. Recommend leaving it; adding a `risk:` priority field would change the check-spec format.

## Handoffs

- qa-tdd: write SLINT-1 to SLINT-7 red; done when they fail for the right reason (no tools/spec-lint.mjs yet).
- engineer: build `tools/spec-lint.mjs` and the keyword table; done when SLINT-1 to SLINT-7 are green 3x.
- staff-pm: add the spec-lint step to `plugins/studio/agents/staff-pm.md` and the training plan log; done when a real run passes check-spec and spec-lint.

```spec
verdict: ready
bet: Staff-pm hands back specs that already carry the gaps it keeps missing; it worked when the 4 held-out-2 failures are each flagged by spec-lint and the 8 known-good specs get at most 1 finding each
step: M1.1 | Failing tests and fixtures for the 9 rules and the CLI | SLINT-1 to SLINT-7 red for the right reason | 1 session
step: M1.2 | Build tools/spec-lint.mjs with the keyword table, waiver and JSON output | SLINT-1 to SLINT-7 green 3x | 1 session
step: M1.3 | Wire into staff-pm.md after check-spec and log the build in the training plan | one real staff-pm run passes check-spec and spec-lint | 0.5 session
criterion: SLINT-1 | auto | Given the failing and passing fixture for each of SL-1 to SL-9, then the failing one gives exactly 1 finding with that rule id and the passing one gives 0
criterion: SLINT-2 | auto | Given the 4 held-out-2 failure specs (phone height, fairness bar, different-user, P1 risk), then each is flagged by SL-4, SL-5, SL-6 and SL-9 respectively
criterion: SLINT-3 | auto | Given the 8 known-good held-out-2 specs, then each gives at most 1 finding
criterion: SLINT-4 | auto | Given a docs-only spec with no numbers, lists, public change, phone or README claim, then the output has 0 findings (no SL-7 on a bare "docs") and the exit code is 0
criterion: SLINT-5 | auto | Given a spec whose block fails check-spec, then the exit code is 2 and no SL rule is printed
criterion: SLINT-6 | auto | Given the line "lint-ok: SL-3 internal tool only", then SL-3 is silenced and listed under waived, and "lint-ok: SL-3" with no reason gives 1 finding
criterion: SLINT-7 | auto | Given the same spec run twice with no network and a read-only directory, then both outputs are byte-identical and exit 0
cut: Model-based spec grading | rules stay keyword and structure so the tool is free, fast and repeatable
cut: Auto-fix of findings | staff-pm writes the fix; the tool only names the gap
cut: CI wiring in product repos | wait for one real logged run and a second held-out set
cut: Rules for concurrent work and thrash | they need PR and repo state, not spec text
cut: Product-prefixed step IDs | known check-spec gap, separate change
risk: False positives make the linter ignored | SLINT-3
risk: A spec that omits P-levels dodges SL-9 | SLINT-2
decision: Advisory or blocking in the staff-pm run | Advisory first, blocking once SLINT-3 holds on a second held-out set
decision: Add a priority field to risk lines so SL-9 can read it from the block | No, keep the check-spec format unchanged for now
handoff: qa-tdd | failing tests and fixtures for SLINT-1 to SLINT-7 | red for the right reason, no spec-lint tool yet
handoff: engineer | build tools/spec-lint.mjs | SLINT-1 to SLINT-7 green 3x
handoff: staff-pm | add the spec-lint step to the staff-pm role and the plan log | one real run passes check-spec and spec-lint
```
