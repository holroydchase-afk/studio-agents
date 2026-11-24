Hi Chase, I'm the studio's chief of staff for the same-opening rule. Short answer: 8 of 10 repos already open like Hearth. Only pm-tools and the portfolio site are missing it, so this is a small fix, not a rollout.

**What I found (from each repo's CLAUDE.md, not thread history)**
- Hearth, ccwatts, Role Radar, Energy Scanner, Charlie, Crew Clock, Stakeholder Twins and studio-agents already have the intro, the plan line and qa-tdd failing-test-first.
- pm-tools and the portfolio site have none of it. The portfolio CLAUDE.md also exists twice, so one copy is stale.

**I chose to reuse, not build.** The paragraph already lives in studio-agents and syncs out. I fix it there once, add a check that fails if a repo's CLAUDE.md lacks it, and sync to the two gaps. Hearth-only things (grandparent-ux, persona check) stay Hearth-only.

**Plan**
1. qa-tdd writes the failing check (0.5 session).
2. Engineer makes the opening one shared block with a product-name slot, so it reads "Hi Chase, I'm Role Radar's chief of staff for the scan fix." (0.5 session)
3. Sync to pm-tools (merges on green) and the portfolio repo (one PR each, docs only).
4. Fresh-thread check in each repo to confirm the first message matches.

**Cut:** a runtime hook that forces the intro. A CLAUDE.md check proves the point; I'll add the hook only if a fresh thread skips the intro.

**One for you:** the portfolio PR changes no site content, but main deploys. Your go to merge it? I recommend yes.

Spec and receipts are saved beside this reply.

```spec
verdict: ready
bet: Chase opens a thread in any repo and the first message is the Hearth-style intro and plan line, with a failing test before any build; it worked when a fresh thread in the portfolio repo and in pm-tools both open that way with no reminder from him
step: M1.1 | Add a check that fails when a product CLAUDE.md lacks the opening paragraph (red first) | OPEN-1 and OPEN-2 red for the right reason | 0.5 session
step: M1.2 | Make the opening paragraph and the product-name slot one shared block in studio-agents templates, with Hearth-only rows excluded | OPEN-3, OPEN-5, OPEN-6 green 3x | 0.5 session
step: M1.3 | Sync to pm-tools and the portfolio repo, one PR each, docs only | both CLAUDE.md files pass OPEN-1; pm-tools merged on green | 0.5 session
step: M1.4 | Fresh-thread check in each of the 10 repos after the sync | OPEN-4 recorded per repo in HANDOFF | 1 session
criterion: OPEN-1 | auto | Given a CLAUDE.md with no "Open every thread the same way" paragraph, then the check exits 1 and names the file
criterion: OPEN-2 | auto | Given the Hearth CLAUDE.md unchanged, then the check exits 0
criterion: OPEN-3 | auto | Given product "Role Radar" and work "the scan fix", then the rendered intro is exactly "Hi Chase, I'm Role Radar's chief of staff for the scan fix."
criterion: OPEN-4 | manual | Open a fresh thread in pm-tools with a build ask -> the first message is the intro, then "Building it now. First the staff PM writes up the spec, then tests, then the build. I'll post the PR when it's ready." before any tool call
criterion: OPEN-5 | auto | Given a question or review ask, then the plan line is "Looking into it now. I'll come back with the answer."
criterion: OPEN-7 | auto | Given an empty CLAUDE.md or none at all, then the check exits 1 with "missing file" and does not crash
criterion: OPEN-6 | auto | Given the sync run twice, then the second run changes 0 files and the Hearth grandparent-ux row is untouched
cut: Rewriting each repo's hard rules | only the opening paragraph is shared; repo hard rules win where they say more
cut: A hook that enforces the first message at runtime | a CLAUDE.md check is enough to prove the bet; revisit if a fresh thread skips the intro
cut: Renaming studio-agents "Atlas" intro | it already follows the same pattern
risk: Sync overwrites Hearth-only content, as the notes warn it drops the Hearth notes | OPEN-6
risk: The portfolio repo has a duplicate CLAUDE.md that drifts | M1.3
decision: Merge the portfolio CLAUDE.md-only PR to main (no site change, but main deploys)? | yes, after the CI run shows the built site is unchanged
handoff: qa-tdd | failing tests for OPEN-1, OPEN-2, OPEN-3, OPEN-5, OPEN-6 | red for the right reason
handoff: engineer | build M1.2 and run M1.3 sync | OPEN criteria green 3x
```
