Yes to shifts and a ratio. One warning first: "max my sessions" is the wrong goal. Your constraint is the application count, not session count. Running more agents all day just builds more portfolio and burns plan limits. Your top priority is the job, so the app count should unlock the rest.

**The fix: the gate has to bind the agents, not just you.** Portfolio work is now mostly done by agents, so a rule on your own hours won't stop it. The rule has to say "no portfolio lane starts until today's application goal is met." That is how you get blocked on the other fronts.

**Shifts (you are done by 9:30pm):**
- Morning, about 15 min, you: read the overnight digest, submit the 1 to 2 applications the agents prepared (Role Radar score plus intake plus resume-refine, run before you wake). Goal counter ticks here.
- Afternoon, 0 min, agents only: one lane at a time. Application prep runs first. Portfolio and PM-tools lanes run only if the day's application goal is met, or are queued for tomorrow.
- Evening, about 30 min, you: one decision or review item, picked by staff-pm. No new builds started after 9:00pm. Anything left goes to the 2:15am night run.

**Ratio (my recommendation): 3 application units to 1 portfolio unit**, counted in your minutes and in agent lanes. Daily rolling goal: 2 submitted applications (1 tailored, 1 quick) before any portfolio lane unlocks. Miss a day and it rolls forward: tomorrow's goal is 3 (cap 3, so it never becomes a guilt pile). Portfolio gets a weekly cap of about 1 lane per 3 applications, and only when a recruiter-facing gap exists. Rejected option: a fixed time split (e.g. 70/30 minutes). It is easy to game, because agents work while you are not.

**Reuse, don't build.** The studio already has the `focus-coach` agent (studio lane for portfolio asks after the cutoff), the digest, night-prep and Role Radar's application tracker. I would have focus-coach read today's application count and refuse or queue portfolio asks. Only one small build if it can't read the count: a daily ledger line (date, applications submitted, portfolio lanes run). Sample or counts only, nothing personal, since the repos are public.

**Biggest risk:** you override it at 9:45pm because "this one portfolio thing is quick." Handled by making the override one explicit word from you, logged in the ledger, so the weekly digest shows how often you used it.

**Decisions for you (one word each):**
1. Ratio 3:1 with goal 2 applications a day? I recommend yes. Say "yes" or give a number.
2. Hard stop 9:30pm for you, 9:00pm for new builds? I recommend yes.

**Next step:** you answer the two questions (tonight). Then focus-coach and qa-tdd set up the gate and its test; first gated day is the next weekday. The 2:15am night run keeps going, but only on application prep and non-portfolio hardening until the goal is met.

Rollback: the gate is a flag; turn it off (or revert the merge commit) and portfolio lanes run ungated again.

Not doing: running agents around the clock, a metered API route (not allowed on your plan), new portfolio products until the gate has run a full week, a fancy dashboard.

```spec
verdict: needs-decision
bet: Chase gets applications out first every day without staying up late; it worked when he submits at least 2 applications on 5 of 7 days for 2 weeks and no portfolio lane started before the goal was met
step: M1.1 | Chase answers the ratio and stop-time questions | both decisions recorded | 0.1 session
step: M1.2 | Daily ledger line: date, applications submitted, portfolio lanes run | ledger has one row per day with counts only | 0.5 session
step: M1.3 | focus-coach reads the ledger and queues portfolio asks until the goal is met | GATE-1 and GATE-2 green 3x | 1 session
step: M1.4 | Shift schedule for morning prep, afternoon lanes and the 2:15am night run | first gated weekday runs end to end | 0.5 session
criterion: GATE-1 | auto | Given a pinned clock of Tue 2026-12-01 2:00pm and 1 application submitted of a goal of 2, when a portfolio lane is requested, then it is queued and the answer reads "queued: 1 of 2 applications"
criterion: GATE-2 | auto | Given 2 applications submitted of a goal of 2, when a portfolio lane is requested, then it starts and the ledger shows 1 portfolio lane
criterion: GATE-3 | auto | Given a fixed clock of Tue 2026-12-01 and Monday finished with 1 application of a goal of 2, when Tuesday's goal is computed, then it is 3, and given three missed days the goal is capped at 3
criterion: GATE-4 | auto | Given an empty or missing ledger file, when the gate runs, then it treats the count as 0 and does not crash
criterion: GATE-5 | manual | Chase types the override word at 9:45pm -> the portfolio lane starts and the ledger row shows override 1
cut: Round-the-clock agent runs | spends plan limits and does not raise applications
cut: Fixed minute split | easy to game while agents work unattended
cut: New dashboard | the digest and one ledger line are enough
cut: New portfolio products during the first gated week | the gate must be proven first
risk: Chase overrides the gate late at night | GATE-5
risk: Ledger missing or malformed on a given day | GATE-4
decision: Ratio of 3 application units to 1 portfolio unit with a goal of 2 applications a day | yes, 3 to 1 and a goal of 2
decision: Hard stop for Chase at 9:30pm and no new builds after 9:00pm | yes
handoff: qa-tdd | failing tests for GATE-1 to GATE-4 | red for the right reason
handoff: engineer | build the ledger and the focus-coach gate | GATE-1 to GATE-4 green 3x
handoff: ux-reviewer | read the queued message and digest wording on a phone | no P0 or P1
```
