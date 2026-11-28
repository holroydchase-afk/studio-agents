#!/usr/bin/env bash
# Install the studio CI template (templates/ci) into a project repo.
# Usage: scripts/install-ci.sh /path/to/repo
# Adds .github/workflows/ci.yml, .prettierrc.json and .prettierignore. Existing files are kept.
set -euo pipefail
repo="${1:?usage: install-ci.sh /path/to/repo}"
[ -d "$repo" ] || { echo "no such folder: $repo" >&2; exit 1; }
repo="$(cd "$repo" && pwd)"
kit="$(cd "$(dirname "$0")/.." && pwd)/templates/ci"

put() { # put <source in kit> <dest in repo>
  local dest="$repo/$2"
  if [ -e "$dest" ]; then echo "kept existing $2 (merge by hand from templates/ci)"; return; fi
  mkdir -p "$(dirname "$dest")"
  cp "$kit/$1" "$dest"
  echo "installed $2"
}
put ci.yml .github/workflows/ci.yml
put prettierrc.json .prettierrc.json
put prettierignore .prettierignore

echo
echo "Add these devDependencies, plus the lint ones in templates/lint/package.json (eslint, typescript-eslint, ...):"
echo "  prettier"
echo "Scripts ci.yml expects: typecheck (tsc --noEmit), test, lint. Also run scripts/install-security.sh for gitleaks and CodeQL."
echo "Needs .github/workflows/lint.yml (studio sync seeds it) and scripts/check-actions-pinned.mjs (studio sync)."
