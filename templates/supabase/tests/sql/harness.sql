-- A tiny assertion harness (no pgTAP). Loaded after the migrations, before the *_test.sql files.
-- tests.ok(condition, what), tests.throws(sql, what [, error text]), tests.lives(sql, what).
-- tests.as(user id or null) switches identity: null means anon. report.sql fails the run on any miss.
\set ON_ERROR_STOP 1
set client_min_messages = warning;
\o /dev/null
create schema tests;
create table tests.results (n serial, ok boolean not null, description text not null);
create function tests.ok(p_ok boolean, p_desc text) returns void language sql as $$
  insert into tests.results (ok, description) values (coalesce(p_ok, false), p_desc) $$;
create function tests.throws(p_sql text, p_desc text, p_like text default null) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    perform tests.ok(p_like is null or sqlerrm ilike '%' || p_like || '%', p_desc || '  [' || sqlerrm || ']');
    return;
  end;
  perform tests.ok(false, p_desc || '  [expected an error, none raised]');
end $$;
create function tests.lives(p_sql text, p_desc text) returns void
language plpgsql as $$
begin
  execute p_sql;
  perform tests.ok(true, p_desc);
exception when others then
  perform tests.ok(false, p_desc || '  [' || sqlerrm || ']');
end $$;
-- Rows a statement touched, for "refused without an error" checks (RLS filters updates and deletes silently).
create function tests.touched(p_sql text) returns int language plpgsql as $$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end $$;
grant usage on schema tests to anon, authenticated;
grant insert on tests.results to anon, authenticated;
grant usage on sequence tests.results_n_seq to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;
