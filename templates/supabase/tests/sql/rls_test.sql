-- Row-level security checks for the starter tables: every policy, tried by someone allowed
-- and by someone who isn't. Add a block like these for every table and policy you add.
\set ON_ERROR_STOP 1
-- Made-up people. Org A: alice (owner), carol (admin), bob (member). Org B: dave (owner). eve: no org.
insert into auth.users (id) values
  ('a0000000-0000-0000-0000-00000000000a'), ('b0000000-0000-0000-0000-00000000000b'),
  ('c0000000-0000-0000-0000-00000000000c'), ('d0000000-0000-0000-0000-00000000000d'),
  ('e0000000-0000-0000-0000-00000000000e');
insert into public.orgs (id, name) values
  ('0a000000-0000-0000-0000-0000000000aa', 'Org A'), ('0b000000-0000-0000-0000-0000000000bb', 'Org B');
insert into public.members (org_id, user_id, role) values
  ('0a000000-0000-0000-0000-0000000000aa', 'a0000000-0000-0000-0000-00000000000a', 'owner'),
  ('0a000000-0000-0000-0000-0000000000aa', 'c0000000-0000-0000-0000-00000000000c', 'admin'),
  ('0a000000-0000-0000-0000-0000000000aa', 'b0000000-0000-0000-0000-00000000000b', 'member'),
  ('0b000000-0000-0000-0000-0000000000bb', 'd0000000-0000-0000-0000-00000000000d', 'owner');
insert into public.items (id, org_id, created_by, title) values
  ('1a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-0000000000aa', 'a0000000-0000-0000-0000-00000000000a', 'Alice item'),
  ('1b000000-0000-0000-0000-000000000002', '0b000000-0000-0000-0000-0000000000bb', 'd0000000-0000-0000-0000-00000000000d', 'Dave item');

-- ---------- anon (no session) ----------
set role anon;
select tests.throws('select * from public.items', 'anon cannot read items', 'permission denied');
select tests.throws('select * from public.orgs', 'anon cannot read orgs', 'permission denied');
select tests.throws($$select public.create_org('Nope')$$, 'anon cannot create an org', 'permission denied');
reset role;

-- ---------- eve: signed in, in no org ----------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-00000000000e"}', false);
select tests.ok((select count(*) from public.orgs) = 0, 'eve sees no orgs');
select tests.ok((select count(*) from public.items) = 0, 'eve sees no items');
select tests.ok((select count(*) from public.members) = 0, 'eve sees no members');
select tests.throws($$insert into public.items (org_id, title) values ('0a000000-0000-0000-0000-0000000000aa', 'x')$$,
  'eve cannot add an item to org A', 'row-level security');
select tests.throws($$insert into public.members (org_id, user_id, role) values ('0a000000-0000-0000-0000-0000000000aa', 'e0000000-0000-0000-0000-00000000000e', 'member')$$,
  'eve cannot add herself to org A', 'row-level security');
select tests.throws('select * from private.secrets', 'clients cannot use the private schema', 'permission denied');
reset role;

-- ---------- bob: member of org A ----------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-0000-0000-00000000000b"}', false);
select tests.ok((select count(*) from public.orgs) = 1, 'bob sees only org A');
select tests.ok((select count(*) from public.members) = 3, 'bob sees org A''s three members, none of org B');
select tests.ok((select count(*) from public.items where org_id = '0b000000-0000-0000-0000-0000000000bb') = 0, 'bob sees none of org B''s items');
select tests.lives($$insert into public.items (id, org_id, title) values ('1a000000-0000-0000-0000-000000000003', '0a000000-0000-0000-0000-0000000000aa', 'Bob item')$$,
  'bob adds an item to org A');
select tests.throws($$insert into public.items (org_id, title) values ('0b000000-0000-0000-0000-0000000000bb', 'x')$$,
  'bob cannot add an item to org B', 'row-level security');
select tests.throws($$insert into public.items (org_id, title, created_by) values ('0a000000-0000-0000-0000-0000000000aa', 'x', 'a0000000-0000-0000-0000-00000000000a')$$,
  'bob cannot write an item as alice', 'permission denied');
