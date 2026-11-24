Hi Chase, I'm your studio chief of staff for the agent pipeline. Looking into it now.

**Answer:** Run one fixed order, one lane at a time, on one real task: staff-pm, qa-tdd, engineer, qa-tdd again, then the review lanes, then the PR. Your ask didn't name a product, so I defaulted to a Hearth fix from the Nov 22 grandparent beta. Tell me if you want a different task.

**Goal fit:** It serves your top priority, the senior/staff PM job search. A task that ships with every lane logged is the strongest portfolio proof, and it only counts if the Agents line matches the run log.

**Buy, reuse, build or skip:** Reuse. The agents, the PR checks and the run-log hook already exist in studio-agents. I'm not building a new orchestrator.

**Critical path (about 3.5 sessions, one task):**
1. M1.1: staff-pm writes the spec with IDs. Done when `check-spec` and `spec-lint` both exit 0 (0.5 session).
2. M1.2: qa-tdd writes the failing tests. Done when each is red for the right reason (1 session).
3. M1.3: engineer builds. Done when all suites are green 3x (1 session).
4. M1.4: ux-reviewer and privacy-security review what users or the public will see. Done when no P0 or P1 is left (0.5 session). For Hearth, grandparent-ux takes the user-facing part.
5. M1.5: the PR goes up with the `Agents:` line and qa-tdd's verdict block pasted as-is. Done when every agent named on the line is in the run log (0.5 session).

**Not doing:**
- Running all 9 agents on every task. The review lanes run only when users or the public see the change.
- A new orchestrator agent. staff-pm already leads the lanes.
- Metered API runs. You're on a plan, not an API budget.

**Biggest risk:** An agent gets named on the PR line but never ran, and agents-check fails the PR. PIPE-1 tests exactly that.

**Decisions for you:**
1. Which task goes first? I recommend a Hearth beta-feedback fix, since it has real users and a clear core loop. A one-word reply works: "hearth" or the name of another.
2. Should I pin the task or let staff-pm pick? I recommend pinning it: one task, one thread.

**Handoffs:**
- qa-tdd writes the failing tests for PIPE-1 and PIPE-2. Done when they are red for the right reason.
- engineer builds once the tests are red. Done when PIPE-1 and PIPE-2 are green 3x.
- ux-reviewer reviews any user-visible words or screens. Done when no P0 or P1 is left.

**What I did not check:** I opened none of your repos. That means no HANDOFF.md, no open PRs or branches, no `.claude/agents/` roster, and no Hearth beta feedback. I haven't confirmed that the agents-check workflow or the run-log hook are active in the repo you pick. The tool checks ran only on this plan: `check-spec` and `spec-lint` both exit 0, and the run log passes `check-agent-run`. The run log shows no token or cost count, so it is marked escalated. Before M1.1 starts, staff-pm should read the chosen repo's HANDOFF.md and open PRs so nothing in flight gets redone.

```spec
verdict: needs-decision
bet: Chase believes one fixed agent order can take a task from one-line ask to a mergeable PR with him doing one step; it worked when a single Hearth task ships with every agent on the Agents line logged and Chase touching it once
step: M1.1 | staff-pm writes the spec with IDs and a spec block | check-spec and spec-lint exit 0 | 0.5 session
step: M1.2 | qa-tdd writes failing tests for every auto criterion | each test red for the right reason | 1 session
step: M1.3 | engineer builds until green | all suites green 3x | 1 session
step: M1.4 | ux-reviewer and privacy-security review what users or the public see | no P0 or P1 left | 0.5 session
step: M1.5 | PR posted with Agents line and qa block pasted as-is | Agents line names only agents in the run log | 0.5 session
criterion: PIPE-1 | auto | Given a PR body whose Agents line names qa-tdd but the run log lacks it, then agents-check exits 1
criterion: PIPE-2 | auto | Given a spec block with no qa-tdd handoff and verdict ready, then check-spec exits 1
criterion: PIPE-3 | manual | Given one real Hearth task run through M1.1 to M1.5, then Chase takes 1 action and the PR shows 5 lane entries
cut: Running all 9 agents on every task | review lanes run only when users or the public see the change
cut: A new orchestrator agent | staff-pm already leads the lanes and one lane at a time fits the plan
cut: Metered API runs | no paid API route on a $20 to $200 plan
risk: Agents named on the PR line but never run | PIPE-1
risk: Spec passes the linter but is too vague to test | PIPE-2
decision: Which task is the first pipeline run | A Hearth beta-feedback fix from the Nov 22 grandparent beta, since it has real users and a clear core loop
decision: Run the pipeline on a pinned task or let staff-pm pick | Pin it; one task, one thread
handoff: qa-tdd | failing tests for PIPE-1 and PIPE-2 | red for the right reason
handoff: engineer | build once red exists | PIPE-1 and PIPE-2 green 3x
handoff: ux-reviewer | review any user-visible words or screens | no P0 or P1
```