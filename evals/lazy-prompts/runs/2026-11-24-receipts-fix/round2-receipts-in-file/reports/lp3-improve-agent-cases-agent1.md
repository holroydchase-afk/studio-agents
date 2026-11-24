Hi Chase. Short answer: the three misses are reply-shape problems, so the fix is a small edit to the reply rules plus one failing case per miss. No new agent, no new tool.

- Claims it couldn't have run: results now live in a file beside the spec, never in the reply. If it can't run something, it says nothing about it.
- Extra decisions: one decision line at most, and only for money, accounts, family, legal or a live-site go. Every other fork, I chose and said so in a clause.
- Stray lint lines: waivers live only in the saved spec file, never in the reply.

What the cases need: a working folder with the studio tools synced in and a spec saved to disk. The spec file has the detail.

Goal fit: serves your rule that agent claims match what run logs and scores show.
Call: reuse. What exists already covers all three misses. I rejected writing a new grader tool.

Next step: qa-tdd writes the three failing cases in your next night session. Engineer edits the agent file once they are red, then I re-sync one product repo.

Nothing needs you.

```spec
verdict: ready
bet: The grader scores the next staff-pm replies without the three misses; it worked when 3 of 3 new cases pass with no tool-result claims, at most 1 decision line and 0 lint lines in the reply
step: M1.1 | Three failing reply-shape cases from the graded misses | all 3 red for the right reason | 0.5 session
step: M1.2 | Tighten the staff-pm reply rules in the shared agent file | M1.1 cases green 3x | 0.5 session
step: M1.3 | Re-sync to product repos and rerun the new cases | cases green in one product repo | 0.5 session
criterion: STPM-1 | auto | Given a reply and no receipts file beside the spec, then the reply contains 0 mentions of a check, guard, tool or exit code
criterion: STPM-2 | auto | Given a reply with 2 forks that are not money, accounts, family, legal or a live-site go, then it has 0 decision lines
criterion: STPM-3 | auto | Given a spec with a waived finding, then the saved spec holds 1 lint-ok line and the reply holds 0
criterion: STPM-4 | auto | Given a reply with a genuine live-site go, then it has exactly 1 decision line
criterion: STPM-5 | manual | Read the reply alone on a phone -> all 3 graded misses are absent and every claim can be checked from the reply
cut: New agent or new grader tool | the existing receipts and lint steps already cover all three misses
cut: Rewriting the whole staff-pm file | only the reply rules changed in the graded runs
risk: Agent stays silent about a check it did run and the caller assumes none ran | STPM-1
risk: Shared agent edit drifts product repos until the next sync | M1.3
handoff: qa-tdd | failing reply-shape cases for STPM-1 to STPM-4 | red for the right reason
handoff: engineer | edit the staff-pm reply rules in studio-agents | STPM-1 to STPM-4 green 3x
```
