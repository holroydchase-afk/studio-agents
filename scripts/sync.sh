#!/usr/bin/env bash
# Copy the studio agents into a project repo's .claude/agents/.
# Usage: scripts/sync.sh /path/to/repo [agent ...]   (no agent names = all)
# Project-only agents (files not in this library) are left alone.
set -euo pipefail
repo="${1:?usage: sync.sh /path/to/repo [agent ...]}"; shift || true
src="$(cd "$(dirname "$0")/.." && pwd)/plugins/studio/agents"
dest="$repo/.claude/agents"
mkdir -p "$dest"
if [ "$#" -eq 0 ]; then set -- $(cd "$src" && ls *.md | sed 's/\.md$//'); fi
# Check every name before copying, so a typo copies nothing.
for a in "$@"; do
  [ -f "$src/$a.md" ] || { echo "unknown agent: $a (have: $(cd "$src" && ls *.md | sed 's/\.md$//' | tr '\n' ' '))" >&2; exit 1; }
done
for a in "$@"; do
  cp "$src/$a.md" "$dest/$a.md"
  echo "synced $a"
done
