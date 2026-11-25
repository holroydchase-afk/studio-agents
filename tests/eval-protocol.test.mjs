// Failing-first tests for tools/eval-protocol.mjs (docs/product/SPEC-EVAL-PROTOCOL.md, EVP-1..EVP-12).
// The tool is spawned as a child process, so this file loads fine before the tool exists; every test then
// fails because tools/eval-protocol.mjs is missing, not because of a typo here.
// Output shapes the spec leaves open (text layout, --json key names) are asserted loosely: text by the spec's
// quoted phrases and numbers, JSON by deep search for the spec's field names (wins/losses/ties, dated_next_step...).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = path.join(ROOT, "tools", "eval-protocol.mjs");
const REAL_V1 = path.join(ROOT, "evals/lazy-prompts/runs/2026-11-24-fresh-prompts/results.json");
const HEX = "a".repeat(64), HEX2 = "b".repeat(64);

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "evp-")); }
function run(args, opts = {}) {
  const r = spawnSync(process.execPath, [TOOL, ...args], { encoding: "utf8", timeout: 20000, ...opts });
  return { code: r.status, out: r.stdout || "", err: r.stderr || "", all: (r.stdout || "") + (r.stderr || "") };
}
function put(dir, name, data) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, typeof data === "string" ? data : JSON.stringify(data, null, 1));
  return p;
}
const W = { a: "agent", p: "plain", r: "plain-rules", t: "tie" };
// "AB:aaa/BA:app" -> 6 vote objects
function votes(spec) {
  const out = [];
  for (const part of spec.split("/")) {
    const [order, letters] = part.split(":");
    for (const l of letters) out.push({ order, winner: W[l] });
  }
  return out;
}
// plan: { p1: ["AB:aaa/BA:aaa", ...], ... }
function v2(plan, { tokens = { agent: 90000, plain: 30000 }, arm = "agent", extra = {} } = {}) {
  const pairs = [];
  for (const [prompt, runs] of Object.entries(plan))
    runs.forEach((spec, i) => pairs.push({ prompt, run: i + 1, arm, votes: votes(spec) }));
  const arms = { agent: { tokens: tokens.agent }, plain: { tokens: tokens.plain } };
  if (tokens["plain-rules"] !== undefined) arms["plain-rules"] = { tokens: tokens["plain-rules"] };
  return {
    schema: 2, date: "2026-11-25", grader_model: "grader-x", agent_model: "agent-x", arms,
    frozen: { prompts_sha256: HEX, rubric_sha256: HEX2 }, pairs, ...extra,
  };
}
const AAA = "AB:aaa/BA:aaa", PPP = "AB:ppp/BA:ppp", TTT = "AB:ttt/BA:ttt";
const F1 = {
  p1: [AAA, AAA, AAA],
  p2: [AAA, AAA, PPP],
  p3: [AAA, PPP, PPP],
  p4: [AAA, AAA, AAA],
  p5: ["AB:aaa/BA:ppp", TTT, TTT],
};
const F2 = "Ship the fix today.\nNext step: Chase taps merge on 2026-11-26.\nDecision: ship now or wait?\nIs the copy ok?\nlint-ok: SL-3 internal\n";

// Depth-first search for the first object that has all the given keys.
function findObj(v, keys) {
  if (v && typeof v === "object") {
    if (!Array.isArray(v) && keys.every((k) => k in v)) return v;
    for (const x of Object.values(v)) { const r = findObj(x, keys); if (r) return r; }
  }
  return undefined;
}
function findKey(v, key) {
  if (v && typeof v === "object") {
    if (!Array.isArray(v) && key in v) return v[key];
    for (const x of Object.values(v)) { const r = findKey(x, key); if (r !== undefined) return r; }
  }
  return undefined;
}
function lineWith(text, re) { return text.split("\n").find((l) => re.test(l)) || ""; }
function nums(s) { return [...s.matchAll(/\d+\.\d+/g)].map((m) => Number(m[0])); }
function reportOf(obj, flags = []) {
  const d = tmp(); const f = put(d, "results.json", obj);
  return run(["report", f, ...flags]);
}

test("EVP-1 the tool file tools/eval-protocol.mjs exists", () => {
  assert.ok(fs.existsSync(TOOL), "missing tools/eval-protocol.mjs");
});

