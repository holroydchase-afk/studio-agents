# The full agent pipeline: plan (not built)

Chase, Nov 24: "Plan a full pipeline with the agents." This is a plan only. Nothing here is built until Chase approves it, and the first build PR is small (see "Build order").

**Rule that shapes everything: reuse, don't rebuild.** Every stage below already has an agent, a validator or a tool in this repo. The only new code is a thin run ledger that chains them and enforces the stop rules.

## What exists (and what it can honestly claim)

| Piece | Status | Where |
|---|---|---|
| Staff PM (spec, buy vs build, dates, handoffs) | Agent + `check-spec`. Lazy-prompt baseline: agent 4 wins, plain 4, **no lift yet** | `agents/staff-pm.md`, `evals/lazy-prompts/` |
| UX (build, grade, revise) | Agent + rules (CLEAN-1..5, DARK, CONTRAST), `ux-refs`, `check-ux-run`, `ux-build-eval` harness (PR 127, fakes only) | `agents/ux-reviewer.md`, `docs/ux-build-eval-spec.md` |
| QA-TDD (tests before and after build, bug fixes, green 3x) | Agent + `qa-cycle` ledger/verify/gate, `check-qa-report`, `qa-run3`. Detection ties plain Claude; lift is format and contract | `agents/qa-tdd.md`, `docs/product/SPEC-QA-CYCLE.md` (PR 125) |
| Feedback loop (widget, gate, triage, scoped auto-merge) | PR 126, **open, proven on fixtures only** | `docs/product/SPEC-FEEDBACK-LOOP.md` |
| Harness (run log, stamp, kill switch, cost cap, memory, scorecard) | Built | `docs/agent-harness.md` |
| Nightly hardening | Designed in `docs/qa-hardening.md`; **disabled** (Chase paused it Nov 23) | |

## The pipeline

```
lazy prompt ─┐
feedback issue (after the PR 126 gate) ─┼─▶ 0 INTAKE ─▶ 1 STAFF PM ─▶ 2 TESTS (red) ─▶ 3 BUILD ─▶ 4 VERIFY ─▶ 5 PR + MERGE CLASS ─▶ 6 LEARN
night shift (hardening, later) ─┘
```

**Who runs it.** The main session as chief of staff, following this doc. No framework, no new always-on service. A small tool, `tools/pipeline-run.mjs`, keeps a ledger (`docs/runs/<date>-pipeline-<slug>.md`) of which stage ran, its handoff block, its validator result, and a running cost. It refuses to start the next stage when the last handoff is missing or invalid, and when a stop rule has tripped.

### Stage 0. Intake
- Input is a lazy prompt, a gated feedback issue, or a hardening goal.
- Run `agent-guard kill` first (any `.off` file halts everything). Feedback goes through `feedback-guard` before any agent reads it.
- Skip rule to save tokens: a docs-only or config-only change goes Staff PM (short) then straight to PR. No UX, no QA build cycle (QA still runs the repo suite).

