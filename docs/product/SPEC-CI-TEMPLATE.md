# Spec: shared CI template (CIT-1..10)

Lane C of the standard-stack plan (pm-tools `docs/PLAN-STANDARD-STACK.md`, SS-4 and SS-5). One template so a new repo starts with every required check. Scoped by the chief of staff from the plan; staff-pm skipped.

## What exists already
`templates/lint` (ESLint), `templates/security` (gitleaks over full history, CodeQL, dependency review, privacy scan, Dependabot). Gaps: Prettier, `npm audit`, typecheck and tests-3x in one workflow, and SHA-pinned Actions (tags only today).

## Scope
1. `tools/check-actions-pinned.mjs` (managed, synced to `scripts/`): lists every `uses:` in the given workflow files or folders that is not a 40-hex commit SHA. Local `./` actions are fine. A `# vX` comment after the SHA is allowed. Exit 1 with `file:line  uses` per offender, 0 when clean, 2 on bad usage.
2. `templates/ci/ci.yml` (seed): jobs `format` (Prettier check), `lint` (calls the local `lint.yml` reusable workflow), `typecheck` (`npm run typecheck --if-present`), `test` (`npm test` three times in a row), `audit` (`npm audit --audit-level=high`), `pinned` (runs the checker). Least-privilege `permissions`, Node 22, every Action SHA-pinned.
3. `templates/ci/prettierrc.json` and `prettierignore` (seeds), `templates/ci/README.md` (adopt steps, what each check is, how to pin).
4. Every Action in `templates/**` and `.github/workflows/**` is SHA-pinned with a `# vN` comment; Dependabot's `github-actions` entry keeps the SHAs fresh.
5. `scripts/install-ci.sh <repo>`: installs the CI template files, leaving existing files alone, then lists the devDependencies to add (prettier) and the lint ones. `templates/manifest.json` lists the checker (managed) and the seeds.

## Acceptance
- CIT-1 checker passes a workflow where every `uses:` is a SHA (with or without comment) or `./local`.
- CIT-2 checker fails on `@v4`, `@main`, a short SHA and a branch name, naming file and line.
- CIT-3 checker ignores `uses:` inside comments and block scalars (`run: |`).
- CIT-4 checker accepts a folder and walks `*.yml` and `*.yaml`; exit 2 without arguments.
- CIT-5 `templates/ci/ci.yml` parses as YAML, has the six jobs, sets `permissions: contents: read`, and passes the checker.
- CIT-6 all workflows in `templates/` and `.github/workflows/` pass the checker.
- CIT-7 `prettierrc.json` parses; `prettierignore` ignores `node_modules`, `dist`, `coverage` and lockfiles.
- CIT-8 `install-ci.sh` into an empty git repo creates the files, a second run keeps them, and it prints the devDependencies.
- CIT-9 the manifest names the checker as managed and the CI files as seed, and `tools/studio-sync` accepts it.
- CIT-10 README states the Gate list (ESLint, Prettier, typecheck, tests 3x, audit, gitleaks, CodeQL, pinned Actions) and each maps to a file.

## Not in scope
Branch protection (a repo setting, handled by `audit/apply-repo-settings.sh`), `expo-doctor` (added by Expo apps), adopting the template in other repos (each lane does that on its own step).
