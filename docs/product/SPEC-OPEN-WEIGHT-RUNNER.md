# Spec: provider-agnostic agent runner (first PR)

Issue #172 (Chase approved Nov 25). Code: `OWR`. Status: built (tools/agent-runner.mjs, tests/agent-runner.test.mjs OWR-1..21 green); OWR-22 not run.

## The bet
The eval pipeline can only run agents as Claude Code subagents (`docs/agent-harness.md`, gap 3: "Nothing enforces a cost cap *inside* a running tool loop"). To test whether an open-weight model can do a studio agent's job, we need a loop that runs one agent task on any hosted OpenAI-compatible chat-completions API, within a dollar cap, and leaves a log the existing checker accepts. Proof it worked: a fake-provider run produces a transcript and a run log that `check-agent-run` passes, and no test touches the network.

Arms (config only, never code): Qwen3.6-35B-A3B and Llama 4 Maverick (open weights); optionally Qwen4-Max, labelled `closed-api`. Opus stays the blind grader and shipped agents stay on Claude. No Raspberry Pi.

## Scope of this PR
`tools/agent-runner.mjs` (plain Node, zero dependencies), `tests/agent-runner.test.mjs`, a minimal `check-agent-run` extension, one `docs/agent-harness.md` row, `evals/runner/example-config.json` and `evals/runner/example-prices.json` (made-up numbers, labelled example). Everything else is a follow-up (end).

Usage: `node tools/agent-runner.mjs --config FILE --task FILE --out DIR [--tools FILE.mjs]`. Exit 0 run finished (any stop reason except config or provider failure), 1 run failed (`failed` verdict), 2 usage or config error (no call made).

Export: `runAgent({config, prices, task, tools, transport, sleep, now}) -> {stop, steps, usage, cost_usd, retries, transcript}`. `transport(req) -> Promise<{status, body}>` defaults to a thin wrapper over global `fetch`. `sleep` defaults to a real delay and is injected in tests.

## Config (nothing hard-coded)
`config.json`: `agent` (kebab name), `product`, `provider` (name), `weights` (`open` or `closed-api`), `base_url`, `api_key_env` (the NAME of an env var), `model`, `prices_file`, `max_steps`, `max_cost_usd`, `system_prompt_file`, `tools` (name, description, JSON-schema parameters). `prices.json`: per model `input_per_mtok`, `output_per_mtok`, `source`, `as_of` (same units and source rule as `stamp-run`).

## Acceptance criteria
Format: ID, type, Given/When/Then. All `auto` unless marked; qa-tdd writes each as a failing test first.

**Loop**
- OWR-1 (auto): Given a fake transport replying with a tool call then a final text, when the run starts, then the tool runs once, its result is sent back as a `tool` message, the loop ends with stop `done`, and every request is an OpenAI chat-completions body (`model`, `messages`, `tools`).
- OWR-2 (auto): Given a model that always asks for another tool call, when `max_steps` is 5, then exactly 5 requests are made and stop is `step-limit`.
- OWR-3 (auto): Given one response with two tool calls, when processed, then both run in order and both results are returned before the next request.
- OWR-4 (auto): Given a tool that throws, then the error text (no stack, no paths) goes back to the model as the tool result and the run continues.

**Cost cap**
- OWR-5 (auto): Given prices of $1/Mtok in and $2/Mtok out and usage on each response, then `cost_usd` equals the sum over responses, to 4 decimals, matching a hand-computed value.
- OWR-6 (auto): Given `max_cost_usd` 0.01 and a response that takes the total past it, then no further request is made, tool calls in that response are not run, and stop is `cost-cap`.
- OWR-7 (auto): Given a response with no `usage`, then the run stops `no-usage` (never prices a call as 0).
- OWR-8 (auto): Given a model id missing from the prices file, or prices without `source` and `as_of`, then exit 2 before any request.

**Schema validation and retries**
- OWR-9 (auto): Given a tool call whose arguments are not valid JSON or break the tool's schema (missing required, wrong type, extra property, bad enum), then the tool does not run and the model gets a tool message naming the field (never echoing the value) and is asked again.
- OWR-10 (auto): Given a second invalid call in the same step, then the run stops `invalid-args`; only one schema retry per step.
- OWR-11 (auto): Given a transport reply of 429 or 5xx, then it is retried up to 2 times with the injected `sleep`; 4xx other than 429 is not retried and stops the run `failed`.
- OWR-12 (auto): Given any retry, then it is counted in `retries` (schema plus transport) and each has a `retry` record in the transcript with its kind.

**Transcript**
- OWR-13 (auto): Given a finished run, then `transcript.jsonl` has one valid JSON object per line, in order, with `step`, `kind` (`request`, `response`, `tool_result`, `retry`, `stop`), the model usage, and the running cost.
- OWR-14 (auto): Given an `api_key_env` value of a known fake key, then the key and the `Authorization` header appear in no transcript line, run log, error or stdout.
- OWR-15 (auto): Given the transcript is written, then it goes only to `--out`; the tool never writes under the repo by default.

