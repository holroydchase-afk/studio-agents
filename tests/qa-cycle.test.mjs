// Failing-first tests for tools/qa-cycle.mjs (docs/product/SPEC-QA-CYCLE.md, QACYC-1..7).
// One CLI: ledger, verify, gate, miss add, ideas, harden-check, score. Commit subjects carry the tag:
// [qa:pre], [qa:post], [qa:red BUG-1], [qa:fix BUG-1]. Fixtures are temp git repos; node built-ins only.
//
// Contract these tests pin down where the spec leaves room:
//   - repo is chosen with --root DIR (default: cwd); the base ref with --base REF.
//   - ledger --json: {pre, post, red: [ids], fixed: [ids], removed, untagged}. pre/post count only commits tagged
//     [qa:pre]/[qa:post]; red and fix commits list ids and do not add to pre or post.
//   - verify, gate, harden-check --json: {ok, reasons[]}; exit 0 pass, 1 tripped (one reason per line on stderr),
//     2 usage error or unreadable input.
//   - ideas --json: {ideas: [{pattern, count, example}]}.
//   - score --json: {arms: {<arm>: {n, claim, means: {tests_pre, tests_post, bugs_found, bugs_fixed, edge_cases,
//     code_quality, perf_path, procedure, seconds}}}}. result.json ledger is the ledger --json shape; bugs found =
//     ledger.red.length, bugs fixed = ledger.fixed.length.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = path.join(ROOT, "tools", "qa-cycle.mjs");
let tmp, n = 0;

const GIT_ENV = {
  ...process.env,
  GIT_CEILING_DIRECTORIES: os.tmpdir(),
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t",
};

before(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), "qa-cycle-test-")); });
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

const fresh = (label) => { const d = path.join(tmp, `${label}-${n++}`); fs.mkdirSync(d, { recursive: true }); return d; };
function run(args, cwd = tmp) {
  assert.ok(fs.existsSync(TOOL), "tools/qa-cycle.mjs is missing"); // keeps 'exit 1' tests from passing vacuously
  const r = spawnSync(process.execPath, [TOOL, ...args], { cwd, encoding: "utf8", env: GIT_ENV, timeout: 30000 });
  return { code: r.status, out: r.stdout || "", err: r.stderr || "" };
}
const errLines = (r) => r.err.split("\n").filter((l) => l.trim());
const parseJson = (r) => { let j; assert.doesNotThrow(() => { j = JSON.parse(r.out); }, `stdout is not JSON: ${r.out}${r.err}`); return j; };
const write = (dir, rel, body = "x\n") => { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, body); return p; };
function assertOkShape(j, ok) {
  assert.deepEqual(Object.keys(j).sort(), ["ok", "reasons"], `json keys must be exactly ok and reasons: ${JSON.stringify(j)}`);
  assert.equal(j.ok, ok);
  assert.ok(Array.isArray(j.reasons) && j.reasons.every((s) => typeof s === "string"));
  if (ok) assert.equal(j.reasons.length, 0); else assert.ok(j.reasons.length >= 1);
}

// ---------- git fixtures ----------
const git = (dir, ...args) => {
  const r = spawnSync("git", args, { cwd: dir, encoding: "utf8", env: GIT_ENV });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
  return r.stdout;
};
const decl = (k, count) => Array.from({ length: count }, (_, i) => `test("t ${k}${i}", () => {});`).join("\n") + (count ? "\n" : "");
function repo(files = { "src/app.js": "a\n", "tests/app.test.js": "// no tests yet\n", "HANDOFF.md": "h\n", "README.md": "r\n" }) {
  const d = fresh("repo");
  git(d, "init", "-q", "-b", "main");
  for (const [rel, body] of Object.entries(files)) write(d, rel, body);
  git(d, "add", "-A");
  git(d, "commit", "-q", "-m", "base");
  git(d, "tag", "base");
  return d;
}
function commit(d, subject, files = {}) {
  for (const [rel, body] of Object.entries(files)) {
    if (body === null) git(d, "rm", "-q", "-f", rel); else write(d, rel, body);
  }
  git(d, "add", "-A");
  git(d, "commit", "-q", "--allow-empty", "-m", subject);
}
const pre = (d, count, file = "tests/pre.test.js") => commit(d, "[qa:pre] failing tests from the spec", { [file]: decl("pre", count) });
const post = (d, count, file = "tests/post.test.js") => commit(d, "[qa:post] edges from the diff", { [file]: decl("post", count) });
const red = (d, id, file = `tests/${id.toLowerCase()}.test.js`) => commit(d, `[qa:red ${id}] red test`, { [file]: decl(id, 1) });
const fix = (d, id, file = "src/app.js") => commit(d, `[qa:fix ${id}] fix`, { [file]: `fixed ${id} ${n++}\n` });
const ledger = (d, extra = []) => run(["ledger", "--base", "base", "--root", d, "--json", ...extra]);
const verify = (d, extra = []) => run(["verify", "--base", "base", "--root", d, ...extra]);

