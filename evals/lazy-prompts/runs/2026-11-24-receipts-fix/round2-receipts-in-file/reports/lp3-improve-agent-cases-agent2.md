Hi Chase. Short answer: the three marks come from rules the agent already has but nothing enforces on the chat reply. I chose to add one small reply check rather than a new agent or a rewrite.

**Why it was marked down**
- Tool-check claims: a reader of the reply alone can't verify "checks passed", so it reads as invented. Fix: checks stay in a file beside the spec; the reply never mentions them.
- Extra decisions: only one `decision:` line, and only for money, accounts, family, legal or a live-site go. Everything else becomes "I chose X".
- Stray lint lines: waivers stay in the saved spec file, never in the reply.

**What tools it needed**
- Already exist: the receipts runner (kill switch, spec check and spec lint in one run, written to a file) and the memory lookup.
- Missing: a check that reads the reply text and fails on tool-check wording, a second decision line, or a lint line. I'm adding that, and a last step in the agent file: save the reply, run the reply check, fix, then send.

**Next steps**
1. qa-tdd writes failing tests for those three cases plus a clean reply (one session).
2. engineer builds the check and the agent-file step.
3. Rerun the new graded cases and compare marks, aiming for zero on all three.

Not doing: a second reviewer agent, or rewriting the whole agent file.

```spec
verdict: ready
bet: The graders and Chase read the staff PM chat reply alone; it worked when a fresh batch of new cases scores zero marks for unverifiable checks, extra decisions and lint lines
step: M1.1 | Add a reply check tool that fails on tool-check words, a second decision line, or a lint-ok line | PMA-1 and PMA-2 and PMA-3 red then green | 1 session
step: M1.2 | Make the staff-pm file end with: save reply, run the reply check, fix, then send; keep receipts file beside the spec | PMA-4 green | 0.5 session
step: M1.3 | Rerun the new-case eval set and compare marks against the last batch | zero marks on the three misses | 1 session
criterion: PMA-1 | auto | Given a reply that says "all checks passed", then the reply check exits 1 naming the line
criterion: PMA-2 | auto | Given a reply with 2 decision lines, then the reply check exits 1 and a reply with 1 exits 0
criterion: PMA-3 | auto | Given a reply containing a line starting "lint-ok: SL-3", then the reply check exits 1
criterion: PMA-4 | auto | Given a reply with no tool words and 0 decision lines, then the reply check exits 0
criterion: PMA-5 | manual | Read only the reply on a phone -> a reader names the 1 next step without trusting any unseen tool run
cut: A new agent or second reviewer for replies | one small check does the job
cut: Rewriting the whole agent file | only the reply rules and the last step change
risk: The agent still writes tool words in prose when the check is not run | PMA-1
risk: A decision line is dropped when it was truly Chase's | PMA-2
handoff: qa-tdd | failing tests for PMA-1 to PMA-4 with the reply texts above | red for the right reason
handoff: engineer | build the reply check and the agent file step | PMA-1 to PMA-4 green 3x
```
