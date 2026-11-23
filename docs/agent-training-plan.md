# Agent training plan

The one process for raising any studio agent from "a prompt file" to "an agent we can show a score for". It is the UX agent's process (the "Raise the UX agent from 7 to 9" work) with the UX-only parts taken out, so `qa-tdd`, `staff-pm` and every agent we add later follow the same steps. Chase asked for this on Nov 22; it changes whenever the process improves (see the update log at the bottom).

Related: [agent-template.md](agent-template.md) (the eight things every agent must have), [ux-agent-bar.md](ux-agent-bar.md) (autonomy tiers and cost), `evals/agent-misses/README.md` (QA-TDD and Staff PM cases and scores), `plugins/studio/evals/README.md` (eval folders).

## Ground rules
- **Real cases only.** Every case comes from something that actually went wrong in one of our products. No invented misses.
- **Score without an API key.** Chase, Nov 21: no paid API route. We run the agent and a fresh grader as Claude Code subagents in the thread and save every report. `claude plugin eval` is a later add when a key exists.
- **The grader never sees how the agent got there.** A fresh grader reads only the case's `criteria.md` and the saved report, and answers PASS or FAIL with one specific reason.
- **Held-out means unread.** A held-out case is never read while tuning and is scored once per change. After a change, a held-out set is spent, so the next change needs a new one.
- **Rules come from misses, not hunches.** A rule is added only for a pattern a missed case showed. The case stays forever as a regression case.
- **Cost stays small.** Run one lane at a time, sonnet for agents; fresh graders run on Opus from run heldout-3 on (Chase, Nov 22), earlier runs (dev-1 to heldout-2) were graded by sonnet, so say so when comparing; and say what a round cost.

## The bar (Chase, Nov 22)
Every studio agent is held to what a hiring manager at Anthropic would call a real agent, not a prompt file. Chase treats the current agents as staff level, and over-claiming on the portfolio has already cost him an opportunity, so the bar has two halves.

**1. It has to be real.** A tool loop (the agent calls scripts that act and read results), a validated output contract, a run log, memory between runs, guardrails and a score on real cases against a plain-session baseline. Strong tooling for each agent comes before polish. The infrastructure table below is the checklist.

**2. We only claim what the repo can show.** A public claim about an agent (README, portfolio, LinkedIn) must point to a run log, a score or a case folder in this repo. Before any claim goes public:
- Say what the agent does in the words of the score ("11 of 11 on 11 fresh cases, 12 of 16 on staff-pm"), never "expert" or "autonomous".
- State the arm: with agent, plain session, cross-lane. A with-agent number with no plain baseline is labeled as such.
- State the limits: a small case set, subagent graders instead of `claude plugin eval`, advisory tier only.
- A capability marked Missing in the infrastructure table is not claimed, even as "coming soon".
- The `positioning` agent checks every agent claim against this plan's status table, and a claim the table cannot back is cut.

## Subagents: where they help
Use a subagent only where a separate context makes the result better, not to look busy.
- **Now:** a fresh grader per batch of cases (it must not see how the agent worked); parallel runs of one agent across independent cases; a qa-tdd review of the tooling code itself.
- **Later, when the single agents are stable:** a staff-pm team (a spec writer plus a fresh skeptical reviewer that tries to break the criteria), a qa-tdd team (a test writer plus a mutation-style reviewer that tries to make the suite pass wrongly), and an orchestrator that dispatches them. A team earns its place only if it beats the single agent on the same held-out cases; until then we do not claim one.

## The loop (every agent, in this order)