// ======================================================================
test("QACYC-1 the tool exists at tools/qa-cycle.mjs", () => {
  assert.ok(fs.existsSync(TOOL), "tools/qa-cycle.mjs is missing");
});

test("QACYC-1 ledger counts tests added per tag and lists red and fixed ids", () => {
  const d = repo();
  pre(d, 3);
  post(d, 2);
  red(d, "BUG-1");
  fix(d, "BUG-1");
  red(d, "BUG-2");
  const r = ledger(d);
  assert.equal(r.code, 0, r.err);
  const j = parseJson(r);
  assert.deepEqual(Object.keys(j).sort(), ["fixed", "post", "pre", "red", "removed", "untagged"]);
  assert.equal(j.pre, 3);
  assert.equal(j.post, 2);
  assert.deepEqual([...j.red].sort(), ["BUG-1", "BUG-2"]);
  assert.deepEqual(j.fixed, ["BUG-1"]);
  assert.equal(j.removed, 0);
  assert.equal(j.untagged, 0);
});

test("QACYC-1 ledger text output names the counts for a person reading it", () => {
  const d = repo();
  pre(d, 3);
  post(d, 2);
  red(d, "BUG-1");
  const r = run(["ledger", "--base", "base", "--root", d]);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /pre\D+3/i);
  assert.match(r.out, /post\D+2/i);
  assert.match(r.out, /BUG-1/);
});

test("QACYC-1 ledger counts declarations in every supported language, in test files only", () => {
  const d = repo();
  commit(d, "[qa:pre] polyglot", {
    "tests/a.test.js": 'test("a", () => {});\nit("b", () => {});\n',
    "tests/test_c.py": "def test_c():\n    pass\n\ndef test_d():\n    pass\n",
    "pkg/e_test.go": "package p\nfunc TestE(t *testing.T) {}\n",
    "src/app.js": 'test("not a test file", () => {});\nit("nor this", () => {});\n',
    "README.md": "def test_readme(): pass\n",
  });
  const j = parseJson(ledger(d));
  assert.equal(j.pre, 2 + 2 + 1, "2 js + 2 python + 1 go, and nothing from src/ or README");
});

test("QACYC-1 a removed test is not subtracted from the totals but is reported as removed", () => {
  const d = repo({ "src/app.js": "a\n", "tests/old.test.js": decl("old", 3), "HANDOFF.md": "h\n" });
  commit(d, "[qa:post] swap tests", { "tests/old.test.js": decl("old", 1), "tests/new.test.js": decl("new", 1) });
  const j = parseJson(ledger(d));
  assert.equal(j.post, 1, "only the added declaration counts");
  assert.equal(j.removed, 2, "two declarations went away");
});

test("QACYC-1 edge: empty range reports zeros and verify passes", () => {
  const d = repo();
  const j = parseJson(ledger(d));
  assert.deepEqual(j, { pre: 0, post: 0, red: [], fixed: [], removed: 0, untagged: 0 });
  assert.equal(verify(d).code, 0);
});

test("QACYC-1 edge: untagged commits are ignored in the counts but reported as untagged", () => {
  const d = repo();
  commit(d, "chore: bump", { "src/other.js": "o\n" });
  commit(d, "add some tests quickly", { "tests/untagged.test.js": decl("u", 4) });
  pre(d, 1);
  const j = parseJson(ledger(d));
  assert.equal(j.untagged, 2);
  assert.equal(j.pre, 1, "tests in an untagged commit do not count");
  assert.equal(j.post, 0);
});

