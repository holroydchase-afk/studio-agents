Hi Chase, I'm the staff PM for the site go-live.

**Answer:** I can't see the site repo from this session, so I don't know what is left on the redesign. I chose to make the inventory the first step rather than guess: list every open redesign PR and status line, then close gaps, check claims against run logs, review, and go live in one pass. "etc" I read as demo syncs, product cards and claims.

**Goal fit:** this serves the job search. The portfolio is what recruiters open, so accuracy matters more than polish. Reuse: the existing drift check and the studio agents. Nothing new to build.

**Critical path (about 4 sessions):**
1. M1.1 Inventory: open PRs in merge order, each marked merged, deployed or checked (0.5, staff-pm, next session).
2. M1.2 Close redesign gaps, one PR each, tests first (1, qa-tdd then engineer).
3. M1.3 Claims and demo sync: every card matches its run log (1, positioning and engineer).
4. M1.4 Phone-width ux and privacy review (0.5, ux-reviewer and privacy-security).
5. M1.5 Your go, then merge to main in order (0.5, you).
6. M1.6 Check every live page after deploy, since merged is not deployed is not checked (0.5).

**Not doing:** new pages or products, copy rewrites beyond claim accuracy, demo feature work.

**Biggest risk:** treating merge, deploy and check as one state and shipping an overclaim. Handled by WEB-5; rollback is WEB-9.

**Your one call:** the live deploy go at M1.5. I recommend yes once M1.4 is clean. It is the only thing I need from you, and not until then.

Checks: all 3 passed
tool: agent-guard kill staff-pm | ok | exit 0
tool: check-spec | ok | exit 0
tool: spec-lint | ok | exit 0
waivers: 1

```spec
verdict: needs-decision
bet: Recruiters and hiring managers who open the portfolio see a redesigned site whose every card, claim and demo link matches what the run logs and demos show; it worked when each live page is checked after the switch and none is broken or overclaiming
step: M1.1 | Inventory: read the site repo HANDOFF and open PRs and branches, list every unmerged redesign PR in merge order, plus what "etc" covers (demo syncs, cards, claims) | one table of PRs with state merged, deployed or checked | 0.5 session
step: M1.2 | Close the redesign gaps found in the inventory, one PR per task, failing test first | every redesign PR green and listed in merge order | 1 session
step: M1.3 | Claims and drift pass: each product card, status line and number matches its run log, score or demo; sync demos from the product repos | portfolio drift check exits 0 and positioning signs off the copy | 1 session
step: M1.4 | Ux and privacy review on the built site at phone width before the go | no P0 or P1 from ux-reviewer or privacy-security | 0.5 session
step: M1.5 | Chase's go, then merge to main in the listed order | live site deploys from main | 0.5 session
step: M1.6 | Post-deploy check of every public place the change touches: home, each product card, each demo link, README intro lines, status lines in HANDOFF | checklist all ticked on the live pages, recorded in HANDOFF | 0.5 session
criterion: WEB-1 | auto | Given the built site, when every internal and demo link is requested, then 0 return a 404
criterion: WEB-2 | auto | Given each product card, when its claim is compared with the run log or score, then 0 cards state a number or capability the log does not show
criterion: WEB-3 | auto | Given the site repo with no secrets scan exceptions, when the privacy check runs, then 0 findings for tokens, ids or personal data
criterion: WEB-4 | manual | Open the home page on a 360 by 640 phone -> no horizontal scroll, the first product card is visible in at most 2 screens, and the page is at most 8 screens tall
criterion: WEB-5 | manual | Given merge, deploy and live check are separate states, when HANDOFF is read, then each redesign PR shows exactly one of "merged", "deployed" or "checked on live"
criterion: WEB-6 | manual | Given a demo synced from a product repo, when the live demo page loads after deploy -> the label "Sample data" is visible and the console shows 0 errors
criterion: WEB-7 | auto | Given a product with no demo or an empty run log, when its card renders, then it shows "Coming soon" and 0 broken links
criterion: WEB-8 | auto | Given the released version of each shipped product, when the card's install or demo line is compared with it, then 0 mismatches
criterion: WEB-9 | manual | Given a bad deploy, when the merge commit is reverted and Pages redeploys -> the previous site is live again within 1 session
cut: New pages or new products on the site | not on the path to going live
cut: Copy rewrites beyond claim accuracy | positioning only fixes claims that overstate
cut: Demo feature work | demos are synced as they are, fixes go to the product repos
risk: The live deploy breaks a page or ships an overclaim because merge, deploy and check were treated as one state | WEB-5
risk: A bad deploy cannot be undone fast | WEB-9
risk: Demo copies drift from the product repos at the moment of go-live | WEB-6
decision: Go for the live site deploy once the PR list is green | I recommend yes after M1.4, with the PRs listed in merge order
handoff: qa-tdd | failing tests for WEB-1, WEB-2 and WEB-3 | red for the right reason
handoff: engineer | close the redesign gaps and sync demos (M1.2, M1.3) | WEB-1 to WEB-3 green 3x
handoff: ux-reviewer | review the built site at phone width | no P0 or P1 on WEB-4
handoff: privacy-security | review before the public deploy | WEB-3 clean
handoff: positioning | check each card and status line against the logs | WEB-2 clean
```
