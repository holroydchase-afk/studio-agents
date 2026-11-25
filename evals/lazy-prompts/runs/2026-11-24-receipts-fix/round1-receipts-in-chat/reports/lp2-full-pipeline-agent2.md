The pipeline already exists as a tool (`pipeline-run.mjs`: staff-pm, tests-pre, build, verify, pr, with stop rules), so I'm reusing it and building nothing new. What's missing is proof it works end to end, and that proof is portfolio material for the PM job search.

Plan: run it once on one small, non-live logic change in ccwatts (I chose that repo; live and Hearth changes are out). Chase's only step is the merge go.

1. Tonight: init the ledger and spec the change (1 session).
2. Next session: qa-tdd red, then engineer builds, then qa-tdd green 3x (1 session).
3. After that: verify, PR with the Agents line, and a portfolio line that claims only the stages the ledger shows (1 session).

Cut: a new chain tool, a rollout to every repo, and Hearth as the test case.
Biggest risk: claiming a stage that never ran. PIPE-5 and PIPE-8 check the portfolio line against the ledger.

Checks: all 3 passed
tool: agent-guard kill staff-pm | ok | exit 0
tool: check-spec | ok | exit 0
tool: spec-lint | ok | exit 0
waivers: 0

```spec
verdict: ready
bet: Chase believes the pipeline works only if one real small change goes staff-pm, tests-pre, build, verify, pr with a ledger and no step done by him except the merge go; it worked when the ledger shows all five stages done and the PR body carries the Agents line
step: M1.1 | Pick one small logic-lane change in a non-live product repo and init the ledger with pipeline-run init | ledger file exists with lane logic and touches non-live | 0.5 session
step: M1.2 | staff-pm writes the spec, then pipeline-run done staff-pm | check-spec passes and the ledger shows staff-pm done | 0.5 session
step: M1.3 | qa-tdd writes failing tests (tests-pre), then engineer builds, max 3 build rounds | tests red for the right reason, then green 3x | 1 session
step: M1.4 | verify and pr stages: qa-tdd 3x run, ux-reviewer if users see it, PR opened with Agents line | ledger shows verify and pr done and the PR is open | 0.5 session
step: M1.5 | Record the run in the portfolio claim only as far as the ledger shows | portfolio line matches the ledger stage count | 0.5 session
criterion: PIPE-1 | auto | Given a ledger with staff-pm not done, when start tests-pre is run, then the tool exits 1 and refuses the stage
criterion: PIPE-2 | auto | Given lane docs, when init runs, then tests-pre and build show "skipped" and the exit code is 0
criterion: PIPE-3 | auto | Given a build stage on round 4, when round build is run, then it trips with exit 1 (limit is 3)
criterion: PIPE-4 | manual | Open the finished PR on a phone -> the body has one line starting "Agents:" naming 5 stages and qa-tdd
criterion: PIPE-6 | auto | Given an empty ledger file, when status is run, then it exits 2 with a usage error and writes nothing
criterion: PIPE-7 | manual | Open the PR body on a phone at 360px by 640px -> the Agents line is visible within 2 screens
criterion: PIPE-8 | manual | Check the portfolio line against the released ledger -> it says "5 stages" and the ledger shows 5 done
criterion: PIPE-5 | manual | Read the portfolio line after the run -> it claims at most the 5 stages the ledger shows done, never more
cut: A new orchestrator or chain tool | pipeline-run.mjs already records stages and stop rules; the main session sequences the agents
cut: Running the pipeline on every repo at once | one real run proves the bet; wide rollout waits for the result
cut: Live-site or Hearth changes as the test case | live merges need Chase's go and Hearth has real beta users
risk: A stage claimed done that never really ran, which would overclaim on the portfolio | PIPE-5
risk: Build loops past the plan limit and burns Chase's Claude plan | PIPE-3
handoff: qa-tdd | failing tests for PIPE-1 to PIPE-3 against the ledger tool, then 3x green | red for the right reason, then green 3x
handoff: engineer | build only what the failing tests need | PIPE-1 to PIPE-3 green 3x
handoff: ux-reviewer | review any user-facing words in the PR | no P0 or P1 findings
handoff: positioning | portfolio line for the run | line matches ledger, PIPE-5 passes
```