test("QACYC-1 ledger only reads REF..HEAD (history before the base is not counted)", () => {
  const d = repo({ "src/app.js": "a\n", "tests/app.test.js": "x\n", "HANDOFF.md": "h\n" });
  pre(d, 5, "tests/early.test.js");
  git(d, "tag", "-f", "base");
  post(d, 2);
  const j = parseJson(ledger(d));
  assert.equal(j.pre, 0);
  assert.equal(j.post, 2);
});

test("QACYC-1 ledger usage: missing --base, bad ref and a non-repo --root exit 2", () => {
  const d = repo();
  const a = run(["ledger", "--root", d]);
  assert.equal(a.code, 2, a.err);
  assert.ok(a.err.trim().length > 0, "says why on stderr");
  assert.equal(run(["ledger", "--base", "no-such-ref", "--root", d]).code, 2);
  assert.equal(run(["ledger", "--base", "base", "--root", fresh("plain")]).code, 2, "not a git repo");
  assert.equal(run(["ledger", "--base", "base", "--root", path.join(tmp, "nope")]).code, 2, "missing folder");
});

// ---------- verify ----------
test("QACYC-2 verify passes a clean cycle: red (tests only), then fix (no tests), each id once", () => {
  const d = repo();
  pre(d, 2);
  red(d, "BUG-1");
  fix(d, "BUG-1");
  red(d, "BUG-2");
  fix(d, "BUG-2");
  const r = verify(d);
  assert.equal(r.code, 0, r.err);
});

test("QACYC-2 verify trips when a fix has no earlier red with the same id", () => {
  const d = repo();
  fix(d, "BUG-1");
  const r = verify(d);
  assert.equal(r.code, 1);
  assert.match(r.err, /BUG-1/);
});

test("QACYC-2 verify trips when the red id differs from the fixed id", () => {
  const d = repo();
  red(d, "BUG-1");
  fix(d, "BUG-2");
  const r = verify(d);
  assert.equal(r.code, 1);
  assert.match(r.err, /BUG-2/);
});

test("QACYC-2 verify trips when the fix commit comes before its red (order matters)", () => {
  const d = repo();
  fix(d, "BUG-1");
  red(d, "BUG-1");
  assert.equal(verify(d).code, 1);
});

test("QACYC-2 verify trips when a fix commit touches a test file", () => {
  const d = repo();
  red(d, "BUG-1");
  commit(d, "[qa:fix BUG-1] fix and bend the test", { "src/app.js": "fixed\n", "tests/bug-1.test.js": decl("BUG-1", 1) + "// loosened\n" });
  const r = verify(d);
  assert.equal(r.code, 1);
  assert.match(r.err, /bug-1\.test\.js|test file/i);
});

test("QACYC-2 verify trips when a red commit touches a non-test file", () => {
  const d = repo();
  commit(d, "[qa:red BUG-1] red test plus product code", { "tests/bug-1.test.js": decl("BUG-1", 1), "src/app.js": "sneaky\n" });
  const r = verify(d);
  assert.equal(r.code, 1);
  assert.match(r.err, /src\/app\.js|non-test/i);
});

test("QACYC-2 verify trips when a red commit adds no test", () => {
  const d = repo();
  commit(d, "[qa:red BUG-1] nothing new", { "tests/app.test.js": "// just a comment\n" });
  const r = verify(d);
  assert.equal(r.code, 1);
  assert.match(r.err, /BUG-1/);
});

test("QACYC-2 verify trips when an id is fixed twice", () => {
  const d = repo();
  red(d, "BUG-1");
  fix(d, "BUG-1");
  fix(d, "BUG-1");
  const r = verify(d);
  assert.equal(r.code, 1);
  assert.match(r.err, /BUG-1/);
});

test("QACYC-2 edge: more than one id in one tag is rejected", () => {
  const d = repo();
  commit(d, "[qa:red BUG-1 BUG-2] two bugs one commit", { "tests/two.test.js": decl("two", 2) });
  const r = verify(d);
  assert.equal(r.code, 1);
  assert.match(r.err, /BUG-1.*BUG-2|more than one|multiple/i);
});

test("QACYC-2 verify reports every problem, one per line, and --json gives {ok, reasons}", () => {
  const d = repo();
  fix(d, "BUG-1");
  commit(d, "[qa:red BUG-2] sneaky", { "tests/b2.test.js": decl("b2", 1), "src/x.js": "x\n" });
  const r = verify(d);
  assert.equal(r.code, 1);
  assert.ok(errLines(r).length >= 2, `expected a line per problem:\n${r.err}`);
  const j = run(["verify", "--base", "base", "--root", d, "--json"]);
  assert.equal(j.code, 1);
  assertOkShape(parseJson(j), false);
  const ok = repo();
  red(ok, "BUG-1");
  fix(ok, "BUG-1");
  const g = run(["verify", "--base", "base", "--root", ok, "--json"]);
  assert.equal(g.code, 0);
  assertOkShape(parseJson(g), true);
});

