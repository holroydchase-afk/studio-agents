#!/usr/bin/env bash
# Copy the Supabase starter (templates/supabase) into a product repo.
# Usage: scripts/add-supabase.sh /path/to/repo
# Existing files are left alone, so a repo's own schema and tests are never overwritten.
set -euo pipefail
repo="${1:?usage: add-supabase.sh /path/to/repo}"
src="$(cd "$(dirname "$0")/.." && pwd)/templates/supabase"
install_one() {
  local from="$src/$1" dest="$repo/$2"
  if [ -e "$dest" ]; then echo "kept existing $2 (merge by hand: templates/supabase/$1)"; return; fi
  mkdir -p "$(dirname "$dest")"
  cp "$from" "$dest"
  echo "installed $2"
}
install_one README.md docs/SUPABASE.md
install_one github/supabase.yml .github/workflows/supabase.yml
(cd "$src" && find supabase tests -type f | sort) | while read -r f; do install_one "$f" "$f"; done
chmod +x "$repo/tests/sql/run.sh"
