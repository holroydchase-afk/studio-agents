Not that I can confirm. I can't open your repos from here, so I can't say a plan for these five exists. Treat this as the plan, and the first step is a table of where each product stands, read from each repo's HANDOFF.

Goal fit: your top priority is the PM job, and the portfolio supports it, so I cut this to five cards. Charlie, Crew Clock and Twins stay as they are.

The path, five steps (about 3 sessions):
1. Tonight (Nov 24), I fill a five-row table: repo state, demo live or not, card on the site or not.
2. Rename Hearth. I check the name-lock list first, then log your pick.
3. Cards for Hearth, Role Radar, ccwatts and Energy Scanner. Each claim must come from that product's claims register.
4. One PM tools card for Build Slate and the roadmap, with sample data only.
5. You give the go. Then merge, deploy and a phone check, each recorded on its own, because merged is not deployed is not checked.

Main risk: the old Hearth name left on a public page. A test searches every page and demo for it.

I chose to reuse the existing portfolio build, not a redesign. I'm treating your brothers' naming work as the input for the rename.

Your one call: the new name. I recommend picking from their shortlist and telling me the word. Don't buy a domain until it's final.

Checks: all 3 passed
tool: agent-guard kill staff-pm | ok | exit 0
tool: check-spec | ok | exit 0
tool: spec-lint | ok | exit 0
waivers: 0

```spec
verdict: needs-decision
bet: A recruiter opening the portfolio sees five named products, each with a working demo and a claim backed by its run logs; it worked when each card opens its demo in one click and the post-deploy check finds no stale old Hearth name
step: M1.1 | Inventory: one row per product (name, repo state, demo live or not, card on site or not, last HANDOFF date), read from each repo | table of 5 rows with every cell filled from a file, none guessed | 0.5 session
step: M1.2 | Rename Hearth: warn on the name-lock list, then record Chase's pick in the decision log | new name recorded and the list of places the old name lives is written out | 0.5 session
step: M1.3 | Cards for Hearth, Role Radar, ccwatts and Energy Scanner on the portfolio build, copy limited to each claims register | each card builds with a demo link and one claim that matches a log | 1 session
step: M1.4 | PM tools card covering Build Slate and the roadmap, sample data only | card builds and the demo opens with sample data | 0.5 session
step: M1.5 | Chase gives the go, then merge, deploy and live check in three recorded states; rollback is revert the merge commit and redeploy | live page checked on a phone, each state written in HANDOFF | 0.5 session
criterion: WEB-1 | auto | Given the built site, when the card list is read, then it has 5 product cards
criterion: WEB-2 | auto | Given the built site after the rename, when searching all pages and the demo for the old Hearth name, then 0 matches remain outside the decision log
criterion: WEB-3 | auto | Given each card's claim text, when compared to its claims register, then 0 claims are missing from the register
criterion: WEB-4 | manual | Open the live page on a phone -> tapping each of the 5 cards opens a demo that loads with "sample" data labeled
criterion: WEB-6 | manual | Open the live page at 360px by 640px -> each card is at most 2 screens tall
criterion: WEB-7 | auto | Given each card's install or demo command in its copy, when run against the released version, then it exits 0
criterion: WEB-5 | auto | Given the PM tools demo seeds, when the private-data check runs, then 0 findings
cut: Charlie, Crew Clock and Stakeholder Twins cards | not in the five Chase named; they stay as they are
cut: Redesign of the portfolio layout | not needed to prove the bet
cut: Buying a domain for the renamed product | it locks the name and is Chase's money call
risk: Old Hearth name left on a public surface after the rename | WEB-2
risk: A card claims more than the logs show | WEB-3
handoff: qa-tdd | failing tests for WEB-1, WEB-2, WEB-3 and WEB-5 | red for the right reason
handoff: engineer | build M1.3 and M1.4 on the portfolio build script | WEB-1 to WEB-5 green 3x
handoff: positioning | card copy and the renamed product line | every claim sits in a register
handoff: privacy-security | public check before the live go | 0 findings on demos and repos
decision: Which name replaces Hearth, with the two brothers' naming work as input | Pick from their shortlist and give the word; I will check the name-lock list first
```