test("QACYC-2 verify usage: missing --base, bad ref and non-repo exit 2", () => {
  const d = repo();
  assert.equal(run(["verify", "--root", d]).code, 2);
  assert.equal(run(["verify", "--base", "no-such-ref", "--root", d]).code, 2);
  assert.equal(run(["verify", "--base", "base", "--root", fresh("plain")]).code, 2);
});

// ---------- verify minimums ----------
function cycleWith(postCount, fixed) {
  const d = repo();
  pre(d, 2);
  if (postCount) post(d, postCount);
  for (let i = 1; i <= fixed; i++) { red(d, `BUG-${i}`); fix(d, `BUG-${i}`); }
  return d;
}

test("QACYC-3 --min-post boundary: 5 post tests pass --min-post 5, 4 do not", () => {
  assert.equal(verify(cycleWith(5, 0), ["--min-post", "5"]).code, 0);
  const r = verify(cycleWith(4, 0), ["--min-post", "5"]);
  assert.equal(r.code, 1);
  assert.match(r.err, /post/i);
});

test("QACYC-3 --min-fixed boundary: 6 fixes pass --min-fixed 6, 5 do not", () => {
  assert.equal(verify(cycleWith(0, 6), ["--min-fixed", "6"]).code, 0);
  const r = verify(cycleWith(0, 5), ["--min-fixed", "6"]);
  assert.equal(r.code, 1);
  assert.match(r.err, /fix/i);
});

test("QACYC-3 the Chase case: write 5 more, fix 6 (both minimums together)", () => {
  assert.equal(verify(cycleWith(5, 6), ["--min-post", "5", "--min-fixed", "6"]).code, 0);
  const r = verify(cycleWith(4, 5), ["--min-post", "5", "--min-fixed", "6"]);
  assert.equal(r.code, 1);
  assert.ok(errLines(r).length >= 2, "both shortfalls are reported");
});

test("QACYC-3 minimums default to 0 and a non-number is a usage error", () => {
  assert.equal(verify(cycleWith(0, 0)).code, 0);
  for (const bad of ["abc", "-1", "", "1.5"]) {
    assert.equal(verify(cycleWith(0, 0), ["--min-post", bad]).code, 2, `--min-post ${JSON.stringify(bad)}`);
    assert.equal(verify(cycleWith(0, 0), ["--min-fixed", bad]).code, 2, `--min-fixed ${JSON.stringify(bad)}`);
  }
});

// ---------- gate ----------
const QA_OK = "# report\n\n```qa\nverdict: green\nsuite: unit | node --test | 5/0 5/0 5/0\n```\n";
const QA_BAD = "# report\n\nno qa block here\n";
const RUN_OK = "# run\n\n```agentrun\n" + [
  "date: 2026-11-22", "agent: qa-tdd", "product: Example App", "tier: supervised", "model: example-model-1",
  "tokens: 1200", "cost_usd: 0.50", "input: failing tests for the share sheet", "tool: Bash | ok | ran tests",
  "verdict: red", "findings: 0", "p0: 0", "escalated: no",
].join("\n") + "\n```\n";
const RUN_BAD = RUN_OK.replace("escalated: no", "escalated: maybe");

function gateReady() {
  const d = repo();
  pre(d, 2);
  red(d, "BUG-1");
  fix(d, "BUG-1");
  commit(d, "[qa:post] edges plus handoff", { "tests/post.test.js": decl("post", 1), "HANDOFF.md": "updated\n" });
  return d;
}
const gate = (d, extra = []) => run(["gate", "--base", "base", "--root", d, ...extra]);

test("QACYC-4 gate passes a verified cycle with HANDOFF.md changed, and prints the manual merge steps", () => {
  const r = gate(gateReady());
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /merge commit/i);
  assert.match(r.out, /oldest first/i);
  assert.match(r.out, /Chase/, "live-demo merges wait for Chase");
});