select tests.ok(tests.touched($$update public.items set title = 'Bob edit' where id = '1a000000-0000-0000-0000-000000000003'$$) = 1, 'bob edits his own item');
select tests.ok(tests.touched($$update public.items set title = 'Hacked' where id = '1a000000-0000-0000-0000-000000000001'$$) = 0, 'bob cannot edit alice''s item');
select tests.ok(tests.touched($$delete from public.items where id = '1a000000-0000-0000-0000-000000000001'$$) = 0, 'bob cannot delete alice''s item');
select tests.throws($$update public.items set org_id = '0b000000-0000-0000-0000-0000000000bb' where id = '1a000000-0000-0000-0000-000000000003'$$,
  'bob cannot move an item to another org', 'permission denied');
select tests.ok(tests.touched($$update public.members set role = 'admin' where user_id = 'b0000000-0000-0000-0000-00000000000b'$$) = 0, 'bob cannot make himself admin');
select tests.ok(tests.touched($$update public.orgs set name = 'Mine' where id = '0a000000-0000-0000-0000-0000000000aa'$$) = 0, 'bob cannot rename org A');
reset role;

-- ---------- carol: admin of org A ----------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-0000-0000-00000000000c"}', false);
select tests.ok(tests.touched($$update public.items set title = 'Admin edit' where id = '1a000000-0000-0000-0000-000000000003'$$) = 1, 'carol (admin) edits bob''s item');
select tests.lives($$insert into public.members (org_id, user_id, role) values ('0a000000-0000-0000-0000-0000000000aa', 'e0000000-0000-0000-0000-00000000000e', 'member')$$,
  'carol adds eve to org A');
select tests.throws($$insert into public.members (org_id, user_id, role) values ('0b000000-0000-0000-0000-0000000000bb', 'e0000000-0000-0000-0000-00000000000e', 'member')$$,
  'carol cannot add anyone to org B', 'row-level security');
select tests.throws($$update public.members set role = 'owner' where user_id = 'e0000000-0000-0000-0000-00000000000e'$$,
  'carol cannot make anyone an owner', 'row-level security');
select tests.ok(tests.touched($$update public.members set role = 'member' where user_id = 'a0000000-0000-0000-0000-00000000000a'$$) = 0, 'carol cannot demote the owner');
select tests.ok(tests.touched($$delete from public.members where user_id = 'a0000000-0000-0000-0000-00000000000a'$$) = 0, 'carol cannot remove the owner');
select tests.ok(tests.touched($$update public.orgs set name = 'Org A2' where id = '0a000000-0000-0000-0000-0000000000aa'$$) = 1, 'carol renames org A');
reset role;

-- ---------- eve again: now a member, then she leaves; and she starts her own org ----------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-00000000000e"}', false);
select tests.ok((select count(*) from public.items) = 2, 'eve sees org A''s items once added');
select tests.ok(tests.touched($$delete from public.members where user_id = 'e0000000-0000-0000-0000-00000000000e'$$) = 1, 'eve can leave org A');
select tests.ok((select count(*) from public.items) = 0, 'eve sees nothing after leaving');
select tests.ok(public.create_org('Eve Org') is not null, 'eve creates her own org');
select tests.ok((select role from public.members where user_id = 'e0000000-0000-0000-0000-00000000000e') = 'owner', 'eve is the owner of her new org');
select tests.ok(tests.touched($$delete from public.members where user_id = 'e0000000-0000-0000-0000-00000000000e'$$) = 0, 'an owner cannot leave (no orphaned orgs)');
reset role;

-- ---------- dave: owner of org B ----------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-00000000000d"}', false);
select tests.ok((select count(*) from public.items where org_id = '0a000000-0000-0000-0000-0000000000aa') = 0, 'dave sees none of org A''s items');
select tests.ok(tests.touched($$update public.items set title = 'x' where org_id = '0a000000-0000-0000-0000-0000000000aa'$$) = 0, 'dave cannot edit org A''s items');
reset role;
