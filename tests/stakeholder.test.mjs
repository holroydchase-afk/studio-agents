// Failing-first tests for the stakeholder plugin (docs/product/SPEC-STAKEHOLDER-PKG.md, criteria SKP-1..SKP-22).
// Written by qa-tdd before any production code: red until the engineer builds plugins/stakeholder.
// Every checker/script test asserts the tool exists first, so a missing tool fails on its own with a clear message
// instead of passing an "exit 1" assertion by accident.
//
// Contracts these tests pin where the spec is silent (engineer: follow them, or change them with qa-tdd):
//   - CLI: node plugins/stakeholder/tools/check-stakeholder.mjs <review.md> --index <quotes.json> [--audience f]
//     [--prev round1.md] [--json]   |   check-stakeholder.mjs --verify-hash <audience.json>
//     exit 0 valid, 1 reasons (one per line on stderr), 2 usage error. On exit 0 the plain output ends with an
//     agreement table: a header line holding every quote id used, then one line per persona starting with its id.
//   - --json prints on stdout {verdict, round, subagents, findings:[{persona,quote_id,severity,fix,line}],
//     hit_rate:"<found> of <total>"} even when the exit code is 1 (findings = the lines that were read as valid).
//   - A bad finding line reason on stderr carries the file line number of that line.
//   - sync-audience.sh <ref?> reads env STAKEHOLDER_AUDIENCE_BASE (a base URL, file:// allowed) and fetches
//     <base>/<ref>/personas/audience.json; it writes <script dir>/../data/audience.json; prints "ref <ref>".
//   - README worked example: a line holding "check-stakeholder" and "--index" whose arguments run from the plugin folder.
// Not run here: SKP-20 (manual, clean machine) and the live fetch of M1.4 (needs a host that reaches raw GitHub).
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
const AUD = path.join(FX, "audience.json"); // pinned: persona-twins personas/audience.json at commit 5e7b9eb
const IDX = path.join(FX, "index-q1-q3.json");
const GOOD_HASH = "f92b483c4143e02c9b0a2fd6b9ce1b3712c696da9e07f5e618f09d7451e0285a";
const PERSONAS = ["customer", "everyday", "finance", "hiring-manager", "linkedin-scroller", "marketing", "pm-peer", "product", "recruiter-skim", "sales", "skeptic", "staff-engineer"];

let n = 0;
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), `skp-${process.pid}-${n++}-`));
const read = (p) => fs.readFileSync(p, "utf8");
const readJson = (p) => JSON.parse(read(p));
const fx = (name) => path.join(FX, name);

function needTool() { assert.ok(fs.existsSync(TOOL), `plugins/stakeholder/tools/check-stakeholder.mjs does not exist yet`); }
function needSync() { assert.ok(fs.existsSync(SYNC), `plugins/stakeholder/scripts/sync-audience.sh does not exist yet`); }
function run(args, opts = {}) {
  needTool();
  const r = spawnSync("node", [TOOL, ...args], { encoding: "utf8", cwd: opts.cwd || ROOT, timeout: 30000 });
  return { code: r.status, out: r.stdout || "", err: r.stderr || "" };
}
const noStack = (r) => assert.doesNotMatch(r.err + r.out, /\n\s+at .*:\d+:\d+|TypeError|SyntaxError|ReferenceError/, "must not print a stack trace");

