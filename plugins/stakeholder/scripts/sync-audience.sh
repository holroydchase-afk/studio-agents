#!/usr/bin/env bash
# Fetch the persona file (personas/audience.json) from persona-twins into ../data/audience.json.
# Usage: sync-audience.sh [ref]     ref defaults to main (a branch or tag name)
# The repo is public, so no credentials are used or sent. The download is checked (valid JSON, hash matches
# its own contents) in a scratch folder first; data/audience.json is replaced only when the check passes.
set -euo pipefail

REPO="holroydchase-afk/persona-twins"   # the one place the repo name lives (a rename is pending)
BASE="${STAKEHOLDER_AUDIENCE_BASE:-https://raw.githubusercontent.com/$REPO}"
ref="${1:-main}"

fail() { echo "sync-audience: $*" >&2; exit 1; }

# A ref is a plain branch or tag name: no "..", no spaces, no leading dash or slash, no "//".
[[ "$ref" =~ ^[A-Za-z0-9][A-Za-z0-9._/-]*$ ]] || fail "bad ref: $ref"
[[ "$ref" != *..* && "$ref" != *//* && "$ref" != */ ]] || fail "bad ref: $ref"

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
data="$here/../data"
mkdir -p "$data"
scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT

echo "ref $ref"
curl -fsSL --max-time 30 -o "$scratch/audience.json" "$BASE/$ref/personas/audience.json" \
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

# Copy beside the target, then rename: the target is never half written.
cp "$scratch/audience.json" "$data/.audience.json.new"
mv -f "$data/.audience.json.new" "$data/audience.json"
echo "wrote data/audience.json"