test("EVP-1 freeze writes schema 1, a date, two sha256 values and basenames only; verify exits 0", () => {
  const d = tmp();
  const pr = put(d, "prompts.json", '{"a":"hello"}'), ru = put(d, "rubric.md", "be fair\n");
  const out = path.join(d, "frozen.json");
  const r = run(["freeze", "--prompts", pr, "--rubric", ru, "--out", out]);
  assert.equal(r.code, 0, r.all);
  const j = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(j.schema, 1);
  assert.match(j.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(j.prompts.sha256, /^[0-9a-f]{64}$/);
  assert.match(j.rubric.sha256, /^[0-9a-f]{64}$/);
  assert.equal(j.prompts.file, "prompts.json");
  assert.equal(j.rubric.file, "rubric.md");
  assert.ok(!fs.readFileSync(out, "utf8").includes(d), "frozen.json must not hold a full path");
  const v = run(["verify", out], { cwd: os.tmpdir() });
  assert.equal(v.code, 0, v.all);
});

test("EVP-2 one byte appended to the rubric makes verify exit 1 naming the rubric only; a deleted prompts file is named too", () => {
  const d = tmp();
  const pr = put(d, "prompts.json", '{"a":"hello"}'), ru = put(d, "rubric.md", "be fair\n");
  const out = path.join(d, "frozen.json");
  assert.equal(run(["freeze", "--prompts", pr, "--rubric", ru, "--out", out]).code, 0);
  fs.appendFileSync(ru, "x");
  const v = run(["verify", out]);
  assert.equal(v.code, 1, v.all);
  assert.match(v.all, /rubric\.md/);
  assert.doesNotMatch(v.all, /prompts\.json/);
  fs.unlinkSync(pr);
  const v2r = run(["verify", out]);
  assert.equal(v2r.code, 1, v2r.all);
  assert.match(v2r.all, /rubric\.md/);
  assert.match(v2r.all, /prompts\.json/);
});

test("EVP-3 a valid v2 run built from F1 passes check-run with no problem lines", () => {
  const d = tmp(); const f = put(d, "results.json", v2(F1));
  const r = run(["check-run", f]);
  assert.equal(r.code, 0, r.all);
  assert.doesNotMatch(r.all, /pairs\[\d+\]/);
});

test("EVP-3 a v2 run with a plain-rules arm declared in arms passes check-run", () => {
  const run2 = v2({ p1: [AAA] }, { tokens: { agent: 1, plain: 1, "plain-rules": 1 } });
  run2.pairs.push({ prompt: "p1", run: 1, arm: "plain-rules", votes: votes("AB:rrr/BA:rrr") });
  const d = tmp(); const r = run(["check-run", put(d, "results.json", run2)]);
  assert.equal(r.code, 0, r.all);
});

test("EVP-4 check-run lists 6 problems, each naming its pairs[i] or top-level field", () => {
  const bad = v2({ p1: [AAA, AAA, AAA, AAA] });
  delete bad.grader_model;                                   // problem 1: top-level grader_model
  bad.arms.agent.tokens = "lots";                            // problem 2: arms tokens
  bad.pairs[0].votes = bad.pairs[0].votes.slice(0, 5);       // problem 3: pairs[0] 5 votes
  bad.pairs[1].votes[5].order = "AC";                        // problem 4: pairs[1] order
  bad.pairs[2].votes[0].winner = "bot";                      // problem 5: pairs[2] winner
  bad.pairs[3].votes[0].winner = "plain-rules";              // problem 6: pairs[3] plain-rules winner on an agent pair
  const d = tmp(); const r = run(["check-run", put(d, "results.json", bad)]);
  assert.equal(r.code, 1, r.all);
  const lines = r.all.split("\n").filter((l) => l.trim());
  assert.equal(lines.length, 6, "want exactly 6 problem lines, got:\n" + r.all);
  for (const l of lines) assert.match(l, /pairs\[\d+\]|grader_model|arms/, "line names no pair or field: " + l);
  for (const i of [0, 1, 2, 3]) assert.ok(lines.some((l) => l.includes(`pairs[${i}]`)), `no line names pairs[${i}]`);
  assert.ok(lines.some((l) => /grader_model/.test(l)));
  assert.ok(lines.some((l) => /tokens/.test(l)));
});

test("EVP-4 usage errors, unreadable files and bad JSON exit 2", () => {
  const d = tmp();
  assert.equal(run([]).code, 2);
  assert.equal(run(["nonsense"]).code, 2);
  assert.equal(run(["check-run"]).code, 2);
  assert.equal(run(["check-run", path.join(d, "missing.json")]).code, 2);
  assert.equal(run(["check-run", put(d, "bad.json", "{not json")]).code, 2);
  assert.equal(run(["report", put(d, "bad2.json", "{not json")]).code, 2);
  assert.equal(run(["reply-checks", path.join(d, "missing.md")]).code, 2);
  assert.equal(run(["verify", path.join(d, "missing.json")]).code, 2);
});

test("EVP-5 the real 2026-11-24 v1 run: check-run exits 0 and says v1 run", () => {
  assert.ok(fs.existsSync(REAL_V1), "real v1 results.json missing");
  const r = run(["check-run", REAL_V1]);
  assert.equal(r.code, 0, r.all);
  assert.match(r.all, /v1 run/);
});

test("EVP-5 the real v1 run: report says not recomputed, flip rate not available, verdict not proven, stored tally 10 vs 5", () => {
  const r = run(["report", REAL_V1]);
  assert.equal(r.code, 0, r.all);
  assert.match(r.out, /not recomputed/);
  assert.match(r.out, /not available/);
  assert.match(r.out, /not proven/);
  assert.doesNotMatch(r.out, /edge shown/);
  assert.match(r.out, /\b10\b/);
  assert.match(r.out, /\b5\b/);
  const j = JSON.parse(run(["report", REAL_V1, "--json"]).out);
  assert.equal(JSON.stringify(j).includes("not proven"), true);
});

test("EVP-5 a schema:1 file is treated as v1 too", () => {
  const d = tmp(); const f = put(d, "results.json", { schema: 1, tally: { agent: 1, plain: 0 }, per_prompt: { p1: { agent: 1, plain: 0 } } });
  const r = run(["check-run", f]);
  assert.equal(r.code, 0, r.all);
  assert.match(r.all, /v1 run/);
});

test("EVP-6 F1 pair verdicts: pairs wins 9, losses 3, ties 3, labeled pairs are not independent", () => {
  const r = reportOf(v2(F1), ["--json"]);
  assert.equal(r.code, 0, r.all);
  const j = JSON.parse(r.out);
  const c = findObj(j, ["wins", "losses", "ties"]);
  assert.ok(c, "no object with wins/losses/ties in --json: " + r.out);
  assert.deepEqual([c.wins, c.losses, c.ties], [9, 3, 3]);
  assert.match(r.out, /pairs are not independent/);
  const t = reportOf(v2(F1));
  assert.match(t.out, /pairs are not independent/);
});

test("EVP-7 F1 prompt tallies and outcomes", () => {
  const t = reportOf(v2(F1)).out;
  const want = { p1: [/3-0/, /agent/], p2: [/2-1/, /agent/], p3: [/1-2/, /plain/], p4: [/3-0/, /agent/], p5: [/0-0/, /tie/] };
  for (const [p, res] of Object.entries(want)) {
    const l = lineWith(t, new RegExp(`\\b${p}\\b`));
    assert.ok(l, `no line for ${p} in:\n${t}`);
    for (const re of res) assert.match(l, re, `${p} line: ${l}`);
  }
  assert.match(lineWith(t, /\bp5\b/), /3 ties?/);
});

test("EVP-8 F1 prompt-level stats: 3 wins, 1 loss, sign p 0.625, Wilson 0.30 to 0.95, not proven", () => {
  const t = reportOf(v2(F1)).out;
  const sign = lineWith(t, /sign/i);
  assert.match(sign, /0\.625/, "sign line: " + sign);
  const w = nums(lineWith(t, /wilson/i));
  assert.ok(w.some((x) => Math.abs(x - 0.30) <= 0.01), "no Wilson low near 0.30: " + w);
  assert.ok(w.some((x) => Math.abs(x - 0.95) <= 0.01), "no Wilson high near 0.95: " + w);
  assert.match(t, /not proven/);
  assert.doesNotMatch(t, /edge shown/);
  const j = JSON.parse(reportOf(v2(F1), ["--json"]).out);
  const pl = findObj(j, ["wins", "losses", "signP"]) || findObj(j, ["wins", "losses", "sign_p"]) || findObj(j, ["wins", "losses", "p"]);
  if (pl) assert.deepEqual([pl.wins, pl.losses], [3, 1]);
});

test("EVP-8 importing tools/studio-scorecard.mjs has no side effects (main is guarded), and the tool imports signP and wilson from it", () => {
  const sc = path.join(ROOT, "tools", "studio-scorecard.mjs");
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", `const m = await import(${JSON.stringify("file://" + sc)}); console.log(typeof m.signP, typeof m.wilson);`], { encoding: "utf8", timeout: 20000, cwd: tmp() });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), "function function", "import printed or did something else: " + r.stdout + r.stderr);
  assert.ok(fs.existsSync(TOOL), "missing tools/eval-protocol.mjs");
  const src = fs.readFileSync(TOOL, "utf8");
  assert.match(src, /import[^;]*\b(signP|wilson)\b[^;]*studio-scorecard\.mjs/s, "must import signP and wilson from studio-scorecard.mjs");
  assert.doesNotMatch(src, /function\s+(signP|wilson)\b|const\s+(signP|wilson)\s*=/, "signP/wilson must not be copied");
});

test("EVP-9 F1 flips: 1 of 15 pairs, printed as 1/15", () => {
  const r = reportOf(v2(F1));
  assert.match(lineWith(r.out, /flip/i), /1\/15/, r.out);
  const j = JSON.parse(reportOf(v2(F1), ["--json"]).out);
  const flips = findKey(j, "flips");
  if (flips !== undefined) assert.equal(flips, 1);
});

test("EVP-10 pair boundaries: 4 of 6 with 2 per order wins; 1 in an order, 3-3 split or 4 of 6 with a tie do not", () => {
  const cases = [
    ["AB:aap/BA:aap", [1, 0, 0]],
    ["AB:aaa/BA:app", [0, 0, 1]],
    ["AB:aaa/BA:ppp", [0, 0, 1]],
    ["AB:aap/BA:ppt", [0, 0, 1]],
  ];
  for (const [spec, [w, l, t]] of cases) {
    const r = reportOf(v2({ p1: [spec] }), ["--json"]);
    assert.equal(r.code, 0, r.all);
    const c = findObj(JSON.parse(r.out), ["wins", "losses", "ties"]);
    assert.ok(c, "no wins/losses/ties in " + r.out);
    assert.deepEqual([c.wins, c.losses, c.ties], [w, l, t], spec);
  }
});

test("EVP-11 10 unanimous prompts: sign p 0.002, Wilson low 0.72, edge shown, cost per win 10000", () => {
  const plan = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`q${i + 1}`, [AAA]]));
  const t = reportOf(v2(plan, { tokens: { agent: 100000, plain: 30000 } })).out;
  assert.match(lineWith(t, /sign/i), /0\.002/, t);
  const w = nums(lineWith(t, /wilson/i));
  assert.ok(w.some((x) => Math.abs(x - 0.72) <= 0.01), "no Wilson low near 0.72: " + w);
  assert.match(t, /edge shown/);
  assert.doesNotMatch(t, /not proven/);
  assert.match(lineWith(t, /cost per win/i), /10,?000\b/);
});

