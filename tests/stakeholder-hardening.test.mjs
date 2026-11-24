// Failing-first tests for the stakeholder plugin hardening (HANDOFF.md, "Stakeholder plugin review"):
// privacy-security findings STK-PS-R3..R9. Written by qa-tdd before any production code. Each test asserts the
// intended new behavior; tests marked "(guard)" already pass and pin behavior the fix must not lose.
//
// Contracts these tests pin where the findings are silent (engineer: follow them, or change them with qa-tdd):
//   - sync-audience.sh [ref] [--expect-hash <64 hex>]; with no STAKEHOLDER_AUDIENCE_BASE it runs curl with
//     `--proto =https --proto-redir =https` (tests stand in a fake curl on PATH, no network).
//   - A refused base exits non-zero with a reason naming STAKEHOLDER_AUDIENCE_BASE and never runs curl.
//     Allowed: file://, http://localhost, http://127.0.0.1 (the host must end there: ":port", "/" or nothing).
//   - check-stakeholder: reasons for ship/zero/zero name "ship", "findings" and "subagents"; the size reason says
//     "1 MB"; the more-than-one-block reason says "more than one"; every success or failure output carries the word
//     "advisory" (plain output, --json output as an "advisory" field, and the stderr of a rejected run).
//   - Escaping is JSON.stringify style (ESC shows as \u001b).
//
// SUPERSEDED OLD TESTS the engineer must update in the same change (they pin the behavior these findings reverse):
//   tests/stakeholder.test.mjs SKP-15 (ship, no findings, 0 subagents expected exit 0: R6),
//   SKP-13 and SKP-22 (--json findings expected on stdout with exit 1: R8).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLUG = path.join(ROOT, "plugins", "stakeholder");
const TOOL = path.join(PLUG, "tools", "check-stakeholder.mjs");
const SYNC = path.join(PLUG, "scripts", "sync-audience.sh");
const FX = path.join(ROOT, "tests", "fixtures", "stakeholder");
const AUD = path.join(FX, "audience.json");
const IDX = path.join(FX, "index-q1-q3.json");
const GOOD_HASH = "f92b483c4143e02c9b0a2fd6b9ce1b3712c696da9e07f5e618f09d7451e0285a";
const ESC = "\u001b";
const C0 = /[\x00-\x09\x0b-\x1f\x7f]/; // every control character except \n

let n = 0;
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), `skph-${process.pid}-${n++}-`));
const read = (p) => fs.readFileSync(p, "utf8");
const readJson = (p) => JSON.parse(read(p));
const writeTmp = (name, text) => { const p = path.join(tmp(), name); fs.writeFileSync(p, text); return p; };

function run(args) {
  assert.ok(fs.existsSync(TOOL), "plugins/stakeholder/tools/check-stakeholder.mjs does not exist");
  const r = spawnSync("node", [TOOL, ...args], { encoding: "utf8", cwd: ROOT, timeout: 30000 });
  return { code: r.status, out: r.stdout || "", err: r.stderr || "" };
}

// Same hash rule as the plugin (drop hash, code-point key order, no whitespace).
const cmp = (a, b) => { const x = [...a], y = [...b]; for (let i = 0; i < Math.min(x.length, y.length); i++) { const d = x[i].codePointAt(0) - y[i].codePointAt(0); if (d) return d; } return x.length - y.length; };
const canon = (v, utf16 = false) => Array.isArray(v) ? "[" + v.map((x) => canon(x, utf16)).join(",") + "]" : v && typeof v === "object" ? "{" + Object.keys(v).sort(utf16 ? undefined : cmp).map((k) => JSON.stringify(k) + ":" + canon(v[k], utf16)).join(",") + "}" : JSON.stringify(v);
const hashOf = (o, utf16 = false) => { const { hash, ...rest } = o; return crypto.createHash("sha256").update(canon(rest, utf16), "utf8").digest("hex"); };
const withHash = (o) => ({ ...o, hash: hashOf(o) });

