Done: every repo gets Hearth's start and Hearth's order. Intro first, then the plan line, then spec, red tests, build, PR. I chose a check in studio-agents over new text, because most repos already carry the paragraph and the gap is drift. From the CLAUDE.md copies I have, pm-tools and the portfolio repo are missing it. I can't open the repos from here, so M1.3 confirms that.

The intro is the first message of the thread, not "beginning-ish". Your exact line is the template: "Hi Chase, I'm Hearth's chief of staff for the Share redo." Questions and reviews get "Looking into it now. I'll come back with the answer."

Next step: qa-tdd writes the failing tests for TWIN-1 to TWIN-6 in studio-agents, one session. Merged, synced into each repo and seen in a real thread are tracked as three separate states. The studio-agents change merges on green. The repo syncs only touch CLAUDE.md, so they merge on green too, with nothing live affected.

Checks: all 3 passed
tool: agent-guard kill staff-pm | ok | exit 0
tool: check-spec | ok | exit 0
tool: spec-lint | ok | exit 0
waivers: 0

```spec
verdict: ready
bet: Chase opens a thread in any repo and sees the same start as Hearth (intro, plan line, spec, red tests, build, PR); it worked when 9 of 9 repos pass the check and his next 3 fresh threads in different repos all open that way unprompted
step: M1.1 | Canonical "Open every thread" and test-first block in studio-agents templates, with the product name and work as slots | block renders to the exact Hearth sentence for the Share redo | 0.5 session
step: M1.2 | check-agents.sh fails a repo CLAUDE.md missing the block or the qa-tdd rule | TWIN-1 to TWIN-4 green 3x | 1 session
step: M1.3 | Sync PRs into the repos that lack it (pm-tools, portfolio), keeping each repo's own hard rules and notes | each repo check green and HANDOFF.md updated | 1 session
step: M1.4 | Verify in real threads and record merged, synced and seen as three states in the studio-agents HANDOFF.md | 3 fresh threads in 3 repos open with the intro | 0.5 session
criterion: TWIN-1 | auto | Given a fixture CLAUDE.md with no "Open every thread the same way" paragraph, then check-agents.sh exits 1 and names the repo
criterion: TWIN-2 | auto | Given a fixture CLAUDE.md with the paragraph and the qa-tdd rule, then check-agents.sh exits 0
criterion: TWIN-3 | auto | Given product "Hearth" and work "the Share redo", then the rendered intro is exactly "Hi Chase, I'm Hearth's chief of staff for the Share redo." and for product "PM tools" it is "Hi Chase, I'm PM tools' chief of staff for the roadmap card." with no doubled apostrophe or "s"
criterion: TWIN-4 | auto | Given a PR that changes code and an Agents line without qa-tdd, then the check exits 1; given "qa-tdd skipped: docs only" on a docs-only PR, then it exits 0, and "qa-tdd skipped: soon" on a code PR exits 1
criterion: TWIN-5 | auto | Given the block synced into a repo twice in a row, then the second run changes 0 lines and the repo's own hard rules and agent notes are untouched
criterion: TWIN-6 | auto | Given a repo whose CLAUDE.md block differs from the canonical one by one word, then the check exits 1 and prints the differing line; given a repo hard rule that says more, then it still exits 0
criterion: TWIN-7 | manual | On a fixed clock of 2026-11-25, open a fresh thread in pm-tools and ask a question -> the first message reads "Hi Chase, I'm PM tools' chief of staff for" followed by the topic, then "Looking into it now. I'll come back with the answer."
criterion: TWIN-8 | manual | On a fixed clock of 2026-11-25, open a fresh thread in the portfolio repo and ask for a build -> the first message is the intro, the second line is "Building it now. First the staff PM writes up the spec, then tests, then the build. I'll post the PR when it's ready."
cut: Making every repo's TDD tooling identical (test commands, suite names) | each repo keeps its own commands; only the order and the Agents line are shared
cut: A new "intro" agent or hook that injects the text | a CLAUDE.md block plus a check is enough and costs no extra run
cut: Rewording the intro for scheduled runs | the block already covers scheduled-run reports; revisit only if one reads wrong
risk: A synced block overwrites a repo's own hard rules or Hearth-style agent notes | TWIN-5
risk: The intro drifts again after the next edit to one repo | TWIN-6
risk: The check passes but a real thread still skips the intro | TWIN-7
handoff: qa-tdd | failing tests for TWIN-1 to TWIN-6 | red for the right reason, then green 3x
handoff: engineer | build M1.1 to M1.3 once tests are red | TWIN-1 to TWIN-6 green 3x
handoff: story-keeper | log Chase's call that every repo opens and builds like Hearth | entry in the decision log
```
