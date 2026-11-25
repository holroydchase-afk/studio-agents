# Public repo standards

A checklist for judging whether a public repo looks professional to an engineer or hiring manager. The stakeholder agent loads this file when it reviews a repo. Sources: GitHub's community profile, OpenSSF Scorecard, and a staff engineer's first impression. Never claim more in a README than run logs, tests or the claims register show.

## How to score
Mark each line Pass, Partial or Fail. Rank repos by visibility: pinned first, then most starred, then the rest. Report a short scorecard per repo: the top three gaps and the one-line fix for each.

## 1. GitHub community profile
- README: what it is, why it exists, install, usage, one screenshot or demo link, license line. No overclaims.
- LICENSE present and recognised by GitHub (not NOASSERTION).
- CONTRIBUTING.md (can be short; say how to report a bug and open a PR).
- CODE_OF_CONDUCT.md (Contributor Covenant is fine).
- SECURITY.md (how to report a vulnerability privately).
- Issue templates (bug, feature) and a pull request template, in `.github/`.
- Repo description and 3 to 6 topics set.
- Social preview image or at least a clear first README screen.

## 2. OpenSSF Scorecard basics
- CI runs on every PR (tests, lint) and passes.
- Branch protection on the default branch (PRs, required checks).
- Dependencies pinned (lockfile committed; GitHub Actions pinned to a version or SHA).
- Dependabot or equivalent enabled.
- Workflow `permissions:` set to least privilege.
- No secrets, tokens, internal ids or personal data in the tree or history. Run secret scanning.
- Releases and tags with notes, once the project is usable by others.

## 3. First-impression checks
- Root holds only what a visitor needs: README, LICENSE, community files, source, config. Agent notes, planning, HANDOFF and story files live under `docs/internal/` (move, never delete).
- No stray scratch files, generated output, `.DS_Store`, large binaries or duplicate copies.
- Consistent layout and naming (one casing style, literal names).
- Default branch is `main` and is the one that works.
- Green CI badge in the README, pointing at a real workflow.
- Commit history is readable: small commits, clear messages.
- Docs describe how to run and test in under five commands.

## 4. Open-source release gate
Before telling anyone to use a repo: community profile at 100 percent, CI green, secret scan clean, privacy-security review done, claims checked against the claims register.

## Studio notes
- Moving internal docs: update every path that names them (the studio sync rule reads `HANDOFF.md`, so keep a root `HANDOFF.md` pointer or update the rule in the same PR).
- Product repos are not edited from this project. File one `intake` issue per repo with its scorecard gaps.

## 5. Repo settings (GitHub's best-practices page)
Settings are not in the tree, so a PR can't fix them, and cloud threads can't write them (the proxy blocks settings writes). Check these in Settings or with a laptop `gh`:
- Description and 3 to 6 topics on every public repo.
- Branch protection or a ruleset on the default branch: require a PR and the CI check, block force pushes and deletions.
- Automatically delete head branches after merge (keeps branch lists short; the studio never deletes branches by hand).
- Secret scanning and push protection on for public repos; Dependabot alerts and security updates on.
- Default branch is `main` (energy-scanner still uses a thread branch; see its HANDOFF).
- Large binaries and generated files stay out of git (use Releases or Git LFS); lockfiles stay in.

### Audit 2026-11-25 (all 15 repos, read-only API plus a clone check)
- Community files (README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, PR and issue templates): complete everywhere except charlie, crew-clock and role-radar (no CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue templates; charlie and crew-clock also no PR template). atlas-portfolio and websites (private) have none.
- Descriptions missing: 11 of 15. Topics: 0 on all 15. Branch protection and rulesets: none on any repo. Delete-branch-on-merge: off on all.
- Secret scanning or push protection off: charlie (both), hearth (both), crew-clock (push protection).
- Workflows: all set `permissions:` except one in hearth; actions are tag-pinned, not SHA-pinned (Dependabot keeps the tags fresh; SHA pinning is a later hardening).
- Dependabot missing: fruit-palettes, atlas-portfolio, websites; hero-backgrounds and persona-twins added in the 2026-11-25 PRs.
- Portfolio LICENSE is "all rights reserved", so GitHub shows NOASSERTION; that is intentional.
- CODEOWNERS: skipped on purpose. A solo owner gains nothing, and the agents check treats it as code, so it would force a qa-tdd run on a no-op file.

### Added from the Linux Foundation report (March 2023, "Recommended Practices for Hosting and Managing OS Projects on GitHub")
Beyond what sections 1 to 5 already cover, the report recommends:
- SUPPORT.md saying where to get help; GitHub Discussions on for repos meant for outside users; archive repos that no longer get support.
- CODEOWNERS plus branch protection so every change is reviewed. Studio note: CODEOWNERS counts as code in the agents check, so add it only in a PR that runs qa-tdd, or change the check first (architect lane).
- A license line and badge in the README, an SPDX identifier comment at the top of source files, and third-party code marked with its license (THIRD_PARTY_NOTICES is already used in four repos).
- Code scanning (CodeQL), Dependabot, GitHub Security Advisories for reported vulnerabilities, and a named person plus a mailbox for security reports.
- Signed commits, so GitHub shows them as Verified; OpenSSF Scorecard and, later, the OpenSSF Best Practices badge.
- DCO sign-off or a CLA only once outside contributors appear; not needed for solo repos.
- Docs the report lists that the studio lacks: governance, release cadence, roadmap and FAQ (the README or docs/ is enough for small repos); organisation-level default community health files (needs a `.github` repo, so a settings-level change for Chase).
- Run Repolinter (TODO Group) as a quick automated check of the community files.
- English for all public content.

### Added from Syracuse University OSPO "Best Practices for Open Source Software Development"
- AI disclosure: say in the README (or source comments) which AI tools were used and for what (code, tests, docs), and that a human reviewed it. Studio repos are mostly AI-built, so every public README carries this line; claim only what the run logs show.
- Commit and branch hygiene: one logical change per commit, a branch per piece of work, branches merged within one to two weeks, never commit straight to the default branch, commit daily.
- PRs small enough to review in one sitting (under about 500 changed lines), with what changed, why and how to test it.
- CHANGELOG.md (Added, Changed, Deprecated, Removed, Fixed, Security) and Semantic Versioning starting at 0.1.0, once a repo ships releases.
- Issue labels `good first issue`, `help wanted` and `documentation` on repos that want outside contributors.
- README: a one-paragraph summary and a quick-start example that works in 60 seconds; document every install method.
- Tests: edge cases and failure modes (service down, corrupt file), not only happy paths; realistic messy sample data; a CI matrix over the versions users run.
- Function docs say what and why (docstrings, JSDoc), and are reviewed whenever the function changes.
- Declare every dependency explicitly with version constraints; keep unneeded files (stray csv or pdf) out of git.
