# Spec: UX agent build eval (plain Claude vs the UX agent)

Chase, Nov 23: "I'm training a UX agent that can deliver clean HQ pixel perfect designs that may not be exotic but would be generally accepted by the masses, allowing me to focus on the problems we are solving. Claude is great at building v1 UI/UX with a fair bit of my assistance; you have to provide a lot of feedback and examples to get close to my taste. So evals are closer to: given a prompt, what does plain Claude produce vs what the UX agent produces, which is higher."

The bet: the UX agent's first build is closer to Chase's taste than plain Claude's, and needs fewer feedback rounds. The agent stays a tool-using agent (Read, Grep, Glob, Write, Bash, WebSearch, WebFetch); nothing here turns it into a prompt-only call. The critique-recall set (24 real, improved and after cases, README "Fresh human-miss cases") stays as a secondary check: it must not regress, and it does not count toward the build claim.

Status: spec only. No arm has been run. Test IDs are `UXB-n`, type `auto` or `manual`. qa-tdd writes the failing tests first.

## 1. Arms
- **UXB-1 (auto).** Given one build prompt, when each arm runs, then both receive the identical prompt text and both use model Sonnet. The harness refuses to run if the two prompt hashes differ or either model is not Sonnet.
- **UXB-2 (auto).** Given an arm's output, when it is collected, then it is one self-contained HTML file (no `http:` or `https:` or protocol-relative URL in any `src`, `srcset`, `href`, `<link>`, `@import` or CSS `url()`; `data:` URIs and `href="#..."` are allowed; fonts are system or inlined) and otherwise the run gets status `error` ("not a score") and is excluded.
- **UXB-3 (auto).** Given a valid HTML file, when Playwright renders it, then it writes `390x844` and `1280x800` full-page PNGs, with no edit by a person or the harness between arm output and screenshot. A page that throws a console error is rendered anyway and the error count is logged.
- Plain arm: a general-purpose Claude with no role file. UX arm: the installed `ux-reviewer` instructions plus its tools, told to build rather than review.

## 2. Prompt set
- **UXB-4 (auto).** Given `evals/ux-build/prompts.json`, then it holds at least 8 prompts covering app home, list, settings, form, landing, dashboard, empty state and dialog (one each at minimum), each with `id`, `type`, `split` and `text`.
- **UXB-5 (auto).** Given the split, then exactly 3 prompts are `heldout` and the rest `dev`. Held-out prompts are scored once per agent change; the harness records a change id and refuses a second held-out run for the same id.
- **UXB-6 (auto).** Given any prompt, then it states the product, the user and the job in plain words and contains none of these whole words, matched case-insensitively (not inside longer words): CLEAN, whitespace, grid, palette, contrast, hierarchy, polished, modern, "pixel perfect", and any font family named in the build reference. The list lives in one test fixture.
- Prompts use Chase's product types (Hearth home, Role Radar list, Crew Clock settings, ccwatts and Charlie dashboards). Real content only, no lorem ipsum.

## 3. Blind grader
- **UXB-7 (auto).** Given an arm pair for one prompt, when graded, then the grader's input is exactly the four screenshots (two per arm) plus the one-line job from the grader section (nothing else), arm order is shuffled per prompt, labels are `A` and `B`, and the mapping is stored apart from what the grader receives.
- **UXB-8 (auto).** Given a grading, then the output scores CLEAN-1 to CLEAN-5 (pass or fail each, from `docs/references/ux/clean-ui.md`) and a 0-10 polish score per arm, and the record names the grader model. Grader is Opus, a different model from the Sonnet arms.
- **UXB-9 (manual).** Chase spot-checks 3 pairs per run against his own eye. If he prefers the grader's loser on 2 of 3, the grader is wrong and no claim is made from that run.
- The grader gets no prompt text beyond the one-line job, no role files, no arm names.

