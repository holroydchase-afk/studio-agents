Hearth is mostly the same as the others already. The "Hi Chase, I'm Hearth's chief of staff for the Share redo" opening, the spec, tests, build, PR order, and TDD come from a block in each repo's CLAUDE.md, and most repos have it. I haven't changed anything yet.

**What I compared:** the CLAUDE.md text for all 10 repos, as it was given to me. I could not open the repos themselves.

**Repos that already match Hearth:** ccwatts, Role Radar, Energy Scanner, Charlie, Crew Clock and studio-agents all have the "Open every thread the same way" opening, the relay of qa-tdd's verdict, and the TDD order.

**Gaps:**
- **Portfolio site and PM tools:** these have no opening paragraph, no "agents come from studio-agents" paragraph, no "every agent on that line must really have run" paragraph, and no story-keeper or release-captain rows. The portfolio site also lacks the "relay qa-tdd's verdict" paragraph. They would not open a thread like Hearth does.
- **Wrong name in the example:** Role Radar, Energy Scanner and Crew Clock still say "Hi Chase, I'm Charlie's chief of staff" in their example. It was copied from Charlie. They should say their own product name.
- **TDD rule:** only Hearth has it as its own numbered rule ("failing test first, run the suite 3x"). The others rely on the agent table. I'd add it as a hard rule everywhere, with the Hearth wording.
- **Hearth-only parts:** the `grandparent-ux` agent and the persona check are product-specific, and I'd leave them there.
- **Repo-specific parts I'd leave alone:** the merge and live-demo gates differ by repo on purpose (portfolio and PM tools wait for you on `main`, studio-agents merges on green).

**Plan:** make the Hearth block the one template in studio-agents, with the product name filled in per repo. Then re-sync it into every repo with `scripts/sync.sh`. That means one PR in studio-agents, then one small docs-only PR per repo, each with "qa-tdd skipped: docs only" and an updated `HANDOFF.md`. Merging the repo PRs follows each repo's own rule. Re-syncing overwrites `.claude/agents/`, so Hearth gets its `sync-agents.sh` run right after to keep its notes.

**Not checked:** whether `check-agents.sh` or CI tests compare that text, the existing `.claude/agents/` folders, the sync script's template, and open PRs or branches in any repo.

Want me to go ahead? Yes or no.