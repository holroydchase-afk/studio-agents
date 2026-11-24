Hi Chase, I'm your staff PM for this. The answer: all three mark-downs already have a rule in the agent file; what's missing is proof they hold on new cases. I chose to treat the misses as cases to test, not to rewrite the agent.

**Why each one happened and the fix**
- **Tool-check claims it couldn't have run:** the agent wrote "passed" in prose. Fix: its reply may only quote the receipts tool's output, and when there are no tools it writes one fixed line and claims nothing else.
- **Extra decisions:** I chose to cap it at one decision line, and only for money, accounts, family, legal or a live-site go. Everything else is "I chose X".
- **Stray lint lines:** `lint-ok:` waivers stay in the saved spec file; the receipt shows only a count.

**Tools it needed (all exist already, so I'm reusing them, not building):** the receipts tool (it runs the kill guard, spec check and spec lint itself and prints the only allowed wording), the memory lookup, and the run-log checker. For testing: the miss-case builder and miss-case scorer, the same ones qa-tdd uses.

**Plan:** add the three misses as dev cases, grade the reply text, then score once on held-out cases. Not building a new tool or using a paid API.

Next step: qa-tdd writes the failing reply-checker tests in the next session.

Checks and receipts:
Checks: all 3 passed
tool: agent-guard kill staff-pm | ok | exit 0
tool: check-spec | ok | exit 0
tool: spec-lint | ok | exit 0
waivers: 0

```spec
verdict: ready
bet: Chase gets a staff-pm that stops losing points on the three graded misses; it worked when the next blind run shows 0 unrunnable check claims, at most 1 decision line and 0 lint-ok lines in the chat reply
step: M1.1 | Add the three misses as dev cases beside the qa-tdd miss cases, with the reply text as the thing graded | cases build and check pass | 1 session
step: M1.2 | Make the receipts tool the only source of check text; reply rules point to it, nothing else | reply rules 1 to 3 in the agent file match the tool output | 0.5 session
step: M1.3 | Score agent arm against plain arm on the dev cases, then once on held-out cases | results file passes the score check | 1 session
criterion: PMR-1 | auto | Given a reply that says "check-spec passed" and no receipt line above the spec block, then the reply checker fails with 1 finding
criterion: PMR-2 | auto | Given a session with no tools folder, then the reply holds exactly the line "Checks: not run (no tools in this session)" and 0 other check claims
criterion: PMR-3 | auto | Given a reply with 2 decision lines, then the checker fails; given 1, then it passes
criterion: PMR-4 | auto | Given a reply containing a "lint-ok:" line, then the checker fails with 1 finding; given the same line only in the saved spec file, then it passes
criterion: PMR-5 | manual | Given the empty input of no spec file, then the receipts tool exits 2 with a usage line and prints no "ok" line
criterion: PMR-6 | auto | Given the agent description and portfolio card state a pass count, then it equals the released score file count of 3 dev cases, checked against the released version
cut: A new staff-pm tool | pm-receipts already runs guard, check-spec and spec-lint and prints the only allowed words
cut: Rewriting the whole agent file | the three reply rules already exist; the gap is proof they hold
cut: Metered API grading | no paid API route; grading runs inside Claude sessions
risk: A reply paraphrases the receipt and slips in a claim | PMR-1
risk: Held-out set is spent on a tweak | M1.3
handoff: qa-tdd | failing reply-checker tests for PMR-1 to PMR-5 and the dev cases | red for the right reason
handoff: engineer | build M1.1 and M1.2 once red | PMR-1 to PMR-5 green 3x
```
