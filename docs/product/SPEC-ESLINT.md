# SPEC: the studio lint gate (ESLint)

Chase, Nov 26: adopt ESLint as the studio-standard lint gate; he shared `npm init @eslint/config@latest` as the base. Scoped by the coordinator; staff-pm did not run.

One shared flat config and one reusable CI workflow in studio-agents, rolled out by sync. Products that are hidden (Charlie, Crew Clock, Energy Scanner, Build Slate) are skipped. `react.doctor` stays optional and advisory (its license bars using it to train or improve AI); nothing here depends on it.

## Design
- `templates/lint/eslint.config.mjs`: ESLint 9 flat config (the React Native plugin does not support ESLint 10 yet). Base `@eslint/js` recommended, `typescript-eslint` recommended for `.ts/.tsx/.mts/.cts`. Adds `eslint-plugin-react-hooks` flat `recommended` (includes the React Compiler rules) when the project's `package.json` lists `react`; adds `eslint-plugin-react-native` rules (`no-unused-styles`, `no-inline-styles`, `no-color-literals`, `split-platform-components`, `no-single-element-style-arrays`) when it lists `react-native` or `expo`.
- Warnings by default: every rule the config turns on is `warn`. `STUDIO_LINT_STRICT=1` makes them `error`.
- Optional `eslint.studio-local.mjs` next to the config is a flat-config array (or one object) appended last, so a repo can turn rules off without forking the managed file.
- `templates/lint/lint.yml`: the reusable workflow (`workflow_call`, inputs `working-directory`, `strict`) that runs `npm ci` then `npx eslint .`.
- `templates/lint/package.json`: the exact devDependency versions to install.
- `templates/manifest.json`: `eslint.config.mjs` managed, `.github/workflows/lint.yml` seed.

## Acceptance criteria
- LINT-1: in a plain JS project, a file with an unused variable gives a `no-unused-vars` warning and ESLint exits 0.
- LINT-2: a `.ts` file with `any` gives a `@typescript-eslint/no-explicit-any` warning; a `.js` file does not load typescript rules.
- LINT-3: with `STUDIO_LINT_STRICT=1` the same findings are errors and ESLint exits 1.
- LINT-4: with `react` in package.json, a conditional hook call reports `react-hooks/rules-of-hooks` and a `setState` inside an effect body reports `react-hooks/set-state-in-effect`; without `react` in package.json neither rule exists.
- LINT-5: with `react-native` (or `expo`) in package.json an inline style reports `react-native/no-inline-styles`; without them the rule does not exist.
- LINT-6: `eslint.studio-local.mjs` can turn a rule off (`"off"`) and the finding disappears.
- LINT-7: ignored paths: `node_modules`, `dist`, `build`, `coverage`, `.expo`, `ios`, `android`, `.next`, and `*.min.js` are never linted.
- LINT-8: the manifest lists the config as managed and the workflow as seed, the sources exist, and `workflow_call` has `working-directory` and `strict` inputs, runs `npm ci`, and sets `STUDIO_LINT_STRICT` from `strict`.
- LINT-9: `templates/lint/package.json` pins eslint to major 9 and lists typescript-eslint, @eslint/js, globals, eslint-plugin-react-hooks and eslint-plugin-react-native.
- LINT-10: the CI job `lint-config` installs the template deps and runs the lint tests with `LINT_REQUIRE=1`, which turns "eslint not installed" skips into failures.

Open for Chase: when a repo is clean, flip it to strict by setting `strict: true` in its workflow call (no config change).
