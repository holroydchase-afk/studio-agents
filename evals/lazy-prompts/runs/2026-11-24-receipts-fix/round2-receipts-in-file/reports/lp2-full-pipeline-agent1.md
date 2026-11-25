Hi Chase, I'm the studio's staff PM. No product was named, so I planned the pipeline itself and proved it on one small non-live task before any repo adopts it.

**Answer:** run staff-pm, then qa-tdd (failing tests), engineer (build), qa-tdd (3x verify), then one PR. The ledger tool and agents already exist, so I reused them and am building nothing new. This serves your job search only if one real task runs all five stages and the run logs show it. I chose the studio-agents repo for the trial, since a change there cannot touch a live demo.

**Critical path:** about 4.5 sessions, six steps (M1.1 to M1.6 below).

**Not doing:** all repos at once, any paid or scheduled auto-runner, a status dashboard.

**Biggest risk:** the stage order depends on Claude sessions obeying it. PIPE-1 makes the ledger refuse an out-of-order stage.

**Your step:** none until the trial PR is ready. I'll post it with the Agents line and ask for your go only if it touches anything live.

**Handoffs:** qa-tdd writes the failing tests first, then engineer fixes to green 3x.

```spec
verdict: ready
bet: Chase can hand any lazy ask to the pipeline and get one PR back with a dated next step; it worked when one real task runs all five stages with a complete ledger and Chase does only the final go
step: M1.1 | Pick the trial task: one small non-live code change in a product repo, lane logic, touches non-live | task named in the ledger init line, class says merge on green | 0.5 session
step: M1.2 | Stage staff-pm: spec with criteria, checked by the spec tools | ledger shows staff-pm done, spec block passes check-spec | 0.5 session
step: M1.3 | Stage tests-pre: qa-tdd writes failing tests for every auto criterion | red for the right reason, one failing test per auto criterion | 1 session
step: M1.4 | Stage build: engineer builds to green, max 3 rounds | all suites green 3x, ledger build done | 1 session
step: M1.5 | Stage verify and pr: qa-tdd verdict block pasted verbatim, PR opened with the Agents line and updated HANDOFF | PR open, Agents line matches the run log, merge class recorded | 1 session
step: M1.6 | Review the ledger and decide roll-out to the other repos | one-page result in HANDOFF: stages run, rounds used, stops tripped | 0.5 session
criterion: PIPE-1 | auto | Given a ledger initialised with lane logic, when build is started before tests-pre is done, then the run is refused with exit 1
criterion: PIPE-2 | auto | Given lane docs, when the ledger is read, then tests-pre and build show "skipped" and verify is next
criterion: PIPE-3 | auto | Given a build that fails 3 times, when round 4 is requested, then the run stops with exit 1 and reason "build: 3 rounds"
criterion: PIPE-4 | auto | Given a changed file list containing a live-site file, when class runs, then the class is "waits for Chase" and not "merge on green"
criterion: PIPE-5 | auto | Given a qa report whose verdict is flaky, when verify is marked done, then it is refused with exit 1
criterion: PIPE-7 | auto | Given an empty changed file list, when class runs, then it exits 2 with a usage error and writes nothing
criterion: PIPE-6 | manual | Given the finished trial PR, when its body is read, then the Agents line lists 3 or more agents and every one appears in the run log
cut: Running every product repo at once | one proven trial beats five half-wired setups
cut: Any metered API or scheduled auto-runner | no paid API route; agents run inside Claude sessions
cut: New dashboard for pipeline status | the ledger status command is enough
risk: A bad trial merge is undone by reverting the merge commit | PIPE-4
risk: Stage hand-offs rely on Claude sessions obeying the order | PIPE-1
risk: Build loops burn the plan limit | PIPE-3
risk: A live-site change slips through as merge on green | PIPE-4
handoff: qa-tdd | failing tests for PIPE-1 to PIPE-5 against pipeline-run | red for the right reason
handoff: engineer | any fixes the failing tests show in the pipeline tools | PIPE-1 to PIPE-5 green 3x
```