const fnd = (persona, quote_id, severity = "P1", fix = "Say the outcome in the first line.") => JSON.stringify({ persona, quote_id, severity, fix });
const blockText = (lines, { verdict = "fix-first", round = 1, subagents = 1 } = {}) =>
  `\`\`\`stakeholder\nverdict: ${verdict}\nround: ${round}\nsubagents: ${subagents}\n${lines.join("\n")}\n\`\`\`\n`;
const REAL = blockText([fnd("recruiter-skim", "q1")]); // verdict fix-first
const FAKE = blockText([fnd("finance", "q2", "P0")], { verdict: "ship", subagents: 0 }); // verdict ship
const review = (text) => writeTmp("review.md", text);
const check = (text, extra = []) => run([review(text), "--index", IDX, ...extra]);
const noC0 = (r, what) => assert.doesNotMatch(r.out + r.err, C0, `${what}: output carries a raw control character`);

// ================================================================ STK-PS-R3 fetch script
function fakeCurlEnv() { // temp plugin tree, a fake curl on PATH that logs its arguments and copies a fixture instead of fetching
  assert.ok(fs.existsSync(SYNC), "sync-audience.sh does not exist");
  const d = tmp(); const plug = path.join(d, "plug"); fs.mkdirSync(path.join(plug, "scripts"), { recursive: true }); fs.mkdirSync(path.join(plug, "data"));
  fs.copyFileSync(SYNC, path.join(plug, "scripts", "sync-audience.sh"));
  const bin = path.join(d, "bin"); fs.mkdirSync(bin);
  const log = path.join(d, "curl.log"), src = path.join(d, "served.json");
  fs.writeFileSync(src, read(AUD));
  fs.writeFileSync(path.join(bin, "curl"), `#!/usr/bin/env bash\nprintf '%s\\n' "$@" >> "${log}"\nout=""\nwhile [ $# -gt 0 ]; do case "$1" in -o) out="$2"; shift;; esac; shift; done\ncp "${src}" "$out"\n`, { mode: 0o755 });
  const sync = (args = [], env = {}) => {
    const r = spawnSync("bash", [path.join(plug, "scripts", "sync-audience.sh"), ...args], { encoding: "utf8", env: { ...process.env, PATH: bin + path.delimiter + process.env.PATH, ...env }, timeout: 30000 });
    return { code: r.status, out: r.stdout || "", err: r.stderr || "" };
  };
  const data = path.join(plug, "data", "audience.json");
  const curlArgs = () => (fs.existsSync(log) ? read(log).split("\n").filter(Boolean) : null);
  return { d, plug, data, sync, curlArgs, serve: (t) => fs.writeFileSync(src, t) };
}

test("STK-PS-R3a sync passes --proto =https and --proto-redir =https to curl in normal use", () => {
  const e = fakeCurlEnv();
  const r = e.sync([]); assert.equal(r.code, 0, r.err + r.out);
  const a = e.curlArgs(); assert.ok(a, "curl was not run");
  const after = (flag) => { const i = a.indexOf(flag); return i >= 0 ? a[i + 1] : undefined; };
  assert.equal(after("--proto"), "=https", `curl args: ${a.join(" ")}`);
  assert.equal(after("--proto-redir"), "=https", `curl args: ${a.join(" ")}`);
  assert.ok(a.some((x) => x.startsWith("https://raw.githubusercontent.com/")), "default URL is the https raw host");
});

