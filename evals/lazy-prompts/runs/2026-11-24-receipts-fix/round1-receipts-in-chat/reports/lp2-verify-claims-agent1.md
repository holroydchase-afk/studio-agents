Hi Chase. Plan: audit every claim first, then walk you through what's built. I chose claims before walkthrough, because the walkthrough should only say what's proven.

**Goal fit:** serves your rule that portfolio and agent claims must match run logs and scores, and the job search: you need to defend each line in an interview.

**Call:** build a claims register (every claim on the portfolio, each product card and each agent description, one row, one evidence line), reuse the existing drift and scorecard tools, and build only the small register check. Skipped: a rewrite of the portfolio.

**Critical path (6 sessions, about 6 nights):**
1. M1.1 Register of all claims (1 session)
2. M1.2 Match each to a run log, score, test or live check (1)
3. M1.3 Reword or cut the unproven ones; goes live only on your go (1)
4. M1.4 Gap report: built but not run on real data, not deployed, not phone-checked (0.5)
5. M1.5 First real run for the products only tested on saved samples (1)
6. M1.6 One short page per product: merged, deployed, checked (2)

**Not doing:** new features, portfolio redesign, a separate agent-by-agent tour.

**Biggest risk:** agents describe their own work generously, so the register inherits overclaims. CLM-2 catches it by comparing each claim to the scorecard.

**Your one step:** none until M1.3, when I'll ask for your go on the live wording. First next step: qa-tdd writes the failing register checks, next session.

**Handoffs:** qa-tdd (failing checks), engineer (register check), positioning (reword), ux-reviewer (phone read), privacy-security (scan before anything is public).

I couldn't open your repos from here, so the gaps are listed as questions the audit answers, not findings yet.

Checks: all 3 passed
tool: agent-guard kill staff-pm | ok | exit 0
tool: check-spec | ok | exit 0
tool: spec-lint | ok | exit 0
waivers: 0

```spec
verdict: ready
bet: Chase can defend every public claim in an interview; it worked when each claim on the portfolio and in agent descriptions has a proof line (run log, score, test or live check) or has been cut
step: M1.1 | Claims register: list every claim on the portfolio, each product card and each agent description, one row each with where it appears | register lists 100 percent of claims found on the live page and in agent files, each row marked proven, unproven or wrong | 1 session
step: M1.2 | Proof pass: match each row to evidence (run log, scorecard, test, live check) and mark proven, unproven or wrong | every row has a verdict and a named evidence file, or the verdict unproven | 1 session
step: M1.3 | Fix pass: reword or cut every unproven or wrong claim, queued as a live-site change for Chase's go; roll back by reverting the merge commit and redeploying | portfolio drift tool reports 0 drifts after the change is live | 1 session
step: M1.4 | Gap report: what is built but not run on real data, not deployed, or not checked on a phone, in plain words | one page, gaps ranked P0 to P2, each with a next step and owner | 0.5 session
step: M1.5 | First real run: a machine that can reach the real sources runs each product with saved-sample tests (Role Radar, Charlie, Crew Clock) and notes which data kinds the samples lack (for example puts when only calls were saved) | 3 products each have a pass or fail on real data | 1 session
step: M1.6 | Walkthrough: one short page per product (what it is, what is merged, deployed, checked, what to say in an interview) | 9 pages, each under 300 words, each ending with the three states merged, deployed and checked | 2 sessions
criterion: CLM-1 | auto | Given the register has a claim with no evidence file, then the register check exits 1 and prints the row ID
criterion: CLM-2 | auto | Given a claim of "3 of 3 runs green" and a scorecard showing 2 of 3, then the drift check reports 1 mismatch
criterion: CLM-3 | auto | Given a claim number shown in two places (card and README) that differ, then the check reports 2 locations and the one source value
criterion: CLM-7 | auto | Given every portfolio command and version number in a claim, then it matches the released version and exits 0 on the registry copy, 0 mismatches
criterion: CLM-8 | manual | Open each walkthrough page at 360px by 640px -> at most 2 screens tall
criterion: CLM-4 | manual | Open the live portfolio on a phone after the fix -> every product card claim matches its register row and 0 rows are marked unproven
criterion: CLM-5 | manual | Given a product whose live adapter was only run on saved samples, then its walkthrough page says "unverified on real data" and lists the data kinds missing
criterion: CLM-6 | manual | Given a claim marked wrong by Chase, then the register row stores 1 reason and the fix row cites that row ID
cut: New products or features | this is about trusting what exists
cut: Rewriting the portfolio design | only claim wording changes
cut: Walkthrough of the studio agents one by one | covered by the claims register rows for agent descriptions
risk: Agents describe their own work generously, so the register inherits overclaims | CLM-2
risk: Live demos pass saved-sample tests but fail on real sources | CLM-5
risk: A claim fix goes live without Chase's go | M1.3
handoff: qa-tdd | failing checks for CLM-1 to CLM-3 against a sample register | red for the right reason
handoff: engineer | build the register check and drift wiring once red | CLM-1 to CLM-3 green 3x
handoff: positioning | reword unproven claims using only proven rows | every new line cites a register row
handoff: ux-reviewer | read the 9 walkthrough pages as Chase on a phone | no P0 or P1 findings
handoff: privacy-security | scan register and walkthrough for personal data before anything is public | 0 findings at P1 or above
```
