# SPEC-EVAL-PROTOCOL: a frozen, two-order, per-prompt eval method

One new tool, `tools/eval-protocol.mjs`, plus README and plan-log updates. Lane: logic. Touches nothing live.

## Why

The Nov 24 run (`evals/lazy-prompts/runs/2026-11-24-fresh-prompts/results.json`) says agent 10, plain 5 over 5 prompts x 3 runs. The benchmark of our method found these gaps:

1. One grader vote per pair, order shuffled once. Position bias is unmeasured.
2. The 15 pairs are counted as independent. They are 5 prompts, so the real n is 5.
3. Prompts and rubric can drift after seeing results. Nothing is frozen before an agent edit.
4. We cannot tell "the agent helps" from "any rules help". No plain-with-the-same-rules arm.
5. Tokens and cost are not recorded, so no cost per win.
6. Staff PM replies are judged only by a model. Four properties are checkable by code.

Bet: Chase can read one `report` and know whether an agent edit helped, without trusting a headline count. It worked when the report on a 5-prompt run says "not proven" and a 10-prompt unanimous run says "edge shown".

## Behavior

Shorthand in criteria: votes are written `AB:xyz/BA:xyz` with a=agent, p=plain, r=plain-rules, t=tie. Usage errors exit 2. Unreadable file or bad JSON exits 2.

**freeze** `node tools/eval-protocol.mjs freeze --prompts F --rubric F --out frozen.json`. Writes `{schema:1, date:"YYYY-MM-DD", prompts:{file, sha256}, rubric:{file, sha256}}`. `file` is the basename only (no full paths). **verify** `verify frozen.json` re-hashes both files from their stored location relative to the frozen.json directory; exit 0 if both match, exit 1 naming each changed or missing file.

**check-run** `check-run results.json`. Schema v2 fields: `schema:2`, `date`, `grader_model`, `agent_model`, `arms` (keys `agent`, `plain` required, `plain-rules` optional; each `{tokens}` where tokens is a number or the string "not measured"), `frozen:{prompts_sha256, rubric_sha256}` (64 hex each), `pairs[]` of `{prompt, run, arm, votes}`. `arm` is `agent` or `plain-rules` (compared against plain). `votes` has exactly 6 entries, 3 with order "AB" and 3 with order "BA"; each `{order, winner}`, winner one of agent, plain, plain-rules, tie, and if not tie or plain it must equal the pair's `arm`. A pair arm must be declared in `arms`. Exit 1 listing every problem, one per line, each naming `pairs[i]` and the field. A run with no `schema` or `schema:1` is a legacy v1 run: print "v1 run: single grader vote, no votes recorded, not validated as v2" and exit 0.

**report** `report results.json [--json]`.
- Pair verdict: arm X wins if X has at least 4 of the 6 votes and at least 2 of 3 in each order. Otherwise tie.
- Order majority: the arm with at least 2 of 3 votes in that order, else tie. Flip: a pair whose AB majority differs from its BA majority. Print flip rate as flips/pairs.
- Per prompt and arm: tally of that prompt's runs (e.g. 3-0, 2-1, with ties counted separately). Prompt outcome: arm if arm run-wins > plain run-wins, plain if fewer, tie if equal.
- Prompt-level stats per arm vs plain, prompt as the unit, tied prompts excluded: wins, losses, sign test and Wilson interval on decisive prompts, using `signP` and `wilson` imported from `tools/studio-scorecard.mjs` (not copied).
- Pair-level counts per arm (wins, losses, ties) printed with the label "pairs are not independent" and no p-value.
- Cost per win: arm tokens divided by the arm's pair-level wins when tokens is a number and wins > 0, else "not measured".
- Verdict per arm: "not proven" if fewer than 10 prompts or sign p >= 0.05; else "edge shown" when wins > losses, "arm worse" otherwise.
- v1 run: print the stored per-prompt tally as given, label it "v1: single vote, order unknown, not recomputed", flip rate "not available", verdict "not proven". Never derive pair verdicts for v1.
- `--json` prints the same fields as one JSON object on stdout.

**reply-checks** `reply-checks reply.md [--json]`. Over the file text outside fenced code blocks:
- `dated_next_step`: true if a line containing "next" (any case) also contains a YYYY-MM-DD or a month-day (Nov 26, November 26, 26 Nov).
- `asks`: count of lines that end in "?" (ignoring trailing `*`, `)`, quotes) or start (after list markers and `**`) with "Decision" or "Ask". A line meeting both counts once.
- `lint_ok_lines`: count of lines containing "lint-ok:" (should be 0 in a reply to Chase).
- `words`: whitespace-separated tokens. Exit 0 always when the file is readable.

## Fixtures

F1 (report): 5 prompts p1..p5 x 3 runs, arm agent only.
- p1 all three runs `AB:aaa/BA:aaa`.
- p2 runs 1 and 2 `AB:aaa/BA:aaa`, run 3 `AB:ppp/BA:ppp`.
- p3 run 1 `AB:aaa/BA:aaa`, runs 2 and 3 `AB:ppp/BA:ppp`.
- p4 all three `AB:aaa/BA:aaa`.
- p5 run 1 `AB:aaa/BA:ppp`, runs 2 and 3 `AB:ttt/BA:ttt`.
Tokens: agent 90000, plain 30000.

F2 (reply): five lines: `Ship the fix today.` / `Next step: Chase taps merge on 2026-11-26.` / `Decision: ship now or wait?` / `Is the copy ok?` / `lint-ok: SL-3 internal`.

