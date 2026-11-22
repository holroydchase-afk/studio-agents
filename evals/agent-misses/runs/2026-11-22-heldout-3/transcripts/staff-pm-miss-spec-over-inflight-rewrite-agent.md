tool: agent-memory | ok | searched usage filter rewrite, no matches
tool: agent-guard | ok | kill staff-pm

# Per-project filter on the usage page

**Answer:** Build the filter logic now, but hold the UI until the in-flight layout and chart rewrite PR merges. HANDOFF.md lists that PR as open, in progress and not merged, and it rewrites the layout and chart of the same usage page this week. A filter UI built on the old layout would conflict or be thrown away. The filter is a new feature, so it only gets in as a follow-on to that PR.

## Critical path
1. FLT-1 core: pure `filterByProject(rows, projectId)` plus totals, no page code, so it cannot collide with the rewrite. Done when FLT-1 to FLT-4 are green and the stale README, screenshots and docs are listed for step 4. 1 session.
2. Wait gate: the rewrite PR is merged. Done when HANDOFF.md moves it to done. 0 sessions.
3. Wire the filter into the rewritten page and chart. Done when FLT-5 and FLT-6 pass on the merged layout. 1 session.
4. Done list: README usage screenshot, the usage-page docs and any case-study image are stale after this change, so they are refreshed in the same PR. 0.5 session.

## Rules
- One rounding rule: kWh shown to 2 decimals, and the total is the sum of unrounded values, rounded once. Case: rows 0.004, 0.004, 0.004 per project sum to 0.01 (not 0.00 from rounding each one first).
- Pinned clock for the date range: 2026-11-16 to 2026-11-22. Never today's date.
- Rollback: revert the PR; the filter lives in one component and one core function, and nothing stored changes.

## Not doing
Multi-select, saved filters and filter by model are backlog. They remove no blocker.

## Biggest risk
Merge conflicts or a double rebuild of the usage page against the rewrite PR. Handled by building core first (FLT-1) and doing the UI only after the merge (step M1.2).

## Decisions for Chase
Whether to wait for the rewrite PR (recommended) or to stack the filter on its branch.

lint-ok: SL-3 this spec adds no page layout; the rewrite PR owns layout and its height budget
lint-ok: SL-6 no auth or sign-in in this change

```spec
verdict: needs-decision
bet: Chase can see usage for one project at a time; it worked when he picks a project and the total matches that project's rows
step: M1.1 | Pure filter and totals in core | FLT-1 to FLT-4 green | 1 session
step: M1.2 | Wire filter into the page after the layout rewrite PR merges | FLT-5 and FLT-6 pass on the merged layout | 1 session
step: M1.3 | Refresh stale README screenshot and usage-page docs | screenshot and docs show the filter and match the released build | 0.5 session
criterion: FLT-1 | auto | Given rows for projects a and b with 2 rows each and filter "a", then 2 rows return and the total sums only those 2
criterion: FLT-2 | auto | Given zero rows or a project with no rows, then the result is 0 rows and a total of "0.00"
criterion: FLT-3 | auto | Given three projects with 0.004 kWh each and a pinned clock of 2026-11-22, then the shown total is "0.01" using one rounding of the unrounded sum
criterion: FLT-4 | auto | Given the same filter applied twice, then the rows are unchanged and the count is 2
criterion: FLT-5 | auto | Given the rewritten page with the filter set to "a", then the chart plots 2 points, not 4
criterion: FLT-6 | manual | Open the usage page after the rewrite merges and pick a project -> the heading reads "Project a" and the total matches the rows
cut: Multi-select and saved filters | not needed to prove the bet
cut: Filter by model | no blocker for a core persona
risk: Conflict with the in-flight layout and chart rewrite PR | M1.2
risk: Rounded totals disagree with the sum of rows | FLT-3
decision: Wait for the rewrite PR to merge before the UI, or stack on its branch | Wait; build core now, UI after the merge
handoff: qa-tdd | failing tests for FLT-1 to FLT-4 | red for the right reason
handoff: engineer | build M1.1 now, M1.2 after the rewrite merges | FLT-1 to FLT-6 green 3x
```
