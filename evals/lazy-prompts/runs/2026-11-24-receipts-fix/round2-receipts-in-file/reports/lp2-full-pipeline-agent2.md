Plan: run one small, non-live change end to end through the agents, then roll the same route out to the other repos. I chose a logic change in a non-Hearth repo as the pilot (Hearth changes reach relatives and need extra reviews). I chose to pilot before rolling out, because nothing new needs building: the agents already exist.

Goal fit: it serves the job search (a repeatable, scored build process on the portfolio) and your effort rule (you only give the merge go).

Route, one lane at a time:
1. staff-pm scopes the ask and writes the spec (0.5 session)
2. qa-tdd writes failing tests, red for the right reason (1 session)
3. engineer builds, 3 rounds max (1 session)
4. qa-tdd runs all suites 3x; ux-reviewer and privacy-security only if users or the public see it (1 session)
5. PR opens with the Agents line and an updated HANDOFF (0.5 session)

Your part: nothing until the PR, and then only a one-word go if it touches a live page or demo. Otherwise it merges on green.

Not doing: Hearth as the pilot, new agents or tools, rolling out to every repo before one clean run.

Biggest risk: a stage loops and eats your hour. Build is capped at 3 rounds, and no stage starts until the one before it is done.

Next step: staff-pm picks the pilot change and begins it at the start of tonight's session. Spec is in SPEC-PIPELINE.md.

```spec
verdict: ready
bet: Chase sends one lazy ask and gets a reviewed PR back through staff-pm, qa-tdd, engineer, qa-tdd and the reviewers; it worked when one pilot change goes ask to PR with every stage logged and Chase touching only the merge go
step: M1.1 | Pick the pilot change and init the ledger (lane logic, touches non-live) | ledger exists and status shows staff-pm pending | 0.5 session
step: M1.2 | staff-pm writes the spec for the pilot | spec block passes check-spec and the stage is marked done | 0.5 session
step: M1.3 | qa-tdd writes failing tests for every auto criterion | tests red for the right reason and the QA block passes check-qa-report | 1 session
step: M1.4 | engineer builds, max 3 rounds | tests green and the build stage is done | 1 session
step: M1.5 | qa-tdd runs all suites 3x, then ux-reviewer and privacy-security if users or the public see it | 3 green runs and no P0 or P1 open | 1 session
step: M1.6 | PR opened with the Agents line and updated HANDOFF | PR open, merge class recorded, Chase gets the one-word go only if it touches live | 0.5 session
criterion: PIPE-1 | auto | Given a fresh ledger with lane logic, when build is started before tests-pre is done, then the tool exits 1 with a reason
criterion: PIPE-2 | auto | Given a ledger with lane docs, when status is read, then tests-pre and build show "skipped"
criterion: PIPE-3 | auto | Given build has run 3 rounds, when a 4th round is requested, then the tool exits 1
criterion: PIPE-4 | auto | Given a changed file list that includes a live page, when class is run, then the merge class is "waits for Chase's go"
criterion: PIPE-6 | auto | Given a ledger with no stages started, when status is read, then 0 stages show "done"
criterion: PIPE-5 | manual | Given the pilot PR body, when read, then it has 1 Agents line naming only agents that ran, and qa-tdd's block pasted verbatim
risk: A stage fails and the loop spins on the 1-hour night budget | PIPE-3
risk: A live-site change merges without Chase's go | PIPE-4
cut: Hearth as the pilot | its changes touch relatives and need grandparent-ux and a persona check, too heavy for a first run
cut: New agents or new tooling | the existing six agents and the ledger tool cover every stage
cut: Running the pipeline on every repo | one clean pilot first, then roll out
handoff: qa-tdd | failing tests for PIPE-1 to PIPE-4 and the pilot's own criteria | red for the right reason
handoff: engineer | build the pilot change | PIPE-1 to PIPE-4 and pilot tests green 3x
handoff: ux-reviewer | review any user-facing words or screens in the pilot | no P0 or P1
handoff: privacy-security | review only if the pilot touches data, keys or a public demo | no P0 or P1
```