test("QACYC-4 gate trips when verify trips", () => {
  const d = gateReady();
  fix(d, "BUG-9");
  const r = gate(d);
  assert.equal(r.code, 1);
  assert.match(r.err, /BUG-9/);
});

test("QACYC-4 gate trips when HANDOFF.md did not change since the base", () => {
  const d = repo();
  red(d, "BUG-1");
  fix(d, "BUG-1");
  const r = gate(d);
  assert.equal(r.code, 1);
  assert.match(r.err, /HANDOFF\.md/);
});

test("QACYC-4 gate trips when an untagged commit touches product code (the skipped-step path)", () => {
  const d = gateReady();
  commit(d, "quick fix, no tag", { "src/quick.js": "q\n" });
  assert.equal(verify(d).code, 0, "verify alone ignores untagged commits");
  const r = gate(d);
  assert.equal(r.code, 1);
  assert.match(r.err, /src\/quick\.js|untagged/i);
});

test("QACYC-4 gate checks --qa-report with check-qa-report (valid passes, invalid trips)", () => {
  const d = gateReady();
  const dir = fresh("rep");
  assert.equal(gate(d, ["--qa-report", write(dir, "ok.md", QA_OK)]).code, 0);
  const r = gate(d, ["--qa-report", write(dir, "bad.md", QA_BAD)]);
  assert.equal(r.code, 1);
  assert.match(r.err, /qa/i);
});

test("QACYC-4 gate checks --run-log with check-agent-run (valid passes, invalid trips)", () => {
  const d = gateReady();
  const dir = fresh("rep");
  assert.equal(gate(d, ["--run-log", write(dir, "ok.md", RUN_OK)]).code, 0);
  const r = gate(d, ["--run-log", write(dir, "bad.md", RUN_BAD)]);
  assert.equal(r.code, 1);
  assert.match(r.err, /escalated|run/i);
});

test("QACYC-4 gate: a missing --qa-report file does not pass", () => {
  const r = gate(gateReady(), ["--qa-report", path.join(tmp, "missing.md")]);
  assert.notEqual(r.code, 0);
});

test("QACYC-4 gate --json prints {ok, reasons[]} on pass and on trip; usage errors exit 2", () => {
  const d = gateReady();
  const p = run(["gate", "--base", "base", "--root", d, "--json"]);
  assert.equal(p.code, 0, p.err);
  assertOkShape(parseJson(p), true);
  const t = run(["gate", "--base", "base", "--root", repo(), "--json"]);
  assert.equal(t.code, 1);
  assertOkShape(parseJson(t), false);
  assert.equal(run(["gate", "--root", d]).code, 2, "missing --base");
  assert.equal(run(["gate", "--base", "no-such-ref", "--root", d]).code, 2);
});

// ---------- miss add and ideas ----------
function inbox(root) { return path.join(root, "evals", "agent-misses", "qa-tdd-inbox.jsonl"); }
function missRoot() { const d = fresh("miss"); fs.mkdirSync(path.join(d, "evals", "agent-misses"), { recursive: true }); return d; }
const add = (root, pattern, text, extra = []) => run(["miss", "add", "--pattern", pattern, "--text", text, "--root", root, ...extra]);
const lines = (f) => fs.readFileSync(f, "utf8").split("\n").filter((l) => l.trim());

test("QACYC-5 miss add appends one JSON line with the pattern and text", () => {
  const d = missRoot();
  const r = add(d, "flaky-passed", "passed a test that failed on rerun");
  assert.equal(r.code, 0, r.err);
  const ls = lines(inbox(d));
  assert.equal(ls.length, 1);
  const o = JSON.parse(ls[0]);
  assert.equal(o.pattern, "flaky-passed");
  assert.equal(o.text, "passed a test that failed on rerun");
});

test("QACYC-5 miss add appends (never overwrites): two adds make two lines, each valid JSON", () => {
  const d = missRoot();
  assert.equal(add(d, "p1", "first").code, 0);
  assert.equal(add(d, "p2", "second").code, 0);
  const ls = lines(inbox(d));
  assert.equal(ls.length, 2);
  assert.deepEqual(ls.map((l) => JSON.parse(l).pattern), ["p1", "p2"]);
});

