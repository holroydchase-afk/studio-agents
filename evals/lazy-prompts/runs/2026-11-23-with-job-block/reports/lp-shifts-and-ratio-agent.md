Yes, and you're right to do it: the job search is the goal, and the portfolio is already past "enough to show." Recommendation: split the day into three shifts, cap portfolio at 20% of your hours, and gate portfolio work behind that day's application goal.

**Goal fit.** Serves your top priority (landing a senior or staff PM job) and your rule to optimize your effort. It also corrects a drift: the portfolio exists to support applications, not to compete with them.

**Reuse, not build.** Don't build a new tool. Role Radar already tracks applications and the `focus-coach` agent already exists for "portfolio or tooling ask during an application window." Use those. Skip a new dashboard.

**The shifts (agents work, you decide and submit):**
- **Morning shift (agents, before you wake):** Role Radar scan, then job intake and a tailored resume draft for the top roles. Your morning is only "review and submit."
- **Day shift (you, one block):** submit applications, recruiter replies. Nothing else opens until the goal is met.
- **Evening/night shift (agents):** hardening, QA and review rounds on existing products, running overnight on Max. You do not stay up for it. You read the summary next morning.
- **Your portfolio time:** only after the day's goal is logged, capped at 20% of the week.

**Default numbers (change them, don't ask me first):** 80/20 applications to portfolio, measured on a rolling 7 days; daily goal 3 submitted applications on weekdays (2 if one is a tailored, referral-backed one); the unmet goal rolls to tomorrow, capped at 6 so a bad day doesn't become a guilt pile.

**The block.** Honest limit: an agent can't physically stop you. What it can do is refuse. When you ask the chief of staff for portfolio or tooling work and today's goal isn't met, `focus-coach` answers "goal not met: X of 3, here's the next application" and queues the ask in the ideas log instead. Hard-stop exception: a live-site break or privacy issue.

**One thing to avoid.** Max raises Claude's limits, not your hour. More sessions will tempt you into more portfolio features. Freeze new portfolio features until you have an agreed number of submissions; agents only harden what exists.

**Biggest risk:** the gate depends on you logging submissions honestly. Handled by AP-1 and AP-2 below.

lint-ok: SL-7 no README, landing or copy claim changes
lint-ok: SL-3 internal rules and a Role Radar counter only, rollback is reverting the merge commit
lint-ok: SL-6 single-owner private tracker, no sign-in or privacy behavior changes

**Decision for you (one word):** is "3 a day" right, or do you want 2 or 5? My pick: 3.

```spec
verdict: needs-decision
bet: Chase gets more applications out per week while sleeping earlier; it worked when 7-day application share of his hours is at or above 80 percent with no late-night sessions
step: M1.1 | Chase confirms the daily goal number | one word reply | 0.1 session
step: M1.2 | Add shift schedule and goal rule to the focus-coach and chief-of-staff notes | rules written and reviewed | 1 session
step: M1.3 | Role Radar counts submitted applications per day and 7-day ratio | AP-1 and AP-2 green | 1 session
step: M1.4 | Overnight hardening run set to start after the evening cutoff | one run summary read next morning | 0.5 session
criterion: AP-1 | auto | Given a pinned clock of Tue 2026-11-24 and 2 submitted applications, then the status reads "2 of 3" and portfolio asks are queued
criterion: AP-2 | auto | Given the same day with 3 submitted applications, then portfolio asks are allowed
criterion: AP-3 | auto | Given a clock of Wed 2026-11-25 and 6 missed applications the previous days, then tomorrow's goal is "9" capped to "6"
criterion: AP-4 | manual | Ask for a new portfolio feature before the goal is met -> reply names "2 of 3" and logs the ask in the ideas log
cut: New tracking dashboard | Role Radar already has the data
cut: Hard locks on the machine | an agent cannot enforce them and they add a build for no gain
risk: Chase self-reports submissions inaccurately | AP-1
risk: Goal rolls into an unreachable pile | AP-3
decision: Daily application goal | 3 per weekday
handoff: qa-tdd | failing tests for AP-1 to AP-3 | red for the right reason
handoff: engineer | build M1.3 count and ratio in Role Radar | AP-1 to AP-3 green 3x
handoff: ux-reviewer | read the goal status line wording | no P0 or P1
```