### Stage 1. Staff PM
- **Job:** turn the ask into one scoped, dated, owned plan that fits Chase's goals and rules.
- **Does:** reads CLAUDE.md, HANDOFF.md and the product board; checks the rules (public repo, merge gate, polish freeze, job-hunt priority); decides buy vs reuse vs build against `docs/agent-harness.md`; sets dates; classifies the work.
- **Handoff out:** the existing ```spec block (`check-spec`), plus two new lines: `lane: ui | logic | docs | config` and `touches: live | non-live | hearth` (Staff PM proposes, `feedback-merge-check` path rules overrule it).
- **Stop:** verdict `blocked` or `cut` ends the run with a one-line reason. `needs-decision` asks Chase once (one card, with a recommendation) and the run goes on with the default if he doesn't answer.
- **Done:** `check-spec` passes and every step has an owner, a date and a done-when.

### Stage 2. Tests first (QA-TDD, pre-build)
- **Does:** failing tests from the spec's acceptance criteria, IDs in titles, red output kept (`[qa:pre]` commits).
- **Handoff out:** `qa-cycle ledger` shows pre tests, all red.
- **Stop:** a criterion that can't be tested goes back to Staff PM once, not argued with.

### Stage 3. Build
- `lane: logic` goes to the **engineer**. `lane: ui` goes to the **UX agent in its build-grade-revise loop** (UX builds the screen against CLEAN-1..5, DARK/CONTRAST rules and the Anthropic frontend-design skill; the engineer only wires logic).
- **UX loop:** build, capture shots (`ux-shots`), grade with `ux-rules` and `check-findings`, revise. **Limit: 3 rounds.** Done is no open P0/P1 and the `Hard rules checked:` line present. Round 3 with a P0 left stops the run and reports it; it never ships "close enough".
- **Handoff out:** diff on the branch plus a `uxrun` block (UI lane only).

### Stage 4. Verify (QA-TDD, post-build, then reviews)
- **Does:** post-build tests from what the build revealed, bugs found become red tests then fixes (`[qa:post]`, `[qa:red]`, `[qa:fix]`), `qa-cycle verify` and `gate`, all suites green 3x.
- **Then, only if triggered:** `privacy-security` (personal data, auth, vendors, public demo) and `positioning` (public copy). Never by default.
- **Handoff out:** the ```qa block pasted verbatim (never summarized), QA-R IDs, ledger.
- **Stop:** red or flaky after 2 fix attempts per bug, or a guard trip, stops the run and reports; no skipped, deleted or weakened tests.

### Stage 5. PR and merge class
PR body has the attribution lines, the `Agents:` line (only agents that really ran), the qa block, and `HANDOFF.md` updated in the same PR. Then one of three classes, set by `feedback-merge-check` path rules, not by the agent's opinion:

| Class | What | Who merges |
|---|---|---|
| **A. Self-merge** | Non-live repos and paths: docs, tests, tooling, studio-agents, internal apps; green, oldest PR first, merge commit | The thread, on green |
| **B. Scoped auto-merge** | Feedback-driven small fixes on non-live repos, under the daily caps from PR 126 (5 issues, 3 auto-PRs) | The pipeline, on green, only if `feedback-merge-check` passes |
| **C. Chase's go** | Anything live: portfolio `main`, public demos, npm or store releases, **every Hearth change**, `.github/`, CLAUDE.md, manifests, auth, privacy or data paths | Chase, via one card listing open PRs in merge order. The pipeline never merges these. |

Merging is not deploying: the PR says when a republish is still owed.

### Stage 6. Learn
- Run log stamped with real tokens (`stamp-run`, by the caller, not the agent).
- Misses and bugs found later become eval cases (`triage-report`, `qa-cycle miss add`); `story-keeper` logs any call Chase made. Ideas from QA go to Chase as a short list, never acted on alone.

## The feedback loop and nightly hardening as two more doors

Both enter at Stage 0 and use the same stages, not a second pipeline.
- **Feedback (PR 126):** widget, then a GitHub issue, then the deterministic gate (spam, personal data, injection dropped before an agent reads it), then Staff PM triage (`check-triage`), then Stage 2 onward. Class B or C by path. Hearth never auto-merges.
- **Nightly hardening:** stays **off** until Chase says resume. When on: QA-TDD only, one repo, hard caps from `docs/qa-hardening.md`, tests-only diffs (`agent-guard only-tests`), PR for Chase's morning, never a merge.

## Stop rules (one place)
1. Kill switch file present: nothing starts.
2. Per-run cost over its cap, or a stage over 1.5x its budget: stop and report.
3. Any validator fails twice on the same block: stop.
4. Round limits: UX 3 rounds, QA 2 fix attempts per bug, Staff PM 1 round of questions.
5. Anything that would touch real data, secrets, live deploys or class C paths without Chase's go: stop and ask once.
6. A rule conflict (for example polish freeze, public-repo data): Staff PM cuts the work; the pipeline never "works around" it.

