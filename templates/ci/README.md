# Studio CI template

One set of required checks so a new repo starts compliant (standard stack SS-4 and SS-5, `docs/product/SPEC-CI-TEMPLATE.md`).

## Adopt it
1. Run `scripts/install-ci.sh /path/to/repo`. It adds `.github/workflows/ci.yml`, `.prettierrc.json` and `.prettierignore` and leaves existing files alone. Run `scripts/install-security.sh` for gitleaks and CodeQL, and the studio sync for the lint gate and `scripts/check-actions-pinned.mjs`.
2. Add the devDependencies the installer prints (`prettier`, plus the lint ones from `templates/lint/package.json`) and scripts `typecheck` (`tsc --noEmit`), `test` and `lint`.
3. Run `npx prettier --write .` once in its own PR, then mark the jobs below as required checks in branch protection.

## The Gate list (every one is a required check)
| Gate | Where it runs |
|---|---|
| ESLint | `lint.yml` and `eslint.config.mjs` (templates/lint), called by the `lint` job in `ci.yml` |
| Prettier | `format` job in `ci.yml`, config in `prettierrc.json` and `prettierignore` |
| typecheck | `typecheck` job in `ci.yml` (`npm run typecheck`, skipped if the script is absent) |
| tests 3x | `test` job in `ci.yml` runs `npm test` three times in a row, so flaky tests fail |
| npm audit | `audit` job in `ci.yml`, fails on high or critical |
| gitleaks | `security.yml` (templates/security), full git history |
| CodeQL | `codeql.yml` (templates/security) |
| SHA-pinned Actions | `pinned` job in `ci.yml` runs `check-actions-pinned.mjs` |

## How to pin an Action
Use the full commit SHA and keep the tag as a comment: `uses: actions/checkout@<40-hex sha> # v7`. Find the SHA with `git ls-remote --tags https://github.com/<owner>/<repo>.git <tag>` (for an annotated tag use the `^{}` line). Dependabot's `github-actions` entry raises a PR with the new SHA and comment, so pins stay current. Local actions (`./...`) need no pin.