test("EVP-11 9 unanimous prompts: not proven", () => {
  const plan = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`q${i + 1}`, [AAA]]));
  const t = reportOf(v2(plan, { tokens: { agent: 90000, plain: 30000 } })).out;
  assert.match(t, /not proven/);
  assert.doesNotMatch(t, /edge shown/);
});

test("EVP-11 tokens 'not measured' makes cost per win print not measured", () => {
  const plan = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`q${i + 1}`, [AAA]]));
  const t = reportOf(v2(plan, { tokens: { agent: "not measured", plain: "not measured" } })).out;
  assert.match(lineWith(t, /cost per win/i), /not measured/, t);
});

test("EVP-11 an arm with zero wins prints cost per win not measured", () => {
  const t = reportOf(v2({ p1: [PPP] })).out;
  assert.match(lineWith(t, /cost per win/i), /not measured/, t);
});

test("EVP-12 reply-checks on F2: dated_next_step true, asks 2, lint_ok_lines 1, words 23", () => {
  const d = tmp(); const f = put(d, "reply.md", F2);
  const r = run(["reply-checks", f, "--json"]);
  assert.equal(r.code, 0, r.all);
  const j = JSON.parse(r.out);
  assert.equal(j.dated_next_step, true);
  assert.equal(j.asks, 2);
  assert.equal(j.lint_ok_lines, 1);
  assert.equal(j.words, 23);
});

test("EVP-12 'Next: ship Nov 27' is dated, 'Next: merge soon' is not; fenced code is ignored", () => {
  const d = tmp();
  const a = JSON.parse(run(["reply-checks", put(d, "a.md", "Next: ship Nov 27\n"), "--json"]).out);
  assert.equal(a.dated_next_step, true);
  const b = JSON.parse(run(["reply-checks", put(d, "b.md", "Next: merge soon\n"), "--json"]).out);
  assert.equal(b.dated_next_step, false);
  const c = JSON.parse(run(["reply-checks", put(d, "c.md", "Hello\n```\nlint-ok: x\nNext: ship 2026-11-26?\n```\n"), "--json"]).out);
  assert.equal(c.lint_ok_lines, 0);
  assert.equal(c.dated_next_step, false);
  assert.equal(c.asks, 0);
});
