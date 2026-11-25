Not that I can confirm. I can't open your repos from here, so I can't say whether a plan for these five products exists. I found no earlier plan to resume. I wrote a short one now (below). It serves your job-search goal: the site needs five honest cards that open working demos.

I chose to keep it to those five products and skip Charlie, Crew Clock and Stakeholder Twins. Rewriting the cards from the claims register comes before the rename, so no card claims more than the product does.

Order: inventory (claim versus reality), Hearth rename, card rewrite, demo check (including Build Slate), then merge, your go, deploy and a phone check. About 4.5 sessions at an hour each.

Biggest risk: a card claims more than the product does, such as "on npm" or "live". The WEB-2 check compares each card to its HANDOFF.

The one call that is yours: the new Hearth name. I recommend the shortlist from your brother who is doing naming. The name stays off the live site until you say "Name final: yes".

Next step: positioning drafts the name shortlist and the five cards, and qa-tdd writes the failing tests. I'll start both next session.

Checks: all 3 passed
tool: agent-guard kill staff-pm | ok | exit 0
tool: check-spec | ok | exit 0
tool: spec-lint | ok | exit 0
waivers: 0

```spec
verdict: needs-decision
bet: Recruiters and hiring managers open the portfolio, see five finished products with honest status, and reach a PM interview; it worked when each of the five cards links to a live demo or repo whose status line matches its HANDOFF
step: M1.1 | Inventory pass: one line per product (Hearth, Role Radar, ccwatts, Energy Scanner, PM tools with Build Slate) from each HANDOFF and the portfolio build page, listing what the card claims versus what is live | one table in the studio plan file, every card claim marked true or stale | 1 session
step: M1.2 | Hearth rename: Chase picks the name, then the name goes in one constant and the accounts doc, with the public demo, portfolio card and repo description changed together | new name appears on the card, the demo and the repo description, old name appears nowhere public | 1 session
step: M1.3 | Portfolio cards for the five products rewritten from the claims register only, each with a status word (live, beta, demo) | each card passes the portfolio drift check against its product HANDOFF | 1 session
step: M1.4 | Role Radar and PM tools demo check: sample-data demos load on the live page, Build Slate reachable from the PM tools card | demo opens with sample data labeled as sample | 0.5 session
step: M1.5 | Merged, deployed and checked as three states: PRs merged, Chase gives the go on the live site push, then the live page is opened on a phone; rollback is reverting the merge commit and redeploying | live page shows five cards, each link returns a working page | 1 session
criterion: WEB-1 | auto | Given the built portfolio page, then it contains exactly 5 product cards for Hearth (new name), Role Radar, ccwatts, Energy Scanner and PM tools
criterion: WEB-2 | auto | Given each card status word, then it equals the status in that product HANDOFF (for example ccwatts says "on npm" only if published)
criterion: WEB-3 | auto | Given the old Hearth name as a search term over the built site, then 0 matches remain after the rename
criterion: WEB-4 | manual | Open the live page on a small phone after the deploy -> all 5 cards load and each link opens without an error page
criterion: WEB-5 | auto | Given a card whose link returns a failed load, then the site check exits 1 and prints the card name
criterion: WEB-6 | manual | Open the page at 360px by 640px -> each card is at most 2 screens tall
cut: Charlie, Crew Clock and Stakeholder Twins cards in this pass | Chase named five products; the others stay as they are and are not touched
cut: New demos or features in any product | the goal is a finished portfolio, not more building
risk: Cards claim more than the products do (overclaiming) | WEB-2
risk: Rename done on the site but missed in the repo, accounts doc or store text | WEB-3
decision: Which new name for Hearth, and is it final? | Pick the one your brother suggested that fits grandparents; the name stays out of the live site until you say "Name final: yes"
handoff: positioning | rewrite the five cards and the Hearth name shortlist from the claims register | each claim traces to a claims line
handoff: qa-tdd | failing tests for WEB-1 to WEB-5 | red for the right reason
handoff: engineer | build M1.3 after the tests exist | WEB-1 to WEB-5 green 3x
handoff: privacy-security | review the public demos and the rename before the go | no P0 or P1 findings
```
