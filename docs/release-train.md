# Release train and portfolio drift check

_Chase, Nov 23: "batch all the changes that impact the live site for late at night and build them up over the day." Owner: Product Studio. Logic and tests: `tools/release-train.mjs`, `tools/portfolio-drift.mjs`, `tests/portfolio-drift.test.mjs`._

## The release train (live-site PRs ship once a night)
- **During the day:** a PR that changes a live site (portfolio, a Pages demo, a live app page) gets the `release-train` label instead of waiting on Chase one by one. Open it, get it green, label it, move on. Previews still come first; hide or move, never delete.
- **Late at night (default 1 AM ET):** one routine merges every eligible PR, verifies, and posts one release note.
- **Eligible** = labeled, not a draft, all checks green, mergeable, and any `Merge after: #N` is already merged or also riding. Anything else is held with its reason in the note.
- **Order:** oldest first inside a repo, the portfolio repo last (it links to the demos), `Merge after` respected. Merge commits only, no force-push, no branch deletes.
- **Verify** after each repo's Pages deploy: `https://chaseholroyd.com/` returns 200 and contains `Hey there, I'm Chase.` intact (CI HOME-7), plus each merged demo's URL returns 200. Deploys: start a fresh run (workflow_dispatch), never re-run a failed one, at most one retry, then stop (pace-no-reruns).
- **A failed check** stops the train, opens a revert PR for the PR that broke it, and says so in the note. No retry loops.
- **One release note** (`releaseNote()` in the tool) goes to the project chat: merged, held with reasons, verified, and any deploy step still owed.

## Approval: the batch, not each PR
Proposed once, recommendation first:
1. **Auto-ship (recommended after a week of clean trains).** Chase says "auto-ship the train" once. Every night's green train merges without asking; the morning note is the receipt.
2. **One yes per train.** The routine posts the queue in the evening; Chase's single "ship tonight's train" (any time before 1 AM) releases it. Silence ships nothing and the queue waits.

Until Chase picks, the default is option 2. `decideShip()` encodes both. Never ask after his 11 PM ET cutoff; the evening post is the ask.

## Portfolio drift check (product repos tell the portfolio when it may be stale)
- **Action:** `holroydchase-afk/studio-agents/actions/portfolio-drift`. A product repo adds `.portfolio-watch.json` (paths behind its demo and page: screens, copy, features, claims) and the `portfolio-drift.yml` workflow from `templates/`.
- **On a merge to main** that touches a watched file, it files (or comments on the open) `INTAKE: portfolio drift from <product>` on the portfolio repo, labels `intake` and `portfolio-drift`, in the standard intake format. The portfolio thread then checks the page and demo against the product's main and logs it under "Portfolio / public presence".
- **Needs one secret** in each product repo: `PORTFOLIO_INTAKE_TOKEN`, a fine-grained token with Issues write on the portfolio repo only. Without it the action never fails the build; it writes the finding to the job summary and a notice.
- **Adoption** goes through an intake issue per product repo (ownership rule); this repo does not edit product repos.
- A watch list only catches paths someone listed. The one-time and periodic audit (compare each page and demo to the product's main) catches the rest.
