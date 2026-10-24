-- Studio Supabase starter: orgs, members and one example table, with row-level security
-- on every table. Rename `orgs` (team, household, company) and `items` to fit the product.
-- Patterns from Hearth (membership helpers, column grants) and Crew Clock (deny by default).
--
-- Rules this file follows (STACK.md in pm-tools, "Supabase rules"):
-- 1. Every table has RLS on, and clients get only the columns and actions a policy covers.
-- 2. Policies call small `app.` helpers that are `security definer` with an empty search_path,
--    so a policy on `members` never recurses into itself.
-- 3. Server-only data lives in `private`, which no client role can use.
-- 4. Every policy has a test in tests/sql/rls_test.sql that someone outside is refused.

create schema if not exists app;      -- helpers called by policies; not exposed by the API
create schema if not exists private;  -- server-only tables (secrets, rate limits); no client access
revoke all on schema private from public, anon, authenticated;
grant usage on schema app to authenticated;

-- ---------- tables ----------
create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 100),
  created_at timestamptz not null default now()
);

create table public.members (
  org_id uuid not null references public.orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  display_name text check (length(display_name) <= 80),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index members_user_idx on public.members (user_id);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index items_org_idx on public.items (org_id);

-- ---------- helpers ----------
create or replace function app.role_in(p_org uuid) returns text
language sql stable security definer set search_path = '' as $$
  select role from public.members where org_id = p_org and user_id = (select auth.uid())
$$;

create or replace function app.is_member(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.role_in(p_org) is not null
$$;

create or replace function app.is_admin(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(app.role_in(p_org) in ('owner', 'admin'), false)
$$;

create or replace function app.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger items_touch before update on public.items
for each row execute function app.touch_updated_at();

revoke execute on all functions in schema app from public, anon;
grant execute on function app.role_in(uuid), app.is_member(uuid), app.is_admin(uuid) to authenticated;

-- Creating an org makes the caller its owner, in one step. The only way to get an owner row.
create or replace function public.create_org(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  insert into public.orgs (name) values (p_name) returning id into v_id;
  insert into public.members (org_id, user_id, role) values (v_id, (select auth.uid()), 'owner');
  return v_id;
end $$;
revoke execute on function public.create_org(text) from public, anon;
grant execute on function public.create_org(text) to authenticated;

-- ---------- privileges: start from nothing ----------
-- Supabase grants every new public table to anon and authenticated by default. Take that back,
-- then grant only what the policies below cover, column by column for writes.
revoke all on public.orgs, public.members, public.items from anon, authenticated;
grant select, update (name) on public.orgs to authenticated;
grant select, insert (org_id, user_id, role, display_name), update (role, display_name), delete
  on public.members to authenticated;
-- Clients may pick the id (offline apps make ids on the phone); the database fills the rest.
grant select, insert (id, org_id, title), update (title), delete on public.items to authenticated;

-- ---------- row-level security ----------
alter table public.orgs enable row level security;
alter table public.members enable row level security;
alter table public.items enable row level security;

create policy orgs_read on public.orgs for select to authenticated using (app.is_member(id));
create policy orgs_admin_update on public.orgs for update to authenticated
  using (app.is_admin(id)) with check (app.is_admin(id));

-- Members see their org's roster. Admins add, change and remove members, never an owner.
-- Anyone but an owner can leave.
create policy members_read on public.members for select to authenticated using (app.is_member(org_id));
create policy members_admin_insert on public.members for insert to authenticated
  with check (app.is_admin(org_id) and role <> 'owner');
create policy members_admin_update on public.members for update to authenticated
  using (app.is_admin(org_id) and role <> 'owner') with check (app.is_admin(org_id) and role <> 'owner');
create policy members_delete on public.members for delete to authenticated
  using (role <> 'owner' and (app.is_admin(org_id) or user_id = (select auth.uid())));

-- Members read and add items; the author or an admin edits or deletes them.
create policy items_read on public.items for select to authenticated using (app.is_member(org_id));
create policy items_insert on public.items for insert to authenticated
  with check (app.is_member(org_id) and created_by = (select auth.uid()));
create policy items_update on public.items for update to authenticated
  using (app.is_member(org_id) and (created_by = (select auth.uid()) or app.is_admin(org_id)))
  with check (app.is_member(org_id));
create policy items_delete on public.items for delete to authenticated
  using (app.is_member(org_id) and (created_by = (select auth.uid()) or app.is_admin(org_id)));
