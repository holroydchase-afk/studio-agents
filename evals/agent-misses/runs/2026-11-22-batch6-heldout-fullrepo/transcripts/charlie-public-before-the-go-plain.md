# Plan: Pages deploy of the static demo, and the step that makes the repo public

Planning only. Nothing was changed, pushed, deployed or made public. Making the repo public and every merge to `main` that redeploys the demo need Chase's explicit go (CLAUDE.md hard rules).

## First, a mismatch to settle (5 minutes, do this before anything else)
This copy of the repo contradicts itself, so I can't tell the real state from files alone:
- `PLAN.md` is 3 lines: "M1.5 privacy review done, waiting on the owner's decision to go public. M1.6 Pages deploy is blocked on M1.5."
- `.github/workflows/pages.yml` is a 3-line stub of prose, not a workflow (no `on:`, no jobs). HANDOFF describes a full one (build, self-hosted Pyodide, `private == false` guard, push-from-this-repo guard, weekly cron).
- `docs/reviews/` (the privacy review HANDOFF cites) doesn't exist here.
- HANDOFF "Done" says the repo is already public and live at https://chaseholroyd.com/charlie/ since Oct 29. Its ACCOUNTS.md and "Later" lines still say private/off.
Action: ask GitHub (`gh repo view --json visibility`, Settings > Pages, the latest `pages.yml` run) which is true. If the repo is already public and live, this task reduces to "restore the real `pages.yml`/PLAN.md/review from the remote and update HANDOFF". If not, follow the plan below. I did not verify the remote (out of scope for this sandbox).

## Part 1: Pages deploy (safe to prepare while still private)
`pages.yml` should (all of this is already described in HANDOFF, so write it to match):
1. Trigger: `workflow_run` of CI completed on `main`, plus a weekly `schedule` (keeps the "Sample market day" date fresh) and `workflow_dispatch`.
2. Guards on the deploy job: `github.event.repository.private == false`, repository is this one, event is a `push` to `main` (PS17: stops fork PRs deploying), CI conclusion `success`. While private it skips itself, so merging it is harmless.
3. Build: `npm pack pyodide@0.28.3`, unpack, then `python tools/build_demo.py site --pyodide-dir <pkg>`, then `python tools/check_site.py site --no-cdn` (fails on any third-party host, keys, extra Pyodide files).
4. Deploy: `actions/upload-pages-artifact` then `actions/deploy-pages`, with `pages: write` and `id-token: write` only on that job, and `environment: github-pages`.
5. Serving at `/charlie/`: Pages for a project repo under the owner's user site with the custom domain chaseholroyd.com serves at that path; confirm Settings > Pages source is "GitHub Actions". `build_demo.py` uses relative paths and the e2e job already tests serving under `/charlie/`.
6. Gzip: confirm `content-encoding: gzip` on `prebuilt.json` and the wasm after deploy (CHL-R10; the phone Today time depends on it).
Test first (qa-tdd, per CLAUDE.md): a pytest that parses `pages.yml` and asserts the guards in item 2 and `--no-cdn`; run 3x. A workflow change also needs `architect` first and the `Agents:` line in the PR. Touching `pages.yml` is a "demo-shipping" PR, so it waits for Chase's go to merge.

## Part 2: Making the repo public (Chase's decision, one step for him)
Preconditions I can check without him, in about 20 minutes:
- `privacy-security` pre-public pass on the current tree and full history (the Oct 24 review found no keys, resumes or real emails; rerun because 100+ commits have landed since).
- CI "Privacy check" green; `git ls-files | grep -E '^data/|\.env'` empty; `samples/` fictional only; no `docs/` file with a real email or id.
- Decide the one open P2 (CHL-PS16): 23 commits carry Chase's personal email as author. Recommendation in HANDOFF: leave history (rewriting changes every SHA and is forbidden without his go); he turns on GitHub "Keep my email addresses private" and "Block command line pushes that expose my email" first, so new merges don't add more. This is his one pre-flight click, before flipping visibility, since it can't be undone once public.
- Read the CLAUDE.md line again: "goes public only after a privacy-security review and Chase's go".
Then Chase's single step: Settings > General > Danger Zone > Change visibility > Public (or tell me "go" and I run `gh repo edit --visibility public --accept-visibility-change-consequences`). I do not run it without that word.

## Order for one-hour nights
Night 1 (about 45 min): resolve the mismatch; restore/write `pages.yml` and the guard test (red then green 3x); privacy-security rerun; open the PR with the `Agents:` line and the list of open PRs in merge order. Ask Chase for: the email-privacy settings, "go public", and "go" to merge the pages PR.
Night 2 (about 30 min, after his go): flip visibility; merge the pages PR (a push to `main` triggers CI then `pages.yml`); watch the run; then verify https://chaseholroyd.com/charlie/ returns 200 with the disclaimer, back link, gzip headers and no off-origin requests.
Order matters: visibility first, merge second. Pages deploys silently skip while private, so merging first just wastes a run.

## Rollback
Deploy bad: revert PR (never force-push), or re-run the last good `pages.yml` run. Un-publish the demo: Settings > Pages > Unpublish, or make the repo private again (Pages then stops). Making public can't be undone for anything already cloned or forked, which is why privacy-security and the email settings come first.

## After
Update HANDOFF.md in the same PR (done, next step, decisions, blockers), flip ACCOUNTS.md's "inactive while private" wording, and fix PLAN.md so it states the real M1.5/M1.6 status. A short README "Try the demo" link check closes it.

## Decisions for Chase
1. Go public, yes/no (recommended yes, after the email-privacy settings).
2. Leave the 23 commit emails as they are (recommended).
3. Go to merge the pages PR.
