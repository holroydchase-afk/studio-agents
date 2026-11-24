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

## Design principles (from Anthropic's Claude Code expertise research, via a sibling thread)

1. **Bigger, less chatty handoffs.** Staff PM writes one full spec and the build runs end to end with no check-ins between stages; stages talk through blocks, not questions.
2. **Chase's attention is the limit.** He gets one batched card per stage group with a `go | fix | kill` verdict, never raw output. Agents review each other first (QA, privacy gate, stakeholders) so the card carries only what survived.
3. **Chase owns the what; agents own the how.** He decides the idea, the user and what good looks like. If a card asks him to approve implementation details, the pipeline is asking too much and that is a bug to fix.
4. **Every idea starts with a short domain brief** (who has this problem, what exists, what good looks like, 1 page max, sources cited) written by Staff PM before the MVP cut, so the cut isn't built on guesses. It is reused as the stakeholder agent's context.

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
- `lane: logic` goes to **plain Claude as the builder, inside QA-TDD's gates** (no separate engineer agent, Chase Nov 24). `lane: ui` goes to the **UX agent in its build-grade-revise loop** (UX builds the screen against CLEAN-1..5, DARK/CONTRAST rules and the Anthropic frontend-design skill; plain Claude wires the logic).
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
- Subagent only where a fresh context pays off: QA pre-build, graders, UX capture. Staff PM and the builder run inline when the main session already holds the context.
- Stage skipping by lane (docs and config skip UX and the QA build cycle).
- Context budget per stage: handoff **blocks**, not transcripts, move between stages. A stage reads the spec and the block before it, not the history.
- Reports short: the spec shows only the recommended option and the rejected one.
- Caps are in rounds and stage token budgets, not dollars (Chase is on Max): per-day feedback caps from PR 126 stay, and `agent-guard cost` is reported, not enforced. Real tokens come from `stamp-run`; "cost not measured" is reported as such.
- No scheduled runs until approved. Eval runs are batched and run only on request, 4 dev prompts first.

## How we'll know it works: outcome eval for the whole pipeline
Same lazy prompt, two arms, **plain Claude vs the pipeline**, graded blind by Opus.
- **Set:** the 8 real lazy prompts in `evals/lazy-prompts/` (4 dev, 4 held-out), plus 4 new ones that need a UI and tests, since the current set grades specs, not shipped work.
- **Arms:** plain gets the shared context pack and the prompt. Pipeline gets the same pack and runs stages 0 to 5 up to an unmerged PR in a throwaway fixture repo.
- **Grade** (fresh Opus per prompt, order shuffled, agent blocks stripped): would Chase ship this PR as is? Plus four checks: goal and rule alignment, buy vs reuse vs build, tests that were red first and cover the ask, UI quality against CLEAN-1..5. Winner A, B or tie.
- **Also recorded, not graded:** cost per prompt, stages that tripped a stop, rounds used, and Chase's own spot-check of 3 pairs as the answer key.
- **Claim rule:** report wins out of N, tune on dev only, score held-out once per change. If the pipeline doesn't beat plain Claude on shipped-PR quality, the site says so or says nothing. Staff PM alone is currently a tie, so the pipeline has to earn lift from the test-first and UX loops, not from the spec.

## MVP-o-matic: the overnight shape (Chase, Nov 24)

Goal: Chase drops an idea at night and wakes up to an MVP or v1. This is a fourth door into the same pipeline, not a new one, with two extra stages around it (a Stage 0 "seed" and a Stage 7 "preview"). Chase's input is one message; the run asks him nothing.

**Do we need an engineer? No (Chase, Nov 24).** Plain Claude already writes code well; what went wrong before was shortcuts and uneven testing and merging, and QA-TDD's tests-first order and fixed gates fix that. An engineer agent would be plain Claude plus a starter scaffold, and we couldn't show it beats plain Claude. So **plain Claude is the builder inside QA-TDD's gates**: tests first, build, post-build tests and fixes, green 3x. The scaffold moves to the architect and the build-report contract to QA-TDD. The existing `engineer.md` is left alone for now and the pipeline doesn't call it; retiring it is a separate, later call.

**What to mature, in order of need for this pipeline:**