// Canonical JSON per the spec's hash rule: drop hash, keys sorted by code point at every depth, no whitespace.
function cmp(a, b) { const x = [...a], y = [...b]; for (let i = 0; i < Math.min(x.length, y.length); i++) { const d = x[i].codePointAt(0) - y[i].codePointAt(0); if (d) return d; } return x.length - y.length; }
function canon(v, utf16 = false) {
  if (Array.isArray(v)) return "[" + v.map((x) => canon(x, utf16)).join(",") + "]";
  if (v && typeof v === "object") return "{" + Object.keys(v).sort(utf16 ? undefined : cmp).map((k) => JSON.stringify(k) + ":" + canon(v[k], utf16)).join(",") + "}";
  return JSON.stringify(v);
}
function hashOf(o, utf16 = false) { const { hash, ...rest } = o; return crypto.createHash("sha256").update(canon(rest, utf16), "utf8").digest("hex"); }
function shuffleKeys(v) { // reverse key order at every depth
  if (Array.isArray(v)) return v.map(shuffleKeys);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).reverse().map((k) => [k, shuffleKeys(v[k])]));
  return v;
}
function writeTmp(name, text) { const d = tmp(); const p = path.join(d, name); fs.writeFileSync(p, text); return p; }

// Review builders.
const fnd = (persona, quote_id, severity = "P1", fix = "Say the outcome in the first line.") => JSON.stringify({ persona, quote_id, severity, fix });
const block = (lines, { verdict = "fix-first", round = 1, subagents = 1 } = {}) =>
  `# Review\n\n\`\`\`stakeholder\nverdict: ${verdict}\nround: ${round}\nsubagents: ${subagents}\n${lines.join("\n")}\n\`\`\`\n`;
const bigIndex = (k = 60) => writeTmp("index.json", JSON.stringify({ quotes: Array.from({ length: k }, (_, i) => ({ id: `q${i + 1}`, text: `quote ${i + 1}` })) }));
const reviewFile = (lines, opts) => writeTmp("review.md", block(lines, opts));

// ---------------------------------------------------------------- SKP-1..3 package
test("SKP-1 plugin.json, agent and skill front matter exist and parse; agent has no Edit or Write", () => {
  const pj = path.join(PLUG, ".claude-plugin", "plugin.json");
  assert.ok(fs.existsSync(pj), "plugins/stakeholder/.claude-plugin/plugin.json missing");
  const p = readJson(pj);
  assert.equal(p.name, "stakeholder");
  assert.match(p.version || "", /^\d+\.\d+\.\d+/);
  const fm = (f) => { const t = read(f); const m = t.match(/^---\n([\s\S]*?)\n---/); assert.ok(m, `${f} has no front matter`); return Object.fromEntries(m[1].split("\n").filter((l) => /^\w+: /.test(l)).map((l) => [l.slice(0, l.indexOf(":")), l.slice(l.indexOf(":") + 2)])); };
  const a = fm(path.join(PLUG, "agents", "stakeholder.md"));
  assert.equal(a.name, "stakeholder"); assert.ok(a.description); assert.ok(a.tools, "agent needs a tools line");
  assert.doesNotMatch(a.tools, /\b(Edit|Write)\b/);
  const s = fm(path.join(PLUG, "skills", "stakeholder", "SKILL.md"));
  assert.equal(s.name, "stakeholder"); assert.ok(s.description);
});

test("SKP-2 agent file states job, done test, caps, kill switch, advisory, no dollar cap", () => {
  const f = path.join(PLUG, "agents", "stakeholder.md");
  assert.ok(fs.existsSync(f), "agents/stakeholder.md missing");
  const t = read(f);
  assert.match(t, /\bjob\b/i, "states the job");
  for (const s of ["check-stakeholder", "2 rounds", "5 personas", "10 critique subagents", "25 tool calls", ".claude/stakeholder.off", "advisory", "no dollar"]) assert.ok(t.toLowerCase().includes(s.toLowerCase()), `agent file lacks "${s}"`);
  assert.doesNotMatch(t, /USD|--cap/);
});

test("SKP-3 marketplace has exactly studio and stakeholder, sources exist, descriptions match plugin.json", () => {
  const m = readJson(path.join(ROOT, ".claude-plugin", "marketplace.json"));
  assert.deepEqual(m.plugins.map((p) => p.name).sort(), ["stakeholder", "studio"]);
  for (const e of m.plugins) {
    const dir = path.join(ROOT, e.source);
    assert.ok(fs.existsSync(dir), `source folder missing for ${e.name}`);
    const pj = readJson(path.join(dir, ".claude-plugin", "plugin.json"));
    assert.equal(e.description, pj.description, `${e.name}: marketplace description differs from plugin.json`);
  }
});

