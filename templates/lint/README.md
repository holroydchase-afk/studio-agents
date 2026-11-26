# Studio lint gate

One ESLint 9 flat config for every studio repo, delivered by `studio-sync` as `eslint.config.mjs` (managed, do not edit) plus a seeded `.github/workflows/lint.yml`.

## Adopt it
1. Run the sync, then add the devDependencies from `package.json` in this folder to the product's `package.json` and a `"lint": "eslint ."` script.
2. Warnings only at first. Fix them in small PRs, then set the repository variable `STUDIO_LINT_STRICT` to `1` (or call the workflow with `strict: true`) so findings fail CI.
3. Repo-specific rules go in `eslint.studio-local.mjs` next to the config (a flat-config array or one object, appended last).

## What it turns on
- `@eslint/js` recommended and `typescript-eslint` recommended for `.ts`, `.tsx`, `.mts` and `.cts`.
- `eslint-plugin-react-hooks` flat `recommended` (includes the React Compiler rules) when `react` is a dependency.
- `eslint-plugin-react-native` rules (`no-unused-styles`, `no-inline-styles`, `no-color-literals`, `split-platform-components`, `no-single-element-style-arrays`) when `react-native` or `expo` is.

## Version limits (checked Nov 26)
- ESLint 9, not 10: `eslint-plugin-react-native` does not support 10 yet.
- TypeScript below 6.1: `typescript-eslint` does not run on TypeScript 7.0 (it crashes). A repo on 7 moves to `~5.9` until typescript-eslint supports 7. pm-tools did this and needed `dom.iterable` added to its tsconfig `lib`.

## This repo
The root `eslint.config.mjs` re-exports this config, so studio-agents lints itself. CI job `lint-config` installs the dependencies here and runs both the config tests and the lint.