| Agent | Today | What it needs for MVP-o-matic |
|---|---|---|
| **qa-tdd** | Mature | Owns the ```build block (files changed, commands run, tests made green, deps added with reason) and a `check-build` validator; its gates are what make plain Claude's build trustworthy. |
| **architect** | Stack and dependency gate | Picks the stack for a new repo once, from a short list (static page with no build step first; the same patterns Hearth, ccwatts and Charlie already use). Owns the scaffold templates the builder starts from. |
| **privacy-security** | Reviews changes | A fixed pre-preview gate: no secrets, no personal data, no third-party calls, repo visibility check. Output block validated like `qa`. Blocks the preview, never the build. |
| **positioning** | Copy and claims | Writes the README and the preview's first screen from the claims register, so v1 doesn't overclaim (the AGENT BAR rule). Runs once, at the end. |
| **preview (new, thin)** | Doesn't exist | Takes the finished branch, builds the static output, publishes it as a private preview, checks the link loads, writes the morning card. Never publishes publicly, never merges, never touches a live site. Not an agent with judgment; mostly a script plus a short checklist. |
| staff-pm, ux-reviewer | Already mature | Staff PM gets an **MVP cut** mode: one persona, one job, 3 to 5 features, everything else on a "v2" list. No change to QA or UX beyond the pipeline's limits. |

Not needed now: release-captain (nothing is released), orchestrator (no coordination across repos), a second builder.

**Overnight run shape (zero input from Chase)**

```
idea (one message) ─▶ SEED ─▶ STAFF PM (domain brief, then MVP cut) ─▶ STAKEHOLDERS (cut) ─▶ ARCHITECT (stack, scaffold) ─▶ QA pre ─▶ BUILD (UX for UI, plain Claude for logic)
   ─▶ QA post, green 3x ─▶ PRIVACY GATE ─▶ POSITIONING (README, first screen) ─▶ PREVIEW ─▶ STAKEHOLDERS (preview) ─▶ MORNING CARD
```

1. **Seed.** Chase's idea goes in as one message (or an issue labeled `mvp-idea`). The run starts at the evening cutoff and must finish by morning.
2. **Decide without asking.** Staff PM picks defaults for every open question and lists them in the morning card as "I assumed X". No `needs-decision` cards overnight. If the idea breaks a standing rule (real money, personal data, live deploy), the run stops at Stage 1 and the card says why; it never works around the rule.
3. **New repo.** One private repo named literally for what it is (repo naming rule), from the scaffold. **Gate:** creating a repo is an outward step, so it needs Chase's standing OK, once, for "one new private repo per night, studio-agents scaffold only". Without that OK the run builds on a branch in studio-agents' `mvp/<slug>/` folder instead and says so. This is decision 6 below.
4. **Build.** Stages 2 to 4 as above, with a tighter budget: scaffold, one persona, 3 to 5 features, UX max 3 rounds, QA max 2 fix attempts per bug.
5. **Preview link.** v1 scope is **static, on-device MVPs** (HTML, CSS, JS, no backend, no accounts, no real data), which is how most studio products already start. The preview is published as a **private claude.ai Artifact** (private by default, so no public deploy and nothing indexed). Anything needing a backend, login or paid service is out of scope for v1: the run builds the front end against fake data, labels it, and lists the backend as a v2 item.
6. **Morning card (the only output).** One message: the preview link, the repo link, three screenshots, the "I assumed" list, the v2 list, what the tests covered (qa block verbatim), what the run cost, and one promote button's worth of next step (go public, or throw it away). Chase promotes; nothing goes public or live on its own.

**Overnight limits and caps (kept, and tighter):**
- Per-run cap: **no dollar cap (Chase is on Max, Nov 24: tokens are use-it-before-reset, not dollars).** Runs are bounded by rounds and stage budgets in tokens instead, and by the plan's own reset: the run keeps going until it is done or the plan's limit stops it, and it must leave a resumable ledger so a limit stop picks up after the reset. Per-night: one MVP run, no retries after a stop.
- A stage over 1.5x its budget stops the run; the card reports how far it got ("the v1 stopped at stage 4, here is the branch").
- Kill switch file halts it. Nightly stays **off** until Chase says resume, and the first MVP run is a supervised daytime dry run on a throwaway idea, not a night run.
- Partial is a success state: a run that stops at a gate hands Chase a short, honest card, never a broken link.

**How we'll know it works (added to the outcome eval):** same idea, plain Claude (one long session, same $ cap) vs the pipeline, blind Opus grader asks "would Chase open this in the morning and keep going, or start over?" Plus counts: preview loads, tests green, privacy gate clean, assumptions listed, cost. Use 4 real ideas from Chase's side-ideas list. Wins out of N, no multipliers.

## Stakeholder agent: Stakeholder Twins as a loop (Chase, Nov 24)

Chase wants Stakeholder Twins evolved into a stakeholder agent that loops through personas. **Reuse, don't rebuild:** the persona set and prompts come from the Twins work (its own repo, `persona-twins`, and the portfolio prompt `prompts/stakeholder-twins.txt`: everyday user, customer, skeptic, marketing, sales, finance, product, each saying what it would push back on, ask, and what would make it say yes). I read the prompt; I did not read the `persona-twins` repo (outside this session's repo scope), so the first build step is to pull its persona text in rather than retype it.

**Update (merged by another thread):** the stakeholder agent now has its own plan, `docs/stakeholder-agent-plan.md`, and an installable plugin (PR 133). Where the two differ on personas, caps or loader, that doc wins; this section only fixes where it sits in the MVP run.

**Job (one sentence):** read the artifact in front of it as each chosen persona, in character, and return the few objections that would change what ships.

**Where it sits in the MVP-o-matic run (two checkpoints):**
1. **Before the build, on Staff PM's MVP cut** (cheap: the input is a short spec). It can only cut, reorder or sharpen the cut; it never adds scope. If it finds a blocker the cut doesn't answer, Staff PM revises once.
2. **After the preview, before the morning card** (input is the preview shots plus README). Objections go on the card as "what your stakeholders would say"; they don't trigger a rebuild overnight, except a P0 that a failed test or the privacy gate also confirms.

**The loop:** for each chosen persona in turn, one pass, each with fresh instructions and only the artifact (not the other personas' answers, so they don't echo each other). Then one merge step: dedupe, rank by "would change what ships", cap at 5 objections total.
- **Personas per run:** the everyday user and the skeptic always, plus 2 picked by the product (finance for anything paid, engineer-minded product for tooling, sales or marketing for something public). Four passes, not seven, to hold the token cost down.
- **Round limit:** 1 pass per persona per checkpoint, **2 checkpoints per run, at most 1 revise after checkpoint 1**. Never a debate between personas.
- **Stop rule:** stop when every chosen persona has answered once. An objection counts only if it cites a line of the spec or a screen; uncited "I'd want more polish" is dropped. If no persona says "would not use", the checkpoint passes and the run goes on.
- **Cost:** one cheap pass each on Sonnet, inside the run's cap (about 10 percent of it). No separate cap; it stops with the run.
- **Output contract:** a ```stakeholders block (persona, objection, evidence line, `blocker | note`), checked by a small `check-stakeholders`, same pattern as the other blocks.