| # | Step | What it produces | Done when |
|---|---|---|---|
| 1 | **Collect real misses** | A list of real misses with product, commit or PR, what the agent should have caught, and a pattern tag. UX called these "before shots": the real input, as it was, before the fix. | At least 30 misses from at least 4 products, each traceable to a PR, issue or commit. |
| 2 | **Chase confirms yes or no** | One list, each miss with a one-line "real miss, should the agent have caught it?" and Chase's yes or no. Only yeses become cases. | Chase has answered every row, or said "all yes". Unconfirmed rows stay out of the scored set. |
| 3 | **Build golden cases** | A case folder per miss (`prompt.md`, `graders/criteria.md`), a tiny repro or scenario, and a rule that the prompt must not hint at the miss. | Generated from one spec file, with a stale-check and a proof that the repro fails for the right reason. |
| 4 | **Split dev and held-out** | About half dev, half held-out, mixed across priority and pattern. | Split is recorded in the spec and enforced by the scorer. |
| 5 | **Baseline on dev** | An honest score: the agent as it is today, on dev cases only. | Saved run with every report and grader reason. |
| 6 | **Good-work set (false alarms)** | Cases where the work is already right: after-fix products for UX, passing suites with correct code for qa-tdd, a complete spec for staff-pm. The agent must say so and must not invent findings. | At least one good-work case per priority-0 pattern, and the false-alarm rate is a number. |
| 7 | **Noise check** | The same cases run 3 times. A case that flips across runs is flagged flaky, and a flaky case does not count as a pass. | Per-case pass count out of 3 for dev, and a list of flipping cases. |
| 8 | **Add rules** | Edits to the agent file (and its skill) for the patterns the dev misses showed. Each rule names the case it came from. | Dev score goes up on re-score, with no good-work regression. |
| 9 | **Score held-out once** | The score that counts. | One run id, a `change` note, never re-scored without a new set. |
| 10 | **Compare** | With agent versus a plain session on the same cases (what the agent adds), and the other agent on the same cases (cross-lane). | Both columns in `results.md`. |
| 11 | **Pilot on a real product** | The agent runs on a live piece of work (UX: the capture, file-issues and recheck loop on the portfolio demos). Its findings are checked against what a person later found. | One real run with Chase's accept or reject on each P0 and P1 finding. |
| 12 | **Promote or hold** | Advisory, Supervised or Full per the tiers in `ux-agent-bar.md`, based on the numbers above. | Criteria met or the next milestone named. |

Every step ends with the agent's **living checklist** (its row in the status table below) updated in the same PR, and a line in the update log.

## Infrastructure every agent gets (build once, reuse)

The loop above needs plumbing. UX has most of it already, so the rule is: **generalize the UX piece, then plug the other agents in. Do not rebuild.** This is the template in [agent-template.md](agent-template.md) turned into a build list. Status is honest: Have, Partial or Missing.

| Piece | UX reviewer has | QA-TDD has | Staff PM has | Shared build (reuse) |
|---|---|---|---|---|
| **Tools that act** (a script the agent calls, not prose) | Have: `ux-shots`, `ux-rules`, `ux-flows`, `ux-issues`, `ux-recheck` | Have (Nov 22): `qa-run3` runs a suite 3x, flags flaky, kills a hung run, never echoes output, prints the qa suite line | Have (Nov 22): `check-spec` validates and `spec-lint` flags 9 kinds of gap staff-pm has missed (45 tests); known gap: SL-9 misses a P1-ranked risk stated on a line with no privacy word | `qa-run3` (suite 3x, per-run counts, flaky flag, JSON) and `spec-lint` (checks a spec against the rules) |
| **Output contract with a validator** | Have: ```findings (`check-findings`) | Have: ```qa (`check-qa-report`) | Have (Nov 22): ```spec block, `check-spec`, 59 tests; not yet scored on a held-out set | Done for staff-pm: verdict, bet, steps, criteria with inputs and expected results, cuts, risks, decisions, handoffs |
| **Run log** (who, when, model, tokens, cost, verdict) | Have: ```uxrun (`check-ux-run`) | Have (Nov 22): ```agentrun (`check-agent-run`, 22 tests); first real log `docs/runs/2026-11-22-qa-tdd.md` (spec-lint tests; tokens and cost not shown by the harness, so it escalates) | Have (Nov 22): same block; first real log `docs/runs/2026-11-22-staff-pm.md` (the spec-lint spec, passes `check-spec`) | One ```agentrun shape for every non-UX agent; ```uxrun stays |
| **Memory between runs** | Have: `ux-state` (open, fixed, back) | Have (Nov 22): `agent-memory` reads past findings, not yet used in a real run; no open/fixed state yet | Have (Nov 22): same; not yet used in a real run; no open/fixed state yet | Parameterize `ux-state` by agent and id prefix (QA-R, PM-R) rather than copying it |
| **Search over past findings and rules** | Have: `ux-search` | Have (Nov 22): `agent-memory` (13 tests) searches finding lines in run logs and the eval miss cases; not yet used in a real run | Have (Nov 22): same, `--agent staff-pm`; not yet used in a real run | `agent-memory` reuses `ux-search`; corpus = run-log finding lines and the miss list. **Finding lines:** a run log lists each finding on its own line outside the ```agentrun block, `QA-R<n> \| P<n> \| where \| problem \| test` (or `PM-R<n> \| ...`); the agentrun block only holds the count |
| **Guardrails** | Partial: tool list without Edit, demo-only, validators; cost cap and kill switch not enforced | Have (Nov 22): `agent-guard` (41 tests): kill-switch file, cost cap that trips unless the run escalated, and a check that a run changed only test files; wired into qa-tdd.md as a Guards step; not yet used in a real run | Have (Nov 22): kill switch and cost cap wired into staff-pm.md; not yet used in a real run | `agent-guard`, shared by all agents |
| **Retries and tool errors** | Partial: `ux-flows` retries once and keeps going | Missing | n/a until it has tools | Same retry-once-and-continue helper inside `qa-run3` |
| **Evals** | Have: recall 14, fresh 11 | Have: 8 recall, 4 behavior, 20 miss cases, scorer | Partial: 1 behavior, 24 miss cases, same scorer | The scorer and case tool already serve all three |
| **Scorecard** | Partial: recall rows on the Studio scoreboard | Have (Nov 22): `agent-scorecard` (15 tests) prints eval scores by run, phase and arm plus logged-run counts; local report only, not published to the site; lift and cost show not measured until a plain arm and a measured run exist | Have (Nov 22): same, local report only | `agent-scorecard`: one table from `runs/` and run logs (score by priority, false-alarm rate, noise, lift, cost per run, accepted-finding rate) |
| **Context budget** | Missing (21 KB prompt loads every run) | Missing | Missing | Written budget per agent: always, per run, on demand; the miss list and rules are fetched, not inlined |
| **Loop that runs without a person** | Partial: capture, issues, recheck merged; scheduled CI run not yet | Missing | Missing | One scheduled-run pattern in CI (kill switch and cost cap first), then each agent registers its loop |

