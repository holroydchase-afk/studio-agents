#!/usr/bin/env bash
# Copy the studio agents into a project repo's .claude/agents/.
# Usage: scripts/sync.sh /path/to/repo [agent ...]   (no agent names = all)
# Syncing ux-reviewer also copies the studio design rules to .claude/design-rules.md (the product's own
# rules go in docs/design-rules.md, which this never touches). Project-only agents are left alone. With no names, the studio-only
# agents (orchestrator, focus-coach: Product Studio's) are skipped; name them to copy them.
set -euo pipefail
repo="${1:?usage: sync.sh /path/to/repo [agent ...]}"; shift || true
src="$(cd "$(dirname "$0")/.." && pwd)/plugins/studio/agents"
dest="$repo/.claude/agents"
mkdir -p "$dest"
if [ "$#" -eq 0 ]; then set -- $(cd "$src" && ls *.md | sed 's/\.md$//' | grep -vxE 'orchestrator|focus-coach'); fi
# Check every name before copying, so a typo copies nothing.
for a in "$@"; do
  [ -f "$src/$a.md" ] || { echo "unknown agent: $a (have: $(cd "$src" && ls *.md | sed 's/\.md$//' | tr '\n' ' '))" >&2; exit 1; }
done
for a in "$@"; do
  cp "$src/$a.md" "$dest/$a.md"
  echo "synced $a"
done
for a in "$@"; do
  if [ "$a" = ux-reviewer ]; then
    cp "$src/../../../docs/design-rules.md" "$repo/.claude/design-rules.md"
    echo "synced design-rules"
  fi
done
