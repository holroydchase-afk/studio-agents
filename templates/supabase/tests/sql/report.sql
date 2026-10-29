-- Prints every result and fails the run if any check missed. Always the last file.
reset role;
do $$ declare r record; bad int; total int; begin
  for r in select * from tests.results order by n loop
    raise warning '% %', case when r.ok then 'ok  ' else 'FAIL' end, r.description;
  end loop;
  select count(*) filter (where not ok), count(*) into bad, total from tests.results;
  if total = 0 then raise exception 'no SQL checks ran'; end if;
  if bad > 0 then raise exception '% of % SQL checks failed', bad, total; end if;
  raise warning '% SQL checks passed', total;
end $$;
