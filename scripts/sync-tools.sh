#!/usr/bin/env bash
# Copy the studio tools (tools/*.mjs) into a project repo's scripts/ folder.
# Usage: scripts/sync-tools.sh /path/to/repo [tool ...]   (no names = all; names without .mjs)
# Re-run it to pick up improvements. Other files in scripts/ are left alone.
set -euo pipefail
repo="${1:?usage: sync-tools.sh /path/to/repo [tool ...]}"; shift || true
src="$(cd "$(dirname "$0")/.." && pwd)/tools"
dest="$repo/scripts"
mkdir -p "$dest"
if [ "$#" -eq 0 ]; then set -- $(cd "$src" && ls *.mjs | sed 's/\.mjs$//'); fi
# Check every name before copying, so a typo copies nothing.
for t in "$@"; do
  [ -f "$src/$t.mjs" ] || { echo "unknown tool: $t (have: $(cd "$src" && ls *.mjs | sed 's/\.mjs$//' | tr '\n' ' '))" >&2; exit 1; }
done
# A tool may import its neighbours (`from "./x.mjs"`) or run them as child processes (a comment `spawns "./x.mjs"`). Follow those imports transitively, so a single
# tool synced alone still runs. Each file is copied once; dependencies print "(needed by <tool>)".
declare -A seen
for t in "$@"; do seen[$t]=named; done
copy_tool() { # copy_tool <tool> [needed-by]
  local t="$1" by="${2:-}" d
  cp "$src/$t.mjs" "$dest/$t.mjs"
  if [ -n "$by" ]; then echo "synced $t (needed by $by)"; else echo "synced $t"; fi
  for d in $(grep -oE '(from|spawns) "\./[A-Za-z0-9_-]+\.mjs"' "$src/$t.mjs" | sed -E 's/(from|spawns) "\.\/(.*)\.mjs"/\2/' | sort -u); do
    [ -f "$src/$d.mjs" ] || continue
    [ -n "${seen[$d]:-}" ] && continue
    seen[$d]=dep
    copy_tool "$d" "${by:-$t}"
  done
}
for t in "$@"; do copy_tool "$t"; done
# The ux-refs tool reads the cited reference library; copy it when syncing everything or ux-refs.
refs="$(cd "$(dirname "$0")/.." && pwd)/docs/references/ux"
case " $* " in *" ux-refs "*) mkdir -p "$repo/docs/references/ux" && cp "$refs"/*.md "$repo/docs/references/ux/" && echo "synced references/ux";; esac
