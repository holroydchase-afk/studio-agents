Hi Chase, I'm your studio chief of staff for making every repo behave like Hearth.

**Answer:** Most of it is already the same. I read the CLAUDE.md files for 9 repos, as pasted into my session, and 7 of them (Hearth, ccwatts, Role Radar, Energy Scanner, Charlie, Crew Clock, studio-agents) already have TDD, the intro line, the plan line ("Building it now. First the staff PM writes up the spec, then tests, then the build...") and the qa-tdd verdict relay.

Two repos are missing pieces:
- **Portfolio site:** no "Open every thread" paragraph, no relay-the-qa-verdict rule, and no "every agent on the Agents line must really have run" rule.
- **PM tools:** has the relay-the-verdict rule but not the intro/plan paragraph or the "must really have run" rule.

I'm treating a missing paragraph in CLAUDE.md as the reason a thread doesn't open like Hearth's.

**Goal fit:** this serves your "everyone behaves the same" ask, and it keeps agent claims matching run logs.

**Reuse, don't build:** put the paragraph in the studio-agents template once and let sync write it into each repo. Hand-editing nine files would drift again. No new agent is needed.

**Not copied everywhere:** Hearth's grandparent-ux, persona check and TRACKER rules. They exist for relatives, not the other repos.

**Critical path:**
1. **M1.1** (0.5 session, qa-tdd then engineer): add the "Open every thread" and relay paragraphs to the template, with a product-name placeholder. Done when a sync into a scratch repo produces "Hi Chase, I'm Hearth's chief of staff for".
2. **M1.2** (0.5 session): add a check to `tests/check.sh` and `scripts/check-agents.sh` that fails when a repo's CLAUDE.md lacks the intro or plan line. Done when it is red without the paragraph and green with it.
3. **M1.3** (1 session): run sync in the portfolio site and PM tools, one small PR each. Neither is a live-demo change, so both merge on green once the checks pass (the portfolio PR touches only CLAUDE.md, not the built site). Done when both PRs are green with an Agents line naming qa-tdd.
4. **M1.4** (1 session): open one new thread per repo and confirm the first reply is the intro plus the plan line.

**Biggest risk:** I could not open any repo, so there may be differences I didn't see. Step M1.2 would catch them.

**Decisions for you:**
- **Intro name for the portfolio and PM tools repos:** I recommend "the portfolio's" and "PM tools'". Say yes or give another name.
- **Hearth-only rules:** I recommend they stay in Hearth.

**Not checked:**
- Any repo itself: not `.claude/agents/`, not `HANDOFF.md`, not open PRs or branches, not CI.
- Whether the hooks and agent-run logs actually fire in each repo.
- Whether a thread really opens with the intro today. I only saw what the files say.

Handoffs: qa-tdd writes the failing checks first (red for the right reason), then engineer builds M1.1 to M1.3 (green 3x), then ux-reviewer reads the wording (no P0 or P1).

I could not record any token or cost figures from my session, so the run log marks this escalated with cost 0.

```spec
verdict: needs-decision
bet: Chase opens any project thread and gets the same opening, the same plan line and the same spec, tests, build order; it worked when a check run over all repos finds 0 repos missing the shared rules
step: M1.1 | Put the "Open every thread" and "Relay qa-tdd verdict" paragraphs in the studio-agents CLAUDE template once, with a product name placeholder | template holds both paragraphs and a sync writes them into a scratch repo | 0.5 session
step: M1.2 | Add a check to tests/check.sh and scripts/check-agents.sh that fails when a repo CLAUDE.md lacks the intro line or the plan line | check is red on a repo without the paragraph, green on one with it | 0.5 session
step: M1.3 | Run sync in portfolio site and pm-tools, one small PR each | both PRs green with an Agents line naming qa-tdd | 1 session
step: M1.4 | Spot check one new thread per repo | first message in each of 9 repos opens with "Hi Chase, I'm" then the plan line | 1 session
criterion: SAME-1 | auto | Given a repo CLAUDE.md with no "Open every thread" paragraph, when check-agents runs, then it exits 1 and names the repo
criterion: SAME-2 | auto | Given a fixed clock and a CLAUDE.md with the paragraph and the plan line "Building it now. First the staff PM writes up the spec, then tests, then the build.", then check-agents exits 0
criterion: SAME-3 | auto | Given the template with the placeholder, when sync runs for a product named "Hearth", then the output reads "Hi Chase, I'm Hearth's chief of staff for"
criterion: SAME-4 | manual | Given a clock of 2026-11-24, open a new thread in each of 9 repos and send one lazy ask -> the first reply is the intro and plan line, with 0 other work before it
criterion: SAME-5 | auto | Given a code PR body with no qa-tdd on its Agents line, then agents-check fails in every repo, 9 of 9
cut: Copying Hearth's grandparent-ux, persona check and TRACKER rules everywhere | they serve Hearth's relatives, not the other repos
cut: Hand editing each repo's CLAUDE.md | drifts again; one template plus sync is the fix
cut: A new agent for openings | the chief of staff already owns it
risk: A repo CLAUDE.md I could not open still differs in a way I missed | SAME-1
risk: Studio repo says Atlas, product repos say their own name, intro names diverge | SAME-3
decision: What does the intro say in the portfolio site and PM tools repos | Use "Hi Chase, I'm the portfolio's chief of staff for" and "PM tools'" so each repo has a name
decision: Keep Hearth-only rules (persona check, grandparent UX) in Hearth | Yes, keep them in Hearth
handoff: qa-tdd | failing check for SAME-1 to SAME-3 in studio-agents | red for the right reason
handoff: engineer | build M1.1 to M1.3 | SAME-1 to SAME-5 green 3x
handoff: ux-reviewer | read the intro and plan wording as Chase sees it | no P0 or P1
```