test("QACYC-5 miss add refuses empty or whitespace text and empty or missing pattern, writing nothing", () => {
  const d = missRoot();
  for (const args of [["--pattern", "p", "--text", ""], ["--pattern", "p", "--text", "   "], ["--pattern", "", "--text", "t"], ["--pattern", "  ", "--text", "t"], ["--pattern", "p"], ["--text", "t"]]) {
    const r = run(["miss", "add", ...args, "--root", d]);
    assert.equal(r.code, 2, `args ${JSON.stringify(args)} should exit 2, got ${r.code}`);
    assert.ok(r.err.trim().length > 0);
  }
  assert.ok(!fs.existsSync(inbox(d)) || lines(inbox(d)).length === 0, "nothing was written");
});

test("QACYC-5 miss add refuses text that holds a full path, writing nothing", () => {
  const d = missRoot();
  for (const text of ["failed in /home/someone/project/src/a.js", "see C:\\Users\\someone\\x.js"]) {
    const r = add(d, "p", text);
    assert.notEqual(r.code, 0, `${text} should be refused`);
  }
  assert.ok(!fs.existsSync(inbox(d)) || lines(inbox(d)).length === 0);
});

test("QACYC-5 ideas groups by pattern and prints only patterns with 2 or more misses, with count and example", () => {
  const d = missRoot();
  add(d, "skipped-red", "fixed before writing the red test");
  add(d, "skipped-red", "again no red first");
  add(d, "skipped-red", "third time");
  add(d, "one-off", "a single odd miss");
  add(d, "flaky-passed", "rerun hid a flake");
  add(d, "flaky-passed", "flake on the second run");
  const r = run(["ideas", "--root", d]);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /skipped-red/);
  assert.match(r.out, /flaky-passed/);
  assert.ok(!r.out.includes("one-off"), "a single miss is not an idea");
  assert.match(r.out, /3/, "count for skipped-red");
  assert.match(r.out, /fixed before writing the red test|again no red first|third time/, "an example text");
  const j = parseJson(run(["ideas", "--root", d, "--json"]));
  assert.deepEqual(j.ideas.map((i) => i.pattern).sort(), ["flaky-passed", "skipped-red"]);
  const sr = j.ideas.find((i) => i.pattern === "skipped-red");
  assert.equal(sr.count, 3);
  assert.equal(typeof sr.example, "string");
  assert.ok(sr.example.length > 0);
});

test("QACYC-5 ideas with no repeated pattern, an empty inbox or no inbox says no ideas yet and exits 0", () => {
  const d = missRoot();
  let r = run(["ideas", "--root", d]);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /no ideas yet/i, "no inbox file");
  add(d, "a", "x");
  add(d, "b", "y");
  r = run(["ideas", "--root", d]);
  assert.equal(r.code, 0);
  assert.match(r.out, /no ideas yet/i, "every pattern seen once");
  const j = parseJson(run(["ideas", "--root", d, "--json"]));
  assert.deepEqual(j.ideas, []);
});

test("QACYC-5 miss and ideas usage: unknown miss action and a missing --root exit 2", () => {
  assert.equal(run(["miss"]).code, 2);
  assert.equal(run(["miss", "remove", "--root", missRoot()]).code, 2);
  assert.equal(run(["ideas", "--root", path.join(tmp, "nope")]).code, 2);
});

// ---------- harden-check ----------
function hardenRepo(branch = "qa-hardening/2026-11-23", { tests = 2, fixes = 1 } = {}) {
  const d = repo();
  git(d, "checkout", "-q", "-b", branch);
  let made = 0;
  for (let i = 1; i <= fixes; i++) { red(d, `BUG-${i}`); fix(d, `BUG-${i}`); made++; }
  if (tests > made) post(d, tests - made);
  return d;
}
const harden = (d, extra = []) => run(["harden-check", "--base", "base", "--root", d, ...extra]);

test("QACYC-6 harden-check passes a tests-first run on the right branch within caps", () => {
  const d = hardenRepo();
  const r = harden(d, ["--max-tests", "5", "--max-fixes", "3"]);
  assert.equal(r.code, 0, r.err);
});

test("QACYC-6 harden-check trips on a branch without the qa-hardening/ prefix; --branch-prefix changes it", () => {
  const d = hardenRepo("feature/other");
  const r = harden(d);
  assert.equal(r.code, 1);
  assert.match(r.err, /branch|prefix|qa-hardening/i);
  assert.equal(harden(hardenRepo("nightly/2026-11-23"), ["--branch-prefix", "nightly/"]).code, 0);
  assert.equal(harden(hardenRepo("qa-hardening/2026-11-23"), ["--branch-prefix", "nightly/"]).code, 1);
});