test("STK-PS-R3b STAKEHOLDER_AUDIENCE_BASE other than file:// or localhost is refused with a reason, curl never runs, data untouched", () => {
  for (const base of ["https://evil.example/x", "http://evil.example", "ftp://evil.example", "http://localhost.evil.example", "http://127.0.0.1.evil.example", "http://user@evil.example#@localhost", "HTTPS://raw.githubusercontent.com/x"]) {
    const e = fakeCurlEnv(); fs.writeFileSync(e.data, "OLD");
    const r = e.sync([], { STAKEHOLDER_AUDIENCE_BASE: base });
    assert.notEqual(r.code, 0, `${base}: expected a non-zero exit\n${r.out}${r.err}`);
    assert.match(r.err, /STAKEHOLDER_AUDIENCE_BASE/, `${base}: reason must name the variable: ${r.err}`);
    assert.equal(e.curlArgs(), null, `${base}: curl must not run`);
    assert.equal(read(e.data), "OLD", `${base}: data/audience.json changed`);
  }
});

test("STK-PS-R3c (guard) file://, http://localhost and http://127.0.0.1 bases are honored", () => {
  for (const base of ["file:///tmp/host", "http://localhost:8123", "http://localhost", "http://127.0.0.1:9", "http://127.0.0.1/x"]) {
    const e = fakeCurlEnv();
    const r = e.sync([], { STAKEHOLDER_AUDIENCE_BASE: base });
    assert.equal(r.code, 0, `${base}: ${r.err}${r.out}`);
    assert.ok(e.curlArgs().some((x) => x.startsWith(base)), `${base}: curl was not pointed at it`);
  }
});

test("STK-PS-R3d --expect-hash <hex> passes on a match and fails on a difference, leaving data untouched", () => {
  const e = fakeCurlEnv();
  const ok = e.sync(["main", "--expect-hash", GOOD_HASH]); assert.equal(ok.code, 0, ok.err + ok.out);
  assert.equal(read(e.data), read(AUD));
  const e2 = fakeCurlEnv(); fs.writeFileSync(e2.data, "OLD");
  const other = "0".repeat(64);
  const bad = e2.sync(["main", "--expect-hash", other]);
  assert.equal(bad.code, 1, "a hash that differs from the fetched file must fail the sync\n" + bad.out + bad.err);
  assert.match(bad.err, /hash/i); assert.equal(read(e2.data), "OLD");
  assert.deepEqual(fs.readdirSync(path.dirname(e2.data)), ["audience.json"], "no stray file in data/");
  for (const junk of ["xyz", "ABC", GOOD_HASH.slice(1), ""]) {
    const e3 = fakeCurlEnv(); fs.writeFileSync(e3.data, "OLD");
    const r = e3.sync(["main", "--expect-hash", junk]);
    assert.notEqual(r.code, 0, `malformed expected hash ${JSON.stringify(junk)} must be refused`);
    assert.equal(read(e3.data), "OLD");
  }
});

test("STK-PS-R3e README says the hash is drift detection, not provenance", () => {
  const t = read(path.join(PLUG, "README.md"));
  assert.match(t, /drift detection/i, "README must call the hash drift detection");
  assert.match(t, /not provenance/i, "README must say it is not provenance");
});

