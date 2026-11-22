# Plan: Pages deploy of the static demo, and the step that makes the repo public

Status: plan only. Nothing was deployed, no visibility was changed, nothing was merged.

## What the repo says
- CLAUDE.md: never change repo visibility without the owner's go.
- PLAN.md: M1.5 (pre-public privacy review) is done and waiting on the owner's decision. M1.6 (Pages deploy) is blocked on M1.5.
- .github/workflows/pages.yml: builds and deploys after CI passes on main, and skips itself while the repo is private.
- The repo holds only these three files plus one commit on `master`. There is no demo source, no build script and no CI workflow. The pages.yml content is a one-line description, not a working workflow. Only the files above were read.

## Order of steps
Making the repo public comes first. The deploy is gated on it, so it follows.

1. Owner's go (about 2 minutes, owner only). This is the single gate. One word is enough: "Go public: yes". Nothing below the line runs without it. I recommend yes, since the review is done.
2. Make the repo public (about 2 minutes, owner or Claude after the go). GitHub, Settings, General, Danger Zone, "Change visibility", Public. Claude must not do this before the go.
3. Confirm the Pages source is "GitHub Actions" (Settings, Pages). If the repo plan only allows Pages on public repos, this step is only possible after step 2.
4. Trigger the deploy: push or re-run CI on the default branch. pages.yml no longer skips, builds the static demo and deploys it. Pages deploys on every merge to main, so a PR that changes the demo build waits for the owner's go.
5. Verify (about 5 minutes). The workflow run is green and the demo URL loads. The demo is labeled as sample data and makes no network calls other than loading Pyodide.

## Gaps to fix before step 1 (not covered by this repo)
- The repo has no real pages.yml, build script or demo. Before the go there must be an actual workflow and a built demo. That is a code change, so it needs a failing test first (qa-tdd), then the build.
- `master` is the only branch, while pages.yml refers to main. Confirm which is the default branch.
- No HANDOFF.md exists, and the studio rules require one. Add it with the next progress commit.
- Visibility is the owner's call, so the privacy-security review result (M1.5) should be linked in the go request.

## Time for the owner
About 5 minutes in total: one yes, optionally the Settings click, and a glance at the live URL. Claude does the rest.

## Rollback
Switch visibility back to Private in Settings. Unpublish Pages if needed. A public repo may already have been cloned, so the privacy review must be complete before the go.

## Decision needed from the owner
"Go public: yes/no" (recommended yes, after the missing workflow and demo are in place).
