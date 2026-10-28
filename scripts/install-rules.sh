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
# PR check: Agents: line (qa-tdd named on code changes) plus the roster check below.
install_one "$root/templates/agents-check.yml" .github/workflows/agents-check.yml
# Shared checks: agent roster and log hygiene, with each repo's roots and banned words in studio-checks.json.
install_one "$root/templates/scripts/check-agents.sh" scripts/check-agents.sh
install_one "$root/templates/scripts/check-logs.mjs" scripts/check-logs.mjs
install_one "$root/templates/studio-checks.json" studio-checks.json
