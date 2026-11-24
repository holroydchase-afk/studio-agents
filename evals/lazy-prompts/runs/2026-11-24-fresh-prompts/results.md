# Fresh prompts run, 2026-11-24

Five fresh lazy prompts taken from Chase's real thread starters (Nov 13 to 24), none seen in earlier runs. 3 runs per arm, one blind Opus grader per pair (15 pairs). Same context pack and rubric as before. The Staff PM file was not changed since the earlier runs.

Agent 10, plain 5 (15 pairs).

- site-golive: agent 3, plain 0
- everyone-like-hearth: agent 1, plain 2
- verify-claims: agent 1, plain 2
- user-feedback-loop: agent 3, plain 0
- full-pipeline: agent 2, plain 1

Notes:
- Graders favored the agent for explicit reuse-over-build calls, owned and sized steps, and a single clear ask. They marked it down for extra decisions, invented tool-pass claims it could not have run (check-spec, agent-memory, run logs) and trailing lint lines.
- Plain won when it was short, led with a plain warning, or respected a live-site gate the agent's plan broke (for example a portfolio merge on green).
- Both arms said they could not open repos. Several replies in both arms still asserted repo facts.
- Four of the five prompts are very short asks, so both arms had little to go on.
- Limits: model graders only, one grader per pair, same context pack, no repo access, prompts are Chase's thread starters not full tasks. No multiplier claim. Chase's spot-check from the earlier run (3 of 3 for the agent, graders agreed on 2) is the only human check so far.
- Pooled with the two earlier with-block runs (7 of 8 each), the agent arm wins 24 of 31 pairs. Fresh prompts alone are the weaker and fairer number: 10 of 15, with two prompts (everyone-like-hearth, verify-claims) going to plain 2 to 1.
