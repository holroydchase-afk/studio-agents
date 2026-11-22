# Staff PM: search feature plus its migration, scoped to done

**Answer.** Needs a decision, then it is about 3 sessions. The README says search is "built", but HANDOFF says the last migration recorded as deployed is 0023 and that deploys wait for the owner's word. So search's migration is almost certainly not live, and "built" is the wrong word until it is. Done must include applying the migration to the hosted backend (Chase's go, via backend/scripts/deploy.sh) and a check on the live project. Done must also include a phone check (CLAUDE.md rule 8: a build is ready only once a phone opened it).

**What the repo says (only 3 facts, no code, no tracker, no search spec here):**
- README: "The Status section lists search as built."
- HANDOFF: "The last migration recorded as deployed to the hosted project is 0023. Deploys to the hosted backend wait for the owner's word."
- CLAUDE.md: rule 8 (phone check); deploys use backend/scripts/deploy.sh.
- Missing: the search migration's number and contents, the search spec, and whether the repo copy of HANDOFF is current. I did not guess them. Not covered in this repo: the personas and anchors the criteria should trace to.

**Stale statements this change touches:** README "search as built" (wrong until deployed); HANDOFF "0023" line (must be updated to the search migration number after deploy); any docs describing stored/searchable data (data-flow docs) if search indexes new fields.

**Critical path**
1. M1.1 Confirm the state: find the search migration number N and whether anything between 0023 and N is also undeployed. Done when HANDOFF lists every undeployed migration by number. 0.5 session.
2. M1.2 Dry run: `backend/scripts/deploy.sh --dry-run` plus the SQL tests on local Postgres. Done when the migration applies on a copy of the 0023 schema and rolls forward cleanly, with the rollback written down. 0.5 session.
3. M1.3 Real-source check: tests so far ran on a local Postgres and fixtures, not the hosted project. Done when search is run against the hosted project after deploy with real-shaped data (see risk). 0.5 session.
4. M1.4 Deploy (Chase's go only) and record it. Done when HANDOFF says "deployed through N", with date and who ran it. 0.5 session, needs Chase.
5. M1.5 Phone check on a build that uses the live backend. Done when search returns the expected result on a phone. 0.5 session.
6. M1.6 Public-side sweep: README, HANDOFF, status lines, any docs and copy that say search exists. Done when each was re-read after the deploy. 0.5 session.

**Not doing:** ranking tuning, fuzzy matching, search of people or captions beyond whatever the spec already says (deep, not wide); new filters; analytics on queries (privacy rule: never log captions).

**Biggest risk:** the migration is not deployed and nobody noticed because the README says "built"; the app then ships search against a backend without it. Handled by M1.1, M1.4 and SRCH-4. Second risk: search leaks a post the viewer cannot see (RLS), handled by SRCH-1.

**Decisions for Chase**
- Go to deploy the search migration (and any between 0023 and N) to the hosted backend: recommend yes, after the dry run is green, in one sitting you can watch.
- Rewrite README "built" to "built, not yet live" until then: recommend yes, I will do it.

**Tools:** agent-guard kill ok (rc 0). agent-memory failed: tools/ux-search.mjs imports a missing check-ux-run.mjs, so no past findings were checked. check-spec and spec-lint results below.

PM-R1 | P1 | README | says search built while HANDOFF shows deploys stop at 0023 | reword to "built, not yet live", update after deploy
PM-R2 | P2 | tools/agent-memory.mjs | missing check-ux-run.mjs, tool cannot run | resync tools

lint-ok: SL-7 SRCH-10 and SRCH-4 check the README claim against the live app after deploy
lint-ok: SL-8 the repo has no screenshots or case study; stale artifacts are README and HANDOFF, named in M1.2, M1.3 and M1.6

```spec
verdict: needs-decision
bet: Chase and his relatives can find a photo by search on a phone against the live backend; it worked when a phone search returns the right post and a post the viewer cannot see never appears
step: M1.1 | Confirm search migration number and every undeployed migration after 0023 | HANDOFF lists them by number | 0.5 session
step: M1.2 | Dry run deploy and SQL tests on a copy of the 0023 schema | dry run clean, rollback written down, README and HANDOFF noted as stale | 0.5 session
step: M1.3 | Run search on the hosted project with real-shaped data | SRCH-1 and SRCH-3 pass there, docs and README updated if data flow changed | 0.5 session
step: M1.4 | Deploy on Chase's go and record it | HANDOFF says deployed through the search migration | 0.5 session
step: M1.5 | Phone check on a build using the live backend | SRCH-5 passes on a phone | 0.5 session
step: M1.6 | Sweep README, HANDOFF and docs after deploy | each re-read and correct | 0.5 session
criterion: SRCH-1 | auto | Given user A cannot see post P and P's caption contains "beach", when A searches "beach", then results contain 0 posts and the response looks the same as for a word that matches nothing
criterion: SRCH-2 | auto | Given a database at migration 0023, when the search migration is applied, then it succeeds, existing rows are unchanged, and the rollback restores 0023
criterion: SRCH-3 | auto | Given 3 visible posts and 1 that errors on bad data, when A searches, then the 3 are returned and the run does not fail
criterion: SRCH-4 | manual | Given the deploy is done, when HANDOFF and README are read, then both name the same last deployed migration number and neither says "built" for an undeployed one
criterion: SRCH-5 | manual | Given a phone with the live build, when Chase searches a known caption word, then the expected post shows within 2 seconds
criterion: SRCH-6 | auto | Given an empty query and a query of 200 characters, when searched, then the empty one returns 0 results without error and the long one returns without error
criterion: SRCH-7 | auto | Given a signed-out visitor, when they call search, then the response is 401 or empty and returns 0 posts
criterion: SRCH-8 | auto | Given another account (a non-owner, user B) in a different family than user A, when B searches a word only in A's visible posts, then B gets 0 results
criterion: SRCH-9 | manual | Given a phone at 360px by 640px, when search results show 5 posts, then the results screen is at most 2 screens tall
criterion: SRCH-10 | manual | Given the deploy is done, when every README quickstart and status line about search is run or read on the live app, then 0 lines disagree with what the live app does
cut: Ranking and fuzzy matching | not needed to prove search works
cut: Query analytics | breaks the no-logging privacy rule
risk: Migration undeployed while README says built | SRCH-4
risk: Search reveals a post the viewer cannot see | SRCH-1
handoff: qa-tdd | failing tests for SRCH-1 to SRCH-3 and SRCH-6 | red for the right reason
handoff: engineer | fix whatever the tests find and run the dry run | SRCH-1 to SRCH-3 green 3x
handoff: privacy-security | check search against RLS and logging rules | no P0 or P1
decision: Deploy the search migration to the hosted backend | yes after a green dry run
decision: Reword README search status to not yet live | yes
```
