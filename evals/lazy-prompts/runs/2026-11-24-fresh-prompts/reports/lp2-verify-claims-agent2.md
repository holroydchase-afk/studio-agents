Hi Chase, I'm your studio chief of staff for the claims check.

**Answer:** Yes, go deeper, but in order: build a claims register first, then walk you through the products. A walkthrough before verification just teaches you claims that may not hold.

**What I did not check:** I did not open any of your repos, run logs, scores, npm, or the live site. So I can't yet say which claims are true. Everything below is about where gaps are likely, from your standing rules and status notes. These are the ones I'd test first:
- "Agents are scored or proven": does a run log or score back it? Your rule is that claims must match logs and scores.
- "ccwatts is on npm": check the live package page, not HANDOFF.
- "Hearth beta to about 12 grandparents": has the beta actually started (Nov 22 was planned), or is it still planned? Merged, deployed and checked are three different states.
- "Role Radar scans every weekday": does a run history show it?
- Demos for Energy Scanner, Charlie and Crew Clock: some were built against saved samples only. Do they work on real sources?
- Your two brothers helping: is that public, and are they named? Keep it out of public copy unless you've said it's fine.

**Plan (1 session each):**
1. Claims register: every public claim, with its evidence, marked proven, unproven or stale.
2. Verify the top 10 against logs, npm and the live pages.
3. Fix or cut the unproven ones.
4. One-page-per-product walkthrough for you.

**Not doing:** a full audit of every repo file. The claims list is the bet.

**Biggest risk:** a claim that passes on saved samples but was never run on the real source. Step 2 handles it.

**Decision for you:** start with the portfolio site or the agent descriptions? I recommend the portfolio site, since recruiters read it first. Site edits wait for your go. Rollback is reverting the merge commit and redeploying.

**Next step:** the register is a job for me and qa-tdd. I can start it as soon as I'm given the repos; it needs nothing from you except a one-word pick on the decision above.

**Tools run:** the kill guard passed (not tripped). Memory search found no earlier finding on this. check-spec and spec-lint exit 0. I did not write a run log (no product repo in scope) and did not run the cost guard.

lint-ok: SL-3 site edits wait for Chase go; rollback is reverting the merge commit and redeploying.

```spec
verdict: needs-decision
bet: Recruiters and hiring managers believe every claim on the portfolio; it worked when each public claim has one named run log, score or live check behind it
step: M1.1 | Claims register: list every public claim (portfolio, READMEs, agent descriptions) with its evidence source | every claim has a row marked proven, unproven or stale | 1 session
step: M1.2 | Verify the top 10 claims against run logs, scores, npm and the live pages | each row has evidence or is cut or reworded | 1 session
step: M1.3 | Fix or cut the unproven claims on the site and in agent descriptions | zero unproven claims left | 1 session
step: M1.4 | Walkthrough doc: one page per product, what exists, what is only planned | Chase can explain each product without notes | 1 session
criterion: CLAIM-1 | auto | Given a claim row with no evidence link, then the check exits 1 and prints "CLAIM-1 row 3 no evidence"
criterion: CLAIM-3 | auto | Given an empty claims register, then the check exits 1 with "0 claims"
criterion: CLAIM-2 | manual | Open each product card on the live site -> the status line matches HANDOFF: "beta" for Hearth, "on npm" for ccwatts
cut: Deep audit of every repo file | the claims list is the bet
risk: A claim passes on saved samples but was never run on a real source | M1.2
decision: Start with the portfolio site or agent descriptions? | Portfolio site first, since recruiters read it
handoff: qa-tdd | failing check for CLAIM-1 | red for the right reason
handoff: positioning | reword unproven claims | each claim traces to a register row
```