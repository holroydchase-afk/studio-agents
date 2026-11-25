Yes, I'd do this, and it fits the goal: a recruiter who finds one overclaim stops trusting the rest. I chose a claims audit first, then the walkthrough, because you can't be walked through what hasn't been checked.

**What I can't see from here:** the repos and live pages. So I haven't verified any claim yet, and I won't guess at gaps. The gaps below are where I'd look first, from what you've told me.

**Likely gaps, to check, not findings:**
- "On npm" (ccwatts): needs a registry check logged, not just a publish.
- Demos on sample data (Charlie, Crew Clock, Role Radar): the label must say sample, and "works with" lines must not imply live sources.
- Agent claims (staff-pm, qa-tdd and the rest): numbers must match the scorecard and run logs.
- Hearth: beta started Nov 22, so say merged, deployed and checked as three separate states.

**Plan:** inventory every claim, check each against a log, score or live page, rank the gaps, then one short page per product on what's built, sample-only, live and untested. Roughly 4 sessions, about an hour each. I cut new features and copy rewrites until gaps are ranked.

**Next step:** staff-pm starts the inventory in your next session on the portfolio; qa-tdd writes the failing checks first. Nothing for you tonight.

Checks: all 3 passed
tool: agent-guard kill staff-pm | ok | exit 0
tool: check-spec | ok | exit 0
tool: spec-lint | ok | exit 0
waivers: 1

```spec
verdict: ready
bet: Chase, a recruiter-facing PM, has to believe every public claim is backed by a log, score or live check; it worked when each portfolio claim has an evidence row and no row reads unverified
step: M1.1 | Claims inventory: list every claim on the portfolio, each product card and each agent description, one row per claim with source and status (verified, partly, unverified) | register has a row for every claim and zero unlisted | 1 session
step: M1.2 | Evidence check: match each row to a run log, score, test result or live page check; mark gaps | every row says verified, partly or unverified with the evidence named | 1 session
step: M1.3 | Gap list for Chase: rank gaps P0 to P2, with the fix or the wording cut for each | gaps ranked, each with an owner and a lane | 0.5 session
step: M1.4 | Walkthrough: one short page per product covering what is built, what is only sample data, what is live, and what is untested | Chase can say for each product what is merged, deployed and checked | 1 session
criterion: CLAIM-1 | auto | Given a register row with no evidence file named, then the check lists it as unverified and exits 1
criterion: CLAIM-2 | auto | Given a claim that says "on npm" and no release record, then it stays partly until a registry check is logged
criterion: CLAIM-3 | manual | Open each public demo page -> every number or "works with" line matches its register row, or the line is cut
criterion: CLAIM-4 | auto | Given a claim of 3 agents scored and a scorecard showing 2, then the check reports a drift of 1
criterion: CLAIM-6 | auto | Given an empty register, then the check exits 1 with "0 rows" instead of passing
criterion: CLAIM-5 | manual | Read the walkthrough for Hearth -> it shows 3 separate lines, "merged", "deployed" and "checked"
step: M1.5 | Rollback: any copy change from this audit is a PR; to undo, revert the merge commit and redeploy after Chase's go | revert tested on a branch | 0.5 session
cut: New products or features | this is an audit, not a build
cut: Rewriting portfolio copy | positioning writes copy only after gaps are ranked
risk: Claims drift again after the audit | CLAIM-4
risk: Demos on saved samples read as live results | CLAIM-3
handoff: qa-tdd | failing check for CLAIM-1, CLAIM-2 and CLAIM-4 | red for the right reason
handoff: positioning | reword or cut each partly or unverified claim | no claim without a register row
handoff: privacy-security | confirm the register and walkthrough hold no private data | no P0 or P1
```

