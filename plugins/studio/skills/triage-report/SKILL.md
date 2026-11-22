---
name: triage-report
description: Sort a mixed issue report (screenshot, note or link from Chase testing a product) into UX, Staff PM or QA-TDD, confirm it against the repo, and turn it into an eval case. Use whenever Chase reports a problem in any product.
---

# Triage a reported issue

Chase drops issues as he tests, unlabeled and mixed. Each one becomes an eval case for the agent that should have caught it. Reply to Chase in a few words ("UX, case added"). Never ask him to label anything.

## 1. Route (one report can have more than one lane)
| Lane | The report is about | Ask yourself |
|---|---|---|
| `ux` | What a person sees or reads: layout, wording, contrast, tap size, overlap, a confusing flow, an ugly or generic screen | Would ux-reviewer, looking at this screen, have flagged it? |
| `staff-pm` | A spec or scope miss: a case nobody wrote down, a missing acceptance criterion, a collision with other work, scope that was wrong | Would a complete spec have named this case? |
| `qa-tdd` | A defect that got past tests: wrong number, crash, regression, a test that passes while the bug ships, a flaky or vacuous test | Should a test have failed before this shipped? |

Run `node tools/triage-report.mjs suggest "<report text>"` for a keyword hint, then decide yourself. When two lanes both apply (a missing criterion that also shipped untested), record both. If none fits, it is not an agent miss (a plain bug fix or a new idea): say so in one line and stop.

## 2. Confirm against the repo
Find the product's repo and reproduce or locate it: the screen, the code at fault, the PR that shipped it, the spec that lacked it. Set `--confirmed yes` only when you found it. If you can't (private data, device-only), use `unchecked` and keep going; unchecked reports do not enter the scored set.

## 3. Record it
```
node tools/triage-report.mjs add --product <name> --lane <lane> [--lane <lane>] \
  --summary "<one line, no personal data>" --evidence <screenshot path or PR> --confirmed yes --pattern <tag>
```
The tool assigns the id (RPT-n) and alternates dev and held-out per lane. Reuse a pattern tag from `evals/agent-misses/README.md` where one fits.

## 4. Build the case (follow the owning thread's format; don't rebuild infra)
- **ux**: add a `ux-reviewer-fresh-real-<product>-<screen>` case under `plugins/studio/evals/` from the real screenshot (see the existing `-real-` cases: `case.yaml`, `prompt.md`, `graders/`, scaffold `setup.sh`). The prompt must not hint at the problem.
- **staff-pm**: add an entry to a new batch in `evals/agent-misses/staff-pm-cases-batch<n>.mjs`, then `node tools/eval-miss-cases.mjs`-style generation as that lane's builder does.
- **qa-tdd**: add a rebuilt repro (code under 25 lines, shipped test green, gap test red) to `evals/agent-misses/qa-tdd-cases-batch<n>.mjs`; `node tools/eval-miss-cases.mjs --verify` must prove it.
Held-out cases are never read while tuning the agent. Then `node tools/triage-report.mjs status RPT-n case-added --case <case name>`.

## 5. Batch and ship
Small PRs, one per few reports, merged on green. Update HANDOFF.md. Cases that came from Chase's own testing are tagged `src-chase`. Graders run on Opus; agents run on Sonnet.
