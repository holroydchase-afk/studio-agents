Yes, and you're right about the problem. Short version: agents work the day shifts, your one hour goes to applications, and portfolio work is locked until the day's application goal is met.

**What "max my sessions" can and can't do.** Max gives more room per session, not a clock. Scheduled runs (the 2:15am night shift already works this way) can do prep work while you're at your day job or asleep. Nothing can stop you typing a portfolio ask at 10pm except the chief of staff refusing it, and that refusal is the lock. So the boundary is a rule the agents enforce, not a feature to build.

**Proposed week (weekdays)**
- Morning run (agents, before you wake): job-intake on new Role Radar hits, tailored resume drafts, recruiter follow-up drafts. Ready to submit when you sit down.
- Afternoon run (agents): portfolio and product work from the existing backlog only, small PRs, no new ideas. This is where the portfolio ratio gets spent, on agent time, not yours.
- Your hour (evening, hard stop 9:30pm): submit what the morning run staged. Nothing else until the goal is met.
- Night run (agents, overnight): hardening, QA, digest.

**The ratio.** Your human time: 4 parts applications to 1 part portfolio. Daily rolling goal: 2 applications submitted per weekday, carried over (a miss makes tomorrow 3, capped at 3). Until the goal is met, the chief of staff declines portfolio, tooling, renaming and new-project asks and says so in one line. After it, you get 15 minutes of portfolio review (merge calls, approvals), then you stop. Agent-run portfolio work on the afternoon shift continues regardless, but its output waits in PRs for that 15 minutes, so it can't eat your evening.

**Mistake to avoid.** Building a day-shift agent or a scheduler dashboard is itself portfolio work, the exact thing you're trying to cap. Do the minimum: one rules file plus the existing focus-coach agent, which already gates portfolio asks during an application window. No new agent.

**Not doing:** a new shift agent, a time-tracking UI, any enforcement that needs a metered API (you have none).

**Biggest risk:** the goal is only a lock if applications are staged and ready. If the morning run produces nothing, you'll skip the goal. So step one is the staging run, then the lock.

**Decisions for you**
1. Daily goal: 2 submitted per weekday? Recommend 2, with a carry-over cap of 3.
2. Hard stop 9:30pm? Recommend yes.
3. Weekend: recommend one free portfolio hour Saturday, nothing Sunday.

Reply "go" and I'll have the rules file and morning staging run ready for your review. Nothing goes live without your say.

Rollback: revert the merge commit; nothing here is public or live.

```spec
verdict: needs-decision
bet: Chase submits 2 applications per weekday inside his one hour; it worked when 5 of 5 weekdays hit the goal for two weeks with portfolio review capped at 15 minutes
step: M1.1 | Write the shift and ratio rules file the chief of staff and focus-coach read at session start | rules file merged, focus-coach declines a portfolio ask when the goal is unmet | 0.5 session
step: M1.2 | Morning staging run: intake plus resume drafts for new Role Radar hits | 2 ready-to-submit applications waiting by 7am on a test day | 1 session
step: M1.3 | Daily goal ledger: submitted count, carry-over, portfolio minutes | ledger shows one row per day for 5 days | 0.5 session
step: M1.4 | Review after 10 weekdays: keep, tune the goal or drop | decision recorded with the numbers | 0.5 session
criterion: SHIFT-1 | auto | Given a clock of Mon 2026-11-23 20:00 and 1 application submitted today and a portfolio ask at 8pm, then the chief of staff replies with the decline line and does no portfolio work
criterion: SHIFT-2 | auto | Given a clock of Mon 2026-11-23 20:00 and 2 applications submitted today, then a portfolio ask is accepted and the 15 minute cap is stated
criterion: SHIFT-3 | auto | Given a clock of Mon 2026-11-23 and 1 application submitted against a goal of 2, then Tuesday's goal is 3
criterion: SHIFT-4 | auto | Given a clock of Wed 2026-11-25 and 3 missed days in a row, then Wednesday's goal stays 3, never 4 or more
criterion: SHIFT-5 | manual | Given a fixed clock of Fri 2026-11-27, open the ledger on a phone at 360px by 640px -> the last 5 weekdays show submitted, goal and portfolio minutes in at most 2 screens
criterion: SHIFT-6 | auto | Given a clock of Mon 2026-11-23 and an empty ledger, then the goal is 2 and carry-over is 0
cut: A new day-shift or scheduler agent | building it is portfolio work and focus-coach already gates asks
cut: Time-tracking UI | the ledger file is enough to prove the bet
cut: Metered API enforcement | no paid API route
risk: The morning run stages nothing, so the goal can't be met and the lock gets skipped | M1.2
risk: Agent-run portfolio PRs still pull Chase's attention in the evening | SHIFT-2
decision: Daily application goal | 2 per weekday with a carry-over cap of 3
decision: Hard stop time | 9:30pm
decision: Weekend rule | one free portfolio hour Saturday, none Sunday
handoff: qa-tdd | failing tests for SHIFT-1 to SHIFT-6 | red for the right reason
handoff: engineer | build the rules file and ledger after the tests exist | SHIFT-1 to SHIFT-6 green 3x
handoff: positioning | one honest line for the portfolio on how the shifts work, only once 10 days of ledger exist | claim matches the ledger
```
