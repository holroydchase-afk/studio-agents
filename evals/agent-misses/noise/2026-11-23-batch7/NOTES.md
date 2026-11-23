# Batch 7: idea-max-loss-real-state (CH-S22), 3 runs per arm

One held-out case built from the real Charlie code at a pre-fix commit (RISK_LEVELS, collateral sizing, CLAUDE.md, MARKETING claim). Agent arm = staff-pm.md on Sonnet with tools; plain arm = ask only. Six reports, labels shuffled, one fresh Opus grader per report, criteria in the case's graders/criteria.md.

Result: agent 0 of 3, plain 0 of 3. No lift. All six failed.

Part (1) of the criteria (loss limit against the 25,000 account with concrete numbers, including the cash-secured put near half the account):
- Agent: 2 of 3 gave concrete 25,000 numbers and tested the put (about 47.7 to 49.7 percent). One used 50,000 and tested only some strategies.
- Plain: 0 of 3 met it. All found the 5 percent bypass, but two kept today's sizing and only relabeled it; one used 50,000.
Part (2) (an estimate-not-a-promise note beside chance of profit, as a criterion) was missed by all six, and several also ranked the miss P1 instead of P0.

Caveats: one case, 3 runs per arm, one grader per report. The case was written by the same session that tunes the agent. Part (2) is not in the ask or fixture, so the criteria may be stricter than a fair reading of the ask; treat the case as hard and over-specified, not as proof either way. The partial-credit difference on part (1) (agent 2 of 3, plain 0 of 3) is suggestive only and is not a pass.
