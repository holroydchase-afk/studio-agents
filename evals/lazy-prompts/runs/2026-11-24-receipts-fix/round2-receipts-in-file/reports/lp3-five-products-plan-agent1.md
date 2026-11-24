Short answer: I can't point you to one. I couldn't find a plan that covers all five products going to the portfolio, so treat it as not written yet. The pieces exist (demos, ccwatts on npm, shared agents), but no single list ties them to a live site.

Goal fit: this serves your top priority, the senior/staff PM job search, through chaseholroyd.com. Call: reuse the current portfolio build and agents, build nothing new. I wrote the plan below and chose to keep Charlie and Crew Clock for the next milestone.

One flag before you go further: don't rename Hearth inside the live beta. The 12 grandparents know the current name, and a mid-beta swap costs you their trust for no gain. Pick the new name, record it, and change the app after the beta round.

Next step: M1.1, finding or writing the single plan file with a status per product. Owner is me, in your next session. Tonight you only answer the one question below.

Decision for you: the Hearth name. I recommend settling it with your two brothers this week.

```spec
verdict: needs-decision
bet: Recruiters and hiring managers who open chaseholroyd.com see five products (Hearth under its final name, Role Radar, ccwatts, Energy Scanner, PM tools with Build Slate) that each open and work; it worked when each card has a live demo or package link that loads and one run log or score behind every claim
step: M1.1 | Find or write the single plan: search the studio project and each product HANDOFF for an existing portfolio plan, then save one WEB plan with status per product (todo, doing, blocked, done) | one plan file lists all five products with status and owner | 0.5 session
step: M1.2 | Decide the Hearth name, then run the rename checklist (repo, app strings, accounts list, portfolio card, HANDOFF) | name final recorded and every listed place checked after the switch | 1 session
step: M1.3 | Per-product demo gate: ccwatts package page, Role Radar demo with labeled sample data, Energy Scanner demo, PM tools demo with Build Slate, Hearth demo or screenshots without real family data | each of the five has a card link that loads 200 and shows sample data only | 2 sessions
step: M1.4 | Claims pass: each card sentence traced to a run log, score or test | no card claim without a source line | 1 session
step: M1.5 | Go-live: PR to the portfolio repo, Chase gives the go, merge, then check the live page | live page checked on a phone after deploy | 0.5 session
criterion: WEB-1 | auto | Given the built portfolio, when the card list is read, then it has exactly 5 product cards with the names in the plan
criterion: WEB-2 | auto | Given each card link, when fetched, then it returns status 200 and no real personal data pattern appears on the page
criterion: WEB-3 | manual | Given the live page on a small phone after deploy, when each card is tapped, then it opens its demo or package and shows 0 error messages
criterion: WEB-4 | auto | Given the old Hearth name, when the repo and built site are searched after the rename, then it appears 0 times outside the decision log
criterion: WEB-5 | auto | Given a card claim with no linked run log or score, when the claims check runs, then it fails with status "claim unsourced"
criterion: WEB-6 | auto | Given a product whose demo or package link is missing, when the card list is built, then the build fails naming that product and shows 0 cards for it
criterion: WEB-7 | auto | Given each card sentence, when compared with the released version and its run log, then every quoted command exits 0 on the registry version
criterion: WEB-8 | manual | Given the live page at 360px by 640px, when scrolled, then each card is at most 2 screens tall
criterion: WEB-9 | manual | Given a bad deploy, when the merge commit is reverted and the site redeployed, then the previous 5 cards return
cut: Charlie and Crew Clock cards in this milestone | Chase named five products; both already have demos and can follow in WEB-M2
cut: New design for the portfolio | reuse the current build; a redesign is not on the critical path
cut: Renaming Hearth inside the live beta app now | the 12 grandparents know the current name; change the app only after the beta feedback round
risk: Rename breaks the beta, accounts and links in one move | M1.2
risk: Cards claim more than the logs show | WEB-5
decision: Which final name for Hearth, and does it ship after the beta round | I recommend pick the name with your two brothers this week, record it as final, and swap the app name only after the beta
handoff: qa-tdd | failing tests for WEB-1 to WEB-5 | red for the right reason
handoff: positioning | card copy for five products using only sourced claims | each sentence has a source
handoff: privacy-security | demo data and rename sweep on the public repos | no personal data found
handoff: engineer | build M1.3 and M1.5 after tests exist | WEB-1 to WEB-5 green 3x
```
