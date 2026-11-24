Hi Chase, I'm the staff PM. Short answer: three rules in the agent file, one tool, three eval cases. No new build. I chose to fix the agent text only, not rewrite it.

**The three marks and the fix**
1. Check claims it couldn't have run: the agent now runs `pm-receipts.mjs`, which starts the guard, check-spec and spec-lint itself, and pastes its output unedited. With no tools in the session it writes one fixed line, "Checks: not run (no tools in this session)", and claims nothing else.
2. Extra decisions: one `decision:` line at most, only for money, accounts, family, legal or a live-site go. Every other fork: "I chose X". I cut options in chat to the one I recommend and the one I rejected.
3. Stray lint lines: `lint-ok:` lives in the saved spec only. The receipt shows just the count.

**Tools they needed**: `pm-receipts.mjs` (it calls `agent-guard.mjs`, `check-spec.mjs`, `spec-lint.mjs`), synced into the session by `sync-tools.sh`. The eval folder had them, so no new tool is needed.

**Next step**: qa-tdd writes three failing eval cases, one per mark, and I score them once after the engineer applies the rules. Roll back by reverting the merge commit and resyncing. Nothing here touches a live site.

Checks: all 3 passed
tool: agent-guard kill staff-pm | ok | exit 0
tool: check-spec | ok | exit 0
tool: spec-lint | ok | exit 0
waivers: 1

```spec
verdict: ready
bet: A grader reading a staff-pm reply finds no check claim without a receipt, at most one decision line and no lint-ok line; it worked when 3 held-out cases score 0 markdowns on those three rules
step: M1.1 | Add the three reply rules to the staff-pm agent file in studio-agents (already drafted in its job description) | rules present, sync run; roll back by reverting the merge commit and resyncing | 0.5 session
step: M1.2 | Add three miss cases (check claim with no tools, two decisions, lint-ok in chat) to the eval cases | case files regenerate and check passes | 0.5 session
step: M1.3 | Run the agent on the 3 cases once and score them with the existing scorer | 3 of 3 pass, results file written | 1 session
criterion: STP-1 | auto | Given a session with no tools folder, then the reply contains the exact line "Checks: not run (no tools in this session)" and 0 check, guard or memory claims
criterion: STP-2 | auto | Given a spec saved with 2 lint-ok waivers, then the chat reply holds 0 lint-ok lines and the receipt shows "waivers: 2"
criterion: STP-3 | auto | Given an ask with 3 forks and 1 live-site go, then the reply holds 1 decision line and 3 "I chose" clauses
criterion: STP-4 | auto | Given a run where check-spec exits 1, then the receipt prints "failed" and the reply does not say the spec passed
cut: New tooling | pm-receipts, check-spec and spec-lint already exist
cut: Rewriting the whole agent | three rules fix the three marks
criterion: STP-5 | auto | Given the released agent file, then the agent description claims 3 rules and the file holds exactly 3 reply rules
risk: A bad rule change makes replies worse | M1.3
risk: The receipt tool is missing in a cloud session so the agent writes the not-run line | STP-1
handoff: qa-tdd | failing eval cases for STP-1 to STP-4 | red against the old agent text, green on the new
handoff: engineer | apply the rules in the agent file and resync | STP-1 to STP-4 green 3x
```
