Hi Chase, I'm Hearth's staff PM. Answer first.

**Answer:** Hiding the name in the UI is not enough, and it is not the real work. Two places in the backend hand a group's name to any member, relatives included: the circles select policy (a plain table read returns the name, 0002) and `export_my_data` (returns circles with names, 0001). A relative can read the name with one API call, so the spec is about the data, not the screen. Verdict: needs-decision (one call below).

Repo is thin: no HANDOFF.md, no personas, anchors or spec docs. I worked from CLAUDE.md, API.md and the two migrations (each is one line, so I could not see the actual policy or RPC SQL). `agent-memory.mjs` crashes (missing `check-ux-run.mjs`), so no memory check ran.

**What is stale if we ship:** API.md says the app uses the table API and contract tests check it, so the circle row contract changes. 0002's policy and 0001's export text become wrong. Both need updating (the migration must also be undoable: ship a down script), plus any app screen showing a name.

**Critical path**
1. M1.1 Decide the relative view (one call below). Done when Chase answers. 0.2 session.
2. M1.2 Failing SQL and contract tests (qa-tdd), covering table read, RPCs, export, search. Red for the right reason. 1 session.
3. M1.3 Migration 0003: name readable by parents only. Preferred: move the name to a parent-only table or column grant so a select cannot return it; a view that nulls it for relatives is the fallback. Done when GRP-1..4 green 3x. 1 session.
4. M1.4 Fix `export_my_data` and any RPC returning the name. Done when GRP-3 green. 0.5 session.
5. M1.5 App shows the neutral label to relatives; update API.md and docs. Done when GRP-5, GRP-6 pass. 0.5 session.

**Not doing:** hiding it in the UI only (leaks via API), renaming groups, per-group visibility settings, hiding member lists (separate question), notification and email copy (listed as a risk, check after).

**Biggest risk:** other leaks of the name: notification text, email, search, error messages, the outbox. Handled by GRP-4 and a grep of every place a circle name is selected.

**Decisions for Chase**
- What do relatives see in place of the name? Recommend a neutral "Shared with you" on the post, no group label at all (A1 anxiety-less: no "who got left out" signal; A2 guilt-free).
- Is a "parent" the creator/owner role, or any parent role? I could not find the role definition in the repo; recommend whoever the current RLS treats as admin.

**Handoffs:** qa-tdd writes the tests, then engineer, then privacy-security reviews (audience breach is P0), grandparent-ux for the relative label.

lint-ok: SL-7 no public copy or released-version claim is changed; only internal API docs go stale.

Priority: any name leak to a relative is a P0 (audience breach).

```spec
verdict: needs-decision
bet: Parents can name groups freely (like a private list) without worry; it worked when no relative can read a group name through the app or the raw API
step: M1.1 | Decide what relatives see instead of the name | Chase answers the decision line | 0.2 session
step: M1.2 | Failing SQL and contract tests for every read path | GRP-1 to GRP-4 red for the right reason | 1 session
step: M1.3 | Migration so only parents can read the name | GRP-1 and GRP-2 green 3x | 1 session
step: M1.4 | Remove the name from the data export for relatives | GRP-3 green 3x | 0.5 session
step: M1.5 | Neutral label in the app and docs updated | GRP-5 and GRP-6 pass | 0.5 session
criterion: GRP-1 | auto | Given a relative who is a member of group G named "Test Group", when they read the groups table directly with a plain select, then the name is not returned (null or absent) and the row count for visible groups is unchanged
criterion: GRP-2 | auto | Given a parent who is a member of group G, when they read the groups table, then the name "Test Group" is returned
criterion: GRP-3 | auto | Given a relative with a group named "Test Group", when they call export_my_data, then the output contains no "Test Group" string and still lists the group by id
criterion: GRP-4 | auto | Given a relative, when they call any RPC, search or notification outbox row for a post shared to "Test Group", then the string "Test Group" appears nowhere in the result
criterion: GRP-5 | manual | Open a post shared to a group as a relative on a phone -> the screen reads "Shared with you" and shows no group name
criterion: GRP-6 | auto | Given another account that is a non-member, when they select group G, then 0 rows come back (not found) and the same holds after the migration
criterion: GRP-7 | auto | Given a parent renames group G to "" or a 200 character name, when a relative reads it, then still nothing is returned and the parent sees the saved value
criterion: GRP-8 | auto | Given a member whose role changes from parent to relative, when they read group G again, then 0 name values are returned immediately, and the same read run twice gives the same result
criterion: GRP-9 | auto | Given a signed-out visitor, when they select group G or call export_my_data, then 0 rows come back or the call is refused, and no name appears
criterion: GRP-10 | auto | Given a relative with 0 groups and an empty group (0 other members), when they call export_my_data, then the export lists 0 groups and returns no error
criterion: GRP-11 | manual | Open a shared post as a relative at 360 by 640 px -> the "Shared with you" label fits within 1 screen with no horizontal scroll
cut: UI-only hiding | the raw API and the export would still leak the name
cut: Hiding member lists | separate decision, not asked
cut: Per-group name visibility setting | deep not wide, no persona asked for it
risk: Name leaks through search, notifications, email or the export, not only the table read | GRP-4
risk: A migration on a live database with real family data and no rollback | GRP-8
risk: Role definition for "parent" is not in the repo so the policy could target the wrong people | GRP-2
decision: What do relatives see instead of the name | A neutral "Shared with you" with no group label
decision: Who counts as a parent for this rule | Whoever the current RLS treats as admin or owner
handoff: qa-tdd | failing tests for GRP-1 to GRP-4 and GRP-6 to GRP-8 | red for the right reason
handoff: engineer | build M1.3 and M1.4 as one new migration | GRP-1 to GRP-10 green 3x
handoff: privacy-security | review every read path of the name | no P0 left
handoff: grandparent-ux | check the neutral label wording | no P0 or P1
```
