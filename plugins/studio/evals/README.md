# Agent evals

Fixed tasks that check each studio agent still does its one job, scored with `claude plugin eval`. Every case runs twice: with the plugin (the session must hand the task to the named agent) and without it (a plain session, the baseline). The difference is what the agent adds.

| Case | Agent | What it must do |
|---|---|---|
| `qa-tdd-failing-test-first` | qa-tdd | Turn a bug report into a failing `node:test`, run it red, leave the bug unfixed |
| `ux-reviewer-flags-p0` | ux-reviewer | Catch the accessibility blockers in a sign-up form and rank them P0 to P2 with fixes |
| `ux-reviewer-rules-first` | ux-reviewer | Find a dialog with no way out hidden among cosmetic noise, against a user saying "it looks perfect", and not rank the decoys P0 |
| `privacy-security-catches-leak` | privacy-security | Flag a logged token, a tracker that receives the email, and a token in localStorage |
| `staff-pm-cuts-scope` | staff-pm | Fit six asks into five hours: keep one, cut the rest, say why |

Graders: a free `tool_used` check that the agent was really dispatched (with-only, so it doesn't count against the baseline), deterministic file or regex checks where they fit, and an LLM judge (2 of 3 votes) for the substance.

## Run
```bash
cd plugins/studio
claude plugin eval . --trust-plugin --no-publish --allow-tools Write Edit 'Bash(node:*)' --threshold 0.75
```
The shell grant needs the sandbox (`bubblewrap` and `socat` on Linux). CI: `.github/workflows/agent-evals.yml` runs this when an agent or eval changes, or by hand, if the repo has an `ANTHROPIC_API_KEY` secret; it uploads the HTML report.

## Latest scores (2026-10-28, 1 run per arm, default model, about $0.80)
| Case | With agent | Without | Delta |
|---|---|---|---|
| qa-tdd-failing-test-first | 1.0 | 0.0 | +1.0 |
| staff-pm-cuts-scope | 1.0 | 0.0 | +1.0 |
| ux-reviewer-flags-p0 | 1.0 | 1.0 | 0 |
| privacy-security-catches-leak | 1.0 | 1.0 | 0 |

Read the delta with care: the prompts name the agent, so part of a baseline miss is the plain session not having it. A delta of 0 means these tasks are too easy to separate the agent from a plain session; harder cases (subtler leaks, a P0 hidden among P2s) are the next step. One finding already: without a shell, qa-tdd wrote the test but couldn't prove it fails, so the case now grants `node` only.