// ================================================================ STK-PS-R4 control characters
test("STK-PS-R4a an ESC in an unknown persona or the verdict value is escaped on stderr, never raw", () => {
  const r = check(blockText([fnd(`${ESC}[31mred`, "q1")]));
  assert.equal(r.code, 1); noC0(r, "persona");
  assert.match(r.err, /\\u001b\[31mred/, `escaped form missing: ${JSON.stringify(r.err)}`);
  const v = check(`\`\`\`stakeholder\nverdict: ship${ESC}[2J\x07\x08\nround: 1\nsubagents: 1\n${fnd("recruiter-skim", "q1")}\n\`\`\`\n`);
  assert.equal(v.code, 1); noC0(v, "verdict");
  assert.match(v.err, /\\u001b/);
});

test("STK-PS-R4b a persona id with ESC in audience.json is escaped on a successful run (stdout) and in --json", () => {
  const a = readJson(AUD); a.personas[0].id = `ev${ESC}il`;
  const aud = writeTmp("aud.json", JSON.stringify(withHash(a)));
  const text = blockText([JSON.stringify({ persona: `ev${ESC}il`, quote_id: "q1", severity: "P1", fix: "Say it first." })]);
  const r = run([review(text), "--index", IDX, "--audience", aud]);
  assert.equal(r.code, 0, r.err); noC0(r, "success table");
  assert.match(r.out, /ev\\u001bil/);
  const j = run([review(text), "--index", IDX, "--audience", aud, "--json"]);
  assert.equal(j.code, 0, j.err); noC0(j, "--json");
});

test("STK-PS-R4c an ESC in a quote id of the index is escaped in the reasons", () => {
  const idx = writeTmp("idx.json", JSON.stringify({ quotes: [{ id: "q1", text: "a" }, { id: `q${ESC}[1m2`, text: "b" }, { id: `q${ESC}[1m2`, text: "dup" }] }));
  const r = run([review(REAL), "--index", idx]);
  assert.equal(r.code, 1); noC0(r, "index id");
  assert.match(r.err, /\\u001b/);
});

// ================================================================ STK-PS-R5 prototype keys
const baseFinding = { persona: "recruiter-skim", quote_id: "q1", severity: "P1", fix: "Say it first." };
test("STK-PS-R5a a __proto__ line cannot satisfy the required fields and is rejected", () => {
  const line = `{"__proto__":${JSON.stringify(baseFinding)}}`;
  const r = check(blockText([line]));
  assert.equal(r.code, 1, "an inherited (via __proto__) persona/quote_id/severity/fix must not count\n" + r.out + r.err);
  assert.match(r.err, /__proto__/, "the reason names the key");
});
test("STK-PS-R5b a valid finding plus an extra __proto__ key is rejected as an extra field", () => {
  const r = check(blockText([JSON.stringify(baseFinding).replace(/}$/, ',"__proto__":{"x":1}}')]));
  assert.equal(r.code, 1, r.out + r.err); assert.match(r.err, /__proto__/);
});
for (const key of ["constructor", "prototype"]) {
  test(`STK-PS-R5c (guard) a "${key}" key is rejected as an extra field`, () => {
    const r = check(blockText([JSON.stringify({ ...baseFinding, [key]: {} })]));
    assert.equal(r.code, 1); assert.match(r.err, new RegExp(key));
  });
}

// ================================================================ STK-PS-R6 ship with nothing behind it
test("STK-PS-R6a verdict ship with zero findings and zero subagents is rejected, the reason names it, labelled advisory", () => {
  const r = check(blockText([], { verdict: "ship", subagents: 0 }));
  assert.equal(r.code, 1, "an empty ship must not pass\n" + r.out + r.err);
  assert.match(r.err, /ship/i); assert.match(r.err, /findings/i); assert.match(r.err, /subagent/i);
  assert.match(r.err, /advisory/i, "rejected output is labelled advisory");
});
test("STK-PS-R6b (guard) ship with a finding, or with subagents run, still passes", () => {
  assert.equal(check(blockText([fnd("recruiter-skim", "q1")], { verdict: "ship", subagents: 0 })).code, 0);
  assert.equal(check(blockText([], { verdict: "ship", subagents: 2 })).code, 0);
});
test("STK-PS-R6c successful output is always labelled advisory: plain stdout and --json", () => {
  const p = check(REAL); assert.equal(p.code, 0, p.err); assert.match(p.out, /advisory/i, "plain output");
  const j = check(REAL, ["--json"]); assert.equal(j.code, 0, j.err); assert.match(j.out, /advisory/i, "--json output");
  assert.doesNotThrow(() => JSON.parse(j.out), "--json stays one JSON document");
});