```spec
verdict: ready
bet: Chase can run one report and trust or reject an agent edit; it worked when the 5-prompt F1 run prints "not proven", a 10-prompt unanimous run prints "edge shown", and every order flip is visible
lane: logic
touches: non-live
step: M1.1 | Failing tests and fixtures F1, F2, the 10-prompt and v1 fixtures for freeze, verify, check-run, report, reply-checks | EVP-1 to EVP-12 red for the right reason (no tools/eval-protocol.mjs) | 1 session
step: M1.2 | Build freeze, verify and check-run, importing nothing but node built-ins | EVP-1 to EVP-5 green 3x | 1 session
step: M1.3 | Build report with signP and wilson imported from tools/studio-scorecard.mjs, plus reply-checks | EVP-6 to EVP-12 green 3x | 1 session
step: M1.4 | Update evals/lazy-prompts/README.md, evals/stakeholder/README.md and the docs/agent-training-plan.md log | READMEs state frozen files, 3 votes per order, plain-rules arm, per-prompt reporting, v1 caveat; log has the build line | 0.5 session
criterion: EVP-1 | auto | Given freeze on a prompts file and a rubric file, then frozen.json has schema 1, a YYYY-MM-DD date, two 64-hex sha256 values and basenames only, and verify exits 0
criterion: EVP-2 | auto | Given one byte appended to the rubric after freeze, then verify exits 1 and names the rubric file only, and deleting the prompts file then also names the prompts file
criterion: EVP-3 | auto | Given a valid v2 run built from F1 with grader_model, agent_model, arms, frozen hashes and 15 pairs, then check-run exits 0 with no problem lines
criterion: EVP-4 | auto | Given a v2 run with a pair of 5 votes, a vote order "AC", a winner "bot", tokens "lots", a plain-rules winner on an agent pair and no grader_model, then check-run exits 1 and prints 6 problem lines each naming its pairs[i] or top-level field
criterion: EVP-5 | auto | Given the real 2026-11-24 results.json (no schema field), then check-run exits 0 and prints "v1 run", and report prints "not recomputed", flip rate "not available" and verdict "not proven" with the stored tally of agent 10 and plain 5
criterion: EVP-6 | auto | Given F1, then pair verdicts are agent for 9 pairs, plain for 3, tie for 3 and report --json shows pairs agent wins 9, losses 3, ties 3 under the label "pairs are not independent"
criterion: EVP-7 | auto | Given F1, then prompt tallies are p1 3-0, p2 2-1, p3 1-2, p4 3-0, p5 0-0 with 3 ties, and prompt outcomes are agent, agent, plain, agent, tie
criterion: EVP-8 | auto | Given F1, then prompt-level wins 3, losses 1, sign p 0.625, Wilson interval 0.30 to 0.95 (within 0.01), and verdict "not proven" because there are 5 prompts
criterion: EVP-9 | auto | Given F1, then flips are 1 of 15 pairs (p5 run 1: AB majority agent, BA majority plain, so tie) and the flip rate prints as 1/15
criterion: EVP-10 | auto | Given pair boundaries, then AB:aap/BA:aap gives agent (4 of 6, 2 in each order), AB:aaa/BA:app gives tie (4 of 6 but 1 in BA), AB:aaa/BA:ppp gives tie, and AB:aap/BA:ppt gives tie
criterion: EVP-11 | auto | Given 10 prompts x 1 run each all AB:aaa/BA:aaa for agent with tokens agent 100000, then sign p is 0.002, Wilson low is 0.72 (within 0.01), verdict is "edge shown", and cost per win is 10000; given 9 such prompts the verdict is "not proven"; given tokens "not measured" cost per win prints "not measured"
criterion: EVP-12 | auto | Given F2 and a reply "Next: ship Nov 27" and a reply "Next: merge soon", then F2 gives dated_next_step true, asks 2, lint_ok_lines 1, words 23; "Next: ship Nov 27" gives dated_next_step true; "Next: merge soon" gives false
cut: Cross-checking results frozen hashes against frozen.json | adds a flag beyond the four commands; check-run only validates hash format for now
cut: Agent vs plain-rules direct comparison | the question is each arm against plain; revisit if both beat plain
cut: Grading, running or scoring prompts with a model | this tool reads results only; the harness that calls graders stays as is
cut: Recomputing v1 runs | v1 has one vote and unknown order; recomputing would invent votes
cut: Rewriting the Nov 24 results.md | old runs stay valid as written
cut: Model-judged reply quality or a pass/fail on reply-checks | the four counts are facts; thresholds wait for data
cut: CI wiring | wait for one real v2 run
risk: Counting pairs as independent again in a headline | EVP-6
risk: Position bias hidden by majority rules | EVP-9
risk: Importing studio-scorecard.mjs runs its main code on import | EVP-8
risk: A v1 run misread as v2 or recomputed | EVP-5
risk: Rubric or prompts edited after seeing results | EVP-2
decision: Report verdict threshold of 10 prompts, or 10 decisive prompts | Total prompts, as asked; tied prompts only drop out of the sign test
decision: Grader cost triples (6 votes per pair); keep 3 runs per prompt | Yes for the next run, then drop to 2 runs if 10 prompts are not affordable
decision: Add a --frozen cross-check to check-run later | Yes, after the first v2 run
handoff: qa-tdd | failing tests and fixtures for EVP-1 to EVP-12 | red for the right reason, no tools/eval-protocol.mjs yet
handoff: engineer | build tools/eval-protocol.mjs and guard studio-scorecard.mjs main code behind an is-main check if its import has side effects | EVP-1 to EVP-12 green 3x
handoff: engineer | update both eval READMEs and the docs/agent-training-plan.md log | M1.4 done-when text present in each file
handoff: privacy-security | confirm frozen.json and report output carry basenames and no prompt text | no full path or message text in any output
```
