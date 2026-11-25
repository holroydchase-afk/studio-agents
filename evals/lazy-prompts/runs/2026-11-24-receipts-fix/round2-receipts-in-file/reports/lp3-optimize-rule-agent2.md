Yes, put it in, but once, in the shared rules, not by hand in each repo. Most of it is already there: Hearth's CLAUDE.md has "optimize for Chase's efficiency" and "tell him before he makes a mistake". The other repos only carry the ask-check line. I chose to add the two lines to studio-standard in studio-agents. The next sync copies them into every repo, so there is no copy-paste for you. Agents re-read it every session, so it takes effect then.

Skipped: a new agent for this, and hand-edited copies per repo, because they drift.

Next: engineer adds the lines tonight after qa-tdd's failing test.

```spec
verdict: ready
bet: Chase stops being asked avoidable questions and hears about a risky step before he takes it; it worked when a week of threads in any repo shows zero asks he could have skipped and any risky ask opened with a plain warning
step: M1.1 | Add the two-line rule (optimize for Chase's effort; say so plainly and briefly first if he is about to make a mistake) to studio-standard in studio-agents, one PR | rule present once in studio-standard | 0.5 session
step: M1.2 | Run install-rules and sync on each product repo so every CLAUDE.md points to the rule | each repo CLAUDE.md names the rule | 0.5 session
criterion: EFF-1 | auto | Given studio-standard.md after the change, then the rule text appears exactly 1 time
criterion: EFF-2 | auto | Given a synced product repo CLAUDE.md, then it contains the phrase "dumb mistake" or the rule's stated warning line, count 1
criterion: EFF-3 | manual | Given a thread where Chase proposes paying for a tool he already has, then reply line 1 starts with "Heads up" and names the mistake before any work
cut: A second copy of the rule in each repo | one source in studio-standard stops drift
cut: A new agent for rule enforcement | existing agents already read CLAUDE.md
risk: Rule copies drift across repos | EFF-2
handoff: qa-tdd | failing tests for EFF-1 and EFF-2 | red for the right reason
handoff: engineer | edit studio-standard and run the sync | EFF-1 and EFF-2 green 3x
```
