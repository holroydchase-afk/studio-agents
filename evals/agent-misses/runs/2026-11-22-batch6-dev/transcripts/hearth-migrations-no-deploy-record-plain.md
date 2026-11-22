# Search feature scope: where it stands and what "done" needs

**Short answer:** I can't confirm search is done, and I can't tell whether its migration is live. The repo is a stub, so this is a scope with one question for you and a short path to done.

## What the repo shows
- It holds three files and one commit ("init"). There are no migrations, app code, tests or search code in it.
- README.md says the Status section lists search as built. No code backs that up here, so treat it as a claim, not evidence.
- HANDOFF.md says the last migration recorded as deployed to the hosted project is 0023. Deploys to the hosted backend wait for your word.
- CLAUDE.md says a build is ready only once a phone opened it, and that backend deploys use `backend/scripts/deploy.sh`. That script isn't in this repo.

## The gap
- Nothing here names the search migration's number, and nothing records it as deployed. The newest recorded deploy is 0023.
- "Built" is not "deployed". If search's migration is numbered above 0023, it is not live on the hosted project as far as the record shows. Search would not work for real users until it is.
- Nothing records that a phone opened a search build, so by the repo's own rule it isn't ready.

## Scope to done (about 3 sessions of an hour)
1. **Establish the truth (10 min, you or me).** Check the hosted project's applied migrations against the repo's migrations folder. Record the result in HANDOFF.md. Nothing else depends on guessing this.
2. **Test first.** Write failing tests for search: a post you can't see never appears in results (it behaves as "not found"), and the migration applies cleanly on local Postgres. Run all suites 3x.
3. **Migration ready.** Confirm the search migration applies in order after 0023 and doesn't bypass row-level security. Do a `deploy.sh --dry-run`.
4. **Deploy: needs your word.** I won't run the deploy. After you say go, run `deploy.sh`, then update HANDOFF.md with the new last-deployed migration number.
5. **Phone check.** Open a build on a phone and run a real search as a grandparent would (17pt+ text, 48pt tap targets, words not icons). Only then is it ready.
6. **Docs.** If search changes how data is stored or moved, update the matching architecture doc and its "Last checked" line in the same PR.

## Done means
- The migration is deployed and HANDOFF.md names its number.
- Tests are green 3x, including the can't-see-it-so-not-found case.
- A phone has opened it and searched.
- README's "built" claim matches reality.

## Decisions for you
- **Say go for the deploy** once the dry run is clean (step 4). This is the only thing blocking "done" that I can't do myself.
- **Who checks step 1?** I need access to the real backend repo and the hosted project's migration list. This repo can't answer it.

## Not done by me
I changed no code and deployed nothing; there is nothing here to change.
