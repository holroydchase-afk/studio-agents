Agreed, and it's mostly a sync job, not a build. I chose to make Hearth's flow the one studio block (intro, plan line, test-first order, qa verdict relay, Agents line) and copy it into every repo's CLAUDE.md. Goal fit: your rule to learn the pattern once and keep replies short. Reuse: studio-agents already owns sync.sh and install-rules.sh, so no new tool.

Each repo's intro keeps its own name, for example "Hi Chase, I'm Hearth's chief of staff for the Share redo." The studio repo says Atlas. Hearth-only lines (grandparent-ux, persona check) stay in Hearth.

**Critical path**
1. M1.1 (0.5 session): one canonical block plus the product-name list in studio-agents standard 2a. Done when committed.
2. M1.2 (0.5 session): failing drift check that fails on any repo missing the block. The studio repo and the portfolio site repo lack the opening and relay paragraphs today, so it starts red there.
3. M1.3 (1 session): sync the block in, one non-live docs PR per repo, merged on green.
4. M1.4 (1 session): open a fresh thread in each repo and record the first message. Done when 9 of 9 match.

Next step: qa-tdd writes the red check in your next session, Nov 24.

**Not doing:** Hearth's persona check everywhere (product rule), a new hook to force the intro (only if the fresh-thread check fails), rewriting agent tables (already identical).

**Biggest risk:** cloud threads start above the repo and may never load CLAUDE.md, so the intro gets skipped. STD-8 checks it; fallback is the agent-prompt script.

**Done is three states:** merged in studio-agents, synced into each repo, checked in a fresh thread. HANDOFF.md says only the state reached.

**Handoffs:** qa-tdd writes the failing drift check, then engineer syncs the block.

Checks: all 3 passed
tool: agent-guard kill staff-pm | ok | exit 0
tool: check-spec | ok | exit 0
tool: spec-lint | ok | exit 0
waivers: 1

```spec
verdict: ready
bet: Chase opens a thread in any repo and gets Hearth's flow without asking; it worked when 9 of 9 repos open with the intro and plan line in a fresh thread
step: M1.1 | Name the one canonical block (intro, plan line, test-first order, qa verdict relay, Agents line) and its per-repo product name in studio-agents standard 2a | block text and a 9-repo name list committed | 0.5 session
step: M1.2 | Failing drift check: every repo's CLAUDE.md must contain the block | check red on the repos missing it | 0.5 session
step: M1.3 | Sync the block into each repo via the existing sync scripts, one non-live docs PR per repo, Hearth-only extras left alone | check green 3x, PRs merged on green | 1 session
step: M1.4 | Fresh thread in each repo, record the first message | 9 of 9 first messages match, row per repo in HANDOFF.md | 1 session
criterion: STD-1 | auto | Given the 9 repo CLAUDE.md files, when the check runs, then each contains the exact line "Hi Chase, I'm <Product>'s chief of staff for <the work>." and fails with the repo name when one lacks it
criterion: STD-2 | auto | Given a repo CLAUDE.md missing the line "Building it now. First the staff PM writes up the spec, then tests, then the build. I'll post the PR when it's ready.", when the check runs, then it exits 1
criterion: STD-3 | auto | Given the studio repo and the portfolio site repo, whose CLAUDE.md lack the opening and verdict-relay paragraphs today, when the check runs before M1.3, then it exits 1 naming both
criterion: STD-4 | auto | Given the product name list, when the block is rendered for Hearth, then the intro reads "Hi Chase, I'm Hearth's chief of staff for the Share redo." and for the studio repo reads "Atlas, Product Studio's chief of staff"
criterion: STD-5 | auto | Given a repo with Hearth-only lines (grandparent-ux, persona check), when sync runs, then those lines are unchanged and the diff touches 0 of them
criterion: STD-6 | auto | Given a code PR body with no "qa-tdd" on its Agents line, when agents-check runs, then it fails, and a docs-only PR with "qa-tdd skipped: docs only" passes
criterion: STD-7 | manual | Open a fresh thread in each of the 9 repos and ask for a small change -> the first message is the intro plus the plan line, and a failing test comes before the build
criterion: STD-8 | manual | Open a cloud thread that starts above the repo -> the first message is the intro line, or HANDOFF.md logs 1 row naming the gap and the fallback prompt used
cut: A Hearth-style persona check in every repo | Hearth's product rule, not a studio behavior
cut: New hook to force the intro in chat | CLAUDE.md block plus fresh-thread check is enough until STD-7 fails
cut: Rewriting each repo's agent table | already identical across repos
risk: Cloud threads start above the repo and may never load CLAUDE.md, so the intro is missed | STD-8
risk: Product repos drift again after the next sync overwrites local edits | STD-1
handoff: qa-tdd | failing drift check for STD-1 to STD-6 in the studio-agents tests | red for the right reason on the repos missing the block
handoff: engineer | render and sync the block into the 9 repos | STD-1 to STD-6 green 3x
```
