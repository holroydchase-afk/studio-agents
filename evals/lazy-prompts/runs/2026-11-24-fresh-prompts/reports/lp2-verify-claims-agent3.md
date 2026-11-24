Hi Chase, I'm your studio chief of staff for the claims check.

**Answer:** Yes, do it. It fits your top goal, because an interviewer will probe the portfolio and every claim has to hold up. Start with Hearth, since its claims age fastest after the Nov 22 beta. I'd build a claims register first, then walkthroughs. A walkthrough written before the claims are checked just repeats the errors.

**Not checked:** I can't open any of your repos, the live site, run logs, scores or npm. Nothing below has been verified. I haven't confirmed any claim on the site or in an agent description, and I haven't read any HANDOFF.md or MARKETING.md. The plan is how to verify, not the result. Every "verified" has to come from a session that can open the repos.

**Goal fit:** It serves "claims must match run logs and scores, no overclaiming," and your job search.

**Buy, reuse, build or skip:** Reuse. The studio already has `check-spec`, `agent-memory` and the qa-tdd checks, and `MARKETING.md` is already the claims source in Charlie, Hearth and ccwatts. The only new build is one small register file plus a check script.

**Critical path (about 6 sessions, one hour each):**
1. M1.1: List every public claim (site cards, READMEs, agent descriptions) with its source file, owner repo and status. Done when all 8 products and the agents have rows and none are blank. 1 session.
2. M1.2: Check each claim against the repo files and run logs, then fix or cut the ones that don't match. Done when every row is verified or cut. 2 sessions.
3. M1.3: One 10-minute walkthrough per product: what it does, why you built it, what is real versus sample data, and its known gaps. Done when you can retell each one without notes. 2 sessions.
4. M1.4: A gap lesson with at most 7 items, ranked by how likely an interviewer is to ask. 1 session.

**Not doing:** site redesign and new product features. Claims come first.

**Biggest risk:** A claim passes the file check but the live site or demo still shows the old text. Merged, deployed and checked are three separate states, so CLM-3 re-checks the live page after any change.

**Decisions for you:**
- Which product goes first? I recommend Hearth.
- Do site edits wait for your go? Yes. A push to main deploys, so I'll open a PR and list it in merge order.

**Handoffs:**
- qa-tdd: failing tests for CLM-1, CLM-2, CLM-5 and CLM-6 first.
- positioning: rewrite any claim that fails its check.
- privacy-security: scan the register and walkthroughs before they go into a public repo.

```spec
verdict: needs-decision
bet: Chase can defend every portfolio claim in an interview; it worked when each claim has a source file and a check date, and he can explain the build in his own words
step: M1.1 | Claims register: list every public claim on the site, in READMEs and agent descriptions, with source, owner repo and status (verified, stale, unverified) | register covers all 8 products and the agents, no row blank | 1 session
step: M1.2 | Check each claim against the repo files and run logs, fix or cut what does not match | every row verified or cut, none unverified | 2 sessions
step: M1.3 | Walkthrough doc per product, 10 minutes each, what it does, why built, what is real versus sample, known gaps | one page per product, Chase can retell it | 2 sessions
step: M1.4 | Gap lesson: a short list of what Chase needs to learn to defend the work, ranked by interview likelihood | list of at most 7 items, each with a one-paragraph lesson | 1 session
criterion: CLM-1 | auto | Given the claims register, when a row has no source file, then the check exits 1 and prints "CLM row 7 no source"
criterion: CLM-2 | auto | Given a count claim such as "3 runs" on the site, when the run logs show 2, then the check fails and names both numbers
criterion: CLM-3 | manual | Open the live site after fixes -> 8 of 8 product cards match their register rows
criterion: CLM-4 | manual | Ask Chase to retell one product unprompted -> he names 1 user, 1 bet and 1 gap in under 2 minutes
criterion: CLM-5 | auto | Given an empty claims register, when the check runs, then it exits 1 with "0 rows"
criterion: CLM-6 | auto | Given a README quickstart command, when run against the released npm version of ccwatts, then it exits 0
cut: Rewriting the site design | not on the claims path
cut: New features in any product | deep not wide, claims first
risk: A claim passes a file check but the live site or demo still says the old thing | CLM-3
risk: Walkthroughs eat the hour a night and nothing gets verified | M1.1
decision: Which product first | Hearth, since the beta went out Nov 22 and claims about it age fastest
decision: Do site edits wait for your go | Yes, a push to main deploys; I prepare a PR and list it for you
handoff: qa-tdd | failing check for CLM-1 and CLM-2 | red for the right reason
handoff: positioning | rewrite any claim that fails to match MARKETING.md | each claim traces to a register row
handoff: privacy-security | scan the register and walkthroughs before they go in a public repo | no personal data or ids
```