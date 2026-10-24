#!/usr/bin/env bash
# Install the studio security kit (templates/security) into a project repo.
# Usage: scripts/install-security.sh /path/to/repo
# Adds: .github/workflows/security.yml (gitleaks, privacy scan, dependency review),
# .github/workflows/codeql.yml (languages detected), .github/dependabot.yml
# (ecosystems detected), .github/privacy-scan.py and SECURITY.md.
# Existing files are left alone, so a repo's own config is never overwritten.
set -euo pipefail
repo="${1:?usage: install-security.sh /path/to/repo}"
repo="$(cd "$repo" && pwd)"
kit="$(cd "$(dirname "$0")/.." && pwd)/templates/security"

write_one() { # write_one <dest relative to repo>  (content on stdin)
  local dest="$repo/$1"
  if [ -e "$dest" ]; then echo "kept existing $1 (merge by hand from templates/security)"; cat >/dev/null; return; fi
  mkdir -p "$(dirname "$dest")"
  cat >"$dest"
  echo "installed $1"
}

files="$(git -C "$repo" ls-files 2>/dev/null || (cd "$repo" && find . -type f -not -path './.git/*' | sed 's#^\./##'))"
has() { printf '%s\n' "$files" | grep -Eq "$1"; }

# CodeQL languages: always the workflows themselves, plus what the code is written in.
langs="actions"
has '\.(js|mjs|cjs|jsx|ts|tsx|html?)$' && langs="$langs, javascript-typescript"
has '\.py$' && langs="$langs, python"

# Dependabot: one npm entry per folder with a package.json, pip for Python, always Actions.
dirs_of() { printf '%s\n' "$files" | grep -E "$1" | grep -v node_modules | xargs -r -n1 dirname | sort -u; }
{
  echo "# Studio security kit (studio-agents templates/security). Weekly update PRs, minor and"
  echo "# patch grouped into one. Security fixes also come as their own PRs when"
  echo "# Dependabot security updates is on in Settings."
  echo "version: 2"
  echo "updates:"
  entry() {
    echo "  - package-ecosystem: $1"
    echo "    directory: \"$2\""
    echo "    schedule:"
    echo "      interval: weekly"
    echo "    groups:"
    echo "      minor-and-patch:"
    echo "        update-types: [minor, patch]"
  }
  for d in $(dirs_of '(^|/)package\.json$'); do entry npm "/${d#.}"; done
  for d in $(dirs_of '(^|/)(requirements[^/]*\.txt|pyproject\.toml)$'); do entry pip "/${d#.}"; done
  entry github-actions /
} | sed 's#"/\./*#"/#; s#"//#"/#' | write_one .github/dependabot.yml

sed "s/\[LANGUAGES\]/[$langs]/" "$kit/codeql.yml" | write_one .github/workflows/codeql.yml
write_one .github/workflows/security.yml <"$kit/security.yml"
write_one .github/privacy-scan.py <"$kit/privacy-scan.py"
write_one SECURITY.md <"$kit/SECURITY.md"
echo "Next: run 'python3 .github/privacy-scan.py' and fix or allow (.privacy-allow) anything it finds, then open a PR."
