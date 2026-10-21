#!/usr/bin/env bash
# Install the studio session rules into a project repo (see docs/session-rules.md).
# Usage: scripts/install-rules.sh /path/to/repo
# Existing files are left alone, so a repo's own settings are never overwritten.
set -euo pipefail
repo="${1:?usage: install-rules.sh /path/to/repo}"
root="$(cd "$(dirname "$0")/.." && pwd)"
install_one() {
  local src="$1" dest="$repo/$2"
  if [ -e "$dest" ]; then echo "kept existing $2 (merge by hand: $src)"; return; fi
  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
  echo "installed $2"
}
install_one "$root/templates/claude-settings.json" .claude/settings.json
install_one "$root/templates/handoff-check.yml" .github/workflows/handoff-check.yml
