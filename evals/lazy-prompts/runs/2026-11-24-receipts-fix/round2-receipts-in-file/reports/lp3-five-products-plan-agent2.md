Not that I can confirm. I couldn't open your repos from here, so I can't say whether a plan exists in any HANDOFF.md. I wrote one now: WEB-M1, five steps, about 6 sessions.

Fit: it serves the job search, because a recruiter sees five honest cards on chaseholroyd.com. I chose reuse: the site, demos and agents already exist, so nothing new gets built.

Critical path:
1. M1.1 (staff-pm, 1 session): one table of the five products with card, demo link, status and claims vs. each repo's HANDOFF.md. Done when every gap has an owner.
2. M1.2 (you, 0.5 session): pick the Hearth name. I'd take your brothers' shortlist.
3. M1.3 (2 sessions): rename sweep across repo, app, demo, card, intro line and docs. Done when the old name shows 0 matches in public places.
4. M1.4 (2 sessions): fix the Role Radar, ccwatts, Energy Scanner and PM tools cards. Build Slate gets its own card under PM tools, and every claim matches the logs.
5. M1.5 (0.5 session): you give the go, we republish and I check the live page on a phone.

Not doing: new products or demos, and buying a domain or store build until the name is final.

Biggest risk: the old Hearth name left behind in a demo, repo or account page. The sweep has a search that must return 0.

decision: Hearth's new name | one word from you; I'd decide by your next session

Hand-offs: qa-tdd writes the failing tests first, positioning writes the card copy from logged claims only, and privacy-security checks the rename leaves no ids in public repos.

```spec
verdict: needs-decision
bet: A recruiter opens chaseholroyd.com and finds five products with one honest card each, a working demo or link, and the Hearth name settled; it worked when every card claim matches its run logs and the live site shows the new name everywhere
step: M1.1 | staff-pm inventories the five products: card, demo link, status line and claims against each repo's HANDOFF.md, one table | table saved in the studio repo, every gap named with an owner | 1 session
step: M1.2 | Chase picks the Hearth name (brothers' naming work as input) | one word from Chase, logged in the decision log | 0.5 session
step: M1.3 | Rename sweep: repo, app, demo, portfolio card, intro line, HANDOFF and facts docs, accounts doc | grep for the old name returns 0 in public places | 2 sessions
step: M1.4 | Fix card gaps from the inventory for Role Radar, ccwatts, Energy Scanner and PM tools (Build Slate named as its own card) | each card links a demo or package and its claims match run logs | 2 sessions
step: M1.5 | Chase gives the go and the live site is republished | live page checked after publish | 0.5 session
criterion: WEB-1 | auto | Given the built portfolio page, when the old Hearth name is searched, then 0 matches remain in the page, the cards and the intro line
criterion: WEB-2 | auto | Given the five product cards, when each is parsed, then 5 cards each have a name, a one-line claim and a link that is not empty
criterion: WEB-3 | manual | Open the live site on a phone after the publish -> all 5 cards load and the Build Slate card is listed under PM tools
criterion: WEB-5 | auto | Given ccwatts on npm, when its card quickstart command runs on the registry version, then it exits 0
criterion: WEB-6 | manual | Open the live page at 360px by 640px -> each card is at most 2 screens tall and the page shows 5 cards
criterion: WEB-4 | auto | Given a claim on a card, when it is compared with the product's run log or score, then 0 claims exceed what the log shows
cut: New products or demos | the five on the list are enough to prove the bet
cut: Buying a domain or a store build for the new Hearth name | waits until the name is final, per the accounts doc rule
risk: A bad publish breaks the live site; rollback is reverting the merge commit and redeploying | M1.5
risk: Renaming Hearth leaves the old name in a demo, repo or account page | WEB-1
risk: A card claims more than the logs show | WEB-4
decision: Hearth's new name | one word from you; I would take the brothers' shortlist and decide by your next session
handoff: qa-tdd | failing tests for WEB-1, WEB-2 and WEB-4 | red for the right reason
handoff: positioning | card copy for the five products using only logged claims | copy matches WEB-4
handoff: privacy-security | check the rename sweep leaves no ids or personal data in public repos | no findings at P1 or above
```
