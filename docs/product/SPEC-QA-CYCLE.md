# SPEC: QA-TDD owns the build cycle (QACYC)

Chase, Nov 23: "I don't want to downgrade any from an agent. QA should manage before and after the build. You write 10 tests but post build 5 more should be written and 6 bugs fixed. It also should be self improving and giving me ideas to make it better. I also want autonomous hardening sessions." Also: Claude does not write scalable code or keep a test-and-merge procedure consistently on its own (it takes the 2-second path, skips steps).

Scope note: the earlier QA-TDD evals only measured bug detection (agent 20/20, plain 19/20 on one set). That is a different job. This spec defines the job Chase actually wants and how to measure it.

## Verdict
Build. qa-tdd stays one agent with a tool loop; the cycle ledger is a tool it calls, not a script that replaces it.

## The cycle (three phases, one ledger)
1. **Pre-build (`[qa:pre]`).** From the spec's acceptance criteria write failing tests, ID in each title, and keep the red output. Count is at least the number of criteria.
2. **Post-build (`[qa:post]`).** After the engineer builds, read the diff and write more tests from what the build revealed: edges and boundaries, the slower or less scalable path chosen, error and empty states, privacy both directions. Each new test that fails is a bug: commit the red test (`[qa:red BUG-n]`), then fix it in a separate commit (`[qa:fix BUG-n]`).
3. **Procedure gate.** Before any PR is ready, the same steps every time: red recorded, suites 3x via `qa-run3`, `qa` block valid, run log valid, HANDOFF.md updated, ledger verified. Merge steps (own PRs on green, oldest first, merge commit, live-demo merges wait for Chase) are printed from the same list.

## Fix policy (changes "never fix product code")
qa-tdd may fix a bug only after its red test is committed, in a separate commit, and the fix commit must not touch any test file. This keeps the independence the old rule protected: the test cannot be bent to pass.

## Self-improvement
Every miss (a bug found later by someone else, a flaky it passed, a step it skipped) is logged with `qa-cycle miss add`. `qa-cycle ideas` groups misses by pattern and prints improvement ideas for Chase to accept or reject; nothing changes by itself.

## Autonomous hardening sessions
A scheduled run on one product repo: branch `qa-hardening/<date>`, one PR, caps on new tests, fixes and cost, kill switch honored, tests-first order verified by `qa-cycle verify`. Runbook: `docs/qa-hardening.md`. Turning on a schedule needs Chase's go and a repo choice; this PR does not schedule anything.

## Acceptance criteria (tools/qa-cycle.mjs, plain Node, no network)
- QACYC-1 `ledger --base REF` reads git history REF..HEAD and counts tests added per commit tag: pre, post; lists red bug ids and fixed bug ids. Counts added test declarations (`test(`, `it(`, `def test_`, `func Test`) in test files only; a removed test is not subtracted from the totals but is reported as `removed`.
- QACYC-2 `verify` exits 1 when: a fix has no earlier red with the same id; a fix commit touches a test file; a red commit touches a non-test file; a red commit adds no test; an id is fixed twice. Exit 0 otherwise.
- QACYC-3 `verify --min-post N --min-fixed M` exits 1 when post-build tests < N or fixes < M ("write 5 more, fix 6").
- QACYC-4 `gate --base REF` runs verify plus: HANDOFF.md changed since REF, and when `--qa-report FILE` / `--run-log FILE` are given, they pass check-qa-report and check-agent-run. Prints the manual merge steps. Exit 1 on any failure.
- QACYC-5 `miss add --pattern P --text T [--root]` appends one JSON line to `evals/agent-misses/qa-tdd-inbox.jsonl`; refuses empty text or pattern; no prompt content or full paths. `ideas` groups by pattern, prints those with 2 or more misses, with count and example text; exit 0 with "no ideas yet" when none.
- QACYC-6 `harden-check --base REF [--max-tests N] [--max-fixes N] [--branch-prefix qa-hardening/]` exits 1 when the branch name has the wrong prefix, new tests or fixes exceed caps, any non-test non-fix change exists, or `.claude/agents.off` / `.claude/qa-tdd.off` exists.
- QACYC-7 `score DIR` reads `DIR/*/result.json` ({arm, case, seconds, ledger, grader}) and prints per-arm means and n for: tests pre, tests post, bugs found, bugs fixed, grader edge_cases, code_quality, perf_path, procedure (0 to 5), seconds. Prints `n < 5: do not claim` when an arm has fewer than 5 runs for a case family. Exit 2 on malformed input.
- Every subcommand takes `--json`; usage errors exit 2; unreadable repo exits 2.
- Edges: empty range (no commits) reports zeros and verify passes; commit with no tag is ignored but reported as `untagged` count; multiple ids in one tag rejected.

## Eval (outcome based; not run in this PR)
Same feature prompt to plain Claude and Claude plus qa-tdd, 5 runs per arm per case, 3 feature cases. Both arms work in a fixture repo with the same starting code. A fresh Opus grader, blind to arm, scores the final repo 0 to 5 on edge_cases, code_quality, perf_path and procedure (rubric in `evals/qa-build-cycle/README.md`); the ledger gives tests pre, post, bugs found, fixed. Claim only what `qa-cycle score` prints.

## Cuts
No schedule created here. No CI API loop (no paid API route, Chase Nov 21). No mutation-testing reviewer team yet.

## Risks
Counting test declarations by regex can be gamed with empty tests; the grader scores test quality, and the red-test rule means a bug test must fail first. Commit tags are a convention an agent can skip; `gate` fails when untagged commits touch product code.
