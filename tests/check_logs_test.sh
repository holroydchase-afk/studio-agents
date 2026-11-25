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
# bannedWords: whole-word match on an identifier split on _, $ and camelCase.
echo '{"logs":{"roots":["'"$F"'/words-good"],"bannedWords":["lat"]}}' > "$tmp/words.json"
for f in word_lat:lat word_dotlat:p.lat word_snake:lat_deg word_camel:latFix; do
  n=${f%%:*}; id=${f#*:}
  out=$(STUDIO_CHECKS="$tmp/words.json" node "$S" "$F/bad/$n.ts"); rc=$?
  [ $rc -ne 0 ] && echo "$out" | grep -q "bad/$n.ts:" && ok "bannedWords flags $id" || bad "bannedWords flags $id  [rc=$rc: $out]"
  echo "$out" | grep -q "banned word" && echo "$out" | grep -q "\"${id##*.}\"" && ok "message names the identifier and says banned word ($id)" || bad "message names the identifier and says banned word ($id)  [$out]"
done
out=$(STUDIO_CHECKS="$tmp/words.json" node "$S"); rc=$?
[ $rc -eq 0 ] && echo "$out" | grep -q "1 file" && ok "bannedWords lets relative and plateau through" || bad "bannedWords lets relative and plateau through  [rc=$rc: $out]"
out=$(STUDIO_CHECKS="$tmp/checks.json" node "$S" "$F/bad/word_lat.ts" "$F/bad/word_snake.ts" "$F/bad/word_camel.ts" "$F/bad/word_dotlat.ts"); rc=$?
[ $rc -eq 0 ] && ok "no bannedWords config flags nothing extra" || bad "no bannedWords config flags nothing extra  [$out]"
echo '{"logs":{"roots":["'"$F"'/good"],"bannedWords":["LAT"]}}' > "$tmp/upper.json"
out=$(STUDIO_CHECKS="$tmp/upper.json" node "$S" "$F/bad/word_camel.ts"); rc=$?
[ $rc -ne 0 ] && ok "bannedWords are case-insensitive" || bad "bannedWords are case-insensitive  [$out]"
echo '{"logs":{"roots":["'"$F"'/good"],"banned":["caption"],"bannedWords":["lat"]}}' > "$tmp/both.json"
out=$(STUDIO_CHECKS="$tmp/both.json" node "$S" "$F/bad/caption.ts" "$F/bad/word_lat.ts"); rc=$?
[ $rc -ne 0 ] && echo "$out" | grep -q "bad/caption.ts:" && echo "$out" | grep -q "bad/word_lat.ts:" && ok "banned and bannedWords together apply both" || bad "banned and bannedWords together apply both  [rc=$rc: $out]"
out=$(node "$S" "$tmp/no-such-dir"); rc=$?
[ $rc -eq 0 ] && echo "$out" | grep -q "not found, skipped" && ok "names a missing root instead of crashing" || bad "names a missing root  [rc=$rc: $out]"
echo; echo "LOG CHECK RESULT: $pass passed, $fail failed"
[ $fail -eq 0 ]