// ---------------------------------------------------------------- SKP-4..6 hash
test("SKP-4 bundled audience.json verifies; pinned persona-twins file reproduces the recomputed hash", () => {
  const pinned = readJson(AUD);
  assert.equal(pinned.hash, GOOD_HASH); assert.equal(hashOf(pinned), GOOD_HASH, "test canonicalizer disagrees with the pinned file");
  const bundled = path.join(PLUG, "data", "audience.json");
  assert.ok(fs.existsSync(bundled), "plugins/stakeholder/data/audience.json missing");
  const r = run(["--verify-hash", bundled]); assert.equal(r.code, 0, r.err); assert.ok((r.out + r.err).includes(GOOD_HASH));
  const r2 = run(["--verify-hash", AUD]); assert.equal(r2.code, 0, r2.err);
});

test("SKP-5 one changed character fails with a hash reason; shuffled key order at every depth still passes", () => {
  const bad = run(["--verify-hash", fx("audience-tampered.json")]);
  assert.equal(bad.code, 1); assert.match(bad.err, /hash/i); noStack(bad);
  const shuffled = writeTmp("shuffled.json", JSON.stringify(shuffleKeys(readJson(AUD)), null, 3));
  const ok = run(["--verify-hash", shuffled]); assert.equal(ok.code, 0, ok.err);
});

test("SKP-6 hash edge cases: missing, malformed, invalid JSON fail with one reason; BOM and CRLF read fine", () => {
  const a = readJson(AUD);
  const cases = {
    missing: (() => { const { hash, ...r } = a; return JSON.stringify(r); })(),
    short: JSON.stringify({ ...a, hash: "abc123" }),
    upper_non_hex: JSON.stringify({ ...a, hash: "z".repeat(64) }),
    invalid_json: "{ not json",
    empty: "",
  };
  for (const [name, text] of Object.entries(cases)) {
    const r = run(["--verify-hash", writeTmp(`${name}.json`, text)]);
    assert.equal(r.code, 1, `${name}: expected exit 1, got ${r.code}`); noStack(r);
    assert.equal(r.err.trim().split("\n").filter(Boolean).length, 1, `${name}: exactly one reason, got: ${r.err}`);
  }
  const src = read(AUD);
  const bom = run(["--verify-hash", writeTmp("bom.json", "﻿" + src)]); assert.equal(bom.code, 0, "BOM: " + bom.err);
  const crlf = run(["--verify-hash", writeTmp("crlf.json", src.replace(/\n/g, "\r\n"))]); assert.equal(crlf.code, 0, "CRLF: " + crlf.err);
});

test("SKP-6 non-ASCII and astral keys sort by code point (JS UTF-16 order is wrong for the hash)", () => {
  const o = { personas: [{ id: "x", "ｚ": 1, "\u{1D49C}": 2, "café": "\u{1F600}" }], protocols: { b: 1, a: 2 } };
  const good = { ...o, hash: hashOf(o) };
  assert.notEqual(hashOf(o), hashOf(o, true), "fixture must distinguish code point from UTF-16 order");
  const r = run(["--verify-hash", writeTmp("astral.json", JSON.stringify(good, null, 2))]); assert.equal(r.code, 0, r.err);
  const wrong = run(["--verify-hash", writeTmp("astral-utf16.json", JSON.stringify({ ...o, hash: hashOf(o, true) }))]);
  assert.equal(wrong.code, 1); assert.match(wrong.err, /hash/i);
});

