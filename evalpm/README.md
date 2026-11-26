# EvalPM

**Does your agent beat plain Claude on the same task, or does it only feel better?**

For anyone building a Claude agent, prompt or skill who wants evidence that it helps. EvalPM gives the same tasks to your agent and to plain Claude, has a blind judge pick the better reply in both orders, and reports per task with the uncertainty showing. It is plain Node (20 or later) with no dependencies, and the demo needs no API key.

```
git clone https://github.com/holroydchase-afk/studio-agents
cd studio-agents
node evalpm/evalpm.mjs demo
```

EvalPM lives in the `evalpm/` folder of that repo and calls the shared tool in [`tools/`](../tools/eval-pipeline.mjs). The demo runs a whole eval offline on invented data (the first and last lines say `SAMPLE DATA`). An excerpt of what it prints:

```
arm agent vs plain: wins 17, losses 4
  by prompt: 6 wins, 1 loss, 1 tied of 8 prompts
  sign test p = 0.125 (tied prompts excluded)
  Wilson 95% interval on prompt wins: 0.49 to 0.97
  verdict: not proven
```

Eight tasks, six won, and the verdict is still "not proven". Six wins out of seven decided tasks would happen by chance about one time in eight (p = 0.125), and the interval says the true win rate could be anywhere from 49 to 97 percent. The tool is working as intended.

## How it works

```
 tasks (frozen) ---> your agent  ---\
                     plain Claude ----> blind judge: A/B, then B/A, three votes each
                                                   |
                                                   v
                     a pair counts as a win only with enough votes in both orders
                                                   |
                                                   v
          per-task tally --> sign test + Wilson interval --> "not proven" or "edge shown"
                                                   |
                                                   v
          a human marks 20 pairs blind --> agreement and kappa --> claims allowed or blocked
```

Terms are defined in [METHOD.md](METHOD.md). The tool never calls a model: it writes one job file per step, you run each job however you like (one fresh session per job works well), and `collect` checks what came back.

## What it refuses to do

- **No verdict under 10 tasks.** Fewer tasks always reads "not proven", whatever the tally.
- **The task is the unit.** Runs of the same task are not independent, so the sign test and the interval count tasks, not pairs.
- **Both orders.** Judges lean toward whichever reply comes first. A pair counts as a win only with at least 4 of 6 votes and at least 2 votes in each order, and the report shows how often the two orders disagreed.
- **No claim before the judge is checked.** `report --claim` exits 1 until a human has marked 20 blind pairs, the judge agrees with them (Cohen's kappa of at least 0.6) and some run shows an edge.
- **Frozen inputs, one-shot held-out set.** Tasks and rubric are hashed before an edit. A held-out change id can be used once for generation and once for grading; a second try is refused.

More rules are in [METHOD.md](METHOD.md). Reports show counts, intervals and tokens per win, never "Nx better".

## Commands

`node evalpm/evalpm.mjs` with no arguments prints this list.

| Command | What it does |
|---|---|
| `demo` | Run the sample eval offline and print the report |
| `init` | Write a starter suite config |
| `check` | Validate a suite config |
| `jobs` | Write the generation or grading jobs for a phase |
| `collect` | Validate returned results and build the run |
| `report` | Per-task report; `--claim` is blocked until the judge is calibrated |
| `calibrate` | Agreement and kappa against a human's marks |

Run `node tools/eval-pipeline.mjs` for the full tool's usage line (it adds `freeze`, `verify`, `sheet`, `key-add`, `status`, `import-v1` and `ci-check`).

## Real runs from this studio (v1 protocol, not recomputed)

These are the studio's own earlier runs, made before EvalPM's two-order protocol and not produced by `evalpm` commands. They are small and inconclusive, and they are here so you can see what small, unproven results look like. Details are in [docs/agent-training-plan.md](../docs/agent-training-plan.md).

| Run | What it was | Result | How to read it |
|---|---|---|---|
| `evals/lazy-prompts/runs/2026-11-24-fresh-prompts` | The studio's planning agent vs plain Claude on 5 short prompts, 3 paired runs each, one blind grader vote per pair | agent 10, plain 5 pairs (agent won 3 prompts, plain won 2) | v1: single vote, order unknown. Not proven. |
| `evals/agent-misses/runs/2026-11-22-batch6-heldout` | The same agent vs plain on 5 held-out cases mined from real misses | agent passed 0 of 5, plain 0 of 5 | Both arms failed every case against written criteria. Five cases is under the 10-case minimum, so it shows nothing either way. |

No v2 run (both orders, three votes) has been completed, and no human has finished the 20 marks, so **nothing is proven** and no claim about the judge's accuracy is made. See [LIMITS.md](LIMITS.md) before quoting any number.

## Try it on your own agent

1. `node evalpm/evalpm.mjs init --agent my-agent --kind pairwise` writes `my-agent.json`. Add your tasks and a rubric, then run `node evalpm/evalpm.mjs check my-agent.json`.
2. Write the jobs for the dev phase: `node evalpm/evalpm.mjs jobs --suite my-agent.json --phase dev --change first --stage gen`. Run each job file as one fresh Claude session and save the reply as a result file, then run `collect --run <run folder>`.
3. Do the same for the grading stage, then `report --suite my-agent.json`. Tune on dev tasks only and spend the held-out set once.
4. Mark 20 pairs blind and run `calibrate` before you say anything about the result.

The studio's own suites are in `evals/suites/`; see [examples/studio-agents.md](examples/studio-agents.md).

## License

MIT, see [LICENSE](LICENSE).
