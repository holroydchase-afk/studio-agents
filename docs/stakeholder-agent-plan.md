# Stakeholder agent: plan (not built)

Chase, Nov 24: evolve Stakeholder Twins into a real stakeholder agent that loops through personas to critique a product idea, spec or preview. Plan only. Nothing here is built until Chase approves it.

**Reuse, don't rebuild.** The Twins repo (`holroydchase-afk/persona-twins`, public, MIT; Chase's rename to `stakeholder-twins` is pending, so tools read the repo name from one constant) already has, and the agent reads in place, never retyped:
- **Persona files:** `personas/*.md`, 7 fictional twins plus `TEMPLATE.md`. Frontmatter: required `name, role, goals, fears, pet_peeves, sample_quotes`; optional `id, label, voice, starter_question, wins_them_over`; body is the background paragraph.
- **The loader and prompt:** `cli/prompt.ts` (`loadPersona`, the `Persona` type, `systemPrompt`), and `cli/sync-personas.ts`, which already generates the page's persona list from the files.
- **The review protocol:** `review-protocol.md` (four walkthrough questions per screenshot, plain-language and platform checks, one fix per objection, quote the element).
- A Claude page (`stakeholder-twins.html`), which stays the interactive toy.

Studio-agents already has the harness (run log, kill switch, validators, memory, blind grader process). The new work is the loop and the checks between them.

**Two things in the Twins code don't fit a batch critic, so the plan adds to them instead of copying:**
1. `systemPrompt` makes the twin talk in character with "no headings, no scores" and says never mention being a simulation. The agent needs findings it can validate. So persona-twins gets a second export, `agentPrompt(persona)`, built from the same `Persona` fields plus a structured-output contract (JSON lines with quote id, severity, one fix). The in-character voice stays for the page and CLI.
2. `review-protocol.md` is written for screenshots. Repos, posts and specs have no screens. So persona-twins gets `review-protocol-text.md` (same one-fix-per-objection and quote-the-element rules, asks "would I stop, believe less, or skip?" for text, code and posts). `review-protocol.md` itself is untouched.

## The problem it solves (Chase's words, Nov 24)
Chase doesn't work at a company, so he has no stakeholders to react to his work. He builds to (a) impress hiring managers, recruiters and engineers and (b) be useful to the PMs and engineers who follow him on LinkedIn. The agent stands in for those readers **before** something ships or gets posted. It is a simulated audience: its output is a set of guesses to check, never "recruiter-approved".

## Where it starts
**First use: a pre-publish gate on Chase's own public surfaces.** The portfolio homepage and product pages, a demo, a repo README, and a LinkedIn post draft. That is where one miss costs most (the site said "8 agents" when none were real, and Chase believes overclaiming cost him a job), and where the inputs already exist (`ux-shots`, the claims register, the site build). Spec and MVP-cut critique comes second, via the pipeline (below). The Twins page stays as the interactive toy; the agent is the batch critic.

