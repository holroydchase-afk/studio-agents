# Stakeholder agent: plan (not built)

Chase, Nov 24: evolve Stakeholder Twins into a real stakeholder agent that loops through personas to critique a product idea, spec or preview. Plan only. Nothing here is built until Chase approves it.

**Reuse, don't rebuild.** The Twins repo (`holroydchase-afk/persona-twins`, public, MIT) already has the persona pack (`personas/*.md`, 7 fictional twins plus a template), the shared review protocol (`review-protocol.md`: four questions per screen, one fix per objection, quote the element) and a Claude page. Studio-agents already has the harness (run log, kill switch, cost cap, validators, memory, blind grader process). The new work is the loop and the checks between them.

## The problem it solves (Chase's words, Nov 24)
Chase doesn't work at a company, so he has no stakeholders to react to his work. He builds to (a) impress hiring managers, recruiters and engineers and (b) be useful to the PMs and engineers who follow him on LinkedIn. The agent stands in for those readers **before** something ships or gets posted. It is a simulated audience: its output is a set of guesses to check, never "recruiter-approved".

## Where it starts
**First use: a pre-publish gate on Chase's own public surfaces.** The portfolio homepage and product pages, a demo, a repo README, and a LinkedIn post draft. That is where one miss costs most (the site said "8 agents" when none were real, and Chase believes overclaiming cost him a job), and where the inputs already exist (`ux-shots`, the claims register, the site build). Spec and MVP-cut critique comes second, via the pipeline (below). The Twins page stays as the interactive toy; the agent is the batch critic.

## One-sentence job, done test, stop rule
- **Job:** before something goes public, tell Chase what each of his real audiences would stop at, believe less, or skip, with a verified quote and one fix for each.
- **Done:** a ```stakeholder block that passes `check-stakeholder`: every P0/P1 quotes text that exists in the captured artifact, has exactly one fix, and names the persona; a persona-by-finding agreement table; a verdict `ship | fix-first | rethink`.
- **Stop rule:** kill switch file, cost over cap ($0.75 per run, tuned after the first measured run), any validator failing twice on the same block, or an input that holds secrets or personal data (stop and say so, never critique it). A finding it cannot ground in a quote is dropped, not softened.
- **Round limit: 2.** Round 1 critiques. Chase (or the pipeline) applies fixes. Round 2 re-runs only the personas that raised a P0/P1. A P0 left after round 2 is reported, never waved through.

## The personas: Chase's real audiences
A new pack, `audience/`, five twins in the same file format as the existing seven (so the page, CLI and agent all load them):

| Persona | Reads it how | Stops at |
|---|---|---|
| `hiring-manager` | Senior PM or agent hiring manager, Anthropic bar, 5 minutes | A claim with no run log or score behind it; "prompts" dressed as agents |
| `recruiter-skim` | 30 seconds, matching a req | No clear role, level or outcome in the first screen; gaps; jargon |
| `staff-engineer` | Opens the repo, reads code and tests | README claims the code doesn't back; no tests; fake data presented as real |
| `pm-peer` | A PM who'd actually use the tool | "What problem is this, and would I use it Monday?" |
| `linkedin-scroller` | 2 seconds in a feed | No hook; self-congratulation; a post that reads as junior |

The existing seven (everyday, customer, skeptic, marketing, sales, finance, product) stay as the **product-buyer lens** for products that have real users (Hearth, Crew Clock). The agent picks by artifact type (see tools), three personas by default, five at most. Persona text is data the agent reads, not instructions to it.

**Weighting (from the Product School stakeholder guide Chase sent, Nov 24).** The guide sorts stakeholders on an influence and interest matrix and builds a persona per group with motivations and pain points. We borrow the matrix to rank findings, since not every audience counts the same for Chase's goals. Each audience persona carries two tags in its frontmatter: `influence` (can it change an outcome for Chase: hiring manager high, recruiter high, staff engineer medium, PM peer medium, scroller low) and `interest` (how closely it reads). Merge ranks by severity, then influence, then agreement. High influence plus low interest (the recruiter's 30 seconds) means the first screen decides; low influence plus high interest (a PM peer) means usefulness decides. The guide's advice to resolve conflicts between stakeholders, not average them, matches the trade-off rule above. The article is generic PM advice, so it informs the tags and ranking only; it is not a source for any public claim.

## The loop (why this is an agent, not a prompt)

```
artifact ─▶ INTAKE ─▶ PICK personas ─▶ per persona: CRITIQUE (fresh context) ─▶ VERIFY quotes ─▶ CLAIM-CHECK ─▶ MERGE + rank ─▶ block
                                              ▲                                                                     │
                                              └──────────── round 2: only personas with a P0/P1, after fixes ◀──────┘
