# Supabase starter

The studio's starting point for any product that needs real logins and shared data (pm-tools `STACK.md`: "A mobile app or multi-user product"). Built from what Hearth and Crew Clock proved. Copy it with `scripts/add-supabase.sh /path/to/repo`; existing files are never overwritten. This file lands as `docs/SUPABASE.md`.

## What you get
| Path | What it is |
|---|---|
| `supabase/migrations/00000000000000_base.sql` | `orgs`, `members` (owner, admin, member) and an example `items` table. RLS on every table, deny by default, column-level grants, `app.` membership helpers, `create_org()` |
| `supabase/functions/_shared/` | `http.ts` (CORS, JSON, plain-words errors), `db.ts` (`userClient` runs under RLS, `admin` bypasses it), `auth.ts` (checks tokens against the project's public keys) |
| `supabase/functions/whoami/` | An example function. Copy its shape, then delete it |
| `supabase/config.toml` | Local stack settings for `supabase start` |
| `tests/sql/` | `run.sh` runs every migration and every `*_test.sql` on a throwaway Postgres. `rls_test.sql` has 36 checks: each policy tried by someone allowed and someone who isn't |
| `.github/workflows/supabase.yml` | SQL tests and an Edge Function type check on every PR |

Run the SQL tests locally with any Postgres 15+: `PGHOST=localhost PGUSER=postgres sh tests/sql/run.sh`.

## Make it yours
1. Rename `orgs` (team, household, company) and `items` to the product's words. Keep the shape.
2. Add tables in new numbered migrations (`supabase migration new <name>`). For each table: RLS on, revoke the default grants, grant only the columns clients write, one policy per action, and a block in a `*_test.sql` file that tries it as an outsider.
3. One org per user and a role in every request (Crew Clock)? Add a Customize Access Token hook that puts `org_id` and the role into the token, and read them in policies. Users in several orgs (Hearth)? Keep the membership helpers here.
4. Server-only data (secrets, rate limits, hashes) goes in the `private` schema. No client can use it.

## Rules (also in pm-tools `STACK.md`)
- Schema changes only as committed migration files. Never edit the hosted database by hand.
- The app holds only the publishable (`anon`) key. The service-role key lives only in Edge Function secrets.
- Functions use `userClient(req)` so RLS applies. `admin()` only for server-only work, scoped by org in code.
- Asymmetric signing keys (ES256) on the project; functions accept no HS256 tokens.
- Public demos never point at the real project: demo builds use the demo kit, production gets its own build or address.
- The privacy-security agent reviews every migration that adds a table, a policy or a grant.

## Connect a hosted project (Chase, once per product)
1. Create a project at supabase.com, region US East.
2. In the repo: `supabase link --project-ref <ref>`, then `supabase db push`.
3. **Project Settings > JWT Keys**: migrate to the new signing keys, then rotate so ES256 signs tokens.
4. **Authentication > Sign In / Providers**: pick the sign-in methods; turn off sign-ups if people only join by invite.
5. `supabase secrets set APP_ORIGIN=https://<app address>`, then `supabase functions deploy`.
6. Put the project URL and publishable key in the production build's settings, never in the demo build.

The product's own `docs/SETUP.md` adds its extra steps (storage, push, cron).
