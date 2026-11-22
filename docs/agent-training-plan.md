# Agent training plan

The one process for raising any studio agent from "a prompt file" to "an agent we can show a score for". It is the UX agent's process (the "Raise the UX agent from 7 to 9" work) with the UX-only parts taken out, so `qa-tdd`, `staff-pm` and every agent we add later follow the same steps. Chase asked for this on Nov 22; it changes whenever the process improves (see the update log at the bottom).

Related: [agent-template.md](agent-template.md) (the eight things every agent must have), [ux-agent-bar.md](ux-agent-bar.md) (autonomy tiers and cost), `evals/agent-misses/README.md` (QA-TDD and Staff PM cases and scores), `plugins/studio/evals/README.md` (eval folders).

## Ground rules
- **Real cases only.** Every case comes from something that actually went wrong in one of our products. No invented misses.
- **Score without an API key.** Chase, Nov 21: no paid API route. We run the agent and a fresh grader as Claude Code subagents in the thread and save every report. `claude plugin eval` is a later add when a key exists.
- **The grader never sees how the agent got there.** A fresh grader reads only the case's `criteria.md` and the saved report, and answers PASS or FAIL with one specific reason.
- **Held-out means unread.** A held-out case is never read while tuning and is scored once per change. After a change, a held-out set is spent, so the next change needs a new one.
- **Rules come from misses, not hunches.** A rule is added only for a pattern a missed case showed. The case stays forever as a regression case.
- **Cost stays small.** Run one lane at a time, sonnet for agents and graders unless a case needs more, and say what a round cost.

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
| **Tools that act** (a script the agent calls, not prose) | Have: `ux-shots`, `ux-rules`, `ux-flows`, `ux-issues`, `ux-recheck` | Have (Nov 22): `qa-run3` runs a suite 3x, flags flaky, kills a hung run, never echoes output, prints the qa suite line | Partial: `check-spec` validates; `spec-lint` not built | `qa-run3` (suite 3x, per-run counts, flaky flag, JSON) and `spec-lint` (checks a spec against the rules) |
| **Output contract with a validator** | Have: ```findings (`check-findings`) | Have: ```qa (`check-qa-report`) | Have (Nov 22): ```spec block, `check-spec`, 59 tests; not yet scored on a held-out set | Done for staff-pm: verdict, bet, steps, criteria with inputs and expected results, cuts, risks, decisions, handoffs |
| **Run log** (who, when, model, tokens, cost, verdict) | Have: ```uxrun (`check-ux-run`) | Have (Nov 22): ```agentrun (`check-agent-run`, 22 tests); qa-tdd.md says to write it; no real run logged yet | Have (Nov 22): same block; no real run logged yet | One ```agentrun shape for every non-UX agent; ```uxrun stays |
| **Memory between runs** | Have: `ux-state` (open, fixed, back) | Missing: every run starts blank | Missing | Parameterize `ux-state` by agent and id prefix (QA-R, PM-R) rather than copying it |
| **Search over past findings and rules** | Have: `ux-search` | Missing | Missing | Parameterize `ux-search`; corpus = past qa blocks, past specs, the miss list |
| **Guardrails** | Partial: tool list without Edit, demo-only, validators; cost cap and kill switch not enforced | Partial: "no fix" is an eval, not enforced | Missing | `agent-guard`: a kill-switch file, a per-run cost cap that stops with `escalated: yes`, and for qa-tdd a check that a run changed only test files |
| **Retries and tool errors** | Partial: `ux-flows` retries once and keeps going | Missing | n/a until it has tools | Same retry-once-and-continue helper inside `qa-run3` |
| **Evals** | Have: recall 14, fresh 11 | Have: 8 recall, 4 behavior, 20 miss cases, scorer | Partial: 1 behavior, 24 miss cases, same scorer | The scorer and case tool already serve all three |
| **Scorecard** | Partial: recall rows on the Studio scoreboard | Partial: same rows, no miss-eval rows | Missing | `agent-scorecard`: one table from `runs/` and run logs (score by priority, false-alarm rate, noise, lift, cost per run, accepted-finding rate) |
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
| 9 Held-out scored once | Done | Done: 3 of 4, then 11 of 11 on a fresh set | Done: 4 of 4, then 12 of 16 on a fresh set |
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
