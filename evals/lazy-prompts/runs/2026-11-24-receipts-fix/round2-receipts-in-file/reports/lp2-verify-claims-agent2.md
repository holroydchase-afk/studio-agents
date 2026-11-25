Yes, and I'd do it as four short sessions, one pair of products each, so you end up able to defend every claim in an interview. A single mega-audit would not stick.

**Goal fit:** this serves the job search. A recruiter who tests one card claim and finds it wrong discounts the rest of the portfolio.

**What I chose:** reuse the claims registers already in each repo and the drift check. I'm not building a new tool. I put the work in one step order:

1. Tonight (Nov 24): I build a claims ledger, one row per portfolio claim, with its evidence and a status of verified, unverified or wrong. This is mine to do; you don't need to prepare anything.
2. Walkthrough 1: Hearth. What's built, what's merged vs deployed vs tried on a real phone, and the gaps.
3. Walkthrough 2: ccwatts and Role Radar, including what "on npm" and "scans weekdays" can truthfully say.
4. Walkthrough 3: Energy Scanner, Charlie, Crew Clock. Sample data vs real, and which parts only ran on fixtures.
5. Walkthrough 4: PM tools and the studio agents, checking agent claims against scores and run logs.
6. Fix list: reword or cut anything unverified or wrong, then a live-site push.

Each walkthrough is about 10 minutes of reading: what it does, how it works, what proves it, and at most 5 gaps with an owner and a date.

**Not doing:** a line-by-line code tour (you need claims you can defend, not code you can recite), and no new features while auditing.

**Biggest risk:** claims that only held against saved samples, such as demos and live data adapters never run against the real source. The ledger flags each of those as unverified until a real run exists.

**Handoffs:** qa-tdd writes the failing checks first, then engineer builds the ledger and the fixes, positioning rewords weak claims, privacy-security checks the demos.

**Your one step:** when the fix list is ready I'll show old vs new wording on one page. You just say go before it hits the live site.

```spec
verdict: ready
bet: A recruiter or hiring manager who opens the portfolio finds every claim backed by a run log, test or live page; it worked when Chase can answer "how do you know?" for each card without notes
step: M1.1 | Claims ledger for the portfolio and its 7 cards: one row per claim with source file, evidence and status (verified, unverified, wrong) | every card claim has a row and a status | 1 session
step: M1.2 | Walkthrough 1, Hearth: what is built, merged vs deployed vs checked on a phone, gaps | Chase can explain Hearth in 5 lines; gaps listed | 1 session
step: M1.3 | Walkthrough 2, ccwatts and Role Radar | same, plus npm release state | 1 session
step: M1.4 | Walkthrough 3, Energy Scanner, Charlie, Crew Clock | same, plus demo-vs-real labels | 1 session
step: M1.5 | Walkthrough 4, PM tools and studio agents: claims vs scorecard and run logs | agent claims match scores | 1 session
step: M1.6 | Fix list: wrong or unverified claims reworded or cut in build.py, then Chase's go on the live site | zero wrong rows; go given | 1 session
criterion: CLAIM-1 | auto | Given a claim row with no evidence, then its status is "unverified" and it cannot appear in portfolio copy
criterion: CLAIM-2 | auto | Given a card number that differs from the run log or scorecard value, then the drift check reports 1 mismatch naming the card
criterion: CLAIM-3 | auto | Given a claim of "on npm" or "live", when the state is only merged, then the ledger status is "wrong" until a deploy row exists
criterion: CLAIM-4 | auto | Given a demo card using sample data, then its copy contains the word "sample" or "demo"; 0 cards claim real users or results without a source
criterion: CLAIM-5 | auto | Given a number shown twice or summed from shown numbers, then rounding follows one rule (round once, at the end) -> 0.4 + 0.4 + 0.4 shows 1.2 not 1.0
criterion: CLAIM-6 | manual | After the fix list is merged and deployed, open each of the 7 live cards -> every sentence matches its ledger row
criterion: CLAIM-7 | auto | Given an empty ledger or a card with 0 claims, then the check fails with "no claims found" instead of passing
criterion: CLAIM-8 | manual | Given the reworded live page on a 360px by 640px phone -> each card is at most 2 screens tall
criterion: CLAIM-9 | manual | Given a bad reword goes live, then reverting the merge commit and redeploying restores the old page in 1 deploy
criterion: GAP-1 | manual | Given each walkthrough, then it ends with at most 5 gaps, each with an owner and a date
cut: A full line-by-line code tour of every repo | the bet is claims Chase can defend, not code he can recite
cut: New claims or features while auditing | deep, not wide; the audit only removes or fixes
cut: Hearth beta-tester claims beyond what tester logs show | no results exist yet to claim
risk: Claims check only the saved samples, not the live source (demos, unverified live adapters) | CLAIM-4
risk: A reworded claim goes live without Chase's go | M1.6
decision: Go on the live-site rewording after the fix list is ready (M1.6) | yes, on the one page showing old vs new text
handoff: qa-tdd | failing checks for CLAIM-1 to CLAIM-5 against the ledger | red for the right reason
handoff: engineer | ledger file and fixes in build.py after the tests exist | CLAIM-1 to CLAIM-5 green 3x
handoff: positioning | reword each unverified or wrong claim from the ledger | every row verified or cut
handoff: privacy-security | check each demo card for personal data and unlabeled sample data | no P0 or P1
```
