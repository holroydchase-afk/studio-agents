# Factory rulebook

The one bar every product, building block and repo in the studio is held to, so anything the MVP factory ships looks seasoned from the first line of code to the portfolio page. Chase, Nov 25: "top tier repos, top tier code, top tier / modern tech stack, top tier everything", and "I hate looking amateur but I also hate bloat."

This page is the layer on top of what exists. It does not restate it:
- How we work, docs every repo keeps, shipping and the PR queue: [studio-standard.md](studio-standard.md).
- GitHub hygiene (community files, settings, OpenSSF, 34-item checklist): [repo-standards.md](repo-standards.md).
- Agent design: [agent-template.md](agent-template.md). Screen rules: [design-rules.md](design-rules.md). Lint: `templates/lint/`.
- Stack direction (Expo and React everywhere): `plans/2026-11-25-react-migration-*.md` in the project folder.

## How to read it
Each rule has an ID (`FAC-n`) and a **tier**:
- **Gate**: a script or CI job fails the PR. If it can't be automated yet, it's listed under "Gates still to build" and is Bar until it is.
- **Bar**: an agent or reviewer scores it Pass, Partial or Fail in a product assessment. Never "looks fine".
- **Defer**: wanted, but not until a product has users or a release. Bloat guard: a Defer rule is not a to-do.

A product's score is its Gate failures first, then Bar Fails, then Partials. Every Fail becomes one `intake` issue in the owning repo (pm-tools `docs/INTAKE.md`). Claims about a product's quality come from this scorecard and run logs, never from adjectives.

## 1. Repo (what a visitor sees in 30 seconds)
- **FAC-1 Gate.** Root holds only README, LICENSE, community files, config, source. Internal notes under `docs/internal/` (see repo-standards section 3).
- **FAC-2 Bar.** README opens with what it is and who it's for, one screenshot or demo link, a quick start that works in five commands, license line, an honest AI-use line, a CI badge. Every number or claim traces to a test, run log or the claims register.
- **FAC-3 Gate.** Community files, issue and PR templates, Dependabot, least-privilege workflow `permissions:` (repo-standards sections 1, 2 and 5). Settings that a PR can't change stay on the Chase-settings list.
- **FAC-4 Bar.** Small commits with clear messages, PRs under about 500 changed lines, merge commits, no direct pushes to `main`.