**What it is not:** not a real user, not a gate on Chase's taste, and not a source of claims. Twins are invented voices; the card labels them "simulated stakeholders". Real feedback still comes through the feedback loop.

**How we'll know it helps:** add it as one more arm in the outcome eval: pipeline with and without the stakeholder checkpoints, same blind Opus question ("would Chase keep going or start over?"). If it doesn't win, it stays a card section, not a stage. Until then no claim that it improves MVPs.

## Status and decisions made while building step 1 (Nov 24)

Build step 1 is merged (`tools/pipeline-run.mjs`, PR 138). Decisions taken while building it, so no thread has to re-decide them:
- **Verify needs a green qa verdict.** A red, flaky or blocked block cannot finish `verify`; it is refused and not counted as a strike.
- **Only validators strike.** Stop rule 3 (two failed validations) counts the spec and qa checkers. An empty block is a presence check and does not count.
- **Build gets 3 rounds on every lane**, not only `ui`. Staff PM gets 1 round; verify gets 2 fix attempts per bug.
- **Class C covers manifests and lockfiles**, not only `package.json` (pyproject, requirements, Cargo, go.mod, lockfiles), plus CLAUDE.md in any letter case and `.github/` however the path is written.
- **Skipped stages are set at `init`:** docs and config lanes skip `tests-pre` and `build`.
- **No dollar caps.** Chase is on Max; the run stops on rounds, stage token budgets and the kill switch.

First dry run (this section was written through the ledger on the docs lane, `docs/runs/2026-11-24-pipeline-dryrun-ledger.json`): the spec validator rejected Staff PM's first block over id formats, which counted as one strike, and the second block passed. That is the stop rule working as designed.

## Build order (one small PR each, test-first, each stops for Chase's go)
1. `tools/pipeline-run.mjs` ledger and stop rules (validators reused), with a fake-stage test run. No model calls.
2. Staff PM adds `lane:` and `touches:` lines to the spec block; `check-spec` accepts them.
3. The runbook as a skill so a thread follows it without rereading this doc.
4. Dry run on one real non-live task (suggest a studio-agents docs fix), end to end, cost logged.
5. Outcome eval on the 4 dev prompts, then held-out once.
6. MVP-o-matic pieces, one PR each: `check-build` and qa-tdd's ```build block; scaffold templates and the architect's stack list; the privacy-security pre-preview gate; the preview script and morning card; Staff PM's MVP cut mode. Then one supervised daytime dry run on a throwaway idea.
7. Stakeholder agent: pull the persona text from `persona-twins`, add the loop prompt and `check-stakeholders`, test on one finished MVP, then add the eval arm.
8. Open the doors: feedback on Energy Scanner (after PR 126 merges), nightly hardening and the first overnight MVP run only on Chase's resume.

## Decisions for Chase
1. **Approve this plan?** Recommend yes.
2. **Who builds UI in the UI lane?** **Decided Nov 24:** the UX agent builds UI screens and plain Claude builds logic, both inside QA-TDD's gates; no engineer agent.
3. **Caps.** Decided Nov 24: no dollar caps (Max plan). Rounds, stage token budgets and the kill switch stay; `agent-guard cost` is recorded for reporting only, not enforced as a stop.
4. **First dry-run task.** Recommend a small studio-agents docs fix, not a product.
5. **Merge order of the open PRs.** PR 121 and 126 both touch HANDOFF.md and the harness doc; recommend merging 121, then 126, before build step 1.
6. **MVP-o-matic repo rule.** Recommend a standing OK for one new private repo per night from the studio scaffold, and v1 limited to static on-device MVPs previewed as a private Artifact. Alternative: no new repos, build in a studio-agents folder only.
7. **Overnight cap.** Decided Nov 24: no dollar cap. One MVP run per night, resumable after a plan-limit stop.
8. **Stakeholder agent.** Recommend yes as a two-checkpoint critic (cut and preview), four personas per run, one pass each, kept only if the eval arm shows it helps.
