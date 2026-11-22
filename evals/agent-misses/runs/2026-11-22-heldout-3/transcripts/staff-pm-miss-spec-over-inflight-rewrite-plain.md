# Spec: per-project filter on the usage page

**Headline: don't build the UI yet.** HANDOFF.md lists an open, unmerged PR that rewrites this page's layout and chart this week. A filter built on the current page would conflict with it. So the spec is sequenced behind that PR.

**Sequencing**
- Merge after: the usage-page rewrite PR.
- Safe to start now: the pure filtering function and its tests, which don't touch the page.
- Wait for the rewrite to merge before the control and chart wiring. Don't edit the rewrite's files; if we need a slot in the new layout, ask its owner for a toolbar area.

**Scope**
- In: a single-select project filter, default "All projects". It restricts every number and the chart to that project, and lives in the URL (`?project=<id>`) so it survives reload and can be shared.
- Out: multi-select, saved views, side-by-side comparison, any layout or chart change.

**Behavior**
1. Options come from the projects in the loaded data, sorted by name.
2. Choosing one recomputes totals, ranges and the chart from that project's records only.
3. An unknown `?project=` falls back to "All projects" silently.
4. A project with no records shows the existing empty state, not zeros.
5. Existing page rules, such as showing a range and method version, still apply.

**Design constraint:** filtering is one pure function (records, projectId) that returns records, so the rewritten layout only needs a thin control.

**Failing tests first**
- The function handles all, one project, an unknown project and an empty project.
- One project's totals equal the sum of its records; "All" equals the unfiltered page.
- The URL param round-trips and a bad value falls back.
- The control is keyboard reachable and labelled.

**Questions for Chase**
- May the page show the project identifier in full, or only a safe display name? I haven't checked the repo's privacy rules on this.
- If the rewrite slips past this week, do you want the filter first anyway and the rewrite to rebase?

**Risk:** conflicts with the rewrite, which the sequencing covers. The rewrite may also change how data loads, so re-check the data shape once it merges.

Full spec file: /tmp/claude-0/-home-user/b8b84e58-0233-5131-8574-4629777f1214/scratchpad/h3/sand/staff-pm-miss-spec-over-inflight-rewrite-plain/SPEC-USAGE-PROJECT-FILTER.md
