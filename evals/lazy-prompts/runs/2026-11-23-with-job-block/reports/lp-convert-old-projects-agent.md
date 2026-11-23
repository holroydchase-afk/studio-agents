Hi Chase, I'm your staff PM. Short answer: no, don't convert all projects. Convert none wholesale; convert one.

I can't verify "way better". Nothing in front of me compares the new agent approach against the old projects on the same task, and your own rule is that claims must match run logs and scores. Treat "better" as unproven until you have a side-by-side.

Goal fit: your top goal is a senior/staff PM job. A recruiter is moved by finished, live products and a clear story. A migration of Hearth, ccwatts, Role Radar, Energy Scanner, Charlie, Crew Clock and the PM tools adds no new product and burns your hour a night. Worse, it touches live things (Hearth beta with about 12 grandparents since Nov 22, ccwatts on npm). A mistake there costs more than any gain.

Call: skip the bulk conversion. Reuse the agents on new work by default. Convert one project as an eval, and only if it is cheap.

What I'd do:
1. Pick the one project that is still moving and has no live users, so nothing live can break. Run one real task through old way vs. agent way (lazy prompt, then staff-pm first). Compare plan quality, tests added, bugs caught.
2. If the agent version wins on that task and the run logs show it, roll the approach out only to projects as you next touch them. No migration PRs for their own sake.
3. Leave Hearth's beta and ccwatts alone until the beta feedback is in. Any change there waits for your go.

Not doing: converting all seven now, rewriting history or docs in repos that work, a migration sprint before the job search needs it.

Biggest risk: spending a week on plumbing that looks like progress but ships nothing a hiring manager can see. Step 1 handles it by capping the test at one task.

One decision for you: run the one-task head-to-head on Role Radar? Yes recommended: it is internal, so nothing public breaks, and the result is a portfolio-ready "I tested my agents" story.

Handoffs: qa-tdd writes the comparison checklist for the one task (done when the pass/fail criteria exist before either run); me again after the result to call roll out or stop.

lint-ok: SL-7 no copy or claims change in this plan
lint-ok: SL-3 nothing public or live ships; the test touches no live site
lint-ok: SL-2 one task comparison, no lists or counts of input

```spec
verdict: needs-decision
bet: Chase believes agents beat his old setup only if a same-task comparison shows it; it worked when one logged head-to-head decides whether he converts anything
step: M1.1 | Pick Role Radar and one real task, define pass criteria | criteria written before either run | 0.5 session
step: M1.2 | Run the task old way and agent way, log both | two run logs exist | 1 session
step: M1.3 | Staff PM reads the logs and calls roll out or stop | verdict recorded in HANDOFF | 0.5 session
criterion: CONV-1 | auto | Given the same task on both arms, then each arm has a run log with a cost_usd value and a findings count of 0 or more
criterion: CONV-2 | manual | Open the comparison -> the verdict names a winner or "no difference" and cites 3 numbers from the logs
cut: Converting all seven projects now | no evidence it is better and it risks live Hearth and ccwatts
cut: Migration PRs for their own sake | ships nothing a recruiter sees
risk: Plumbing work that looks like progress but ships nothing | M1.1
decision: Run the head-to-head on Role Radar? | Yes, because it is internal and cannot break a live demo
handoff: qa-tdd | write pass criteria for the one-task comparison | criteria exist before either run
```
