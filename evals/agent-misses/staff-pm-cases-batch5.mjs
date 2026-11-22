// Batch 5 of the staff-pm miss cases (Nov 22): "dossier" cases. The ask is one bare line and the traps sit in a small fixture repo
// (CLAUDE.md, HANDOFF.md, a doc or two) that the agent has to read, the way a real session starts. Earlier batches put the situation
// in the prompt, so a plain session scored 7 of 10 on them (heldout-3); here each case needs TWO things found in the files, and the
// grader passes it only when both are in the spec. Facts are rebuilt from the README misses with made-up details; no real names.
// Fixture text may use ordinary words like "bug"; only `ask` and `context` are screened for hints (the tool enforces it).
export const PM_BATCH5 = [
  // ---- dev (read while tuning) ----
  {
    id: "live-feed-one-symbol-blocks-all", miss: "CH-S1", pattern: "missing-criteria", priority: "P1", split: "dev", src: "ch",
    ask: "Spec the live options-price feed so the idea cards on the demo show today's prices.",
    context: "The owner has about an hour a night.",
    repo: {
      "CLAUDE.md": "# Charlie\n\nPaper trading only. The public demo is static and labeled as sample data.\nCloud sessions can't reach Cboe or SEC hosts: build against fixtures and say live adapters are unverified.\nRun tests before every push. Keep HANDOFF.md current.\n",
      "HANDOFF.md": "# Handoff\n\n## Done\n- Cboe adapter (`charlie/adapters/cboe.py`) parses the three saved sample files in `samples/cboe/` (AAPL, KO, XOM). 14 tests green.\n- Idea cards render from `samples/ideas.json`.\n\n## In progress\n- Nothing.\n\n## Next\n- Prices on idea cards.\n\n## Decisions to review\n- Fundamentals on the cards are still the October sample numbers.\n",
      "docs/adapters.md": "# Adapters\n\n`cboe.py`: fetch the options chain for a symbol, return calls and puts. The saved samples hold calls and puts for three symbols.\nSymbols come from the user's watchlist (about 40). The adapter is called once per symbol in a loop.\n",
    },
    mustCover: "BOTH: (1) a criterion or design rule that one symbol failing, being blocked or returning nothing must not take the whole feed offline (per-symbol isolation with a visible fallback state), with a concrete input such as one blocked symbol among forty; AND (2) says the adapter has only been run against three saved samples and the cloud cannot reach the live host, so a first live run on a machine that can reach it (with puts as well as calls checked) is a named done-gate, not something called done from the sample tests",
  },
  {
    id: "make-repo-public-links", miss: "CO-S4", pattern: "missing-criteria", priority: "P1", split: "dev", src: "co",
    ask: "Plan making the Stakeholder Twins repo and demo public.",
    context: "The owner has about an hour a night.",
    repo: {
      "CLAUDE.md": "# Stakeholder Twins\n\nPublic repos hold no personal data and no secrets. The portfolio site is a separate repo; its product cards link only to things that are public.\nKeep HANDOFF.md current.\n",
      "HANDOFF.md": "# Handoff\n\n## Done\n- Twins demo works on sample personas. README has the intro paragraph.\n\n## State\n- Repo is private. There is no public demo yet.\n- Portfolio card for this product: shows the repo link only until the demo artifact is shared.\n\n## Next\n- Go public.\n",
      "docs/portfolio-facts.md": "# Facts the portfolio uses about this product\n\n- Status: private repo, no demo.\n- Skill tags: stakeholder research, persona design, prompt evaluation.\n- Intro line: \"Twins of your stakeholders you can ask first.\"\n",
    },
    mustCover: "BOTH: (1) the done definition includes the portfolio side, a working link to the repo and the demo and the intro line on the portfolio card, checked after the switch; AND (2) every place that still says the repo is private or has no demo (HANDOFF state, the portfolio-facts doc, the card) is listed as something to update in the same change, not left stale",
  },
  {
    id: "red-flag-rule-scoring-clash", miss: "RR-S1", pattern: "missing-criteria", priority: "P1", split: "dev", src: "rr",
    ask: "Spec a red-flag rule that lowers a role's score when the posting asks for five days on site.",
    context: "The owner has about an hour a night.",
    repo: {
      "CLAUDE.md": "# Role Radar\n\nScores each role 0-100 against criteria.yaml. Public repo: demo data only. Keep HANDOFF.md current.\n",
      "HANDOFF.md": "# Handoff\n\n## Done\n- Scoring v3: weights in criteria.yaml. Pay is its own weight (20) with a floor: below the floor the role is capped at 60.\n- Skip button on each role (no reason captured).\n\n## In progress\n- Nothing.\n\n## Next\n- Red-flag rule for on-site.\n",
      "docs/scoring.md": "# Scoring\n\nTotal = sum of weighted parts. Pay weight 20, floor 150k; below the floor the total is capped at 60.\nThe scan summary says: \"pay adds up to +10\" (written when pay was a bonus).\nA role scoring 80+ is shown in Top 5.\n",
    },
    mustCover: "BOTH: (1) a feedback loop for the new rule: a way to see which roles it hit and to mark a hit as wrong or add a skip reason, so the rule can be checked against what the owner actually does; AND (2) says how the penalty combines with the existing pay weight and floor cap (order or precedence), with a worked example using concrete scores, and notices that the scan wording \"pay adds up to +10\" no longer matches scoring v3 and must be aligned",
  },
  {
    id: "product-plan-no-dates", miss: "PS-S3", pattern: "missing-criteria", priority: "P2", split: "dev", src: "ps",
    ask: "Spec the product page for Utility Belt on the portfolio site.",
    context: "The owner has about an hour a night.",
    repo: {
      "CLAUDE.md": "# Portfolio site\n\nA claim on any page must be in docs/claims-register.md. Public repo.\nSite voice: see docs/site-voice.md.\n",
      "docs/site-voice.md": "# Site voice\n\n- No product dates anywhere on the site, in plans or in copy. Use status words (idea, scoped, building, live).\n- No metrics on first load.\n- Simple, not salesy. First person, plain words.\n",
      "docs/claims-register.md": "# Claims register\n\n| Product | Allowed claim | Evidence |\n|---|---|---|\n| Utility Belt | One ADHD app: three tools (Nudge, Lessons, Sayings) planned on one engine. Scoped only; parked until after the Hearth beta. | scope doc |\n| Hearth | Private family photo app, beta with relatives. | repo |\n",
      "HANDOFF.md": "# Handoff\n\n## State\n- Utility Belt: scoped only. Nothing built. Nudge would be first.\n",
    },
    mustCover: "BOTH: (1) the page and the plan carry no calendar dates, using status words instead, with a criterion that checks the page text for dates; AND (2) the page claims only what the register allows, saying scoped and parked, not built or live, with a criterion that every claim on the page matches a register row",
  },
  // ---- held-out (never read while tuning; scored once per change) ----
  {
    id: "four-demo-issues-already-in-flight", miss: "CK-S1", pattern: "concurrent-work-collision", priority: "P1", split: "heldout", src: "ck",
    ask: "Spec the work for the four open issues on the live demo.",
    context: "The owner has about an hour a night.",
    repo: {
      "CLAUDE.md": "# Crew Clock\n\nCheck open PRs and branches before starting and resume, never redo. Keep HANDOFF.md current.\nNever merge to main without the owner's go.\n",
      "HANDOFF.md": "# Handoff\n\n## Live demo issues\n1. Today list shows yesterday's open shift.\n2. Map pin drifts after zoom.\n3. Reset sample data keeps an unsent punch.\n4. Week total does not match the day rows.\n\n## In progress\n- Branch `claude/demo-issues` (PR 34, open, not merged): issues 1, 2 and 3, tests written, review pending. Thread: Demo cleanup.\n\n## Next\n- Issue 4 has no owner yet.\n",
    },
    mustCover: "BOTH: (1) names the open PR and branch that already cover issues 1 to 3 and says to resume or finish that work instead of speccing it again, with no parallel rework of those three; AND (2) scopes issue 4 as the new work, with a testable criterion using concrete hours (the week total equals the sum of the day rows as shown)",
  },
  {
    id: "console-page-built-then-hidden", miss: "PS-S2", pattern: "built-then-cut", priority: "P1", split: "heldout", src: "ps",
    ask: "Spec a Studio Console page on the portfolio that shows the status of the studio's agents.",
    context: "The owner has about an hour a night.",
    repo: {
      "CLAUDE.md": "# Portfolio site\n\nEvery claim must be in docs/claims-register.md and point to evidence in a repo. Public repo.\n",
      "HANDOFF.md": "# Handoff\n\n## History\n- Studio and Studio Console pages were built, then hidden two days later: the page said \"8 agents\" before any of them ran a real tool loop. Owner: overclaiming may have cost a job.\n- Hidden, not deleted (site chop-down rule).\n\n## State\n- Agents with run logs and scores: qa-tdd and staff-pm (scores in the studio-agents repo, evals/agent-misses/runs). Others: none.\n",
      "docs/claims-register.md": "# Claims register\n\n- Agents: only claim what a run log or score shows. State the arm (with agent, plain) and the limits. Never claim a capability marked Missing in the training plan.\n",
    },
    mustCover: "BOTH: (1) cites that Studio and Console pages were already built and hidden because claims outran evidence, and asks whether that premise has changed before building (a go, no-go or needs-decision verdict, not a straight build plan); AND (2) any status or count on the page must come from a run log or score in the repo, shown with its limits, with a criterion that every figure traces to a file and no agent without a log is listed as working",
  },
  {
    id: "phone-font-again", miss: "HE-S7", pattern: "thrash-and-reversal", priority: "P1", split: "heldout", src: "he",
    ask: "Spec switching the app to the phone's system font so it feels more native.",
    context: "Users are older relatives on phones.",
    repo: {
      "CLAUDE.md": "# Hearth\n\nGrandparent rules: text 17pt or larger, 48pt tap targets. Decisions are logged in docs/DECISIONS.md with the reason.\n",
      "docs/DECISIONS.md": "# Decisions\n\n- DEC-31: One font, Atkinson Hyperlegible, for every screen. Reason: legibility for older eyes, one look across phones.\n- DEC-58: Swapped to the system font in the redesign (PR 114). Reversed in PR 146 six days later: relatives said letters like 1, l and I looked alike.\n",
      "HANDOFF.md": "# Handoff\n\n## State\n- Font: Atkinson Hyperlegible everywhere (back since PR 146).\n- Beta with relatives is two weeks out.\n",
    },
    mustCover: "BOTH: (1) cites the earlier swap and its reversal (DEC-58, PR 146) and the one-font decision (DEC-31) and does not simply spec the change: the verdict is needs-decision, no-go or a test first, with the owner's call recorded; AND (2) if any build is proposed, a measurable check with the target readers before the build (for example relatives reading a sample of confusable characters, with a stated pass bar) and the 17pt text rule kept as a criterion",
  },
  {
    id: "dream-roles-live-page-ahead", miss: "RR-S5", pattern: "concurrent-work-collision", priority: "P1", split: "heldout", src: "rr",
    ask: "Spec re-weighting dream roles in the scoring, then bring the README up to date.",
    context: "The owner has about an hour a night.",
    repo: {
      "CLAUDE.md": "# Role Radar\n\nPublic repo: demo data only. The live page is a published artifact; main holds its source copy. Keep HANDOFF.md current.\n",
      "HANDOFF.md": "# Handoff\n\n## State\n- The live page is ahead of main: scoring changes made on the live page on Nov 3 (anchor weights) were never copied back to main.\n- Dream roles currently score as anchors.\n",
      "README.md": "# Role Radar\n\nA weekday scan scores roles 0-100.\n\nFeatures:\n- Dream-role anchors\n- Skip reasons\n- Weekly email digest\n- Recruiter list\n",
      "docs/status.md": "# Status\n\nBuilt: anchors, skip reasons, recruiter list (private). Not built: email digest.\n",
    },
    mustCover: "BOTH: (1) makes syncing main with the live page's scoring (or diffing live against main) the first step before any re-weighting, naming that the live page is ahead; AND (2) the README update lists only what is built, with the email digest removed or marked as not built, and a criterion that checks each README feature against docs/status.md",
  },
];