// ---------------------------------------------------------------- SKP-7..9 fetch script
function syncEnv() { // temp plugin tree holding a copy of the script, a fixture "raw host" folder, and the data dir
  needSync();
  const d = tmp(); const plug = path.join(d, "plug"); fs.mkdirSync(path.join(plug, "scripts"), { recursive: true }); fs.mkdirSync(path.join(plug, "data"));
  fs.copyFileSync(SYNC, path.join(plug, "scripts", "sync-audience.sh"));
  const base = path.join(d, "host");
  const put = (ref, text) => { const p = path.join(base, ref, "personas"); fs.mkdirSync(p, { recursive: true }); fs.writeFileSync(path.join(p, "audience.json"), text); };
  const sync = (...args) => { const r = spawnSync("bash", [path.join(plug, "scripts", "sync-audience.sh"), ...args], { encoding: "utf8", env: { ...process.env, STAKEHOLDER_AUDIENCE_BASE: "file://" + base, GITHUB_TOKEN: "ghp_SHOULD_NEVER_BE_SENT", GH_TOKEN: "ghp_SHOULD_NEVER_BE_SENT" }, timeout: 30000 }); return { code: r.status, out: r.stdout || "", err: r.stderr || "" }; };
  const data = path.join(plug, "data", "audience.json");
  return { d, plug, base, put, sync, data };
}

test("SKP-7 sync-audience.sh copies the fixture, prints the ref, defaults to main, sends no token", () => {
  const e = syncEnv(); const good = read(AUD);
  e.put("main", good); e.put("claude/project-thread-xhlmij", good);
  const r = e.sync(); assert.equal(r.code, 0, r.err); assert.match(r.out, /ref main/);
  assert.equal(read(e.data), good);
  const r2 = e.sync("claude/project-thread-xhlmij"); assert.equal(r2.code, 0, r2.err); assert.match(r2.out, /ref claude\/project-thread-xhlmij/);
  const src = read(SYNC);
  assert.doesNotMatch(src, /authorization|bearer|GITHUB_TOKEN|GH_TOKEN|gh auth/i, "script must not read or send a token");
});

test("SKP-8 bad downloads and bad refs exit 1 and leave the existing file byte-identical", () => {
  const e = syncEnv(); const good = read(AUD);
  fs.writeFileSync(e.data, good);
  const before = fs.readFileSync(e.data);
  e.put("wronghash", read(fx("audience-tampered.json")));
  e.put("html", "<!doctype html><html><body>404: Not Found</body></html>");
  e.put("empty", "");
  e.put("notjson", "{ nope");
  const cases = { wronghash: ["wronghash"], html: ["html"], empty: ["empty"], notjson: ["notjson"], missingref: ["no-such-ref"], dotdot: ["../x"], dotdot2: ["a/../../b"], space: ["a b"], leadingdash: ["--help"] };
  for (const [name, args] of Object.entries(cases)) {
    const r = e.sync(...args);
    assert.equal(r.code, 1, `${name}: expected exit 1, got ${r.code}\n${r.out}${r.err}`);
    assert.ok(fs.readFileSync(e.data).equals(before), `${name}: data/audience.json changed`);
    assert.deepEqual(fs.readdirSync(path.dirname(e.data)), ["audience.json"], `${name}: left a stray file in data/`);
  }
});

test("SKP-9 two consecutive syncs are idempotent and leave exactly one file in data/", () => {
  const e = syncEnv(); const good = read(AUD); e.put("main", good);
  for (let i = 0; i < 2; i++) { const r = e.sync(); assert.equal(r.code, 0, r.err); assert.equal(read(e.data), good); assert.deepEqual(fs.readdirSync(path.dirname(e.data)), ["audience.json"]); }
});

