# Method

**Question.** On the same task, is the agent's reply better than plain Claude's, by a margin that survives chance?

**Arms.** An arm is one version being tested. `agent` (yours) and `plain` (plain Claude, the baseline) are required. Optional arms: `plain-rules` (plain Claude given the same rules as a prompt, to tell "any rules help" from "this design helps"), `cross` (the agent run by a different model), `orchestrated` (several agents coordinated) and `ablate:<part>` (the agent with one part removed). Every extra arm is compared with `plain` only.

**Runs.** Each task runs several times per arm. Runs of one task are not independent, so they feed one per-task outcome.

**Judge.** For every pair the judge sees two replies labeled A and B with no arm names. The pair is graded in both orders, three votes each. A pair is a win only with at least four of six votes for it and at least two in each order (for example 2 votes in one order and 2 in the other is a win; 4 votes in one order and 0 in the other is not). Otherwise it is a tie or a loss. The share of pairs where the two orders disagree is reported as the flip rate.

**Statistics.** Each task gets an outcome (agent, plain or tie). The exact two-sided sign test and a Wilson 95% interval run over tasks, ties excluded. Under 10 tasks, or a sign-test p of 0.05 or more, the verdict is "not proven".

**Judge check.** A human marks pairs blind (A, B or tie). Raw agreement and Cohen's kappa compare the human with the judge. Claims need at least 20 marked pairs and kappa of at least 0.6.

**Dev and held-out.** Tune on dev tasks. The held-out set is emitted once per change id.

**Cost.** Tokens and tool calls per arm are logged when the runner supplies them, and "not measured" otherwise. Cost per win is reported only when tokens exist.

**Ledger.** A held-out change id can be emitted once for generation and once for grading. Missing results can be reissued, and the reissue is logged.
