Hi Chase, I'm the Staff PM for the site redesign go-live.

**Answer:** the site is not live-ready until five checks pass, then you give one go. I chose to finish open redesign PRs first, hold any that change the live site, and deploy in one merge. I could not read the portfolio repo here, so step 1 is listing open PRs and what HANDOFF says is left.

This serves your job search: recruiters see the portfolio first, and a push to main deploys it.

Reuse the existing build script and agents; nothing new to build.

**Critical path**
1. M1.1 (0.5 session): I list open PRs and the exact remaining redesign work in HANDOFF. Done when each item has an owner.
2. M1.2 (1 session): merge redesign PRs on green, oldest first; hold the ones that change the live site.
3. M1.3 (1 session): ux-reviewer checks pages on phone and laptop. Done when no P0 or P1 is left.
4. M1.4 (0.5 session): positioning checks every card claim against run logs and scores.
5. M1.5 (0.5 session): privacy-security scans the public repo and demos.
6. M1.6 (0.5 session): your go, merge, then check every live page. Merged, deployed and checked are three states, and the status line claims only the one reached.

**Not doing:** new products or cards, more polish past P1, hosting changes.

**Biggest risk:** overclaiming "live" after the merge but before the live pages are checked. Rollback is reverting the merge commit.

**Next step:** I start M1.1 tonight. Your only step is the go once M1.1 to M1.5 are green.

```spec
verdict: needs-decision
bet: Recruiters and hiring managers who open chaseholroyd.com believe Chase ships real products; it worked when every card and demo link loads on a phone and each claim matches a run log or score
step: M1.1 | staff-pm lists open PRs and branches, reads HANDOFF, and writes the exact remaining-work list for the redesign | list posted in HANDOFF with each item owned | 0.5 session
step: M1.2 | Close open redesign PRs on green, oldest first, except any that change the live site (those are held for the go) | no redesign PR left open except the held ones | 1 session
step: M1.3 | ux-reviewer showcase review of the redesigned pages on a phone and a laptop | no P0 or P1 findings left | 1 session
step: M1.4 | positioning checks every portfolio claim and card against run logs and scores | each claim has a source or is removed | 0.5 session
step: M1.5 | privacy-security scans the public repo and every demo for secrets, ids and personal data | no findings at P1 or above | 0.5 session
step: M1.6 | Chase gives the go; merge to main; then check each live page and demo link | live check recorded in HANDOFF | 0.5 session
criterion: WEB-1 | auto | Given the built site, when every internal and demo link is requested, then 0 return a status of 400 or more
criterion: WEB-2 | auto | Given the repo text, when scanned for tokens, emails and artifact or trigger ids, then 0 matches
criterion: WEB-3 | manual | Open the live home page on a small phone -> 0 pixels of horizontal scroll and every product card opens its demo
criterion: WEB-6 | manual | Open the live home page at 360px by 640px -> the first product card is visible within at most 2 screens
criterion: WEB-7 | auto | Given each portfolio claim about a released product, when checked against the released version and its run log, then 0 claims disagree
criterion: WEB-4 | auto | Given each product card, when its claim text is compared to the claims doc, then 0 claims are missing a source
criterion: WEB-5 | manual | After the deploy, open each of the 8 product pages and demos on the live URL -> each loads with its sample-data label
cut: New products or new cards | not on the path to going live
cut: Extra redesign polish beyond P1 findings | one more round only if P1 remains
cut: Custom domain or hosting changes | the current Pages setup already works
risk: Merged but not deployed or checked, so the status line overclaims | WEB-5
risk: A stale claim or leaked id goes live on a public repo | WEB-2
decision: Go live once M1.1 to M1.5 are green? | yes, I recommend the go the night they pass
handoff: ux-reviewer | showcase review of the redesigned pages | no P0 or P1 left
handoff: positioning | claims check against logs and scores | every claim sourced
handoff: privacy-security | public repo and demo scan | no P1 findings
handoff: qa-tdd | failing tests for WEB-1, WEB-2 and WEB-4, then all suites 3x | red for the right reason, then green 3x
```
