#!/usr/bin/env bash
# Copy the studio agents into a project repo's .claude/agents/, and the skills they preload
# (their `skills:` frontmatter) into .claude/skills/. Project-only skills are left alone.
# Usage: scripts/sync.sh /path/to/repo [agent ...]   (no agent names = all)
# Syncing ux-reviewer also copies the studio design rules to .claude/design-rules.md (the product's own
# rules go in docs/design-rules.md, which this never touches). Project-only agents are left alone. With no names, the studio-only
# agents (orchestrator, focus-coach: Product Studio's) are skipped; name them to copy them.
set -euo pipefail
repo="${1:?usage: sync.sh /path/to/repo [agent ...]}"; shift || true
src="$(cd "$(dirname "$0")/.." && pwd)/plugins/studio/agents"
skills_src="$src/../skills"
dest="$repo/.claude/agents"
# skills_of <agent.md>: the frontmatter `skills:` list, one per line.
skills_of() {
  awk 'NR==1&&$0!="---"{exit} NR>1&&$0=="---"{exit} NR>1&&/^skills:/{on=1;next} on&&/^ *- /{sub(/^ *- */,"");print;next} on{on=0}' "$1"
}
if [ "$#" -eq 0 ]; then set -- $(cd "$src" && ls *.md | sed 's/\.md$//' | grep -vxE 'orchestrator|focus-coach'); fi
# Check every name before copying, so a typo copies nothing.
for a in "$@"; do
  [ -f "$src/$a.md" ] || { echo "unknown agent: $a (have: $(cd "$src" && ls *.md | sed 's/\.md$//' | tr '\n' ' '))" >&2; exit 1; }
  if awk 'NR>1&&$0=="---"{exit} NR>1' "$src/$a.md" | grep -qE '^skills: *[^ ]'; then
    echo "agent $a: write skills: as a list, one '  - name' per line" >&2; exit 1
  fi
  for s in $(skills_of "$src/$a.md"); do
    [[ "$s" =~ ^[a-z0-9-]+$ ]] || { echo "agent $a: bad skill name: $s" >&2; exit 1; }
    [ -f "$skills_src/$s/SKILL.md" ] || { echo "agent $a preloads a missing skill: $s" >&2; exit 1; }
  done
done
mkdir -p "$dest"
for a in "$@"; do
  cp "$src/$a.md" "$dest/$a.md"
  echo "synced $a"
  for s in $(skills_of "$src/$a.md"); do
    rm -rf "$repo/.claude/skills/$s"; mkdir -p "$repo/.claude/skills"
    cp -R "$skills_src/$s" "$repo/.claude/skills/$s"
    echo "synced skill $s"
  done
done
for a in "$@"; do
  if [ "$a" = ux-reviewer ]; then
    cp "$src/../../../docs/design-rules.md" "$repo/.claude/design-rules.md"
    echo "synced design-rules"
  fi
done
