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
# HANDOFF.md status header (the Studio Console reads it); handoff-check runs this and only warns.
install_one "$root/templates/scripts/check-handoff-status.sh" scripts/check-handoff-status.sh
# PR check: Agents: line (qa-tdd named on code changes) plus the roster check below.
install_one "$root/templates/agents-check.yml" .github/workflows/agents-check.yml
# Shared checks: agent roster and log hygiene, with each repo's roots and banned words in studio-checks.json.
install_one "$root/templates/scripts/check-agents.sh" scripts/check-agents.sh
install_one "$root/templates/scripts/check-logs.mjs" scripts/check-logs.mjs
# Agent run log: the hook (in settings.json) records real Agent calls; agents-check holds the Agents: line to it.
install_one "$root/templates/scripts/log-agent-run.sh" scripts/log-agent-run.sh
install_one "$root/templates/scripts/check-agent-runs.sh" scripts/check-agent-runs.sh
install_one "$root/templates/studio-checks.json" studio-checks.json
