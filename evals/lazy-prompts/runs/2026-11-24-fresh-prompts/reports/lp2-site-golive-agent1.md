Hi Chase, I'm your portfolio chief of staff for the site redesign go-live.

**Answer: go, but not yet. I can't see the site repo, so I can't tell you what's left. Step 1 is listing it.** The live-site rule stands: a push to main deploys, so nothing merges without your go.

**What I did not check (I can't open your repos):**
- Open PRs and branches on the site repo.
- HANDOFF.md and the built HTML.
- Whether the 6 demo links load.
- Current run logs and scores behind the card and agent claims.
- Any scan for secrets or personal data.

Everything below is the plan for what to verify. None of it has been verified.

**Goal fit:** this serves the senior/staff PM job search. The site is what recruiters see, so it has to match the run logs and scores, with no overclaiming.

**Buy, reuse, build or skip:** reuse. Use the existing agents and checks, and build nothing new.

**Critical path (about 4.5 sessions, about 4.5 hours):**
1. Inventory open PRs and leftovers on the site repo and list them in merge order in HANDOFF. staff-pm, 0.5 session, next session.
2. Claims pass on every card, agent description and score against the run logs. A claim with no source is cut. positioning, 1 session.
3. Check all 6 demos load from the built site: Energy Scanner, Charlie, Crew Clock, Build Slate, roadmap and the ccwatts playground. There should be no console errors and no backend URL. qa-tdd, 1 session.
4. Privacy scan plus a phone-width review, with no P0 or P1 left. privacy-security and ux-reviewer, 1 session.
5. You say "go". I merge the PRs in listed order. This is the only step that needs you, and it's 0.5 session.
6. Check the live page on a phone after deploy, then fix the status lines in HANDOFF and on the cards so they match. 0.5 session.

**Not doing:** new products or demos, polish beyond P0/P1 (P2 goes to the backlog), and domain or hosting changes.

**Biggest risk:** the redesign claims more than the logs show (agent scores, "on npm", "beta"). Step 2 handles it. A merge deploys instantly with no staging, so I added a rollback: revert the merge commit and redeploy.

**Decisions for you:**
1. Merge to main once steps 2 to 4 pass, with the PR list in merge order. My recommendation: yes.
2. Hearth on the portfolio now? My recommendation: a short case study only, with no live app link until the beta settles (it started Nov 22).

**Hand-offs:**
- qa-tdd writes failing tests first (links, secret scan, rebuild diff).
- ux-reviewer takes the phone review.
- privacy-security does the scan before deploy.
- positioning takes the claims pass.
- engineer builds only what a red test needs.

```spec
verdict: needs-decision
bet: Recruiters and hiring managers land on the redesigned portfolio and reach a working demo in two clicks; it worked when every card links to a live demo and no claim exceeds what run logs show
step: M1.1 | Inventory open PRs and branches on the site repo, list the redesign leftovers in merge order | list posted in HANDOFF with each PR marked merge-ready or blocked | 0.5 session
step: M1.2 | Claims pass: every card, agent description and score on the site checked against run logs and scores | each claim has a source line or is cut | 1 session
step: M1.3 | Demo link check: all 6 demos (Energy Scanner, Charlie, Crew Clock, Build Slate, roadmap, ccwatts playground) load from the built site | 6 of 6 load, no console errors, no backend URL | 1 session
step: M1.4 | Privacy and phone pass on the built site | no P0/P1 from privacy-security and ux-reviewer at phone width | 1 session
step: M1.5 | Chase says go; merge the redesign PRs to main in listed order | live site shows the new design | 0.5 session
step: M1.6 | Post-deploy check of the live site and every public status line | live page checked on a phone, HANDOFF and card status lines match | 0.5 session
criterion: WEB-1 | auto | Given the built site, when every card link is requested, then all 6 demo links return 200 and 0 point to a backend or a hosted-page address
criterion: WEB-2 | auto | Given the repo scan, when run before push, then 0 secrets, tokens, artifact ids, trigger ids or personal data are found
criterion: WEB-3 | manual | Open the live site on a small phone -> no horizontal scroll, and the first demo is reachable in 2 taps
criterion: WEB-4 | manual | Given a card that says "on npm" or "beta", when checked against its repo status, then the wording matches the state, and any claim without a source is cut
criterion: WEB-5 | auto | Given the built HTML after a rebuild, when diffed against the committed HTML, then the diff is 0 lines
criterion: WEB-6 | auto | Given a card whose demo link is empty or missing, when the site builds, then the build fails with 1 named error instead of shipping a dead card
criterion: WEB-7 | manual | Open the home page at 360px by 640px -> the intro and first demo card show within 2 screens
criterion: WEB-8 | manual | Given a signed-out visitor with empty browser storage, and a different user (a non-owner) on another device, when each opens every demo, then both see only labeled sample data and 0 real records
criterion: WEB-9 | manual | Given a bad deploy, when the merge commit is reverted and Pages redeploys, then the old site is live again within 1 deploy cycle
cut: New products or new demos | not on the path to going live
cut: Further redesign polish beyond P0/P1 | deep not wide; P2 goes to the backlog
cut: Custom domain or hosting changes | not needed unless it is already broken
risk: Redesign claims more than run logs show (agent scores, "on npm", "beta") | WEB-4
risk: Merge to main deploys instantly with no staging | WEB-5
decision: Go on merging the redesign to main once checks pass | yes, after M1.4, with the PR list in merge order
decision: Include the Hearth beta on the portfolio now | link a short case study only, no live app link, until the grandparent beta settles
handoff: staff-pm | build the leftover list from the site repo | list in HANDOFF with merge order
handoff: qa-tdd | failing tests for WEB-1, WEB-2 and WEB-5 | red for the right reason, then green 3x
handoff: ux-reviewer | phone-width review of the built site | no P0/P1
handoff: privacy-security | scan before the public deploy | no P0/P1
handoff: positioning | claims pass on card and agent copy | every claim sourced
```

Checks run: the kill guard passed, the memory lookup found no matches, and check-spec and spec-lint both exit 0. The run log passes check-agent-run and the cost guard. The harness showed no token or cost count, so the log records 0 and is marked escalated for that reason.