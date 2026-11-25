Yes, doing this as a claims audit, then a walkthrough one product a night. I chose to soften first and remove only what I can't prove. Nothing goes live without your go.

**What I can say now, and what I can't.** I can't open your repos or the web from here. So I haven't verified a single claim yet, and I won't pretend to walk you through what's built from memory. Step one builds the table that makes that possible.

**Gaps I already know about from what you've told me:**
- Role Radar, Charlie, Energy Scanner: if any result was only run on saved samples, the site can't call it a real run.
- Hearth beta: "about 12 grandparents on Nov 22" is a plan until a log shows who actually got in.
- Agent scores and counts on the site: each must match a run log, or say "about".
- ccwatts on npm: the quickstart has to work on the published version, not just the repo.
- Nothing is yet checked as one table across the portfolio and 8 repos.

**Plan (about 6.5 sessions):**
1. One table of every public claim: where it appears, the evidence, and its status.
2. Check each against logs, scores, tests and the live demo. Each ends verified, softened or removed.
3. A gap list for you: built vs claimed vs only tried on samples.
4. Walkthrough, one product per night, in plain words: what it does, what is real, what is demo, what is unproven. About 1 minute each to explain.

**Not doing:** a new dashboard, or rewriting copy beyond the softened rows.

**Your one step:** nothing tonight. Tomorrow I'll hand you the table and the first walkthrough (Hearth).

Handoffs: qa-tdd writes the failing checks first, positioning rewrites only softened rows, privacy-security scans before anything public, ux-reviewer reads it as a recruiter.

```spec
verdict: ready
bet: A recruiter or hiring manager who checks any portfolio claim finds it true; it worked when Chase can open the audit table, point at evidence for every claim, and 0 claims are unverified
step: M1.1 | Inventory every public claim across portfolio, 8 product repos and agent descriptions into one table (claim, where, evidence, status) | table lists every claim with an evidence pointer or "none" | 1 session
step: M1.2 | Verify each claim against run logs, scores, tests and the live demo; mark verified, softened, or removed | every row is verified, softened or removed, none blank | 1 session
step: M1.3 | Gap list for Chase: what is built vs claimed vs only run on saved samples (Role Radar, Charlie, Energy Scanner) | each gap has an owner and a next step | 0.5 session
step: M1.4 | Walkthrough, one product per night, in plain words: what it does, what is real, what is a demo, what is unproven | 8 products covered, Chase can explain each in 1 minute | 4 sessions
criterion: CLAIM-1 | auto | Given the claims table, then every row has a non-empty evidence field or the status "removed"
criterion: CLAIM-2 | auto | Given a claim with a number (for example "12 grandparents"), then it matches the count in HANDOFF or a log, else it is flagged "unverified"
criterion: CLAIM-3 | auto | Given the portfolio card text for each product, then portfolio-drift reports 0 mismatches with each repo's claims register
criterion: CLAIM-4 | manual | Given Hearth beta wording, when read against the Nov 22 state, then it says "invited" or "in use" only as the log shows
criterion: CLAIM-6 | auto | Given an empty claims list (zero rows) for a product, then the audit fails with "no claims inventoried" instead of passing
criterion: CLAIM-7 | auto | Given the ccwatts quickstart command on the npm version, when run, then it exits 0
criterion: CLAIM-5 | manual | Given an agent score on the site, when compared with the scorecard run logs, then the figure matches the log to 1 decimal or the text says "about"
cut: New claims dashboard | the table plus portfolio-drift is enough
cut: Copy rewrite | positioning does it only for rows marked softened
risk: Claim stays live without evidence because the table is skipped | CLAIM-1
risk: Samples-only results presented as real runs | M1.3
handoff: qa-tdd | failing check for CLAIM-1 to CLAIM-3 | red for the right reason
handoff: positioning | rewrite rows marked softened using only registered claims | no overclaim in the copy
handoff: privacy-security | scan the table and copy for personal data before any public change | no personal data found
handoff: ux-reviewer | read the walkthrough and live cards as a recruiter | no P0 or P1
```