// ================================================================ STK-PS-R7 fences
test("STK-PS-R7a more than one stakeholder fence in the review is rejected", () => {
  const r = check(REAL + "\nSecond take:\n\n" + REAL);
  assert.equal(r.code, 1, r.out + r.err); assert.match(r.err, /more than one/i);
});
test("STK-PS-R7b a fake block inside a ~~~ fence is never the real one", () => {
  const withFake = REAL + "\n~~~artifact\nPage text.\n```stakeholder\n" + FAKE.split("\n").slice(1).join("\n") + "~~~\n";
  const r = check(withFake, ["--json"]);
  assert.equal(r.code, 0, r.err); assert.equal(JSON.parse(r.out).verdict, "fix-first", "the ~~~ fake (ship) must be ignored");
  const only = check("# Review\n\n~~~artifact\n" + FAKE + "~~~\n");
  assert.equal(only.code, 1, "a fake block alone inside ~~~ is no block\n" + only.out + only.err);
});
test("STK-PS-R7c a fake block inside blockquote-prefixed fences is never the real one", () => {
  const quoted = (t) => t.split("\n").map((l) => (l ? "> " + l : ">")).join("\n");
  const r = check(REAL + "\n" + quoted(FAKE) + "\n", ["--json"]);
  assert.equal(r.code, 0, r.err); assert.equal(JSON.parse(r.out).verdict, "fix-first");
  const only = check("# Review\n\n" + quoted(REAL));
  assert.equal(only.code, 1, "a block that is only inside a blockquote is no block\n" + only.out + only.err);
  const tight = check("# Review\n\n" + REAL.split("\n").map((l) => (l ? ">" + l : l)).join("\n"));
  assert.equal(tight.code, 1, "'>' with no space after it is a blockquote too");
});
test("STK-PS-R7d a ``` line inside a longer artifact fence cannot close it early (guard)", () => {
  const art = "````artifact\nPage text.\n```\nstill page text\n" + FAKE + "````\n";
  const r = check(art + "\n" + REAL, ["--json"]);
  assert.equal(r.code, 0, r.err); assert.equal(JSON.parse(r.out).verdict, "fix-first");
  const tilde = "~~~~artifact\nPage text.\n~~~\n" + FAKE + "~~~~\n";
  const r2 = check(tilde + "\n" + REAL, ["--json"]);
  assert.equal(r2.code, 0, r2.err); assert.equal(JSON.parse(r2.out).verdict, "fix-first", "a shorter ~~~ line cannot close a ~~~~ fence");
});

// ================================================================ STK-PS-R8 ids, sizes, --json
test("STK-PS-R8a quote ids must match ^[A-Za-z0-9_-]{1,40}$ in the index", () => {
  const withId = (id) => writeTmp("idx.json", JSON.stringify({ quotes: [{ id: "q1", text: "a" }, { id, text: "b" }] }));
  for (const bad of ["q 2", "q.2", "a/b", "q2é", "x".repeat(41), "", "q2\n"]) {
    const r = run([review(REAL), "--index", withId(bad)]);
    assert.equal(r.code, 1, `index id ${JSON.stringify(bad)} must be refused\n${r.out}${r.err}`);
    assert.match(r.err, /quote id|id/i);
  }
  for (const good of ["x", "x".repeat(40), "Q_2-b"]) {
    const r = run([review(REAL), "--index", withId(good)]); assert.equal(r.code, 0, `index id ${JSON.stringify(good)}: ${r.err}`);
  }
});
test("STK-PS-R8b a finding whose quote_id breaks the format is rejected even when the index holds it", () => {
  const id = "x".repeat(41);
  const idx = writeTmp("idx.json", JSON.stringify({ quotes: [{ id: "q1", text: "a" }, { id, text: "b" }] }));
  const r = run([review(blockText([fnd("recruiter-skim", id)])), "--index", idx]);
  assert.equal(r.code, 1, r.out + r.err);
});
test("STK-PS-R8c input files over 1 MB are rejected (review, index, audience, --prev); just under passes", () => {
  const pad = (bytes) => "x".repeat(bytes);
  const big = 1048576 + 1000, small = 900000;
  const rv = check(REAL + "\n" + pad(big) + "\n"); assert.equal(rv.code, 1, "review"); assert.match(rv.err, /1 MB|too large|size/i);
  assert.equal(check(REAL + "\n" + pad(small) + "\n").code, 0, "a review just under 1 MB passes");
  const bigIdx = writeTmp("idx.json", JSON.stringify({ quotes: [{ id: "q1", text: pad(big) }] }));
  const ri = run([review(REAL), "--index", bigIdx]); assert.equal(ri.code, 1, "index"); assert.match(ri.err, /1 MB|too large|size/i);
  const a = readJson(AUD); a.padding = pad(big);
  const ra = run([review(REAL), "--index", IDX, "--audience", writeTmp("aud.json", JSON.stringify(withHash(a)))]);
  assert.equal(ra.code, 1, "audience"); assert.match(ra.err, /1 MB|too large|size/i);
  const rp = run([review(blockText([fnd("recruiter-skim", "q1")], { round: 2 })), "--index", IDX, "--prev", review(REAL + "\n" + pad(big))]);
  assert.equal(rp.code, 1, "prev"); assert.match(rp.err, /1 MB|too large|size/i);
});
test("STK-PS-R8d with --json, findings print only on success (exit 0)", () => {
  const bad = check(blockText([fnd("recruiter-skim", "q1"), fnd("recruiter-skim", "q99")]), ["--json"]);
  assert.equal(bad.code, 1);
  assert.doesNotMatch(bad.out, /findings|recruiter-skim/, "stdout must not carry findings when the exit code is 1: " + bad.out);
  const ok = check(REAL, ["--json"]); assert.equal(ok.code, 0, ok.err);
  assert.equal(JSON.parse(ok.out).findings.length, 1);
});