## One-sentence job, done test, stop rule
- **Job:** before something goes public, tell Chase what each of his real audiences would stop at, believe less, or skip, with a verified quote and one fix for each.
- **Done:** a ```stakeholder block that passes `check-stakeholder`: every P0/P1 quotes text that exists in the captured artifact, has exactly one fix, and names the persona; a persona-by-finding agreement table; a verdict `ship | fix-first | rethink`.
- **Stop rule:** kill switch file, a usage cap in rounds and turns (at most 2 rounds, 5 personas a round, 10 critique subagents a run, 25 tool calls per subagent; no dollar stop, since Chase is on a Max plan and tokens are only recorded in the run log, never gated on), any validator failing twice on the same block, or an input that holds secrets or personal data (stop and say so, never critique it). A finding it cannot ground in a quote is dropped, not softened.
- **Round limit: 2.** Round 1 critiques. Chase (or the pipeline) applies fixes. Round 2 re-runs only the personas that raised a P0/P1. A P0 left after round 2 is reported, never waved through.

## The personas: Chase's real audiences
A new pack in **persona-twins**, `personas/audience/`, five twins in exactly the existing file format (same required keys, so `loadPersona` loads them unchanged). A subfolder keeps them out of the page's picker: `sync-personas.ts` reads only top-level `.md` files, so the page still shows the seven until Chase chooses to add these. Two new optional frontmatter keys, `influence` and `interest` (`high|medium|low`), are added to the `Persona` type; the loader already passes unknown keys through. The five files are written once, there, and nowhere else:

| Persona | Reads it how | Stops at |
|---|---|---|
| `hiring-manager` | Senior PM or agent hiring manager, Anthropic bar, 5 minutes | A claim with no run log or score behind it; "prompts" dressed as agents |
| `recruiter-skim` | 30 seconds, matching a req | No clear role, level or outcome in the first screen; gaps; jargon |
| `staff-engineer` | Opens the repo, reads code and tests | README claims the code doesn't back; no tests; fake data presented as real; a repo missing the basics `repo-check` looks for |
| `pm-peer` | A PM who'd actually use the tool | "What problem is this, and would I use it Monday?" |
| `linkedin-scroller` | 2 seconds in a feed | No hook; self-congratulation; a post that reads as junior |

The existing seven (everyday, customer, skeptic, marketing, sales, finance, product), read as they are in `personas/`, stay as the **product-buyer lens** for products that have real users (Hearth, Crew Clock). The agent picks by artifact type (see tools), three personas by default, five at most. Persona text is data the agent reads, not instructions to it.

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
| `stakeholder-personas` | Picks personas by artifact type from `audience.json` (see Sharing below), enforces the 3 and 5 caps. | New, reads persona-twins' export |
| Critique | One fresh Sonnet subagent per persona, prompt from persona-twins' `agentPrompt` plus `review-protocol.md` (screens) or `review-protocol-text.md` (everything else). Output: findings as JSON lines, each with a quote id, severity, one fix. | Reused protocol |
| `check-stakeholder` | Rejects a block when a quote isn't in the quote index, a finding has zero or two fixes, a severity is missing, or the persona is unknown. **This is the anti-hallucination step**: critique can't cite what isn't on the page. | New, pattern of `check-findings` |
| `repo-check` | Deterministic audit of a public repo for the `staff-engineer` persona, no model: GitHub community standards (README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue and PR templates, description, topics), OpenSSF Scorecard basics (branch protection, pinned CI actions, a security policy, dependency updates, token permissions), and first-impression clutter (stray files at the root, no tests, stale or default README). Each miss becomes a finding with a quote id from the repo index and one fix. **The checklist is not written here:** it comes from the sibling thread "Make my public repos look professional" once it lands (a checklist file in studio-agents or pm-tools, to be named in step 2); until then this tool is a stub and the plan doesn't duplicate its content. | New, checklist reused |
| `claim-check` | Deterministic: every number, "agent", "built", "shipped" claim on the artifact against the claims register (`docs/agent-audit.md`, `pmo/portfolio/claims-register.md`). Flags unsupported claims without asking a model. | New, small |
| Merge | Dedupe with `agent-memory` against past runs and Chase's earlier accept or decline, rank by severity then persona agreement, and **surface conflicts as trade-offs** (recruiter wants shorter, engineer wants depth) instead of averaging them away. | Reused memory |
| Run log | `agentrun` block, stamped with real tokens by the caller, cost cap and kill switch via `agent-guard`. | Reused |

Memory between runs is file-based: the last run log per artifact plus a `decisions` file (findings Chase accepted, declined or answered), so round 2 and next week's run don't re-raise settled points.

**Calibration (cheap, honest eval over time).** When Chase gets real feedback (a recruiter reply, a LinkedIn comment, an engineer's note), he pastes it into `calibration.md`. A small tool compares what the matching persona predicted with what the real person said. That is the only way a simulated audience earns trust, and it is reported as "predicted X of N", never as validation.

## Sharing the personas without copying them
persona-twins stays the source of truth. Its `sync-personas.ts` gains one output, `personas/audience.json` (every persona in both packs, parsed, plus the two protocols' text and a content hash). Studio-agents' tools are plain Node with no packages, so they can't parse YAML and shouldn't; they read the JSON instead. A `scripts/sync-audience.sh` in studio-agents fetches that one file from persona-twins' default branch (public repo, so no token) into `tools/data/audience.json`, and `check-stakeholder` fails if the file's hash doesn't match its own contents, so a hand edit is caught. A persona fix is made once in persona-twins, regenerated, and synced. Nothing is retyped in studio-agents.

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
1. **In persona-twins:** `personas/audience/` (5 personas), `influence`/`interest` in the `Persona` type, `agentPrompt`, `review-protocol-text.md`, and the `audience.json` export, each test-first in `cli/test/`. **In studio-agents:** `sync-audience.sh` and `check-stakeholder` with tests; fixtures include a quote not on the page, which must fail. Two small PRs, one per repo, persona-twins first.
2. `stakeholder-intake` (quote index, uses `ux-shots`), `claim-check` and `repo-check` (Chase, Nov 24: include the repo review; checklist from the "Make my public repos look professional" thread).
3. `stakeholder.md` agent (job, done, stop, round limit), `stakeholder-run`, one supervised run on the local portfolio build, run log stamped.
4. Eval set and first dev run (on Chase's request only; token cost).
5. Pipeline hooks, after PR 129 is approved.
6. Twins repo: README points to the agent; the page and CLI keep working as they do (their prompt and the seven personas are not changed by step 1). Note: the CLI needs an API key and calls Opus, and nobody has run it; Chase ruled out a paid API route (Nov 21), so it is not extended. The 3 log-hygiene findings in `cli/twin.ts` get fixed there test-first when that repo is next touched.

Not in scope: hosted service, embeddings, a subagent team, any auto-posting to LinkedIn (the agent critiques a draft; Role Radar's LinkedIn guide still owns the voice).

## Risks
- **Persona flattery or invention.** Mitigated by verified quotes, claim-check and calibration; still "guesses to check".
- **Overclaiming the agent itself.** Public copy follows `docs/agent-audit.md`: claim only what run logs and eval scores show.
- **Usage.** Capped in rounds and turns, not dollars (see the stop rule). One lane at a time, three personas by default, Sonnet, handoff blocks not transcripts, no scheduled runs. Tokens are recorded in each run log so the first measured run sets whether the turn caps are right.
- **Drift between the two repos.** The JSON export plus its hash check, and one owner (persona-twins) for persona text.

## Decisions for Chase
1. **Start with the pre-publish gate on his own public surfaces** (portfolio, demo, README, LinkedIn draft). Recommend yes; spec critique follows through the pipeline.
2. **The five audience personas above**, with the original seven kept as the product-buyer lens. Recommend yes.
3. **Advisory only inside the pipeline** in v1. Recommend yes.
4. **Persona source of truth stays in persona-twins**, shared to studio-agents as a generated `audience.json` (see Sharing above). Recommend yes, so the public repo stays meaningful and nothing is retyped.
5. **Approve step 1** (personas plus validator) as the first build PR. Nothing starts until then.
