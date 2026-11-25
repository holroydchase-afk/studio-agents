# Lazy-prompt eval for Staff PM

Chase's test for Staff PM (Nov 23): give plain Claude a lazy prompt of his, then give the same prompt to the agent running first, and see which output he would ship. The agent is an orchestrator that works while he doesn't, keeps work aligned to his goals and rules, and makes the output better.

- `prompts.json`: real lazy messages from Chase's project chat (verbatim), split dev or held-out.
- `context.md`: the context pack both arms get (his goals and standing rules from the repos' CLAUDE.md files). Both arms get the same pack; the agent arm also gets `plugins/studio/agents/staff-pm.md` and the tools.
- Grading: one fresh Opus grader per prompt, comparing the two replies blind to arm (order shuffled, the agent's spec block stripped) on four things: goal and rule alignment, buy or reuse or build, a dated owned next step, and effort for Chase. Winner is one of A, B or tie.
- Runs: `runs/<date>-<label>/results.json` and `results.md`, plus every reply under `reports/`.

Rules: tune only on dev prompts; score held-out once per change; report wins out of N, never a multiplier like "2-3x". Add prompts from new real asks, not written to fit the agent. Chase is the answer key: spot-check a few pairs and note where he disagrees with the grader.

## Protocol v2 (Nov 25, `tools/eval-protocol.mjs`)
Runs from here on follow the v2 protocol; earlier runs stay v1 (one vote, order unknown) and are never recomputed.
- **Freeze first.** `eval-protocol.mjs freeze --prompts prompts.json --rubric <rubric file> --out frozen.json` before any agent edit. A held-out set or rubric changed afterwards fails `verify`.
- **Three arms.** `agent`, `plain`, and `plain-rules` (plain Claude given the same rules as a prompt). The agent's win only counts as the design helping if it also beats `plain-rules`.
- **Six votes per pair.** Three grader votes with the agent first and three with it second. A pair is a win only with at least 4 of 6 votes and at least 2 in each order; otherwise a tie. The flip rate (orders disagreeing) is reported.
- **Per prompt, not per pair.** The prompt is the unit; sign test and Wilson interval use prompts. Fewer than 10 prompts is "not proven".
- **Record** grader and agent model ids and tokens per arm; check the file with `check-run`, read it with `report`.
- **Code checks.** `reply-checks` scores each reply for a dated next step, asks, leftover `lint-ok` lines and words, so the judge only decides what code cannot.
- Chase's marks on 20 blind pairs measure grader to human agreement (raw agreement and kappa); no public claim before that.

## Suite config
The shared pipeline runs this eval from `evals/suites/staff-pm.json` (and `evals/suites/staff-pm.cases.json` for the cases). Note that old runs stay v1: they are recorded with `import-v1` and never recomputed. See `plugins/studio/skills/eval-runbook`.