// ---------------------------------------------------------------- SKP-10..17, 22 findings
test("SKP-10 a quote id missing from the index (q99) fails and names the id and the line", () => {
  const r = run([fx("review-q99.md"), "--index", IDX]);
  assert.equal(r.code, 1); noStack(r);
  const line = r.err.split("\n").find((l) => l.includes("q99"));
  assert.ok(line, `no reason names q99: ${r.err}`);
  const lineNo = read(fx("review-q99.md")).split("\n").findIndex((l) => l.includes('"q99"')) + 1;
  assert.match(line, new RegExp(`\\b${lineNo}\\b`), "reason carries the line number");
});

test("SKP-10 the good fixture passes", () => {
  const r = run([fx("review-good.md"), "--index", IDX]); assert.equal(r.code, 0, r.err); noStack(r);
});

test("SKP-11 fix must be exactly one non-empty single-line string", () => {
  const fixture = run([fx("review-two-fixes.md"), "--index", IDX]);
  assert.equal(fixture.code, 1, "two fixes in one finding must fail"); assert.match(fixture.err, /fix/i);
  const bad = {
    array: JSON.stringify({ persona: "recruiter-skim", quote_id: "q1", severity: "P1", fix: ["a", "b"] }),
    empty: fnd("recruiter-skim", "q1", "P1", ""),
    newline: fnd("recruiter-skim", "q1", "P1", "one\ntwo"),
    missing: JSON.stringify({ persona: "recruiter-skim", quote_id: "q1", severity: "P1" }),
  };
  for (const [name, line] of Object.entries(bad)) {
    const r = run([reviewFile([line]), "--index", IDX]);
    assert.equal(r.code, 1, `${name}: expected exit 1`); noStack(r);
    assert.equal(r.err.trim().split("\n").filter(Boolean).length, 1, `${name}: one reason per bad line: ${r.err}`);
  }
  assert.equal(run([reviewFile([fnd("recruiter-skim", "q1")]), "--index", IDX]).code, 0);
});

test("SKP-12 severity and persona are checked; all 12 audience ids are accepted", () => {
  for (const sev of ["P3", "p0", undefined]) {
    const line = sev === undefined ? JSON.stringify({ persona: "recruiter-skim", quote_id: "q1", fix: "x" }) : fnd("recruiter-skim", "q1", sev);
    const r = run([reviewFile([line]), "--index", IDX]); assert.equal(r.code, 1, `severity ${sev}`); assert.match(r.err, /severity/i);
  }
  const u = run([fx("review-unknown-persona.md"), "--index", IDX]); assert.equal(u.code, 1); assert.match(u.err, /intern/);
  assert.deepEqual(readJson(AUD).personas.map((p) => p.id).sort(), PERSONAS);
  for (const p of PERSONAS) { const r = run([reviewFile([fnd(p, "q1")]), "--index", IDX]); assert.equal(r.code, 0, `${p}: ${r.err}`); }
});

test("SKP-13 non-strict lines and duplicates are each rejected; the other valid lines are still read, never hidden", () => {
  const A = fnd("recruiter-skim", "q1"), B = fnd("staff-engineer", "q2");
  const bad = {
    single_quotes: "{'persona':'skeptic','quote_id':'q3','severity':'P1','fix':'x'}",
    trailing_comma: '{"persona":"skeptic","quote_id":"q3","severity":"P1","fix":"x",}',
    duplicate_key: '{"persona":"skeptic","persona":"finance","quote_id":"q3","severity":"P1","fix":"x"}',
    extra_field: '{"persona":"skeptic","quote_id":"q3","severity":"P1","fix":"x","note":"y"}',
    identical_twice: A,
  };
  for (const [name, line] of Object.entries(bad)) {
    const file = reviewFile([A, B, line]);
    const lineNo = read(file).split("\n").length - 2; // the bad line is the last finding line
    const r = run([file, "--index", IDX, "--json"]);
    assert.equal(r.code, 1, `${name}: expected exit 1`); noStack(r);
    assert.match(r.err, name === "identical_twice" ? /duplicate/i : /strict JSON/i, `${name}: reason text`);
    assert.match(r.err, new RegExp(`\\b${lineNo}\\b`), `${name}: reason carries line ${lineNo}: ${r.err}`);
    // STK-PS-R8d (QA-R2): --json prints findings only on success, so a rejected run has no stdout findings.
    // The valid lines are still never hidden or blamed: the only reason names the bad line, not the two good ones.
    assert.doesNotMatch(r.out, /findings|recruiter-skim|staff-engineer/, `${name}: stdout must not carry findings on exit 1`);
    assert.doesNotMatch(r.err, /recruiter-skim|staff-engineer/, `${name}: the valid lines must not be blamed`);
  }
});