```

Tools, all plain Node scripts in `tools/` (no network, no packages, no API key), same pattern as the existing harness:

| Tool | What it does | New or reused |
|---|---|---|
| `stakeholder-intake` | Classifies the input (page, demo, repo, post, spec). Pages: shots and a text index through `ux-shots`. Repos: README, file tree, test count. Posts and specs: text. Writes a numbered **quote index** of everything on the artifact. | New, wraps `ux-shots` |
| `stakeholder-personas` | Loads a pack, picks personas by artifact type, enforces the 3 and 5 caps. | New, reads the Twins format |
| Critique | One fresh Sonnet subagent per persona, review protocol plus that persona. Output: findings as JSON lines, each with a quote id, severity, one fix. | Reused protocol |
| `check-stakeholder` | Rejects a block when a quote isn't in the quote index, a finding has zero or two fixes, a severity is missing, or the persona is unknown. **This is the anti-hallucination step**: critique can't cite what isn't on the page. | New, pattern of `check-findings` |
| `claim-check` | Deterministic: every number, "agent", "built", "shipped" claim on the artifact against the claims register (`docs/agent-audit.md`, `pmo/portfolio/claims-register.md`). Flags unsupported claims without asking a model. | New, small |
| Merge | Dedupe with `agent-memory` against past runs and Chase's earlier accept or decline, rank by severity then persona agreement, and **surface conflicts as trade-offs** (recruiter wants shorter, engineer wants depth) instead of averaging them away. | Reused memory |
| Run log | `agentrun` block, stamped with real tokens by the caller, cost cap and kill switch via `agent-guard`. | Reused |

Memory between runs is file-based: the last run log per artifact plus a `decisions` file (findings Chase accepted, declined or answered), so round 2 and next week's run don't re-raise settled points.

**Calibration (cheap, honest eval over time).** When Chase gets real feedback (a recruiter reply, a LinkedIn comment, an engineer's note), he pastes it into `calibration.md`. A small tool compares what the matching persona predicted with what the real person said. That is the only way a simulated audience earns trust, and it is reported as "predicted X of N", never as validation.

## How it plugs into the MVP-o-matic pipeline (PR 129) and runs standalone
Same agent, same block, three entry points:

1. **Standalone (first build):** `node scripts/stakeholder-run.mjs <url|file|repo|draft.md> --kind page` preps intake and personas; the main session spawns the agent. No dependency on the pipeline.
2. **Pipeline, after Staff PM's MVP cut (before the build):** input is the cut spec. Personas `pm-peer`, `staff-engineer`, `hiring-manager`. Questions: is the one job clear, would a user miss any of the 3 to 5 features, is anything over-scoped. Output lands in the ledger as advice to Staff PM.
3. **Pipeline, on the preview (before the morning card):** input is the preview and its repo. Personas by artifact type. The card gets "what each audience would stop at" as three lines.

**Advisory, never a gate, in v1.** A `rethink` verdict is shown on the card; it never stops the build or blocks a merge (merge classes in the pipeline plan are unchanged). The pipeline ledger only needs the block's verdict and cost, so the ledger tool can consume it without knowing anything about personas.

## How we'll know it works (outcome eval)
Same artifact, two arms: **plain Claude** ("critique this for hiring managers, recruiters, engineers and PMs", same context pack, same cost cap) vs the **agent**. Graded blind by a fresh Opus grader per artifact (agents run on Sonnet; grader model recorded).
- **Set:** 6 real artifacts, 3 dev and 3 held-out, taken from the portfolio and product repos **as they were before Chase fixed them**.
- **Answer key from real history, not planted bugs:** the issues that were later fixed (the "8 agents" claim, "$6M" and "3–5 points", the hero animating, jargon Chase cut). Recall of those is counted per arm, plus false alarms (findings Chase rejects).
- **Blind grader question:** "Which critique would you act on first, and why? Which contains something generic that would fit any site?" Order shuffled, arm labels and blocks stripped.
- **Recorded, not graded:** % of findings with verified quotes, trade-offs surfaced, cost per run, rounds used. Chase spot-checks 3 pairs as the final answer key.
- **Claim rule:** wins out of N, tune on dev only, score held-out once per change. If the agent only ties plain Claude, we say so and the claim becomes "verified quotes and the claims check", which are real tooling, not a multiplier.

## Build order (each one small PR, test-first, qa-tdd red before build)
1. `audience/` pack (5 personas) plus `check-stakeholder` and its tests. Fixtures include a quote not on the page, which must fail.
2. `stakeholder-intake` (quote index, uses `ux-shots`) and `claim-check`.
3. `stakeholder.md` agent (job, done, stop, round limit), `stakeholder-run`, one supervised run on the local portfolio build, run log stamped.
4. Eval set and first dev run (on Chase's request only; token cost).
5. Pipeline hooks, after PR 129 is approved.
6. Twins repo: README points to the agent; the page and CLI stay as they are. Note: the CLI needs an API key and calls Opus, and nobody has run it; Chase ruled out a paid API route (Nov 21), so it is not extended. The 3 log-hygiene findings in `cli/twin.ts` get fixed there test-first when that repo is next touched.

Not in scope: hosted service, embeddings, a subagent team, any auto-posting to LinkedIn (the agent critiques a draft; Role Radar's LinkedIn guide still owns the voice).

## Risks
- **Persona flattery or invention.** Mitigated by verified quotes, claim-check and calibration; still "guesses to check".
- **Overclaiming the agent itself.** Public copy follows `docs/agent-audit.md`: claim only what run logs and eval scores show.
- **Token cost.** One lane at a time, three personas by default, Sonnet, handoff blocks not transcripts, a cap per run, no scheduled runs.

## Decisions for Chase
1. **Start with the pre-publish gate on his own public surfaces** (portfolio, demo, README, LinkedIn draft). Recommend yes; spec critique follows through the pipeline.
2. **The five audience personas above**, with the original seven kept as the product-buyer lens. Recommend yes.
3. **Advisory only inside the pipeline** in v1. Recommend yes.
4. **Persona source of truth stays in persona-twins**, vendored into studio-agents by a sync step. Recommend yes, so the public repo stays meaningful.
5. **Approve step 1** (personas plus validator) as the first build PR. Nothing starts until then.