test("QACYC-6 harden-check --max-tests boundary: at the cap passes, one over trips", () => {
  const d = hardenRepo("qa-hardening/2026-11-23", { tests: 3, fixes: 1 });
  assert.equal(harden(d, ["--max-tests", "3"]).code, 0);
  const r = harden(d, ["--max-tests", "2"]);
  assert.equal(r.code, 1);
  assert.match(r.err, /test/i);
});

test("QACYC-6 harden-check --max-fixes boundary: at the cap passes, one over trips", () => {
  const d = hardenRepo("qa-hardening/2026-11-23", { tests: 2, fixes: 2 });
  assert.equal(harden(d, ["--max-fixes", "2"]).code, 0);
  const r = harden(d, ["--max-fixes", "1"]);
  assert.equal(r.code, 1);
  assert.match(r.err, /fix/i);
});

test("QACYC-6 harden-check trips on any change that is neither a test nor a tagged fix", () => {
  const d = hardenRepo();
  commit(d, "refactor while I was there", { "src/extra.js": "e\n" });
  const r = harden(d);
  assert.equal(r.code, 1);
  assert.match(r.err, /src\/extra\.js|untagged|non-test/i);
});

test("QACYC-6 harden-check trips when the kill switch exists (.claude/agents.off or .claude/qa-tdd.off)", () => {
  for (const sw of ["agents.off", "qa-tdd.off"]) {
    const d = hardenRepo();
    write(d, `.claude/${sw}`, "");
    const r = harden(d);
    assert.equal(r.code, 1, `${sw} should halt the run`);
    assert.match(r.err, new RegExp(sw.replace(".", "\\.")));
  }
  const other = hardenRepo();
  write(other, ".claude/engineer.off", "");
  assert.equal(harden(other).code, 0, "another agent's switch does not halt qa-tdd");
});

test("QACYC-6 harden-check also trips on a verify failure (a fix without its red)", () => {
  const d = hardenRepo();
  fix(d, "BUG-7");
  assert.equal(harden(d).code, 1);
});

test("QACYC-6 harden-check --json prints {ok, reasons[]}; bad caps, missing --base and non-repo exit 2", () => {
  const d = hardenRepo();
  const p = run(["harden-check", "--base", "base", "--root", d, "--json"]);
  assert.equal(p.code, 0, p.err);
  assertOkShape(parseJson(p), true);
  const t = run(["harden-check", "--base", "base", "--root", hardenRepo("main2"), "--json"]);
  assert.equal(t.code, 1);
  assertOkShape(parseJson(t), false);
  for (const bad of ["abc", "-1", ""]) {
    assert.equal(harden(d, ["--max-tests", bad]).code, 2, `--max-tests ${JSON.stringify(bad)}`);
    assert.equal(harden(d, ["--max-fixes", bad]).code, 2, `--max-fixes ${JSON.stringify(bad)}`);
  }
  assert.equal(run(["harden-check", "--root", d]).code, 2);
  assert.equal(run(["harden-check", "--base", "base", "--root", fresh("plain")]).code, 2);
});

// ---------- score ----------
function resultRun(arm, i, over = {}) {
  return {
    arm, case: "share-sheet", seconds: 100 + i,
    ledger: { pre: 4, post: i, red: Array.from({ length: i }, (_, k) => `BUG-${k + 1}`), fixed: Array.from({ length: Math.max(0, i - 1) }, (_, k) => `BUG-${k + 1}`), removed: 0, untagged: 0 },
    grader: { edge_cases: 3, code_quality: 4, perf_path: 2, procedure: 5 },
    ...over,
  };
}
function evalDir(arms) {
  const d = fresh("eval");
  for (const [arm, count] of Object.entries(arms)) {
    for (let i = 1; i <= count; i++) write(d, `${arm}-${i}/result.json`, JSON.stringify(resultRun(arm, i)));
  }
  return d;
}