## Where Chase is needed (and only there)
- **Approves the plan** (this doc) and each new door opening (feedback on a product, nightly run).
- **Class C merges**, in one card with open PRs in merge order.
- **Real product calls** Staff PM can't default (flagged `needs-decision`, once, with a recommendation).
- Nothing else. No settings, environments or repos by hand; hosts are requested through the environment tool.

## Models
Agents run on **Sonnet**. **Opus** is for blind graders in evals and for review where the loop asks for it (not by default). **Haiku** for mechanical checks only. Fable for UX or copy review only when Chase asks. The pipeline picks the model per stage in the ledger, so cost is attributable.

## Token cost controls (Chase just hit heavy use)
- One lane at a time; no parallel agent fan-out by default.
- Subagent only where a fresh context pays off: QA pre-build, graders, UX capture. Staff PM and the engineer run inline when the main session already holds the context.
- Stage skipping by lane (docs and config skip UX and the QA build cycle).
- Context budget per stage: handoff **blocks**, not transcripts, move between stages. A stage reads the spec and the block before it, not the history.
- Reports short: the spec shows only the recommended option and the rejected one.
- Hard caps: per-run (`agent-guard cost`, starting at $1.00 per run as the repo default), per-day (feedback caps from PR 126), and a weekly token ceiling Chase sets. Real tokens come from `stamp-run`; "cost not measured" is reported as such.
- No scheduled runs until approved. Eval runs are batched and run only on request, 4 dev prompts first.

## How we'll know it works: outcome eval for the whole pipeline
Same lazy prompt, two arms, **plain Claude vs the pipeline**, graded blind by Opus.
- **Set:** the 8 real lazy prompts in `evals/lazy-prompts/` (4 dev, 4 held-out), plus 4 new ones that need a UI and tests, since the current set grades specs, not shipped work.
- **Arms:** plain gets the shared context pack and the prompt. Pipeline gets the same pack and runs stages 0 to 5 up to an unmerged PR in a throwaway fixture repo.
- **Grade** (fresh Opus per prompt, order shuffled, agent blocks stripped): would Chase ship this PR as is? Plus four checks: goal and rule alignment, buy vs reuse vs build, tests that were red first and cover the ask, UI quality against CLEAN-1..5. Winner A, B or tie.
- **Also recorded, not graded:** cost per prompt, stages that tripped a stop, rounds used, and Chase's own spot-check of 3 pairs as the answer key.
- **Claim rule:** report wins out of N, tune on dev only, score held-out once per change. If the pipeline doesn't beat plain Claude on shipped-PR quality, the site says so or says nothing. Staff PM alone is currently a tie, so the pipeline has to earn lift from the test-first and UX loops, not from the spec.

## Build order (one small PR each, test-first, each stops for Chase's go)
1. `tools/pipeline-run.mjs` ledger and stop rules (validators reused), with a fake-stage test run. No model calls.
2. Staff PM adds `lane:` and `touches:` lines to the spec block; `check-spec` accepts them.
3. The runbook as a skill so a thread follows it without rereading this doc.
4. Dry run on one real non-live task (suggest a studio-agents docs fix), end to end, cost logged.
5. Outcome eval on the 4 dev prompts, then held-out once.
6. Open the doors: feedback on Energy Scanner (after PR 126 merges), then nightly hardening only on Chase's resume.

## Decisions for Chase
1. **Approve this plan?** Recommend yes.
2. **Who builds UI in the UI lane?** Recommend the UX agent builds, the engineer wires logic (matches your Nov 23 design). Alternative: the engineer builds and UX only grades.
3. **Per-run cost cap and weekly token ceiling.** Recommend $1.00 per run and a weekly ceiling you set when usage recovers.
4. **First dry-run task.** Recommend a small studio-agents docs fix, not a product.
5. **Merge order of the open PRs.** PR 121 and 126 both touch HANDOFF.md and the harness doc; recommend merging 121, then 126, before build step 1.
