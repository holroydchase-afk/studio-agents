#!/bin/sh
# Runs every migration, then every SQL test, on a throwaway local Postgres database.
# Uses the usual PG* variables (PGHOST, PGUSER, PGPASSWORD). Usage: sh tests/sql/run.sh [dbname]
# New migrations and *_test.sql files run automatically, in name order, so none gets skipped.
set -eu
cd "$(dirname "$0")/../.."
db="${1:-supabase_test}"
dropdb --if-exists "$db"
createdb "$db"
set -- -f tests/sql/supabase_stub.sql
for f in supabase/migrations/*.sql; do set -- "$@" -f "$f"; done
set -- "$@" -f tests/sql/harness.sql
for f in tests/sql/*_test.sql; do set -- "$@" -f "$f"; done
set -- "$@" -f tests/sql/report.sql
psql -q -X -v ON_ERROR_STOP=1 -d "$db" "$@"