test("SKP-14 caps: 5 personas, 10 findings per persona, 40 per block, 10 subagents", () => {
  const idx = bigIndex(60);
  const ids = PERSONAS;
  const many = (personas, per) => personas.flatMap((p, pi) => Array.from({ length: per }, (_, k) => fnd(p, `q${pi * 10 + k + 1}`)));
  const chk = (lines, opts) => run([reviewFile(lines, opts), "--index", idx]);
  let r = chk(many(ids.slice(0, 6), 1)); assert.equal(r.code, 1, "6 personas"); assert.match(r.err, /\b6\b.*persona|persona.*\b6\b|5 persona/i);
  r = chk(many(ids.slice(0, 1), 11)); assert.equal(r.code, 1, "11 findings from one persona"); assert.match(r.err, /\b11\b|\b10\b/);
  r = chk([...many(ids.slice(0, 5), 8), fnd(ids[0], "q50")]); assert.equal(r.code, 1, "41 findings"); assert.match(r.err, /\b41\b|\b40\b/);
  r = chk(many(ids.slice(0, 1), 1), { subagents: 11 }); assert.equal(r.code, 1, "subagents 11"); assert.match(r.err, /subagent/i);
  r = chk(many(ids.slice(0, 5), 1), {}); assert.equal(r.code, 0, "5 personas: " + r.err);
  r = chk(many(ids.slice(0, 1), 10)); assert.equal(r.code, 0, "10 findings: " + r.err);
  r = chk(many(ids.slice(0, 5), 8), { subagents: 10 }); assert.equal(r.code, 0, "40 findings, subagents 10: " + r.err);
});

test("SKP-15 verdicts: ship may be empty; fix-first and rethink may not; unknown or doubled verdict fails", () => {
  const idx = IDX;
  // STK-PS-R6 (QA-R1): an empty ship with zero subagents run is rejected; an empty ship after real subagents passes.
  assert.equal(run([reviewFile([], { verdict: "ship", subagents: 0 }), "--index", idx]).code, 1);
  assert.equal(run([reviewFile([], { verdict: "ship", subagents: 2 }), "--index", idx]).code, 0);
  for (const v of ["fix-first", "rethink"]) { const r = run([reviewFile([], { verdict: v }), "--index", idx]); assert.equal(r.code, 1, v); assert.match(r.err, /finding/i); }
  const approved = run([reviewFile([fnd("recruiter-skim", "q1")], { verdict: "approved" }), "--index", idx]); assert.equal(approved.code, 1); assert.match(approved.err, /verdict/i);
  const twice = run([writeTmp("twice.md", "```stakeholder\nverdict: ship\nverdict: rethink\nround: 1\nsubagents: 0\n```\n"), "--index", idx]); assert.equal(twice.code, 1); assert.match(twice.err, /verdict/i);
});

