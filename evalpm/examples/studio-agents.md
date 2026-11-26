# Worked example: the studio's own agents

This kit was extracted from the studio that built it. The studio's suites for its planning, QA, UX and stakeholder agents live in `evals/suites/` with their tasks, and the cases they came from are in `evals/agent-misses/` and `evals/lazy-prompts/`. They are an example of how to turn real misses into tasks, not part of the kit.

Run one with `node tools/eval-pipeline.mjs report --suite evals/suites/<name>.json` once a run exists. See `plugins/studio/skills/eval-runbook/SKILL.md` for the run steps.
