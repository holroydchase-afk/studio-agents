#!/usr/bin/env bash
# Copy the feedback loop pieces (docs/feedback-loop.md) into a product repo. Usage: scripts/add-feedback.sh /path/to/repo
# Existing files are kept (merge by hand). Merging the result is Chase's call: it touches .github/.
set -euo pipefail
repo="${1:?usage: add-feedback.sh /path/to/repo}"
root="$(cd "$(dirname "$0")/.." && pwd)"
put() { if [ -e "$repo/$2" ]; then echo "kept existing $2"; else mkdir -p "$(dirname "$repo/$2")"; cp "$root/$1" "$repo/$2"; echo "added $2"; fi; }
bash "$root/scripts/sync-tools.sh" "$repo" feedback-guard
put templates/scripts/feedback-gate.mjs scripts/feedback-gate.mjs
put templates/github/ISSUE_TEMPLATE/feedback.yml .github/ISSUE_TEMPLATE/feedback.yml
put templates/workflows/feedback-gate.yml .github/workflows/feedback-gate.yml
put templates/feedback/widget.js feedback/widget.js