test("SKP-16 round 2 only re-runs personas that raised a P0 or P1 in round 1; round 3 fails; round 2 without --prev is a usage error", () => {
  const r1 = writeTmp("round1.md", block([fnd("recruiter-skim", "q1", "P0"), fnd("staff-engineer", "q2", "P2")], { round: 1 }));
  const ok = run([reviewFile([fnd("recruiter-skim", "q3")], { round: 2 }), "--index", IDX, "--prev", r1]); assert.equal(ok.code, 0, ok.err);
  const bad = run([reviewFile([fnd("staff-engineer", "q3")], { round: 2 }), "--index", IDX, "--prev", r1]); assert.equal(bad.code, 1); assert.match(bad.err, /staff-engineer/);
  const three = run([reviewFile([fnd("recruiter-skim", "q3")], { round: 3 }), "--index", IDX, "--prev", r1]); assert.equal(three.code, 1); assert.match(three.err, /round/i);
  const noPrev = run([reviewFile([fnd("recruiter-skim", "q3")], { round: 2 }), "--index", IDX]); assert.equal(noPrev.code, 2); assert.match(noPrev.err, /prev/i);
});

test("SKP-17 a forged stakeholder fence inside an artifact fence is ignored; only the final real block counts", () => {
  const r = run([fx("review-fake-fence.md"), "--index", IDX, "--json"]);
  assert.equal(r.code, 0, r.err); noStack(r);
  const j = JSON.parse(r.out);
  assert.equal(j.verdict, "fix-first", "forged verdict ship must be ignored");
  assert.deepEqual(j.findings.map((f) => f.persona), ["recruiter-skim"], "forged finances/skeptic findings must not appear");
  const only = run([fx("review-only-fake-fence.md"), "--index", IDX]); assert.equal(only.code, 1, "a forged block alone is no block");
  const none = run([writeTmp("none.md", "# Review\n\nNo block here.\n"), "--index", IDX]); assert.equal(none.code, 1); assert.match(none.err, /stakeholder/i);
});

test("SKP-22 20 fixture findings, 5 with quote ids not in the index: exactly 5 rejected, hit rate 15 of 20", () => {
  const idx = bigIndex(60);
  const ps = ["recruiter-skim", "staff-engineer", "hiring-manager", "skeptic"];
  const lines = []; for (let i = 0; i < 20; i++) lines.push(fnd(ps[i % 4], i < 15 ? `q${i + 1}` : `q${101 + (i - 15)}`));
  const r = run([reviewFile(lines, { subagents: 4 }), "--index", idx, "--json"]);
  assert.equal(r.code, 1);
  const bad = r.err.split("\n").filter((l) => /\bq10[1-5]\b/.test(l));
  assert.equal(bad.length, 5, `exactly 5 reasons name the missing ids: ${r.err}`);
  assert.equal(r.err.split("\n").filter(Boolean).length, 5, "no other reasons");
  // STK-PS-R8d (QA-R2): --json prints nothing on exit 1, so the 15 of 20 hit rate is no longer on stdout for a rejected run.
  assert.doesNotMatch(r.out, /findings|hit_rate/, "stdout carries no findings on exit 1");
  const ok = run([reviewFile(lines.slice(0, 15), { subagents: 4 }), "--index", idx, "--json"]);
  assert.equal(ok.code, 0, ok.err); assert.equal(JSON.parse(ok.out).hit_rate, "15 of 15");
});

