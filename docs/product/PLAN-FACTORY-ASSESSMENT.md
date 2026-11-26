# Plan: factory rulebook and product assessments

Chase, Nov 25: build the rules for a factory first, then have every agent assess each product against them, code to portfolio, Hearth first. Focus is on building blocks, agents, harnesses and PM tools; the products are testbeds that teach us what to refine. **No agents run until Chase says go** (Nov 25, 10:46 PM).

## Step 1 (done in this PR): the rulebook
`docs/factory-rulebook.md`, FAC-1..38, each Gate, Bar or Defer. Built on repo-standards, studio-standard, design-rules and the lint config, not a restart.

## Step 2: Chase reviews the rulebook (one pass)
Questions that change the rules, with my recommendation:
1. Stack names. The rulebook says "one choice, written down, current" for data, state, navigation and test libraries and leaves brands to the architect. Recommend: the architect proposes them once, from Hearth's actual choices plus a vendor-page check, in the component-library thread.
2. Storybook. Native stories need a React Native Storybook plus a web build for the shared catalog. Recommend: one catalog on web Storybook (react-native-web) as the design library people see, with on-device stories only where a component needs the real runtime.
3. Strictness. FAC-6 means zero lint warnings in every repo. Recommend: yes, adopted per repo through sync, as studio-agents already did.

## Step 3: Hearth assessment (starts on Chase's go; read-only on the Hearth repo)
Hearth is frozen and owned by its own project, so no code changes here; every finding becomes an `intake` issue in the Hearth repo.

Known facts to start from: Expo 58 and RN 0.88, strict TypeScript, in-house kit (`app/src/ui/kit.tsx`, `theme.ts`), about 170 inline styles, 13 screens using raw `Pressable`, no Storybook.

Lanes, one at a time, each reporting against FAC ids with Pass, Partial or Fail and evidence (file and line, or command output):

| Order | Agent | Looks at | Rules |
|---|---|---|---|
| 1 | staff-pm | Scope of the assessment, ranking of findings, buy vs build for each block | all |
| 2 | architect | Stack, dependencies, what in `app/src/ui`, `platform`, `state`, `errors` is a building block | 3, 8 |
| 3 | qa-tdd | Suites run 3x, test shape, flakes, fixed sleeps, hook disables, amateur-code list | 2, 4 |
| 4 | ux-reviewer and grandparent-ux | Every screen, states, words, accessibility, design-system fit | 5 |
| 5 | privacy-security | Data flows, public-repo leaks, logging | 2, 6 |
| 6 | positioning | README, case study, claims against the register | 1, 7 |
| 7 | staff-pm again | One merged scorecard and the intake list, ranked | all |

Output: one report per lane in `audit/` with a `factory-score` table, then a single Hearth scorecard. Findings carry `HEA-FR<n>` IDs, P0 to P2; each Fail gets an intake in the Hearth repo (deduplicated against open `intake` issues first).

The ux-reviewer lane needs screenshots; it uses `scripts/ux-shots` where the Hearth web build runs, and says plainly where it could not look.

## Step 4: product by product
After Hearth is done: ccwatts next (Chase's call), then Role Radar and the portfolio. Skipped products (Charlie, Energy Scanner, Crew Clock, Build Slate) stay hidden and are not assessed.

## What Hearth teaches the factory
The assessment's second output is not Hearth's gaps but the factory's: which findings repeat, so they become a Gate, a library component or a block. That list feeds the component library thread ("Generalize building blocks and audit code"), which owns Storybook and the blocks repo; this thread hands over findings there, never builds a second library.

## Not doing
No new agents (recommend any gaps to studio-agents in one line), no restart of the standards, no product code changes from this thread, no publishing.