## 2. Code
- **FAC-5 Gate.** Strict TypeScript, `tsc --noEmit` in CI. JS only with a one-line reason in HANDOFF (studio-standard section 4).
- **FAC-6 Gate.** The studio ESLint config in strict mode (`STUDIO_LINT_STRICT=1`), zero warnings. A disable comment needs a reason on the same line; `react-hooks/exhaustive-deps` disables count as Fails until explained.
- **FAC-7 Bar.** One way to do each job. Inputs from outside the app (network, storage, model output, files) are parsed against a schema at the edge; inside, types are trusted. No `any`, no unchecked JSON from a model.
- **FAC-8 Bar.** Small units: a function over about 60 lines or a file over about 400 gets a reason or a split. No 13-argument functions, no closures that hold a whole app (the QA amateur-code audit's P1 and P2 list is the reference).
- **FAC-9 Bar.** Errors are handled where they can be acted on, never swallowed by a catch-all. Network and model calls have a timeout, a bounded retry and a cap on spend (the agent API loop kit).
- **FAC-10 Gate.** No secrets, tokens or personal data in the tree or history; the privacy scan runs in CI. Dependencies declared with versions, lockfile committed, each new runtime dependency justified in one line in its PR.
- **FAC-11 Bar.** Committed generated output (bundles, built JS) has a drift check in CI, or isn't committed.
- **FAC-12 Bar.** Comments say why, not what. Public functions and exported components have a one-line doc comment. No dead code, no commented-out blocks.

## 3. Stack (defaults; deviate with a one-line reason in the PR)
Chase, Nov 25: native by default, React everywhere else, TypeScript throughout.
- **FAC-13 Bar.** Phone apps: Expo (React Native), strict TS. Web products: React + Vite + TS (Expo web where the code is shared with a phone app). Pages: built output from React, prerendered; no hand-written HTML in a product.
- **FAC-14 Bar.** UI comes from the studio component library (section 5). A screen that reaches for raw `Pressable`, `View` styles or inline colours where a library component exists is a Fail; the missing component gets added to the library, not worked around.
- **FAC-15 Gate.** Every runtime, SDK and library version is looked up on the vendor's live page, with the date checked written beside it (Hearth LESSONS, Oct 18). The bump bot is Dependabot; majors are manual.
- **FAC-16 Bar.** Data layer, state and navigation are named once in the repo's `docs/eng/STACK.md` (one line each, with why). A second library for the same job is a Fail.
- **FAC-17 Bar.** Accessibility is part of the stack: labels, roles, 48pt targets, dynamic type, contrast from the tokens. Hearth's DS rules are the strictest and the reference.

Not decided here, left to the architect and the library thread: the exact data, state, navigation and test libraries. The rulebook names the rule (one choice, written down, current), not the brand.

## 4. Tests and CI
- **FAC-18 Gate.** Failing test first, ticket or planning ID in the test title; every suite 3x green before a PR is ready (studio-standard section 4). A flaky test is a finding.
- **FAC-19 Gate.** CI on every PR runs typecheck, lint, unit tests, the privacy scan and the build. A suite that only runs by hand doesn't count.
- **FAC-20 Bar.** Test pyramid: many fast unit tests on pure logic, component tests on the library's components and screens (testing-library style: by role and label, not by implementation), a few end-to-end flows for the golden paths. Edge cases and failure modes, not only happy paths; realistic messy sample data.
- **FAC-21 Bar.** No fixed sleeps in e2e (wait on a condition), no test pinning prose from CLAUDE.md, no snapshot of an entire screen as the only assertion. No test skipped, deleted or weakened to get green.
- **FAC-22 Defer.** Coverage thresholds, mutation testing, visual regression on every component: add when a block has outside users.

## 5. UX and design system
- **FAC-23 Bar.** One design system: tokens (colour, type, spacing, radius, motion) in one file, light and dark, contrast tested in the library once rather than rewritten per repo.
- **FAC-24 Bar.** The component library is the only place components are born. Each component has a Storybook story per state (default, loading, empty, error, disabled, largest text), a test, and an accessibility check in CI.
- **FAC-25 Bar.** Screens follow `design-rules.md` and the CLEAN-1..5 rules; ux-reviewer scores every user-visible change, in showcase mode before anything goes public.
- **FAC-26 Bar.** Every screen has real loading, empty and error states. Words are plain, verbs on buttons, no jargon the audience wouldn't use.
- **FAC-27 Defer.** Chat-first layer (message list, composer, streaming, agent-rendered components): built in the library once the base is stable (React plan, Phase 1).

## 6. Docs
- **FAC-28 Gate.** The studio-standard section 3 docs exist and `HANDOFF.md` is updated in every PR (the handoff-check workflow).
- **FAC-29 Bar.** `docs/architecture/` for any product that stores or moves someone's data, changed in the same PR as the data flow.
- **FAC-30 Bar.** A new contributor, or an agent, runs the project from the README alone. Each building block also has its own README: what it is, install, a 60-second example, what it deliberately doesn't do.

## 7. Portfolio presentation (code to page)
- **FAC-31 Bar.** One case study per product: the real problem, who it's for, what's built, what was measured, what isn't proven. A 90-second demo and a link to the repo. No standalone sites per product (strategy plan, Nov 25).
- **FAC-32 Gate.** Claims on the page come from the claims register; the portfolio drift check files an intake when a product changes under its page. No metrics, dates or screenshots the homepage rules forbid.
- **FAC-33 Bar.** The repo a visitor clicks to is itself a Pass on sections 1 to 4. A polished page that links to an amateur repo is the worst case.
- **FAC-34 Bar.** Shelved or dropped products are hidden from the portfolio, not left half-alive. Hidden, never deleted.

## 8. Building blocks (what the factory consumes)
- **FAC-35 Bar.** A block has one job, a typed public API, a README, tests, a version, and no product words in it. Name is literal.
- **FAC-36 Bar.** Products import blocks; they don't fork them. A fix found in a product goes upstream once, never copied back.
- **FAC-37 Bar.** Every block is held to sections 1 to 4 as strictly as a product, and ships with an example app or story that proves it works.
- **FAC-38 Defer.** Publishing blocks to npm: only on Chase's explicit go and after the release-captain pass.

## Gates still to build
Rules marked Gate that no script checks yet. Each is a small PR in studio-agents with a failing test first:
1. Root-clutter check (FAC-1) and a README section check (FAC-2, partly).
2. Strict lint adoption in every product repo, via sync (FAC-6).
3. A single `factory-check` that runs FAC-5, 6, 10, 15 and 19 on a repo and prints a scorecard (extends `tools/product-review.mjs`).
4. Version-date check: a `STACK.md` line without a "checked" date fails (FAC-15).

## Changing this page
Add a rule only when a product has been burned by its absence or an audit found it in two repos. Say what it replaces or why nothing does. If the page passes two screens, split it by topic.