test("QACYC-7 score prints per-arm means and n for every measure", () => {
  const d = evalDir({ plain: 5, agent: 5 });
  const r = run(["score", d, "--json"]);
  assert.equal(r.code, 0, r.err);
  const j = parseJson(r);
  assert.deepEqual(Object.keys(j.arms).sort(), ["agent", "plain"]);
  const a = j.arms.agent;
  assert.equal(a.n, 5);
  assert.equal(a.claim, true);
  assert.deepEqual(Object.keys(a.means).sort(), ["bugs_fixed", "bugs_found", "code_quality", "edge_cases", "perf_path", "procedure", "seconds", "tests_post", "tests_pre"].sort());
  assert.equal(a.means.tests_pre, 4);
  assert.equal(a.means.tests_post, 3, "mean of 1..5");
  assert.equal(a.means.bugs_found, 3, "red ids 1..5, mean 3");
  assert.equal(a.means.bugs_fixed, 2, "fixed 0..4, mean 2");
  assert.equal(a.means.edge_cases, 3);
  assert.equal(a.means.code_quality, 4);
  assert.equal(a.means.perf_path, 2);
  assert.equal(a.means.procedure, 5);
  assert.equal(a.means.seconds, 103, "mean of 101..105");
});

test("QACYC-7 score text output names each arm, its n and the measures", () => {
  const r = run(["score", evalDir({ plain: 5, agent: 5 })]);
  assert.equal(r.code, 0, r.err);
  for (const w of ["plain", "agent", "edge_cases", "code_quality", "perf_path", "procedure", "seconds"]) assert.ok(r.out.includes(w), `missing ${w}`);
  assert.ok(!r.out.includes("n < 5: do not claim"), "5 runs per arm is enough");
});

test("QACYC-7 score: an arm with n < 5 prints 'n < 5: do not claim' and has claim false", () => {
  const d = evalDir({ plain: 5, agent: 4 });
  const r = run(["score", d]);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /n < 5: do not claim/);
  const j = parseJson(run(["score", d, "--json"]));
  assert.equal(j.arms.agent.n, 4);
  assert.equal(j.arms.agent.claim, false);
  assert.equal(j.arms.plain.claim, true);
});

test("QACYC-7 score malformed input exits 2: bad JSON, missing fields, out-of-range grader score, missing folder", () => {
  const bads = [
    ["bad json", "{not json"],
    ["no arm", JSON.stringify({ ...resultRun("a", 1), arm: undefined })],
    ["no grader", JSON.stringify({ ...resultRun("a", 1), grader: undefined })],
    ["no ledger", JSON.stringify({ ...resultRun("a", 1), ledger: undefined })],
    ["procedure over 5", JSON.stringify(resultRun("a", 1, { grader: { edge_cases: 3, code_quality: 4, perf_path: 2, procedure: 7 } }))],
    ["negative score", JSON.stringify(resultRun("a", 1, { grader: { edge_cases: -1, code_quality: 4, perf_path: 2, procedure: 5 } }))],
    ["seconds not a number", JSON.stringify(resultRun("a", 1, { seconds: "fast" }))],
  ];
  for (const [label, body] of bads) {
    const d = evalDir({ plain: 5 });
    write(d, "broken-1/result.json", body);
    const r = run(["score", d]);
    assert.equal(r.code, 2, `${label}: expected exit 2, got ${r.code}`);
    assert.ok(r.err.trim().length > 0, `${label}: says why on stderr`);
  }
  assert.equal(run(["score", path.join(tmp, "nope")]).code, 2);
  assert.equal(run(["score"]).code, 2, "DIR is required");
});

// ---------- usage ----------
test("QACYC-1..7 usage: no subcommand, an unknown one and an unknown flag exit 2 with a message", () => {
  const d = repo();
  for (const args of [[], ["nope"], ["LEDGER"], ["verify", "--base", "base", "--root", d, "--bogus"], ["ledger", "--base"], ["harden-check", "--base", "base", "--root", d, "--max-tests"]]) {
    const r = run(args);
    assert.equal(r.code, 2, `args ${JSON.stringify(args)} should exit 2, got ${r.code}: ${r.err}`);
    assert.ok(r.err.trim().length > 0, `args ${JSON.stringify(args)}: say why on stderr`);
  }
});

test("QACYC-1..7 ledger, verify, gate and harden-check never modify the repo", () => {
  const d = gateReady();
  const snap = () => [git(d, "status", "--porcelain=v1", "--untracked-files=all"), git(d, "rev-parse", "HEAD"), git(d, "stash", "list")].join("|");
  const before = snap();
  ledger(d);
  verify(d);
  gate(d);
  harden(d);
  assert.equal(snap(), before);
});
