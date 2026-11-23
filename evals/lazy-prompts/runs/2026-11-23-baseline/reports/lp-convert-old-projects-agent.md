Hi Chase, Staff PM here. Short answer: no, don't convert all of them.

I'm assuming "new approach" means the agent-team workflow (staff-pm, qa-tdd, engineer, the Agents: line, 3x green) versus how the older projects were built with plain Claude. If you meant something else, tell me.

**Is it way better?** Unproven. You have the hypothesis (your lazy-prompt A/B: plain Claude vs staff-pm first), but nothing I can see shows a measured win yet. "Way better" on a portfolio or in an interview is an overclaim until the run logs and scores back it. Say "I run a measured agent workflow", not "10x".

**Should you convert everything?** No. Converting costs your scarce hour a night and earns nothing for the job search unless someone looks at that project.

Critical path:
1. Sort projects by who looks at them. Convert only what a recruiter will open or what you will keep building: Hearth, Role Radar, Crew Clock, ccwatts. 0.5 session.
2. Conversion for a live project is light: sync agents, add the CLAUDE.md table, keep HANDOFF.md current. No rewrite of working code. Done when the Agents: line passes CI. 0.5 session each.
3. Frozen demos (Energy Scanner, Charlie, PM tools): leave as is. Run the new flow only if you reopen them. If you want a recruiter-ready polish, run one ux-reviewer pass, not a rebuild.
4. Prove it once before scaling: pick one older project, run one real task both ways (your lazy prompt on plain Claude vs through staff-pm), and compare. That one comparison is your evidence and a good interview story. 1 session.

Not doing: a blanket migration, rewriting old code to match the new test style, retrofitting specs for finished work. Reason: it moves no date and no application.

Biggest risk: spending the application window on tooling. Handled by step 1's cut, and by tying any conversion to a project that is live or recruiter-facing.

Decisions for you:
- Which projects count as "keep building"? I recommend Hearth, Role Radar, Crew Clock, ccwatts, and everything else frozen.
- Run the step 4 comparison on which project? I recommend Role Radar, since you use it daily and can judge the output.

lint-ok: SL-3 nothing ships live; conversion is repo config and docs, revert the PR to undo
lint-ok: SL-8 no public artifact goes stale; portfolio claims are held until the A/B score exists
lint-ok: SL-7 no README or landing copy changes in this spec; the positioning handoff only restricts claims to the A/B score
lint-ok: SL-2 no counts or lists are computed; this is a process decision

```spec
verdict: needs-decision
bet: Chase gets evidence the agent workflow beats plain Claude before spending sessions converting; it worked when one A/B result exists and only live projects are converted
step: M1.1 | Tier projects into keep-building and frozen | list agreed by Chase | 0.5 session
step: M1.2 | A/B one lazy prompt, plain Claude vs staff-pm first, on one older project | side by side outputs scored | 1 session
step: M1.3 | Light-convert keep-building projects only | Agents line passes CI on each | 0.5 session
criterion: CONV-1 | manual | Given the two outputs from M1.2, then a score is recorded for each, 1 to 5, before any conversion starts
criterion: CONV-2 | auto | Given a converted repo, when a PR opens without an Agents: line, then the agents-check fails with 1 error
cut: Blanket conversion of all projects | costs sessions, moves no application
cut: Rewriting old code to new test style | working code, no user-visible gain
risk: Overclaiming better on the portfolio without evidence | CONV-1
risk: Tooling work eats the application window | M1.1
decision: Which projects are keep-building | Hearth, Role Radar, Crew Clock, ccwatts
decision: Which project hosts the A/B | Role Radar
handoff: qa-tdd | failing check for CONV-2 on any repo lacking it | red for the right reason
handoff: positioning | claim wording that matches the A/B result only | no claim beyond the score
```
