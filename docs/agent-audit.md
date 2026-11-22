# Agent audit (2026-11-22)

A real agent has a goal, uses tools, makes decisions over several steps, and checks its own work. A skill is a reusable procedure or checklist with no autonomy. A rule is reference text.

| Name | Where | Verdict | Why | Proof today |
|---|---|---|---|---|
| `qa-tdd` | agents | Agent | Writes and runs tests, reruns 3x, files findings; its ```qa block is checked by `check-qa-report` | 12 evals (4 behavior, 8 recall). Recall 8 of 8 with the agent, 0 of 8 plain (plain finds the gap but skips the red test) |
| `ux-reviewer` | agents | Agent | Runs `ux-shots` and `ux-rules`, shoots phone and laptop, scores 0-10; ```findings block checked by `check-findings` | 14 recall cases (12 of 14 with the agent, Oct 31), baseline 8 of 11 on fresh human-miss cases (PR 71) |
| `story-keeper` | agents | Agent | Decides if a moment is worth an entry, writes it, never duplicates; ```story block checked by `check-story-entry` | 4 behavior evals; README results line still says "not run yet" |
| `privacy-security` | agents | Agent | Greps code and config, names the standard per finding | 1 eval (`catches-leak`); no baseline gap |
| `architect` | agents | Agent (thin proof) | Reviews stack-crossing changes, runs the weekly drift sweep with Bash | None |
| `orchestrator` | agents | Agent (studio only) | Reads every repo's HANDOFF and PRs, writes the digest, flags stalls | None |
| `staff-pm` | agents | Agent, light | Decides scope and writes specs, but mostly reads and writes docs | 1 eval (`cuts-scope`) |
| `engineer` | agents | Agent, light | Builds, runs the suite, updates HANDOFF; 7 rules, no self-check output | None |
| `positioning` | agents | Borderline: closer to a skill | Copy and claims partner; no verification loop, overlaps the `story-and-positioning` skill | None. Candidate to demote next |
| `release-captain` | Chase's account and ccwatts only | Agent | Runs `check:release`, packs and installs the tarball, never publishes | None. Not in this repo yet |
| `grandparent-ux` | Hearth only | Persona rubric | A persona and rules layered on `ux-reviewer` | None |
| `focus-coach` | was agents | **Not an agent** | Reads one file and emits two lines. Moved: the `focus-check` skill already holds all of it | n/a |
| `review-rounds`, `ux-review`, `staff-pm`, `story-and-positioning`, `focus-check`, `digest`, `night-prep`, `onboard`, `recruiter-review` | skills | Skill | Procedures with no autonomy. `ux-review`, `staff-pm`, `story-and-positioning`, `focus-check` mirror an agent for chats with no repo | n/a |
| `docs/design-rules.md`, `docs/studio-standard.md`, `docs/session-rules.md` | docs | Rule | Reference text the agents read | n/a |

What a product hiring manager wants for each agent: an eval score with a plain-session baseline, before and after examples from a real product, and a sample run log. Only qa-tdd and ux-reviewer have the first today; none ship a curated sample run.

## Raising ux-reviewer to a real agent
Today it reviews what it is handed. To act on its own it needs four things, in this order:
1. **Gather its own evidence.** Run the app (demo or sample data), capture every flow at phone and laptop width, light and dark, with the capture scripts from `evals/ux-baseline-2026-11-19` (PR 70), then review. Smallest first step, one PR: a `ux-capture` tool in `tools/` that takes a product URL and a flow list and writes the shots plus `report.json`, and ux-reviewer's first step becomes "run it", with a test on a fixture page.
2. **Prioritize and act.** Rank screens by risk (sign-in, first run, anything a grandparent touches), file an issue or draft the fix per P0/P1, then re-shoot to confirm.
3. **Stop and escalate.** A pass bar (8/10, no P0) and a rule to hand Chase a one-word question when unsure instead of guessing.
4. **Learn.** A run log per review and every human-found miss added as an eval case (the "UX eval miss" issues feed PR 71's cases).
Evals are owned by the "Raise the UX agent from 7 to 9" thread: step 1 here only adds the capture tool.
