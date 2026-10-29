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
for t in "$@"; do
  cp "$src/$t.mjs" "$dest/$t.mjs"
  echo "synced $t"
done
