I wrote the spec for a Studio Console page. Nothing is built and the page is still hidden.

**What the spec says**
- **Why it's shaped this way:** the last Console was hidden because it claimed "8 agents" when only two had run evidence. This version can't overclaim.
- **Page:** one table with a row per agent in the roster. The headline is "N of M agents have scores", with N taken from the data.
- **Row status:** Scored, Run but not scored, or No runs yet. A scored row shows the arm (with agent or plain), the score, the run count, the last-run date, the limits and an evidence link. An unscored agent shows only "No runs yet".
- **Expected today:** qa-tdd and staff-pm are Scored and every other agent is No runs yet. I couldn't see the studio-agents scores from here, so the spec has no numbers. They must be copied from `evals/agent-misses/runs`.
- **Guard:** the page renders from a generated `data/agent-status.json`. The build fails if a Scored row has no evidence link, arm or limits, or has zero runs. New agents show up automatically as No runs yet.
- **Tasks:**
  1. The data contract and generator, with a failing test first.
  2. The page in `tools/build.py`, kept hidden.
  3. Reviews by ux-reviewer, positioning and privacy-security.
  4. A claims check against `docs/claims-register.md`.
  5. Unhide only on Chase's go, because a merge to `main` deploys the site.

**Decision for Chase (blocks the build)**
- **(a)** Build now on the qa-tdd and staff-pm scores, and swap the data source when the new evals land.
- **(b)** Wait for the new evals and the triage after the merge.
- **My recommendation:** build the generator and page now behind the hide, and unhide only after the new evals. The data contract is the same either way.

**Files**
- `docs/SPEC-STUDIO-CONSOLE.md`: the spec.
- `HANDOFF.md`: updated with the done item, the next step (Chase picks a or b, then task 1) and the hidden status.