Build order for QA-TDD and Staff PM, each its own small PR, test first, merged on green:
1. **Contracts.** `check-spec` and the ```spec block for staff-pm. (qa-tdd already has its contract.)
2. **Tools.** `qa-run3`, then `spec-lint`.
3. **Run log.** `check-agent-run` and the ```agentrun block, written by both agents.
4. **Memory.** `ux-state` and `ux-search` made agent-generic; both agents read the last run and open findings first.
5. **Guardrails.** Kill switch, cost cap, qa-tdd changed-only-tests check.
6. **Scorecard.** `agent-scorecard` over every run folder, published to the Studio scoreboard (a site change: preview for Chase first).
7. **Scheduled loop.** Last, as for UX.

### Score definitions (same for all agents)
- **Recall** = cases passed over cases scored, by priority. P0 recall is reported on its own.
- **Priority ranking** counts: finding the gap but ranking a P0 as P1 is a FAIL on that case.
- **False-alarm rate** = good-work cases where the agent invents a blocking finding, over good-work cases.
- **Noise** = cases whose result flips across 3 runs.
- **Lift** = with-agent score minus plain-session score on the same cases.

### Where things live
- Case specs: `evals/agent-misses/<agent>-cases*.mjs`. Generated folders: `plugins/studio/evals/<agent>-miss-*`. Tool: `tools/eval-miss-cases.mjs` (write, `--check`, `--verify`).
- Runs: `evals/agent-misses/runs/<date>-<phase>-<n>/` with `results.json`, `results.md` (made by `tools/eval-miss-score.mjs`) and `transcripts/`. `--check-all` runs in `tests/check.sh`.
- Misses list and tallies: `evals/agent-misses/README.md`.

## Status by agent

