Hi Chase, I'm your studio chief of staff for the agent pipeline plan.

**Answer:** Don't build a new pipeline. The chain already exists in each repo's CLAUDE.md. What's missing is proof it runs end to end. Run one real task through it, keep the run logs, and put on the portfolio only what the logs show.

**Goal fit:** This serves the senior/staff PM job search. The portfolio claims about agents have to match run logs and scores. Buy, reuse, build or skip: reuse. A new orchestrator or runner is a skip.

**The chain, in order:** staff-pm scopes it, then qa-tdd writes failing tests (red), engineer builds, qa-tdd runs everything 3x (green), then the review lanes that apply, then the PR with an `Agents:` line and a HANDOFF update.
- Review lanes: ux-reviewer, privacy-security, positioning if there is copy, story-keeper if you made a call.
- CI checks: agents-check and handoff-check.
- One lane at a time, inside Claude sessions, with no paid API.

**Recommended:** Pilot it on a small, non-live-gated ccwatts task, about 4.5 sessions of roughly an hour each. I'd reject Hearth for the pilot. The beta is live and its rules are the heaviest.

**Critical path:**
1. M1.1 staff-pm picks the task and writes the spec. Done when check-spec and spec-lint pass. Next step: tonight, Nov 24, once you say go.
2. M1.2 qa-tdd writes failing tests for the auto criteria. Done when they are red for the right reason and the qa report passes `check-qa-report`.
3. M1.3 engineer builds. Done when everything is green 3x.
4. M1.4 reviews. Done when no P0 or P1 is open.
5. M1.5 PR with the `Agents:` line, run logs committed, and HANDOFF updated. Merge on green, since it is not live-gated.
6. M1.6 positioning and story-keeper write the portfolio line from the logs only.

**Not doing:**
- A new orchestrator agent.
- All repos at once.
- Metered or CI-driven agent runs.
- Any live-site or demo change.

**Biggest risk:** The `Agents:` line names an agent that didn't run, or the logs are missing because the Agent tool can't load the studio types. PIPE-1 tests this.

**Decisions for you:**
1. Is ccwatts the pilot repo? I recommend yes.
2. Go to start M1.1 tonight? I recommend yes.

**Not checked:** I can't open your repos. I did not read any HANDOFF.md, any open PRs or branches, the `.claude/agents/` folders, the CI workflows, or the scorecards. So I don't know what is in flight, and I haven't confirmed the agents actually load in each repo. The ccwatts task itself isn't picked yet. M1.1 picks it after reading the repo. I took the CLAUDE.md pipeline text as accurate. `agent-memory` found no past findings on this. Cost and tokens were not shown to me, so the run log says 0 and is marked escalated.

The spec and run log passed the checks (`check-spec`, `spec-lint`, `check-agent-run`, and the cost guard).

```spec
verdict: needs-decision
bet: Chase and a hiring manager can see one task go through the whole agent chain with a run log per agent; it worked when the PR shows an Agents line that matches the logs and qa-tdd green 3x
step: M1.1 | Pick the pilot task and write its spec (staff-pm) | spec block passes check-spec and spec-lint | 0.5 session
step: M1.2 | Failing tests for each auto criterion (qa-tdd) | tests red for the right reason, qa block passes check-qa-report | 1 session
step: M1.3 | Build until green (engineer) | all suites green 3x | 1 session
step: M1.4 | Run the review lanes that apply to the pilot diff | findings listed as ID-P# rows, no open P0 or P1 | 1 session
step: M1.5 | PR with Agents line, run logs committed, HANDOFF updated | agents-check and handoff-check green, merged on green if not live-gated | 0.5 session
step: M1.6 | Write down what the logs show, nothing more | portfolio line matches the run logs and scorecard | 0.5 session
criterion: PIPE-1 | auto | Given a PR that names qa-tdd and ux-reviewer on the Agents line but only qa-tdd is in the run log, then agents-check fails with 1 missing agent
criterion: PIPE-2 | auto | Given a qa-tdd report with a flaky run on 1 of 3, then check-qa-report exits 1 and the PR body does not say green
criterion: PIPE-3 | auto | Given each lane writes a run log, then check-agent-run exits 0 for 5 of 5 logs and each verdict matches its spec or qa block
criterion: PIPE-4 | auto | Given the pilot spec, then check-spec exits 0 and spec-lint exits 0 or each finding has a lint-ok line with a reason
criterion: PIPE-5 | manual | Open the finished PR page -> the first message from the chief of staff names the work and gives one plan line, and the reply leads with the answer in under 10 lines
criterion: PIPE-6 | manual | Read the portfolio line about agents -> every number in it ("3x", "5 agents") appears in a run log or the scorecard, otherwise the line is cut
cut: A new orchestrator agent or a custom runner | The chain already exists in each repo's CLAUDE.md; reuse it and add nothing
cut: Running every repo through the pipeline at once | One real task proves it; the rest is wide, not deep
cut: Any metered API or CI-driven agent runs | No paid API route; agents run inside Claude sessions
cut: Pipeline changes to the live site or a live demo | Those wait for Chase's go and are not needed to prove the bet
risk: The Agents line names agents that did not run, or logs are missing because the Agent tool cannot load the studio types | PIPE-1
risk: Portfolio claims outrun what the logs show | PIPE-6
risk: A $20 plan cannot afford five lanes in one night | M1.2
decision: Which repo for the pilot | ccwatts, a small code task that is not live-gated; reject Hearth, since the beta is live and its rules are heaviest
decision: Go for me to start M1.1 tonight | yes
handoff: qa-tdd | failing tests for PIPE-1 to PIPE-4 on the pilot task | red for the right reason, qa block verbatim
handoff: engineer | build the pilot task | PIPE-1 to PIPE-4 green 3x
handoff: ux-reviewer | review any user-facing output of the pilot | no open P0 or P1
handoff: privacy-security | check the pilot diff for personal data and secrets | no open P0 or P1
handoff: positioning | write the portfolio line from the logs only | PIPE-6 passes
```