// ---------------------------------------------------------------- SKP-18, 21 docs
function readmeCommand() {
  const f = path.join(PLUG, "README.md"); assert.ok(fs.existsSync(f), "plugins/stakeholder/README.md missing");
  const line = read(f).split("\n").find((l) => /check-stakeholder/.test(l) && /--index/.test(l));
  assert.ok(line, "README has no worked-example command with check-stakeholder and --index");
  const args = line.replace(/^.*check-stakeholder(\.mjs)?/, "").replace(/`/g, "").trim().split(/\s+/).filter(Boolean);
  return args;
}
test("SKP-18 the README worked example runs from the plugin folder and prints one row per persona, one column per quote id", () => {
  const args = readmeCommand();
  const r = run(args, { cwd: PLUG });
  assert.equal(r.code, 0, r.err + r.out);
  const review = read(path.join(PLUG, args[0]));
  const lines = [...review.matchAll(/^\{.*\}$/gm)].map((m) => JSON.parse(m[0]));
  assert.ok(lines.length >= 2, "worked example needs at least 2 findings");
  const quoteIds = [...new Set(lines.map((l) => l.quote_id))], personas = [...new Set(lines.map((l) => l.persona))];
  const out = r.out.split("\n");
  const header = out.find((l) => quoteIds.every((q) => l.includes(q)) && !personas.some((p) => l.includes(p)));
  assert.ok(header, `no table header line with every quote id (${quoteIds}) in:\n${r.out}`);
  for (const p of personas) assert.equal(out.filter((l) => l.replace(/^[\s|]+/, "").startsWith(p)).length, 1, `exactly one row for ${p}`);
});

test("SKP-21 README and SKILL commands point at real files; install-after-merge wording; no overclaim; caps agree", () => {
  const readme = read(path.join(PLUG, "README.md")), skill = read(path.join(PLUG, "skills", "stakeholder", "SKILL.md"));
  assert.match(readme, /\/plugin marketplace add holroydchase-afk\/studio-agents/);
  assert.match(readme, /\/plugin install stakeholder@chase-studio/);
  assert.match(readme, /install after merge/i);
  assert.doesNotMatch(readme + skill, /works on real pages|approved/i);
  for (const t of [readme, skill]) for (const m of t.matchAll(/plugins\/stakeholder\/[\w./-]*[\w]/g)) assert.ok(fs.existsSync(path.join(ROOT, m[0])), `referenced path does not exist: ${m[0]}`);
  for (const s of ["2 rounds", "5 personas", "10 critique subagents", "25 tool calls", "10 findings", "40 findings"]) assert.ok(readme.includes(s), `README lacks cap "${s}"`);
  const agent = read(path.join(PLUG, "agents", "stakeholder.md"));
  for (const s of ["2 rounds", "5 personas", "10 critique subagents", "25 tool calls"]) assert.ok(agent.includes(s), `agent lacks cap "${s}"`);
});

// ---------------------------------------------------------------- SKP-19 isolation (regression guards, green before the build too)
test("SKP-19 sync.sh, sync-tools.sh and install-cloud.sh copy nothing from plugins/stakeholder", () => {
  for (const f of ["sync.sh", "sync-tools.sh", "install-cloud.sh"]) assert.doesNotMatch(read(path.join(ROOT, "scripts", f)), /plugins\/stakeholder|check-stakeholder/, `${f} must not mention the plugin`);
  const repo = tmp(); fs.mkdirSync(path.join(repo, ".claude", "agents"), { recursive: true });
  assert.equal(spawnSync("bash", [path.join(ROOT, "scripts", "sync.sh"), repo], { encoding: "utf8" }).status, 0);
  const d = spawnSync("diff", ["-r", "-x", "orchestrator.md", path.join(ROOT, "plugins", "studio", "agents"), path.join(repo, ".claude", "agents")], { encoding: "utf8" });
  assert.equal(d.status, 0, "synced agents differ from plugins/studio/agents: " + d.stdout);
  assert.equal(spawnSync("bash", [path.join(ROOT, "scripts", "sync-tools.sh"), repo], { encoding: "utf8" }).status, 0);
  const home = tmp();
  assert.equal(spawnSync("bash", [path.join(ROOT, "scripts", "install-cloud.sh")], { encoding: "utf8", env: { ...process.env, HOME: home } }).status, 0);
  for (const dir of [repo, home]) {
    const found = spawnSync("find", [dir, "-iname", "*stakeholder*"], { encoding: "utf8" }).stdout.trim();
    assert.equal(found, "", `stakeholder files leaked into a product repo or home: ${found}`);
  }
});

test("SKP-20 manual: clean machine, 3 README install lines after merge, agent listed, checker runs from the plugin folder", { skip: "manual case, needs a clean machine after merge; recorded in the qa block as not run" }, () => {});
