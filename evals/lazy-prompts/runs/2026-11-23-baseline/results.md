# Lazy-prompt eval, baseline (2026-11-23)

Eight real lazy messages from Chase (project chat, Oct 20 to 21), each answered by plain Claude and by the Staff PM agent, both given the same context pack. One Opus grader per prompt compared the two replies blind (order shuffled, the agent's spec block stripped) on goal and rule alignment, buy or reuse or build, dated owned next step, and effort for Chase.

| Split | Agent wins | Plain wins |
|---|---|---|
| Dev (4) | 2 | 2 |
| Held-out (4) | 2 | 2 |
| All (8) | 4 | 4 |

No lift: 4 to 4. Agent won linkedin-drip, shifts-and-ratio, licenses-scan, inbox-merge-tokens. Plain won agent-for-orchestration, role-radar-tokens, hearth-on-portfolio, convert-old-projects.

What the graders saw:
- The agent made stronger reuse-over-build calls (positioning not a new agent, focus-coach plus a rules file, existing orchestrator) and protected the job search more.
- The agent lost on effort for Chase: several replies asked two or three decisions, and left spec-lint waiver lines (`lint-ok`) in the reply.
- Neither arm gave a dated next step in most replies. This is what the job, done test and stop rule block (added after this run) targets, so this run is the "before".
- Both arms invented small facts about his repos, because neither could open them.

Limits: 8 prompts, one run per arm, one grader per prompt; neither arm could read the real repos (a context pack only); the prompts are from Oct 20 to 21 but the context is late November; I chose the prompts and the rubric. Held-out was seen before the agent change, so a re-run on it is not a clean held-out. Not a basis for a public claim.
