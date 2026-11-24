Hi Chase, I'm your staff PM for this one. It's a plan, not a verification. I couldn't open any of your repos, so I haven't checked a single claim yet.

**Answer:** Yes, go deeper on claims, but do it in order. First a claims register, then a check of each row against its source, then the walkthrough. Walking you through everything first would teach you things that may not be true.

**Goal fit:** This serves the senior/staff PM job search and your rule that portfolio and agent claims must match run logs and scores. Overclaiming costs you most in an interview, when someone asks "show me".

**Buy, reuse, build or skip:** Reuse. HANDOFF.md, the run logs and the agent scorecard already hold the evidence. Build only the register, as one doc. Skip a separate walkthrough per product until the register is done.

**Critical path** (one session is about an hour):
1. M1.1, 1 session: list every claim on the portfolio and in the agent descriptions, one row each, with its source or "no source". Done when every card, intro line and agent description is a row.
2. M1.2, 2 sessions: check each row against run logs, scores, the npm package and the live demos. This must run in a session that can reach the repos. Done when each row is marked met, soft or unsupported with evidence.
3. M1.3, 1 session: fix or cut the unsupported claims. Edits to the live site wait for your go.
4. M1.4, 2 sessions: write the walkthrough, one product per section, with a gaps list for you. Done when you've read the top 3 products' sections.

**Not doing:**
- All nine products at once. You have an hour a night, so the top 3 for the job search go first.
- New features while claims are unverified. Deep, not wide.

**Biggest risk:** I haven't verified anything. I did not read HANDOFF.md, any run log or score, the portfolio build, any npm listing, or any live demo. That includes the Hearth beta size and date, the ccwatts publish, and the Role Radar weekday scan. M1.2 is the step that handles it.

**Decisions for you:**
- Which three products lead the walkthrough? I recommend Hearth, ccwatts and Role Radar, with the rest after.
- Run this as one thread from the studio project, one product per session? I recommend yes.

**Handoffs:**
- qa-tdd writes a failing check that every register row has a source.
- positioning rewrites any claim marked soft or unsupported.
- privacy-security scans public repos and demos before any claim cites them.

**Next step:** the owner is the studio project, in your next session. Say "go" and I start M1.1 from a session that can read the repos.

lint-ok: SL-2 nothing to count; the register always has rows
lint-ok: SL-3 nothing ships live in this plan; a later fix is reverted by reverting its merge commit
lint-ok: SL-6 no sign-in or privacy behavior changes; this only checks claims about it

```spec
verdict: needs-decision
bet: Chase can defend every public claim in an interview; it worked when each claim has a named source (run log, score, live page) and he can explain it unprompted
step: M1.1 | Claims register: list every claim on the portfolio and in agent descriptions, one row each with its source or "no source" | every card, intro line and agent description is a row | 1 session
step: M1.2 | Check each row against run logs, scores, npm and the live demos from a session that can reach the repos | each row marked met, soft or unsupported with evidence | 2 sessions
step: M1.3 | Fix or cut unsupported claims in the product repos and the portfolio | no unsupported row remains; live-site changes wait for Chase's go | 1 session
step: M1.4 | Walkthrough doc, one product per section, with a gaps list for Chase | Chase has read the top 3 products' sections | 2 sessions
criterion: CLAIM-1 | auto | Given the claims register, then every row has a source or the status unsupported (0 blank sources)
criterion: CLAIM-2 | auto | Given a claim containing a number such as "12 grandparents", then it matches the HANDOFF or run log figure exactly, else flagged
criterion: CLAIM-3 | manual | Open the portfolio card for ccwatts -> the npm version shown equals the published version, 1 of 1 cards match
criterion: WALK-1 | manual | Ask Chase to explain Hearth's privacy model from the doc alone -> he answers 3 of 3 questions without opening the code
cut: Walking through all nine products at once | one hour a night; do the top 3 for job search first
cut: New features while claims are unverified | deep, not wide
risk: I could not open any repo, so everything below is unchecked | M1.2
risk: Overclaiming in agent descriptions versus scores | CLAIM-1
decision: Which three products lead the walkthrough? | Hearth, ccwatts, Role Radar; the others follow
decision: Run the verification as one thread from the studio project? | yes, one thread, one product per session
handoff: qa-tdd | failing check that every register row has a source | red for the right reason
handoff: positioning | rewrite any claim marked soft or unsupported | each matches its source
handoff: privacy-security | scan public repos and demos before any claim cites them | no P0 or P1
```