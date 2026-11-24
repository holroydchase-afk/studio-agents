Hi Chase, I'm your studio chief of staff for making every project behave like Hearth.

Yes, let's do it. I couldn't open any of your repos here, so none of this is checked against the files. The plan below comes from what you said and from the CLAUDE.md contents I was shown.

**What I'd make the same everywhere**
1. The opening. Every thread starts with "Hi Chase, I'm <Product>'s chief of staff for <the work>." The next line is "Building it now. First the staff PM writes up the spec, then tests, then the build. I'll post the PR when it's ready." For a question or review it's "Looking into it now. I'll come back with the answer."
2. TDD. staff-pm writes the spec, qa-tdd writes the failing test, engineer builds, qa-tdd runs all suites 3x, then the reviews. Each review fix gets its own failing test first.
3. The `Agents:` line in every PR body, qa-tdd's verdict pasted as-is, and the agent-run log committed.

**What I think is already in place**
The CLAUDE.md files I was shown for ccwatts, Role Radar, Energy Scanner, Charlie, Crew Clock, studio-agents and Hearth already have the opening, the TDD order and the `Agents:` line.

**What looks different**
- The portfolio site and PM tools CLAUDE.md files have the table and the TDD order, but not the "Open every thread the same way" rule. They also lack the rule that agents come only from studio-agents, the log rule and, for the site, the qa-tdd verdict relay. I'd add those.
- Their intro wording is also looser. The portfolio site and PM tools files don't have the intro at all. The ccwatts file adds a line about introducing itself, and Role Radar and Energy Scanner use the "Charlie's chief of staff" example, which could be copied into the wrong product.
- The studio-agents file calls the intro "Atlas, Product Studio's chief of staff". Every project has its own product name, so they can't all use the same words.
- Hearth also has `grandparent-ux`, which only it needs. The other repos have `focus-coach`, `orchestrator` or `release-captain` in different places. That's fine, because those lanes differ by project.

**How I'd do it**
Put the shared block in studio-agents once, with `<Product>` as a placeholder. Add it to the sync script so each repo gets it on its next sync. Then open one small PR per repo. Each PR is docs-only (`qa-tdd skipped: docs only`) and updates HANDOFF.md. The per-repo PRs can merge on green. Anything that changes a live demo still waits for your go.

**Decision for you**
Should the portfolio site (holroydchase-afk.github.io) and PM tools get the intro rule too? Both show the studio-only `orchestrator` and `focus-coach` rows, so they may be run differently from product repos. I recommend yes. One word back ("yes" or "no") and I'll start with the studio-agents change.

**One caution**
The intro is a prompt rule. Nothing in CI checks it, so it only holds if each repo's CLAUDE.md has it. I'd add a line to `check-agents.sh` that fails when a repo's CLAUDE.md is missing the intro rule. That makes "everyone behaves the same" something CI enforces.