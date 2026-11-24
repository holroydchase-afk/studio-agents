Yes to both, with one caveat on "blocks": I can make the gate stricter, but I can't physically stop you. The block works because I refuse to start portfolio work until the day's application goal is met. Nothing here is built yet. This is the plan I'd start with.

**You are right about the ratio, and I'd go further.** The portfolio is already in good shape (6 demos, ccwatts on npm, Hearth in beta). A better portfolio now adds far less than another submitted application. Roughly 80% applications and 20% portfolio, with portfolio work earned, not default.

**Day shift, so you stop at a fixed time**
- **Morning (your slot, about 30 min):** I have the applications queue ready: scored roles from Role Radar, with the resume and cover note already tailored. You submit. That's the one step.
- **Afternoon (agents only, you do nothing):** staff-pm and the other agents work through the portfolio and hardening queue inside Claude sessions. They open PRs and I merge the non-live ones on green.
- **Evening (about 20 min, hard stop at a time you pick):** you review one digest. You approve any live-site change and then you're done. No late nights, because the agents already used the daytime.

"Maxing sessions" means using Max's room for daytime and overnight agent runs, so you aren't the bottleneck. Your hour a night shrinks to a short review.

**The gate (daily rolling goals)**
- Daily goal: 3 applications submitted, or 2 if one is a high-fit role with a tailored resume. Pick the number and I'll hold you to it.
- Until the goal is met, portfolio, tooling, renaming and new-project asks get "not yet, you're at 1 of 3". The studio already has a `focus-coach` agent for this. Today it only fires during an application window or after an evening cutoff. I'd widen it to always apply.
- Rolling: a missed day adds to tomorrow's goal, capped at 5, so it can't snowball.
- One exception: anything a recruiter or interviewer is waiting on bypasses the gate.
- Every digest opens with the count ("Applications: 1 of 3, portfolio locked").

**Do you actually want this?** One real risk: a gate you can override at will turns into a nag you ignore. Decide now that portfolio asks are refused until the goal is met, and that a day off is a day you skip the gate for, not a day you break it.

**What I need from you (one word each):**
1. Daily application goal: 3? (my recommendation)
2. Hard evening stop time: 9pm? (my recommendation)

Say "go" and I'll adopt those defaults, update `focus-coach` and the digest so the gate and the counter run every day, and put the change in a PR to studio-agents. It's docs and agents only, so it merges on green.
