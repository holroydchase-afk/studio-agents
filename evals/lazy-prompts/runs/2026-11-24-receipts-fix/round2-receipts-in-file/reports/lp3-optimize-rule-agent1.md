It's already a rule, so don't write a new one. "Optimize for Chase's effort" and "tell Chase if he's about to make a mistake" are both in Hearth's CLAUDE.md. The other repos only have part of it.

Yes, put it in Claude Code, but once. I chose the shared studio standard in studio-agents. Sync pushes it into every repo, and Hearth's own copy becomes a pointer. A copy in each repo would drift. I'd also add one line to your personal Claude Code memory so threads outside a repo get it too.

The one block says two things:
- If Claude can do a step itself, it does it. If it needs you, it asks for one step.
- If you're about to waste money or time, or pick a worse option, the reply's first sentence says so.

Next step: engineer adds the block and runs sync, after qa-tdd writes a failing check that counts the phrase once per repo. That's about one session, tonight if you want it. You do nothing.

```spec
verdict: ready
bet: Chase stops being asked avoidable questions and gets warned before a dumb mistake; it worked when a sampled thread in each repo shows the warning or a done-it-myself instead of an ask
step: M1.1 | Add one "Working with Chase" block (efficiency plus flag-a-mistake) to the studio standard | block present once in studio-agents standard | 0.5 session
step: M1.2 | Run sync so every product repo CLAUDE.md gets the block and Hearth's duplicate points to it | each repo has the block exactly once | 0.5 session
criterion: EFF-1 | auto | Given every product repo CLAUDE.md after sync, then the phrase "about to make a mistake" appears 1 time per file
criterion: EFF-2 | auto | Given the studio standard, then the efficiency block appears 1 time and Hearth's own copy is removed or a pointer -> 0 duplicate blocks
criterion: EFF-3 | manual | Given a thread where Chase asks for a paid tool when a free one exists, then the first sentence of the reply is the warning -> 1 sentence, before any work
cut: Per-repo hand-written copies | they drift; sync already exists
cut: New agent for mistake-spotting | the rule belongs in every agent's context, not a new lane
risk: Rule is in the file but ignored in a thread | EFF-3
handoff: qa-tdd | failing check that counts the phrase per repo CLAUDE.md | red for the right reason (EFF-1, EFF-2)
handoff: engineer | add the block in studio-agents and run sync | EFF-1 and EFF-2 green 3x
```
