#!/usr/bin/env bash
# Tests for templates/scripts/check-logs.mjs (never log keys, URLs, emails or raw errors). Run: bash tests/check_logs_test.sh
set -u
cd "$(dirname "$0")/.."
pass=0; fail=0
ok()  { echo "ok      $1"; pass=$((pass+1)); }
bad() { echo "NOT OK  $1"; fail=$((fail+1)); }
S=templates/scripts/check-logs.mjs
F=tests/fixtures/logs
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
# "caption" is not a default word; the config adds it, the way a product adds its own data names.
echo '{"logs":{"roots":["'"$F"'/good"],"banned":["caption"]}}' > "$tmp/checks.json"
export STUDIO_CHECKS="$tmp/checks.json"
for f in key url caption message object stringify multiline template stack; do
  out=$(node "$S" "$F/bad/$f.ts"); rc=$?
  [ $rc -ne 0 ] && echo "$out" | grep -q "bad/$f.ts:" && ok "flags a bad log call ($f)" || bad "flags a bad log call ($f)  [rc=$rc: $out]"
done
out=$(node "$S"); rc=$?
[ $rc -eq 0 ] && echo "$out" | grep -q "1 file" && ok "passes safe log calls in the configured roots" || bad "passes safe log calls in the configured roots  [$out]"
out=$(STUDIO_CHECKS="$tmp/none.json" node "$S" "$F/bad/caption.ts"); rc=$?
[ $rc -eq 0 ] && ok "banned words come from the config (caption allowed without it)" || bad "banned words come from the config  [$out]"
out=$(node "$S" "$tmp/no-such-dir"); rc=$?
[ $rc -eq 0 ] && echo "$out" | grep -q "not found, skipped" && ok "names a missing root instead of crashing" || bad "names a missing root  [rc=$rc: $out]"
echo; echo "LOG CHECK RESULT: $pass passed, $fail failed"
[ $fail -eq 0 ]