**Run log**
- OWR-16 (auto): Given a finished run, then `run.md` has one ```agentrun block with `agent`, `product`, `tier: advisory`, `model` (the agent model), `provider`, `weights`, `tokens` (input plus output), `cost_usd`, `retries`, `verdict` (`done`, `step-limit`, `cost-cap`, `no-usage`, `invalid-args`, `failed`), `findings: 0`, `p0: 0`, `escalated: no`.
- OWR-17 (auto): Given each stop reason from OWR-1, 2, 6, 7, 10 and 11, then `checkAgentRun` returns no errors for the written `run.md`. QA-R1: this holds for runner-named agents such as `open-weight-staff-pm`. The fixed verdict lists of `qa-tdd`, `staff-pm` and `ux-reviewer` reject `done`, `step-limit` and the rest, so the runner exits 2 if `config.agent` is one of those three.
- OWR-18 (auto): Given `check-agent-run`, then `provider:` (one token) and `weights:` (`open` or `closed-api`) are accepted optional keys, rejected when empty or invalid, and the existing 100+ tests still pass unchanged.
- OWR-19 (auto): Given the run log, then the grader model is not in it; the caller adds a `tool: grader | ok | <model>` line, as the UX agent already does.

**No network, no secrets**
- OWR-20 (auto): Given the test suite, then a global `fetch` stub that throws proves no test reaches the network; the default transport is only exercised against it.
- OWR-21 (auto): Given the repo, then `tests/check.sh` finds no key pattern or literal key in the config examples, and a config with a `api_key` field (not `api_key_env`) exits 2.
- OWR-27 (auto, QA-R4): Given a config string (product, model, ...) with a control character or line break, then exit 2 before any request, so run.md can't gain forged lines.
- OWR-28 (auto, QA-R5): Given a provider reply with a null or non-object entry in `tool_calls`, then the run ends `failed` with run.md and transcript written, not a crash.
- OWR-29 (auto, QA-R6): Given `--out/run.md` or `transcript.jsonl` is a symlink (or not a regular file), then exit 2 before any request, and writes use O_NOFOLLOW; nothing is written outside `--out`.
- PS-R1 (auto): Given `base_url` that is not https, has credentials, or is an IP literal, localhost, `.local` or private/link-local host, or an `api_key_env` that does not end in `_API_KEY` or is `ANTHROPIC_API_KEY`, then exit 2 before any request; the host and the env var name (never the key) are printed to stderr before the first request.
- PS-R2 (auto): Given the default transport, then fetch gets `redirect: "error"` and `AbortSignal.timeout` (default 120 s, `timeout_ms` in the config); a timeout ends the run `failed` with logs written.
- PS-R3 (auto): Given usage, `--help` and the harness doc row, then a "What leaves the machine" note says the system prompt, task, tool results and history go to the provider host, the transcript and run.md stay local, and only synthetic or public tasks are used until vendor terms are cited with date and URL.
- PS-R4 (auto): Given `--out` inside a git work tree, then exit 2 before any request unless `--allow-repo-out`, which writes a `.gitignore` of `*` into `--out`.
- PS-R6 (auto): Given `docs/agent-harness.md`, then the runner row cites `tools/agent-runner.mjs` and the synced command `node scripts/agent-runner.mjs`.
- PS-R7 (auto): Given an `api_key_env` that fails the allowed pattern, then the error does not echo it.
- OWR-22 (manual): Given Chase's go and a real key in his own environment, one live call on the cheapest model with a 10-cent cap returns `done` and a log that passes the checker. Not run by CI; first real use of #172.

## Measure
Signals for the bet (after this PR, not part of it): a fake-provider run passes the checker (OWR-17); tokens and cost in the log equal the hand sum (OWR-5); first live run (OWR-22) stays under its cap. Stop: if OWR-22 shows the provider's `usage` is missing or unreliable, stop and fix pricing before any eval arm runs.

## Biggest risk
The runner measures its own tokens, so cost is provider-reported, not independent like `stamp-run`. Handled by follow-up 1 and by saying so: no cost claim from an unstamped log.

## Not now (follow-ups, each its own PR)
1. `stamp-run` adapter: read the runner's JSONL transcript instead of a Claude Code subagent transcript, so the caller stamps tokens and cost.
2. Grader script: packaged blind Opus grader (harness gap 1) that reads `criteria.md` plus a saved report and answers PASS or FAIL.
3. Eval-pipeline wiring: `run-gated` calls the runner, arm names for the open-weight models, results into `collect`.
4. Streaming, parallel tool calls, provider-specific quirks (Maverick and Qwen tool-call formats), prompt caching.
5. Live run (OWR-22) and the first Staff PM comparison, after Chase picks the budget.

## Decisions for Chase
- Qwen4-Max labelled `closed-api`: recommend yes, so it is never reported as open weights.
- Per-run default cap `max_cost_usd`: recommend $0.25 until OWR-22 shows real cost.