// ================================================================ STK-PS-R9 hash agreement, temp names
test("STK-PS-R9a sync-audience.sh and check-stakeholder agree on every hash fixture (including code-point key order)", () => {
  const o = { personas: [{ id: "x", "ｚ": 1, "\u{1D49C}": 2, "café": "\u{1F600}" }], protocols: { b: 1, a: 2 } };
  assert.notEqual(hashOf(o), hashOf(o, true), "fixture must separate code-point from UTF-16 order");
  const fixtures = {
    pinned: read(AUD),
    codepoint: JSON.stringify(withHash(o), null, 2),
    utf16_wrong: JSON.stringify({ ...o, hash: hashOf(o, true) }),
    tampered: read(path.join(FX, "audience-tampered.json")),
    nohash: JSON.stringify(o),
    short: JSON.stringify({ ...o, hash: "abc" }),
    crlf: read(AUD).replace(/\n/g, "\r\n"),
  };
  for (const [name, text] of Object.entries(fixtures)) {
    const viaTool = run(["--verify-hash", writeTmp(name + ".json", text)]).code === 0;
    const e = fakeCurlEnv(); e.serve(text);
    const viaSync = e.sync([]).code === 0;
    assert.equal(viaSync, viaTool, `${name}: sync-audience.sh says ${viaSync}, check-stakeholder says ${viaTool}`);
  }
  const hand = fakeCurlEnv(); hand.serve(fixtures.codepoint);
  assert.equal(hand.sync([]).code, 0, "the code-point-order fixture must be accepted by sync");
});
test("STK-PS-R9b the staging file in sync is from mktemp: a planted symlink at the old fixed name is never written through", () => {
  const e = fakeCurlEnv();
  const victim = path.join(e.d, "victim.txt"); fs.writeFileSync(victim, "KEEP");
  fs.symlinkSync(victim, path.join(e.plug, "data", ".audience.json.new"));
  const r = e.sync([]); assert.equal(r.code, 0, r.err + r.out);
  assert.equal(read(victim), "KEEP", "sync wrote through a symlink planted at the predictable name");
  assert.equal(read(e.data), read(AUD));
  assert.doesNotMatch(read(SYNC), /\.audience\.json\.new/, "the fixed staging name is gone from the script");
  assert.match(read(SYNC), /mktemp/, "the script still uses mktemp");
});
