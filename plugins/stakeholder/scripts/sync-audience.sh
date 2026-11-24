#!/usr/bin/env bash
# Fetch the persona file (personas/audience.json) from persona-twins into ../data/audience.json.
# Usage: sync-audience.sh [ref] [--expect-hash <64 lowercase hex>]     ref defaults to main (a branch or tag name)
# The repo is public, so no credentials are used or sent. The download is checked (valid JSON, hash matches
# its own contents) in a scratch folder first; data/audience.json is replaced only when the check passes.
# The hash inside the file only detects drift or damage: whoever can change the file can recompute it, so it is not
# provenance. To pin a version, pass --expect-hash with a hash you got from somewhere you trust.
# Normal use is https only (curl --proto =https --proto-redir =https). STAKEHOLDER_AUDIENCE_BASE may point at
# file://..., http://localhost... or http://127.0.0.1... (tests and local copies); any other value is refused.
set -euo pipefail

REPO="holroydchase-afk/persona-twins"   # the one place the repo name lives (a rename is pending)
fail() { echo "sync-audience: $*" >&2; exit 1; }

ref="main"; expect=""; have_expect=0; have_ref=0
while [ $# -gt 0 ]; do
  case "$1" in
    --expect-hash) [ $# -ge 2 ] || fail "--expect-hash needs a value"; expect="$2"; have_expect=1; shift 2;;
    --*) fail "unknown option: $1";;
    *) [ "$have_ref" -eq 0 ] || fail "only one ref allowed"; ref="$1"; have_ref=1; shift;;
  esac
done
if [ "$have_expect" -eq 1 ]; then
  [[ "$expect" =~ ^[0-9a-f]{64}$ ]] || fail "--expect-hash must be 64 lowercase hex characters"
fi

proto=(--proto '=https' --proto-redir '=https')
if [ -n "${STAKEHOLDER_AUDIENCE_BASE:-}" ]; then
  BASE="$STAKEHOLDER_AUDIENCE_BASE"
  # The host must end at the localhost or 127.0.0.1 label: ":port", "/" or nothing may follow it.
  if [[ "$BASE" =~ ^file:// ]]; then proto=()
  elif [[ "$BASE" =~ ^http://(localhost|127\.0\.0\.1)(:[0-9]+)?(/.*)?$ ]]; then proto=(--proto-redir '=https')
  else fail "STAKEHOLDER_AUDIENCE_BASE must be a file:// path or http://localhost or http://127.0.0.1 (got a different base); refusing"
  fi
else
  BASE="https://raw.githubusercontent.com/$REPO"
fi

# A ref is a plain branch or tag name: no "..", no spaces, no leading dash or slash, no "//".
[[ "$ref" =~ ^[A-Za-z0-9][A-Za-z0-9._/-]*$ ]] || fail "bad ref: $ref"
[[ "$ref" != *..* && "$ref" != *//* && "$ref" != */ ]] || fail "bad ref: $ref"

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
data="$here/../data"
mkdir -p "$data"
scratch="$(mktemp -d)"
stage=""
trap 'rm -rf "$scratch"; [ -z "$stage" ] || rm -f "$stage"' EXIT

echo "ref $ref"
curl -fsSL ${proto[@]+"${proto[@]}"} --max-time 30 -o "$scratch/audience.json" "$BASE/$ref/personas/audience.json" \
  || fail "could not download $BASE/$ref/personas/audience.json"
[ -s "$scratch/audience.json" ] || fail "downloaded file is empty"

# Same hash rule as tools/check-stakeholder.mjs --verify-hash (drop hash, sort keys by code point, no whitespace).
# It is repeated here so the script works with nothing but this one file beside data/.
node - "$scratch/audience.json" <<'JS' || fail "downloaded file failed the hash check; data/audience.json left as it was"
const fs = require("fs"), crypto = require("crypto");
const cmp = (a, b) => { const x = [...a], y = [...b]; for (let i = 0; i < Math.min(x.length, y.length); i++) { const d = x[i].codePointAt(0) - y[i].codePointAt(0); if (d) return d; } return x.length - y.length; };
const canon = (v) => Array.isArray(v) ? "[" + v.map(canon).join(",") + "]" : v && typeof v === "object" ? "{" + Object.keys(v).sort(cmp).map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}" : JSON.stringify(v);
let a;
try { a = JSON.parse(fs.readFileSync(process.argv[2], "utf8").replace(/^﻿/, "")); } catch { console.error("not valid JSON"); process.exit(1); }
if (!a || typeof a !== "object" || typeof a.hash !== "string" || !/^[0-9a-f]{64}$/.test(a.hash)) { console.error("hash missing or malformed"); process.exit(1); }
const { hash, ...rest } = a;
if (crypto.createHash("sha256").update(canon(rest), "utf8").digest("hex") !== hash) { console.error("hash mismatch"); process.exit(1); }
JS

if [ "$have_expect" -eq 1 ]; then
  got="$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8").replace(/^\uFEFF/,"")).hash)' "$scratch/audience.json")"
  [ "$got" = "$expect" ] || fail "hash of the downloaded file ($got) is not the expected hash; data/audience.json left as it was"
fi

# Copy to a private mktemp file beside the target, then rename: the target is never half written and no
# predictable name can be a planted symlink.
stage="$(mktemp "$data/.audience.XXXXXXXX")"
cp "$scratch/audience.json" "$stage"
mv -f "$stage" "$data/audience.json"
stage=""
echo "wrote data/audience.json"
