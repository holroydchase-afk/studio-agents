# Lazy-prompt eval for Staff PM

Chase's test for Staff PM (Nov 23): give plain Claude a lazy prompt of his, then give the same prompt to the agent running first, and see which output he would ship. The agent is an orchestrator that works while he doesn't, keeps work aligned to his goals and rules, and makes the output better.

- `prompts.json`: real lazy messages from Chase's project chat (verbatim), split dev or held-out.
- `context.md`: the context pack both arms get (his goals and standing rules from the repos' CLAUDE.md files). Both arms get the same pack; the agent arm also gets `plugins/studio/agents/staff-pm.md` and the tools.
- Grading: one fresh Opus grader per prompt, comparing the two replies blind to arm (order shuffled, the agent's spec block stripped) on four things: goal and rule alignment, buy or reuse or build, a dated owned next step, and effort for Chase. Winner is one of A, B or tie.
- Runs: `runs/<date>-<label>/results.json` and `results.md`, plus every reply under `reports/`.

Rules: tune only on dev prompts; score held-out once per change; report wins out of N, never a multiplier like "2-3x". Add prompts from new real asks, not written to fit the agent. Chase is the answer key: spot-check a few pairs and note where he disagrees with the grader.
