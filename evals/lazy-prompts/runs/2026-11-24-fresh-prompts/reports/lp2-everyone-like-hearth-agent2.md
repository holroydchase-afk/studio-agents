Hi Chase, I'm your studio chief of staff for the "make every repo behave like Hearth" ask. I looked into it and here is the answer.

**Answer:** Most repos already behave like Hearth. The fix is to make that one shared block that a sync writes, so it can't drift again.

**What I found.** I only read the CLAUDE.md files that were handed to me. I did not open the repos, so I haven't checked hooks, CI workflows, `.claude/agents/` or the code.
- **Already match Hearth:** ccwatts, Role Radar, Energy Scanner, Charlie, Crew Clock and studio-agents. Each has the "Open every thread" intro, the test-first order (staff-pm, then qa-tdd red, then engineer, then qa-tdd green 3x), the `Agents:` line rule and the qa-tdd relay rule.
- **PM tools:** missing the "Open every thread" paragraph, the "Agents come from studio-agents" paragraph and the "agent actually ran" log rule. Its table also lacks the "introduces itself by role, warmly" sentence.
- **Portfolio site:** the CLAUDE.md in `portfolio` and in `holroydchase-afk.github.io` are identical. It is missing the same things as PM tools, plus the qa-tdd relay rule.
- **Hearth only (leave as is):** grandparent-ux, the persona check, the tracker and the grandparent UX rules. They serve Hearth's users.
- **Two other differences.** Some repos name their own example in the intro ("Charlie's chief of staff"). ccwatts, Charlie and Crew Clock also have different stop-and-ask rules that stay as they are.

**Recommended (one build):** put one canonical "Open every thread" and "One task, in order" block in studio-agents. Have `install-rules.sh` write it into each repo's CLAUDE.md. Add a check that fails when a repo's copy drifts. Hand-editing nine files would just drift again. The one I rejected is editing each repo's CLAUDE.md by hand.

**Plan**
1. Build the shared block and the sync in studio-agents. Done when the block matches byte for byte in every test. About 1 session.
2. Sync the two repos that are missing it, the portfolio and PM tools, one PR each. About 1 session. The portfolio PR waits for your go, because a push to `main` deploys the live site.
3. Sync the other repos, one PR each, oldest first. Each diff should be only the shared block. About 1 session.
4. Add the drift check. About 0.5 session.

**Not doing:** copying Hearth's persona check, tracker or grandparent-ux elsewhere, and a new agent. The existing studio agents cover every lane.

**Biggest risk:** hand edits to the block bring the drift back. The drift check is the answer to that.

**Your calls (both defaults, so I'll keep going unless you say otherwise):**
- Make the block a shared template that sync writes. Recommend yes.
- Use the repo you start in as the product name in the intro. Recommend yes, so you never type it.

**Hand-offs:** qa-tdd writes the failing tests first (SAME-1 to SAME-3). The engineer builds steps 1 and 4 once they are red. No privacy review is needed, because this is doc and CI text only.

**Not run.** I did not run the sync or touch any repo. I ran the kill guard (ok) and the memory lookup (no past findings), and the spec passed `check-spec` and `spec-lint`. I did not write the run log file, so `check-agent-run` was not run. I had no token or cost count, so there is nothing to report on cost.

```spec
verdict: ready
bet: Chase gets the same opening, the same test-first order and the same PR checks in every repo; it worked when a new thread in any repo opens with the intro line and a PR without a qa-tdd line fails CI
step: M1.1 | Put one canonical "Open every thread" and "One task, in order" block in studio-agents and have install-rules.sh write it into each repo's CLAUDE.md | blocks match byte for byte in the studio-agents test | 1 session
step: M1.2 | Run the sync on portfolio and pm-tools first (the two repos missing the block), one PR each | each PR shows the block added and checks green | 1 session
step: M1.3 | Run the sync on the other repos, one PR each, oldest first | diff in each is only the shared block | 1 session
step: M1.4 | Add a check that fails when a repo's block drifts from the template | check red on a hand edit, green on sync | 0.5 session
criterion: SAME-1 | auto | Given any product repo CLAUDE.md, then it contains the intro line template "Hi Chase, I'm <Product>'s chief of staff for <the work>." exactly once
criterion: SAME-2 | auto | Given a repo CLAUDE.md whose block was hand edited, then the drift check exits 1
criterion: SAME-3 | auto | Given a PR that changes code and whose Agents line omits qa-tdd, then agents-check exits 1 with "qa-tdd missing"
criterion: SAME-4 | manual | Start a new thread in each of the 9 repos -> the first message is the intro line, then the plan line
cut: Copying Hearth-only rules (grandparent-ux, persona check, tracker) | they serve Hearth's users and would be noise elsewhere
cut: A new agent | the studio team already covers every lane
risk: Hand-editing nine files lets them drift again | SAME-2
decision: Make the block one shared template that sync writes | yes, one source beats nine copies
decision: Treat the repo you start in as the product name in the intro | yes, no extra input from you
handoff: qa-tdd | failing tests SAME-1 to SAME-3 in studio-agents tests | red for the right reason
handoff: engineer | build M1.1 and M1.4 | SAME-1 to SAME-3 green 3x
```