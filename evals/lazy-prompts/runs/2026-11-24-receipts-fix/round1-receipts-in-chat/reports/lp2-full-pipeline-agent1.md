Chase, I planned it as a four-session trial run of the pipeline that already exists (staff-pm, qa-tdd, engineer, qa-tdd 3x, PR), not a new build. Goal fit: it serves "do the one step that needs him" and keeps the portfolio's agent claims tied to real run logs. Reuse: the `pipeline-run` ledger already chains the stages, so I skipped a new orchestrator. I chose the studio-agents repo with a docs-lane ask first, since it is non-live and merges on green; Hearth waits until the pipeline has run cleanly once.

Next step: qa-tdd writes the failing tests (PIPE-1 to PIPE-3, PIPE-5), then M1.1 runs the ledger on one small ask. You do nothing until a live-site go comes up.

Not doing: a metered API runner (no paid route) and a first run on Hearth (live to grandparents).
Biggest risk: a build looping past 3 rounds and eating your plan limit; PIPE-2 caps it.

Checks: all 3 passed
tool: agent-guard kill staff-pm | ok | exit 0
tool: check-spec | ok | exit 0
tool: spec-lint | ok | exit 0
waivers: 3

```spec
verdict: ready
bet: Chase gives one lazy ask and gets back a PR with a ledger; it worked when one ask runs staff-pm, qa-tdd, engineer, qa-tdd 3x and a PR with no step from him except the live-site go
step: M1.1 | Run the existing pipeline-run ledger by hand on one small non-live ask, lane logic | ledger shows 5 stages, each done or skipped | 1 session
step: M1.2 | Gap list from that run: where a stage needed Chase or a stop rule tripped wrongly | each gap is one PM-R row with a fix lane | 0.5 session
step: M1.3 | Fix the top 2 gaps in studio-agents, then rerun on a docs lane ask | docs lane skips tests-pre and build in the ledger | 1 session
step: M1.4 | Run a ui lane ask with ux-reviewer and the security lane added before the PR stage | PR body has an Agents line matching the run log | 1 session
criterion: PIPE-1 | auto | Given lane docs, when status is read, then tests-pre and build show "skipped" and the PR stage can start
criterion: PIPE-2 | auto | Given the build stage has run 3 rounds, when a 4th round is requested, then the tool exits 1 and names the round limit
criterion: PIPE-3 | auto | Given a change touching live, when class is run, then it reports "chase-go" and a docs-only change reports "green"
criterion: PIPE-4 | manual | Run one ask end to end -> Chase takes 1 action (the live go) and 0 other steps
criterion: PIPE-5 | auto | Given a missing ledger file or an empty one, when status is read, then the tool exits 2 and says to run init first
cut: A new orchestrator agent | staff-pm already leads; the pipeline-run ledger already chains stages
cut: Metered API runner | no paid API route; agents run inside Claude sessions
cut: Running on Hearth first | Hearth is live to grandparents; prove the pipeline on a non-live repo
risk: A stage hands off in a session with no tools and the ledger drifts from what ran | M1.2
risk: Build loops past 3 rounds and burns plan limit | PIPE-2
handoff: qa-tdd | failing tests for PIPE-1 to PIPE-3 against the pipeline-run tool | red for the right reason
handoff: engineer | fix the top 2 gaps from M1.2 once the tests are red | PIPE-1 to PIPE-3 green 3x
handoff: ux-reviewer | review the ui lane run output Chase would read | no P0 or P1
```
