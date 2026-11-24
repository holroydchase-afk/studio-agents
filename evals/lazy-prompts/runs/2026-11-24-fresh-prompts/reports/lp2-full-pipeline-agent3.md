Hi Chase, I'm your staff PM for planning the agent pipeline.

**Answer:** Your ask didn't name a repo or task. I picked the default and carried on. Run the one standard pipeline on the next item in HANDOFF, with Role Radar as the first repo. That repo is my pick, so it's your one decision. I did not open any of your repos or check open PRs, branches or HANDOFF files, so "which task is next" is not verified. M1.1 does that first.

**Goal fit:** This serves the senior or staff PM job search. The pipeline itself is the portfolio story, and your CLAUDE.md files already define it. Role Radar is the repo closest to the job search.

**Buy, reuse, build or skip:** Reuse. The nine studio agents and the CI checks (agents-check, handoff-check) already cover every lane. I'm building no new agents or tools.

**Pipeline, in order (about 4 sessions, one lane at a time):**
1. M1.1 staff-pm picks the task from HANDOFF and checks open PRs so nothing is redone (0.5).
2. M1.2 staff-pm writes the spec with test inputs (0.5).
3. M1.3 qa-tdd writes the failing tests, red for the right reason (1).
4. M1.4 engineer builds until qa-tdd runs all suites green 3x (1).
5. M1.5 ux-reviewer and privacy-security review anything users or the public see (0.5).
6. M1.6 positioning checks copy, then the PR goes up with the `Agents:` line, the qa block pasted as-is, and a HANDOFF update (0.5).

**Not doing:**
- Running every agent on every task. Docs-only changes skip qa-tdd and say so.
- The studio-only agents (orchestrator, focus-coach).
- New agents.

**Biggest risk:** Naming an agent in a PR that never ran, which overclaims on the portfolio. PIPE-2 makes CI fail on it.

**Your one step:** Reply "Role Radar" or name another repo. Nothing merges to a live page or demo without your go. When one is ready, I'll send one message listing the open PRs in merge order.

**Handoffs:**
- qa-tdd: failing tests for the criteria.
- engineer: build until green 3x.
- ux-reviewer and privacy-security: review.
- positioning: copy check.

**Tools run:** the kill guard passed, the memory lookup found no prior matches, `check-spec` exits 0, and `spec-lint` exits 0 with three waivers. The waivers cover rollback, sign-in cases and copy claims. They're waived because this plan ships nothing itself.

**Run log:** the harness showed no token or cost count, so I wrote 0 and set `escalated: yes`. The log is `docs/runs/2026-11-24-staff-pm.md` in the working folder. `check-agent-run` and the cost guard both exit 0.

```spec
verdict: needs-decision
bet: Chase believes one task can run scope, red test, build, green 3x, reviews and PR with him doing one step; it worked when the first task reaches a PR with an Agents line and a qa block and he only says go
step: M1.1 | Pick the first task from HANDOFF in the chosen repo and check open PRs and branches | task named, nothing redone | 0.5 session
step: M1.2 | staff-pm writes the spec with criteria and edge cases | check-spec and spec-lint exit 0 | 0.5 session
step: M1.3 | qa-tdd writes failing tests for every auto criterion | each test red for the right reason | 1 session
step: M1.4 | engineer builds until green | qa-tdd all suites green 3x | 1 session
step: M1.5 | ux-reviewer and privacy-security review what users or the public see | no P0 or P1 findings open | 0.5 session
step: M1.6 | positioning checks copy, then PR posted with Agents line, qa block and HANDOFF update | PR open, checks green | 0.5 session
criterion: PIPE-1 | auto | Given a PR that changes code and names no qa-tdd on its Agents line, then agents-check fails with 1 error
criterion: PIPE-2 | auto | Given an agent named on the Agents line but absent from the run log, then agents-check fails with 1 error
criterion: PIPE-3 | auto | Given a qa-tdd run that flakes once in 3 runs, then the PR body shows the flaky verdict and not green
criterion: PIPE-4 | manual | Given a merge that changes a live site or demo, then Chase gets 1 message listing open PRs in merge order and 0 merges happen before his go
cut: Running every agent on every task | docs-only tasks skip qa-tdd and say so
cut: Studio orchestrator and focus-coach lanes | studio-only, not needed for a product task
cut: New agents | the nine studio agents already cover each lane
risk: Agents named but never run, which overclaims on the portfolio | PIPE-2
risk: Live demo changed by a merge without Chase's go | PIPE-4
decision: Which repo runs the first pipeline | Role Radar, since it has the live job-search value; otherwise your call
handoff: qa-tdd | failing tests for PIPE-1 to PIPE-3 on the first task | red for the right reason
handoff: engineer | build the first task | all suites green 3x
handoff: ux-reviewer | review screens and words | no P0 or P1
handoff: privacy-security | review public repo and demo data | no P0 or P1
handoff: positioning | copy and claims check | claims match run logs
```