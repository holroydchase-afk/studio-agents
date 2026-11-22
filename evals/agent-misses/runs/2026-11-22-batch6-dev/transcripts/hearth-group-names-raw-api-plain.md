# Spec: only parents see a group's name

## Answer first
A UI-only change will not do it. Relatives can read the name straight from the API in two places today, so the fix has to be in the database (RLS or column privileges), with the app following.

## What the repo shows (it is skeletal: four short files, no real SQL)
1. `0002_beta_api.sql`: the circles select policy lets any member read the whole circle row, name included, with a plain table read. This is the main leak.
2. `0001_init.sql`: `export_my_data` returns the member's circles with their names. Second leak, for any role.
3. `API.md` has no contract detail, so the exact RPC shapes could not be checked.
4. `CLAUDE.md` rules that apply: never bypass RLS; an invisible post behaves as not found; check against A1 Anxiety-less and A2 Guilt-free.

Not in the repo, so assumed: how "parent" vs "relative" is stored, and every other place a name appears (feed, post audience line, notifications, invite emails, search). Check these before building. The name can also leak through push and email text, so confirm those too.

## Spec
**Rule:** a member's role in the circle decides whether `name` is readable. Parents get the real name. Relatives never receive it, through any path.

**Backend (the real fix)**
- Stop returning `name` to relatives from the circles select policy. RLS is row-level, so use one of: (a) move `name` to a parents-only table, or (b) revoke column select on `name` and expose circles to the app through a view or RPC that returns `name` only for parents. Recommend (b) as the smaller change, needing the architect's call because it is a schema change.
- `export_my_data`: return `name` only for parent members; for relatives return a neutral label.
- Any RPC, notification payload or email template that embeds the name must use the same role check. Audit them.
- Never bypass RLS: the check lives in the policy or view, not in client code.

**App**
- Relatives see a neutral label, e.g. "Shared with you" (or the post author's name), never an empty or broken field. Needs UX wording sign-off from `grandparent-ux` (A1/A2: no confusing gaps, no sense of being left out).
- Parents' screens unchanged.

**Tests (qa-tdd writes these red first)**
- A relative's plain table read of circles does not return `name`.
- A relative's `export_my_data` has no name.
- A parent still gets the name from both.
- A relative cannot read a circle they are not in: behaves as not found.
- Notification and email text for a relative contains no group name.
- Run the suite 3x.

**Owners, in order:** staff-pm confirms scope, qa-tdd red tests, engineer builds, architect for the schema change, grandparent-ux for the fallback wording, privacy-security because it changes what data is exposed, then qa-tdd green 3x. This also needs an `docs/architecture/` update if storage or sharing changes, and a persona check row.

## Decisions for Chase (one word each)
1. Relative fallback label: "Shared with you" (recommended) or the author's name?
2. Does an existing relative lose a name they already see today? If yes, this is a visible change to relatives, so decide whether to warn them. Recommend: no warning, since the fallback is gentle.
3. Who counts as a "parent" (assumed: circle owner or admin role)? Confirm.

## Sizing
About one evening for the backend change plus tests, one more for app and notification text, if the role is already stored. If roles are not modeled yet, add an evening.