## 3b. The agent's own loop (Chase approved, Nov 23)
- **Job (one sentence):** turn a build prompt into a clean, generally accepted screen (CLEAN-1..5 plus polish) that needs little feedback from Chase.
- **Loop:** build the screen, render it at 390 and 1280, grade it against CLEAN-1..5 and the reference library (Chase's answer key rules, Hearth STUDIO-CORE, and the frontend-design skill once UXB-12 passes), fix what fails, repeat.
- **Done test:** polish at least 8 and no CLEAN failure on a fresh render, or the agent says exactly which rule it could not meet and why.
- **Stop rule:** at most 4 build-grade-revise rounds per prompt; stop early on done; never report done without a render of the final build.
- **UXB-16 (manual, then auto).** Given the agent file, then it states the job, done test, stop rule and round limit in its first lines, and a run log records each round (render path, scores, what it changed). This is a build change to ux-reviewer.md and waits for the baseline from step 3 below.

## 4. Rounds to good (stand-in, not Chase)
- **UXB-10 (auto).** Given an arm's first build that scores below 8 or has any CLEAN failure, when feedback rounds run, then an Opus stand-in writes feedback from `/mnt/project-files/ux/review-2026-11-22/answer-key-chase-2026-11-22.md` (a copy of the key lives in the test fixtures so CI can read it; the check is structural: each feedback line cites a key item id or quotes key text, and a line citing none fails), the arm rebuilds, and the loop stops at 4 rounds.
- **UXB-11 (auto).** Given each round, then it logs the grader polish score and CLEAN results; "rounds to good" is the first round with polish at least 8 and no CLEAN failure, or `not reached` after 4.
- State plainly in every report: the stand-in is an Opus model applying Chase's written key. It is not Chase and not his taste live. Real rounds with Chase (UXB-9 style) are the only evidence about him.

## 5. Reference: frontend-design skill
- **UXB-12 (manual).** Given Anthropic's frontend-design skill, when first used, then someone confirms it is reachable (fetched file or installed plugin, with source and date recorded) before it is given to the UX arm as a build reference. Until that is recorded, no doc, report or copy says the agent uses it.
- Plain arm does not get it, so the comparison is agent-with-reference vs plain. A third arm (plain plus the skill) is optional, and is how we learn whether the lift is the reference or the agent.

## 6. Claims
- **UXB-13 (auto).** Given a results file, then it lists n (prompts, runs per arm), arms, model for each arm, grader model, split, change id, cost, and a limits list. `eval-miss-score` style check fails if any is missing.
- Claim only what scores and run logs show: "UX agent scored higher on X of Y prompts, mean polish a vs b, grader Opus, n=1 per arm". No "better", "pixel perfect" or taste claim. One run per arm is suggestive only; take 3 runs per arm before any public line. Cases and key were written by us (limit, say so).

## 7. Cost and the 5-hour limit
- **UXB-14 (auto).** Given a run, then arms execute sequentially, one at a time, with run cost and tokens logged via `stamp-run`.
- **UXB-15 (auto).** Given an API or rate-limit error, timeout or empty output, then the run is marked `error`, is excluded from scores, is never counted as a loss for either arm, and the harness resumes at that prompt.
- Estimate before running: 8 prompts x 2 arms x (1 build + up to 4 rounds) plus grading is the ceiling. Run dev first (5 prompts); held-out only after one tuning pass. If the usage limit hits, stop and resume next window; no partial score is reported.

## 8. Not in scope
- Turning the UX agent into a prompt-only call, or any downgrade of any agent.
- Pixel-diff against a reference design; Figma; native app screens (web at two widths only).
- Dark mode, motion, hover and keyboard states (the build is a static page at two widths).
- Grading by Sonnet, or by anything that sees arm labels.
- Replacing the critique-recall set; changing ux-reviewer.md before a baseline exists.
- Public claims or showcase copy (positioning and Chase's go first).

## Next three steps, in order
1. qa-tdd writes the failing tests UXB-1..15 (harness: arm runner, Playwright render, shuffle and mapping, results check); engineer builds `tools/ux-build-eval.mjs`. One session.
2. Write the 8 prompts (5 dev, 3 held-out) and confirm the frontend-design skill is reachable (UXB-12). One session.
3. Run the dev set, plain vs UX agent, 1 run per arm, graded blind by Opus; report scores and rounds-to-good with limits; Chase spot-checks 3 pairs. One session.