| Step | UX reviewer | QA-TDD | Staff PM |
|---|---|---|---|
| 1 Real misses | Done (23 issues, 11 fresh cases) | Done (46 collected) | Done (48 collected) |
| 2 Chase confirms yes or no | Done | **Not yet** | **Not yet** |
| 3 Golden cases | Done (`ux-reviewer-fresh-*`) | Done (20 cases) | Done (24 cases) |
| 4 Dev and held-out split | Done | Done | Done |
| 5 Baseline on dev | Done (8 of 11) | Done (see README, Scored runs) | Done |
| 6 Good-work set | Done (after shots of improved products) | **Not yet** | **Not yet** |
| 7 Noise check | Done | **Not yet** | **Not yet** |
| 8 Rules from misses | Done (7 to 9, then 11 of 12) | Done once (P0 rule, qa block, boundary list, think like the staff PM) | Done once (public-copy done items, test-first spec) |
| 9 Held-out scored once | Done | Done: 3 of 4, then 11 of 11, then 10 of 10 (plain session 1 of 10 on the written criteria, 9 of 10 format-neutral) on fresh sets | Done: 4 of 4, then 12 of 16, then 9 of 10 (plain session 7 of 10) on fresh sets |
| 10 Compare (plain, cross-lane) | Plain done | Cross-lane started; plain **not yet** | Cross-lane 2 of 4; plain **not yet** |
| 11 Pilot on a real product | Done (#76, portfolio demos) | **Not yet** | **Not yet** |
| 12 Promote or hold | Advisory | Advisory | Advisory |
| Infrastructure (table above) | Mostly have | Contract and evals only | Evals only |

The QA-TDD and Staff PM score cells are in `evals/agent-misses/README.md` ("Scored runs"); this table points there rather than copying every number.

## Milestones: QA-TDD
Goal: a qa-tdd that writes the failing test that would have caught each real miss, ranks it right, and says "green" only when the suite really is.
- **Q1. Chase's yes or no list.** Post the 46 misses as one list with a recommended answer on each; only confirmed rows count. Done when Chase answers or says all yes.
- **Q2. Good-work cases.** Six cases: a passing 3x suite with correct code, a correct date-clock test, a test that already pins the boundary, a docs-only PR, a flaky-looking but stable suite, and a privacy-clean diff. The agent must report green, name no blocking finding and write no extra tests it cannot justify. Done when the false-alarm rate is measured.
- **Q3. Noise.** Run every dev case 3 times; fix or retire flipping cases. Done when the flip list is empty or written down.
- **Q4. P0 ranking rule, second pass.** The remaining miss pattern is P0 ranked as P1 (privacy leaks, wrong-night data, Infinity on a zero divisor). Tune on a new dev set. Done when P0 recall on a fresh held-out set is at or above 90%.
- **Q5. Plain-session arm.** Same cases with no agent file. Done when lift is a number per priority.
- **Q6. Pilot.** qa-tdd reviews one real open PR per product with tests (ccwatts, Role Radar, Hearth), and Chase marks each P0 and P1 finding accept or reject. Done when at least 80% of P0 and P1 findings are accepted.
- **Q7. Infrastructure.** `qa-run3`, `agentrun` log, generic state and search, the changed-only-tests guard (build order 2 to 5 above). Done when a qa-tdd run writes a checked `agentrun` log and reads the last one.
- **Q8. Promote or hold.** Apply the tier criteria in `ux-agent-bar.md`.

## Milestones: Staff PM
Goal: a staff-pm that writes specs with testable acceptance criteria, names the risk before it ships, and writes the spec test-first (the criterion that would have caught the bug appears as a test input before the build).
- **S1. Chase's yes or no list.** Same as Q1 for the 48 misses.
- **S2. Good-work cases.** Six complete specs the agent must approve or tighten lightly without inventing new scope: a spec with a budget, a rollback and a fairness bar, a spec with pinned-clock criteria, a docs-only change, a small cut that is already right, a go and no-go with evidence. Done when the false-alarm rate is measured.
- **S3. Noise.** Run every case 3 times, especially the long open-ended ones where a criterion is easy to miss.
- **S4. Second pass on the four batch-2 misses.** README unreleased features ranked P1 instead of P0, recruiter rollback with no different-user check, geofence with no measured pass-share bar, phone page height with no screen budget. Tune on a new dev set. Done when staff-pm scores at or above 90% on a fresh held-out set.
- **S5. Plain-session arm.** Same as Q5.
- **S6. TDD-mindset check.** The cross-lane cases (spec must contain the test input that would have caught the bug) stay a small subset, scored separately so the core spec skills stay the focus.
- **S7. Pilot.** staff-pm scopes one real new feature per product, and Chase marks which acceptance criteria he would have missed himself.
- **S8. Infrastructure.** ```spec block with `check-spec`, `spec-lint`, `agentrun` log, generic state and search (build order 1 to 4 above). Done when a staff-pm run writes a spec that passes `check-spec` and `spec-lint`.
- **S9. Promote or hold.** As Q8.

## Adding a new agent
Copy this plan: open a status column, run step 1 (collect real misses), and do not write a rule before step 5 has a baseline. If an agent has no misses to learn from yet, its first job is to collect them. Add the agent to the status table in the same PR.

## Update log
Add a dated line whenever the process changes or a milestone moves. Say what changed and why.

- 2026-11-22: Plan written. Generalized from the UX loop; added steps 2 (Chase confirms), 6 (good-work set) and 7 (noise) as explicit gates for QA-TDD and Staff PM, which so far have only had steps 1, 3 to 5, 8 to 10 (partly). Held-out set 2 scored: qa-tdd 11 of 11, staff-pm 12 of 16, cross-lane 2 of 4.
- 2026-11-22: Added the infrastructure table (Chase: "are we building all the infrastructure? ... we have already built it for UX"). Rule: generalize the UX pieces and plug qa-tdd and staff-pm in; build order and milestones Q7 and S8 added.
- 2026-11-22: Added "The bar" (real agent, claim only what logs and scores show) and the subagent section (Chase: strong tooling for each, staff level, no overclaiming; subagent teams later if they beat the single agent).
- 2026-11-22: Build order 1 done: `check-spec` and the ```spec block for staff-pm (qa-tdd wrote 59 red tests first, engineer built it). Known gap: step IDs must look like M1.1; a product prefix such as CCW-M1.1 is rejected. Next: `qa-run3`.
- 2026-11-22: Build order 2 (qa-run3) done: 19 tests written red by qa-tdd, built by the engineer, wired into qa-tdd.md. Next: `spec-lint`, then the shared run log.
- 2026-11-22: Build order 3 done: `check-agent-run` and the ```agentrun block, with a Run log step in qa-tdd.md and staff-pm.md. No real run has been logged yet, so no claim of run logs until one exists. Next: first real logged run of each agent, then generic state and search, guardrails, `spec-lint`, scorecard.
- 2026-11-22: Build order 4 done: `spec-lint` (staff-pm scoped it and logged the run, qa-tdd wrote 45 red tests, engineer built it). First real run logs exist for qa-tdd and staff-pm; tokens and cost were not visible to the agents, so both escalate with that reason and no cost claim is made. Next: generic state and search, guardrails, scorecard, then run both agents on a held-out set with the tools on and compare.
- 2026-11-22: Build order 5 done: `agent-guard` (kill switch, cost cap, qa-tdd only-test-files), 41 tests, Guards step in qa-tdd.md and staff-pm.md. Not claimed as working in production until a real run uses all three. Next: generic state and search, scorecard, fresh held-out set with the tools on.
- 2026-11-22: Build order 7 done: `agent-scorecard` (15 tests, SCORE-1..15) reads `evals/agent-misses/runs/*/results.json` and valid `docs/runs/*.md` logs, one section per agent, cross rows attributed by `by`. Lift counts only for a heldout run whose plain and agent arms cover the same case names; none does yet, so lift and cost both print not measured. Local report only; publishing to the Studio scoreboard is a site change that needs a preview for Chase first.
- 2026-11-22: `stamp-run` (26 tests, STAMP-1..13): the caller, not the agent, stamps a run log with tokens measured from the subagent transcript (deduplicated sums), the commit and an optional test count; `check-agent-run` validates the `stamp_*` lines. Run log row: tokens measured by stamp-run from subagent transcripts, run by the caller. Cost needs a price file with a source and date; none exists, so cost stays not measured. Committed logs are not stamped yet.
- 2026-11-22: Held-out set 3 scored with a plain-session arm and Opus graders (blind to arm): 20 fresh batch-3 cases, 2 runs each. qa-tdd agent 10 of 10 vs plain 1 of 10; staff-pm agent 9 of 10 vs plain 7 of 10; overall 19 of 20 vs 8 of 20. Limits: 20 cases, one run each, cases written by us (CO-Q2, PS-Q6, PS-Q7 repros are inferences from thin README lines), reports saved by the agent itself, held-out set now spent. Staff-pm lift (2 cases) is within noise; qa-tdd lift on the written criteria is mostly format. Format-neutral re-grade of the same 20 qa-tdd reports (Opus, blind, ignoring qa block, priority and ID format; `neutral-regrade.json` in the run folder): agent 10 of 10, plain 9 of 10. Most of the qa-tdd lift on the written criteria is report format, not finding bugs. Staff-pm miss: share-screen-feels-like-a-form (both arms). Next: Q5 per-priority lift is a number now; a new held-out set is needed for the next change.
- 2026-11-22: Held-out set 4 (tool-dependent cases) scored: 6 new qa-tdd cases where the gap shows only when something is run (CC-Q6 docs-only skip via a renamed file, PS-Q1, CH-Q4, CH-Q5, RR-Q7, RR-Q9), agent and plain arms, Opus graders blind to arm. Written criteria: agent 6 of 6, plain 2 of 6. Format-neutral: agent 6 of 6, plain 6 of 6. Plain also ran the code and found every gap, so there is still no proven qa-tdd lift beyond report format and keeping to "do not fix source". Limits: 6 cases, one run, our cases, one grader call gave both verdicts. Next: cases where plain is likely to fail on substance (many files, a hidden regression only visible across runs, flaky 1-in-N needing repeats), or accept that qa-tdd's value is the contract and log, not detection.
- 2026-11-22: Staff PM dossier cases (batch 5, S4/S5): 8 new cases whose traps sit in a small fixture repo (CLAUDE.md, HANDOFF.md, a doc) instead of the prompt, two required items each, rebuilt from real misses (`staff-pm-cases-batch5.mjs`; `eval-miss-cases` now writes `fixture/`, `setup.sh` and `case.yaml` for a case with a `repo`). Dev run `2026-11-22-batch5-dev` (before tuning): agent 1 of 4, plain 0 of 4. The agent's three general misses (a new rule needs a feedback loop; saved samples are not the real source; done means the public side is checked after the switch) went into staff-pm.md, and spec-lint gained SL-10 feedback-loop and SL-11 samples-only (red then green). Held-out run `2026-11-22-batch5-heldout` (6 cases: 4 batch-5 plus the 2 triage cases), scored once: agent 5 of 6, plain 3 of 6, Opus graders blind to arm. The agent won two (console page, phone font), tied on three, both missed the dream-roles README check; plain never beat the agent. Limits: 6 cases, one run each, I wrote the cases myself so the author knew the traps, the demo-criteria case is weak (both arms read a real repo outside the sandbox and found the demo already has criteria), and the agent arm's agent-memory tool crashed in the sandbox (check-ux-run.mjs was not copied; a harness mistake, the repo's sync-tools copies it). Not a significant lift; do not claim more than "no case where plain beat the agent, 2 of 6 where only the agent passed". Next: noise runs (3x) on the 6 held-out cases, good-work cases (S2), and a harder dev set built from fresh triage reports.

- 2026-11-22, Staff PM noise runs: the 6 held-out batch-5 cases were run twice more on the agent arm and graded by fresh Opus graders. Agent passes 11 of 18 runs (first run 5 of 6). Plain not repeated, so no lift is claimed from this. Limits: cases written by me; some repeat runs could not see repo docs. Detail: `evals/agent-misses/noise/2026-11-22-batch5/NOTES.md`.

- 2026-11-22, Staff PM real-miss cases (batch 6): 9 cases built from real past misses in the product repos' review files and lessons. Dev (read while tuning): agent 3 of 4, plain 1 of 4. One tuning change (staff-pm.md rule 4: merged, deployed and checked are three states). Held-out, scored once: agent 0 of 5, plain 0 of 5, so no lift is claimed on real-miss cases. Why both fail: the real misses ask for checks the repo files only hint at (chat retention, visibility against the recorded go, the Expo Go conflict), and sandbox repos were thin. Detail: `evals/agent-misses/runs/2026-11-22-batch6-*`.
- 2026-11-22, batch 6 held-out re-run on a full-repo sandbox (coordinator ask: runs could not see real repo docs, so results measured the harness): 4 of 5 cases rebuilt as full copies of the real repo at the pre-miss commit for both arms. Old thin-fixture numbers on those 4: agent 0, plain 0. Fixed: agent 1 of 4 (crew-clock), plain 0 of 4. Still no real lift claim: one run, 4 cases, and the full repos changed some case premises (History and the tab bar were already built, Charlie already public), so graders' criteria no longer fit those cases cleanly. SDK case kept its thin result (Hearth history starts after the miss). Detail: `evals/agent-misses/runs/2026-11-22-batch6-heldout-fullrepo/`.
