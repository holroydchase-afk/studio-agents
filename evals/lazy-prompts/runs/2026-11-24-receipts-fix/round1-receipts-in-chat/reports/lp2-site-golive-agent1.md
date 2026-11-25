Hi Chase, I'm the staff PM. Short answer: I can't see the site repo from this session, so I can't tell you which redesign items are still open. Step 1 is reading its HANDOFF and open PRs to get that list. The rest is a fixed go-live gate.

Goal fit: this serves the senior/staff PM job search, so the portfolio has to be true before it is pretty. I chose reuse over build: the existing drift check, ux-reviewer and qa-tdd cover everything, and nothing new gets built. I rejected adding new pages or products now; that waits until after go-live.

Path to live, about 3.5 sessions:
1. Read the site HANDOFF and open PRs, then list what is unmerged (0.5).
2. Check every card against its product repo and run logs, so no overclaiming (0.5).
3. ux-reviewer pass at phone width (1).
4. Secrets and personal-data scan of the site and demos (0.5).
5. You give the go and I merge in order (0.5).
6. Check the live pages after the deploy (0.5).

Merged, deployed and checked are three separate states in HANDOFF. Merging to main deploys the site, so nothing merges before step 4 is clean. Rollback is reverting the merge commit.

Next step: I read the site HANDOFF and open PRs in the next session and hand ux-reviewer the pass.

Your one call: merge to main once steps 1 to 4 are clean? I recommend yes, and I'll list the open PRs in merge order.

Checks: all 3 passed
tool: agent-guard kill staff-pm | ok | exit 0
tool: check-spec | ok | exit 0
tool: spec-lint | ok | exit 0
waivers: 0

```spec
verdict: needs-decision
bet: Recruiters and hiring managers land on the redesigned portfolio and every card, number and demo link is true and works; it worked when a cold click-through of all 7 product cards finds 0 broken links and 0 claims the run logs do not back
step: M1.1 | Read the site repo HANDOFF and open PRs, list every redesign item not merged, resume not redo | Written gap list with each item marked todo, doing or done | 0.5 session
step: M1.2 | Drift check of cards against product repos and run logs (status lines, scores, claims) | portfolio-drift reports 0 mismatches | 0.5 session
step: M1.3 | ux-reviewer showcase pass on the redesigned pages at phone width | No P0 or P1 open, findings logged | 1 session
step: M1.4 | secrets and personal-data scan of the public site and demos | No secrets, ids or personal data; no P0 or P1 | 0.5 session
step: M1.5 | Chase says go; merge to main in order | Merged state recorded in HANDOFF | 0.5 session
step: M1.6 | Post-deploy check of the live pages, every card link and each demo | Deployed and checked recorded as separate states in HANDOFF | 0.5 session
criterion: WEB-1 | auto | Given the built site, when every internal and demo link is requested, then 0 return a non-200 status
criterion: WEB-2 | auto | Given each product card status line, when compared with that product repo HANDOFF, then 0 lines disagree
criterion: WEB-3 | manual | Open the live home page on a 375 px phone -> all 7 cards render with no horizontal scroll
criterion: WEB-4 | auto | Given the site source, when scanned for key and email patterns, then 0 matches
criterion: WEB-5 | manual | After the deploy, open the live page and click each demo -> each loads, and the "sample data" label shows on every demo
criterion: WEB-6 | auto | Given a product with no demo or an empty status, when its card is built, then the card shows "no demo yet" and 0 broken links
criterion: WEB-7 | auto | Given each card claim, when compared with the released version and the run log or score, then 0 claims exceed what they show
criterion: WEB-8 | manual | Open the home page at 360 px by 640 px -> the first card is visible and the page is at most 12 screens tall
criterion: WEB-9 | manual | Given a bad deploy, when the merge commit is reverted and Pages redeploys, then the previous page serves within 10 minutes
cut: New pages or new products on the site | not on the path to go live; backlog
cut: Further copy rewrites beyond claim fixes | claims must match run logs and scores, nothing more needed to ship
risk: Merged is mistaken for live; the site deploys on merge and a broken card or overclaim goes public | WEB-1
risk: Card claims drift from product repos during the redesign | WEB-2
decision: Give the go to merge the redesign to main once steps 1 to 4 are clean? | Yes, after M1.4 is clean; I will list the open PRs in merge order
handoff: ux-reviewer | showcase review of redesigned pages at phone width | no P0 or P1 open
handoff: privacy-security | public site and demo scan | no P0 or P1 open
handoff: qa-tdd | failing tests for WEB-1, WEB-2 and WEB-4 | red for the right reason, then green 3x
handoff: positioning | claim check on card copy against run logs | every claim traced to a log or score
```


