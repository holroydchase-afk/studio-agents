Most repos already behave like Hearth. ccwatts, Role Radar, Energy Scanner, Charlie, Crew Clock, Stakeholder Twins and studio-agents all have the "open every thread" intro and the test-first order. Only pm-tools and the portfolio site are missing it, so I'll fix those two first. I read their CLAUDE.md files but haven't seen how any repo behaves in a live thread.

One bug applies to five repos. Their example intro says "I'm Charlie's chief of staff", which is wrong outside Charlie. I'm replacing it with the product name.

My plan is reuse, not nine hand edits. I'll put one shared block in studio-agents and sync it out. I'll also have the session-start hook print "Hi Chase, I'm <Product>'s chief of staff for <the work>." and the plan line, so the intro doesn't depend on the model remembering. A check in studio-agents will fail any repo whose CLAUDE.md is missing the block.

Hearth keeps its grandparent-ux agent and persona check. Those are about its audience, not how threads run.

Steps:
1. Shared block plus the check (qa-tdd writes the failing checks, then engineer builds). 1 session, tonight.
2. Hook line. 0.5 session.
3. One docs-only PR per repo, pm-tools and the portfolio site first. 1 session.
4. I open a fresh thread in each repo and confirm the intro. 0.5 session.

Your call: the portfolio-site sync redeploys the live site. I recommend yes once the other eight are green.

```spec
verdict: ready
bet: Chase opens a thread in any repo and gets the same start as Hearth without asking; it worked when the first message names the product and the work in 10 of 10 new threads across 3 nights
step: M1.1 | Add one canonical thread-opening and test-first block to the studio-agents templates, with a product placeholder; check-agents.sh fails a CLAUDE.md missing it | SAME-1 and SAME-2 green 3x | 1 session
step: M1.2 | SessionStart hook template prints "Hi Chase, I'm <Product>'s chief of staff for <the work>." plus the plan line | SAME-3 green | 0.5 session
step: M1.3 | Sync to pm-tools and the portfolio site first (the two gaps), then fix the Charlie example in the other five | one docs-only PR per repo, SAME-4 green in each | 1 session
step: M1.4 | Fresh-thread check in each repo after merge, recorded in the studio-agents HANDOFF | SAME-5 met in 9 of 9 | 0.5 session
criterion: SAME-1 | auto | Given a fixture CLAUDE.md for pm-tools without the line "Open every thread the same way", then check-agents.sh exits 1 and names pm-tools
criterion: SAME-2 | auto | Given a fixture for ccwatts whose intro example says "I'm Charlie's chief of staff", then check-agents.sh exits 1; with "<Product>" it exits 0
criterion: SAME-3 | auto | Given product name "Crew Clock", then the hook output first line is "Hi Chase, I'm Crew Clock's chief of staff for" and the second line is the plan line, 2 lines in order
criterion: SAME-4 | auto | Given a code PR body whose Agents line omits qa-tdd and gives no skip reason, then agents-check exits 1 in every synced repo
criterion: SAME-5 | manual | Open a new thread in each of 9 repos and send "fix a typo" -> the first reply is the intro naming the product, then the plan line, before any other work
cut: Hearth's grandparent-ux agent and persona check in other repos | they are Hearth's audience rules, not studio behavior
cut: Enforcing the intro with code beyond the hook line | a model's first message cannot be tested by script; SAME-5 is the check
risk: The portfolio site deploys on any push to main, so a docs sync there goes live | M1.3
risk: Synced files get overwritten by a later sync.sh, losing product edits | SAME-1
decision: Merge the portfolio-site CLAUDE.md sync, which redeploys the live site | Yes, once the other eight are green, tonight
handoff: qa-tdd | failing checks for SAME-1 to SAME-4 in the studio-agents tests | red for the right reason
handoff: engineer | build M1.1 to M1.3 | SAME-1 to SAME-4 green 3x
handoff: positioning | none needed | none needed
```
