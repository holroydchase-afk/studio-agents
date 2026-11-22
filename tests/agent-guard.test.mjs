// Failing-first tests for tools/agent-guard.mjs: the three agent fail-safes from docs/agent-training-plan.md
// (guardrails row). One CLI, three subcommands: kill (kill-switch files), cost (per-run cost cap read from an
// ```agentrun log via check-agent-run.mjs) and only-tests (qa-tdd changed only test files).
// Exit 0 pass, 1 guard tripped (one reason per line on stderr), 2 usage error or unreadable input.
// --json prints {ok, reasons[]} on stdout. Fixtures are temp dirs and temp git repos; node built-ins only.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = path.join(ROOT, "tools", "agent-guard.mjs");
const AGENTS = ["qa-tdd", "staff-pm", "engineer", "ux-reviewer", "privacy-security", "architect", "positioning", "release-captain", "story-keeper", "orchestrator"];
let tmp, n = 0;

// Keep git away from any parent repo and from the user's config.
const GIT_ENV = {
  ...process.env,
  GIT_CEILING_DIRECTORIES: os.tmpdir(),
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t",
};

before(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agent-guard-test-")); });
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

const fresh = (label) => { const d = path.join(tmp, `${label}-${n++}`); fs.mkdirSync(d, { recursive: true }); return d; };
function run(args, cwd = tmp) {
  const r = spawnSync(process.execPath, [TOOL, ...args], { cwd, encoding: "utf8", env: GIT_ENV, timeout: 30000 });
  return { code: r.status, out: r.stdout || "", err: r.stderr || "" };
}
const errLines = (r) => r.err.split("\n").filter((l) => l.trim());
const parseJson = (r) => { let j; assert.doesNotThrow(() => { j = JSON.parse(r.out); }, `stdout is not JSON: ${r.out}${r.err}`); return j; };
function assertJsonShape(j, ok) {
  assert.deepEqual(Object.keys(j).sort(), ["ok", "reasons"], `json keys must be exactly ok and reasons: ${JSON.stringify(j)}`);
  assert.equal(j.ok, ok);
  assert.ok(Array.isArray(j.reasons) && j.reasons.every((s) => typeof s === "string"), "reasons must be an array of strings");
  if (ok) assert.equal(j.reasons.length, 0, "a pass has no reasons");
  else assert.ok(j.reasons.length >= 1, "a trip has at least one reason");
}
const write = (dir, rel, body = "x\n") => { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, body); return p; };

// ---------- git helpers ----------
const git = (dir, ...args) => {
  const r = spawnSync("git", args, { cwd: dir, encoding: "utf8", env: GIT_ENV });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
  return r.stdout;
};
function repo(files = { "src/app.js": "a\n", "tests/app.test.js": "t\n", "README.md": "r\n" }) {
  const d = fresh("repo");
  git(d, "init", "-q");
  for (const [rel, body] of Object.entries(files)) write(d, rel, body);
  git(d, "add", "-A");
  git(d, "commit", "-q", "-m", "base");
  return d;
}
const snapshot = (d) => ({
  status: git(d, "status", "--porcelain=v1", "-z", "--untracked-files=all"),
  head: git(d, "rev-parse", "HEAD"),
  staged: git(d, "diff", "--cached", "--name-status", "-z"),
  stash: git(d, "stash", "list"),
});

// ---------- agentrun helpers ----------
function runLog({ tokens = "1200", cost = "0.50", escalated = "no", reason = null } = {}) {
  const lines = [
    "date: 2026-11-22", "agent: qa-tdd", "product: Example App", "tier: supervised", "model: example-model-1",
    `tokens: ${tokens}`, `cost_usd: ${cost}`, "input: failing tests for the share sheet", "tool: Bash | ok | ran tests",
    "verdict: red", "findings: 0", "p0: 0", `escalated: ${escalated}`,
  ];
  if (reason !== null) lines.push(`escalation_reason: ${reason}`);
  return `# run\n\n\`\`\`agentrun\n${lines.join("\n")}\n\`\`\`\n`;
}
const logFile = (opts) => write(fresh("cost"), "run.md", runLog(opts));

// ======================================================================
test("GUARD-1 the tool exists at tools/agent-guard.mjs", () => {
  assert.ok(fs.existsSync(TOOL), "tools/agent-guard.mjs is missing");
});

test("GUARD-2 usage: no subcommand, unknown subcommand and missing arguments exit 2", () => {
  for (const args of [[], ["nope"], ["KILL", "qa-tdd"], ["kill"], ["cost"], ["kill", "qa-tdd", "--root"], ["cost", "x.md", "--cap"], ["only-tests", "--base"], ["only-tests", "--root"]]) {
    const r = run(args);
    assert.equal(r.code, 2, `args ${JSON.stringify(args)} should exit 2, got ${r.code}: ${r.err}`);
    assert.ok(r.err.trim().length > 0, `args ${JSON.stringify(args)}: a usage error says why on stderr`);
  }
});

// ---------- kill ----------
test("GUARD-3 kill passes (exit 0) with no switch files, for every studio agent", () => {
  const d = fresh("kill");
  fs.mkdirSync(path.join(d, ".claude"));
  for (const a of AGENTS) {
    const r = run(["kill", a, "--root", d]);
    assert.equal(r.code, 0, `${a}: ${r.err}`);
  }
  // no .claude folder at all also passes
  assert.equal(run(["kill", "qa-tdd", "--root", fresh("kill")]).code, 0);
});

test("GUARD-4 kill trips on .claude/agents.off (halts every agent)", () => {
  const d = fresh("kill");
  write(d, ".claude/agents.off", "");
  for (const a of AGENTS) {
    const r = run(["kill", a, "--root", d]);
    assert.equal(r.code, 1, `${a} should be halted by agents.off`);
    assert.match(r.err, /agents\.off/, "the reason names the switch file");
  }
});

test("GUARD-5 kill trips on .claude/<agent>.off for that agent only", () => {
  const d = fresh("kill");
  write(d, ".claude/qa-tdd.off", "stop\n");
  const r = run(["kill", "qa-tdd", "--root", d]);
  assert.equal(r.code, 1);
  assert.match(r.err, /qa-tdd\.off/);
  assert.equal(run(["kill", "engineer", "--root", d]).code, 0, "another agent's switch does not halt engineer");
});

test("GUARD-6 kill: both switches present give two reasons, one per line", () => {
  const d = fresh("kill");
  write(d, ".claude/agents.off", "");
  write(d, ".claude/staff-pm.off", "");
  const r = run(["kill", "staff-pm", "--root", d]);
  assert.equal(r.code, 1);
  assert.ok(errLines(r).some((l) => l.includes("agents.off")) && errLines(r).some((l) => l.includes("staff-pm.off")), `expected one reason per switch, got: ${r.err}`);
});

test("GUARD-7 kill: a directory named like the switch file counts as absent", () => {
  const d = fresh("kill");
  fs.mkdirSync(path.join(d, ".claude", "agents.off"), { recursive: true });
  fs.mkdirSync(path.join(d, ".claude", "engineer.off"), { recursive: true });
  assert.equal(run(["kill", "engineer", "--root", d]).code, 0);
});

test("GUARD-8 kill: --root defaults to the current folder", () => {
  const d = fresh("kill");
  write(d, ".claude/agents.off", "");
  assert.equal(run(["kill", "qa-tdd"], d).code, 1, "cwd with agents.off trips");
  assert.equal(run(["kill", "qa-tdd"], fresh("kill")).code, 0, "clean cwd passes");
});

test("GUARD-9 kill: an unknown agent exits 2, even when a switch file exists", () => {
  const d = fresh("kill");
  write(d, ".claude/agents.off", "");
  write(d, ".claude/hacker.off", "");
  for (const a of ["hacker", "QA-TDD", "general-purpose", "", "../qa-tdd", "grandparent-ux"]) {
    const r = run(["kill", a, "--root", d]);
    assert.equal(r.code, 2, `agent ${JSON.stringify(a)} should exit 2, got ${r.code}`);
  }
});

test("GUARD-10 kill: a --root that does not exist or is a file exits 2", () => {
  assert.equal(run(["kill", "qa-tdd", "--root", path.join(tmp, "no-such-dir")]).code, 2);
  const f = write(fresh("kill"), "plain.txt");
  assert.equal(run(["kill", "qa-tdd", "--root", f]).code, 2);
});

test("GUARD-11 kill --json prints {ok, reasons[]} on pass and on trip", () => {
  const d = fresh("kill");
  const p = run(["kill", "qa-tdd", "--root", d, "--json"]);
  assert.equal(p.code, 0);
  assertJsonShape(parseJson(p), true);
  write(d, ".claude/qa-tdd.off", "");
  const t = run(["kill", "qa-tdd", "--root", d, "--json"]);
  assert.equal(t.code, 1);
  const j = parseJson(t);
  assertJsonShape(j, false);
  assert.ok(j.reasons.some((s) => s.includes("qa-tdd.off")));
});

// ---------- cost ----------
test("GUARD-12 cost: under the default cap (1.00) and not escalated passes", () => {
  const r = run(["cost", logFile({ cost: "0.50" })]);
  assert.equal(r.code, 0, r.err);
});

test("GUARD-13 cost: boundary values against the default cap 1.00 (0.99 pass, 1.00 pass, 1.01 trip)", () => {
  assert.equal(run(["cost", logFile({ cost: "0.99" })]).code, 0, "0.99 is under the cap");
  assert.equal(run(["cost", logFile({ cost: "1.00" })]).code, 0, "exactly at the cap passes");
  assert.equal(run(["cost", logFile({ cost: "1" })]).code, 0, "1 equals 1.00");
  const r = run(["cost", logFile({ cost: "1.01" })]);
  assert.equal(r.code, 1, "1.01 is over the cap and not escalated");
  assert.ok(errLines(r).length >= 1);
});

test("GUARD-14 cost: --cap moves the line (2.50 cap: 2.50 pass, 2.51 trip, 0.01 cap: 0.02 trip)", () => {
  assert.equal(run(["cost", logFile({ cost: "2.50" }), "--cap", "2.50"]).code, 0);
  assert.equal(run(["cost", logFile({ cost: "2.51" }), "--cap", "2.50"]).code, 1);
  assert.equal(run(["cost", logFile({ cost: "1.50" }), "--cap", "2.50"]).code, 0, "1.50 would trip the default cap but not 2.50");
  assert.equal(run(["cost", logFile({ cost: "0.02" }), "--cap", "0.01"]).code, 1);
});

test("GUARD-15 cost: --cap 0, negative, abc, empty, Infinity and NaN are usage errors (exit 2)", () => {
  const f = logFile({ cost: "0.50" });
  for (const cap of ["0", "0.00", "-1", "-0.5", "abc", "", "Infinity", "NaN", "1e", "1,5"]) {
    const r = run(["cost", f, "--cap", cap]);
    assert.equal(r.code, 2, `--cap ${JSON.stringify(cap)} should exit 2, got ${r.code}`);
  }
});

test("GUARD-16 cost: over the cap with escalated yes and a reason passes, noting over cap, escalated", () => {
  const r = run(["cost", logFile({ cost: "3.20", escalated: "yes", reason: "big refactor needed a long run" })]);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out + r.err, /over cap, escalated/i, "the note says over cap, escalated");
});

test("GUARD-17 cost: tokens 0, cost 0, escalated no trips (cost not shown but not escalated)", () => {
  const r = run(["cost", logFile({ tokens: "0", cost: "0", escalated: "no" })]);
  assert.equal(r.code, 1);
  assert.match(r.err, /cost not shown but not escalated/i);
});

test("GUARD-18 cost: tokens 0 and cost 0 with escalated yes passes; tokens counted with cost 0 passes", () => {
  assert.equal(run(["cost", logFile({ tokens: "0", cost: "0", escalated: "yes", reason: "harness showed no token or cost count" })]).code, 0);
  assert.equal(run(["cost", logFile({ tokens: "500", cost: "0", escalated: "no" })]).code, 0, "tokens were counted, so cost 0 is a claim with a count");
  assert.equal(run(["cost", logFile({ tokens: "0", cost: "0.10", escalated: "no" })]).code, 0, "a cost was shown");
});

test("GUARD-19 cost: an invalid run log exits 2 and prints check-agent-run's errors", () => {
  const d = fresh("cost");
  const bad = write(d, "bad.md", runLog({ escalated: "maybe" }));
  const r = run(["cost", bad]);
  assert.equal(r.code, 2);
  assert.match(r.err, /escalated "maybe" must be yes or no/, "it relays check-agent-run's own error text");
  const none = write(d, "none.md", "# no block here\n");
  const r2 = run(["cost", none]);
  assert.equal(r2.code, 2);
  assert.match(r2.err, /agentrun/);
});

test("GUARD-20 cost: an unreadable or missing run log exits 2", () => {
  assert.equal(run(["cost", path.join(tmp, "missing.md")]).code, 2);
  assert.equal(run(["cost", fresh("cost")]).code, 2, "a directory is not a readable run log");
});

test("GUARD-21 cost --json prints {ok, reasons[]} on pass and on trip", () => {
  const p = run(["cost", logFile({ cost: "0.10" }), "--json"]);
  assert.equal(p.code, 0);
  assertJsonShape(parseJson(p), true);
  const t = run(["cost", logFile({ cost: "5.00" }), "--json"]);
  assert.equal(t.code, 1);
  assertJsonShape(parseJson(t), false);
});

test("GUARD-22 cost: errors never repeat a secret from the log", () => {
  const d = fresh("cost");
  const marker = "sk-" + "ABCDEFGHIJKLMNOP1234";
  const f = write(d, "leak.md", runLog().replace("input: failing tests for the share sheet", `input: ${marker}`));
  const r = run(["cost", f]);
  assert.equal(r.code, 2, "a log with an API key is invalid");
  assert.ok(!(r.out + r.err).includes(marker), "the key is never echoed");
});

// ---------- only-tests ----------
test("GUARD-23 only-tests: a clean repo (no changes) passes", () => {
  const d = repo();
  const r = run(["only-tests", "--root", d]);
  assert.equal(r.code, 0, r.err);
});

test("GUARD-24 only-tests: allowed paths pass (test dirs at any depth, test name patterns, run logs)", () => {
  const d = repo();
  const allowed = [
    "tests/new.test.js", "tests/deep/nested/helper.js", "test/a.js", "__tests__/b.js", "e2e/flow.ts",
    "fixtures/data.json", "tests/fixtures/x/y.json", "packages/app/__tests__/c.js", "app/e2e/d.spec.ts",
    "src/util.test.ts", "src/util.spec.js", "pkg/thing_test.go", "lib/test_thing.py",
    "docs/runs/2026-11-22-qa-tdd.md", ".claude/agent-runs/claude-x.log",
  ];
  for (const p of allowed) write(d, p);
  const r = run(["only-tests", "--root", d]);
  assert.equal(r.code, 0, `all allowed, but tripped on:\n${r.err}`);
});

test("GUARD-25 only-tests: an untracked source file trips and is listed", () => {
  const d = repo();
  write(d, "src/foo.js");
  const r = run(["only-tests", "--root", d]);
  assert.equal(r.code, 1);
  assert.ok(errLines(r).some((l) => l.includes("src/foo.js")), r.err);
});

test("GUARD-26 only-tests: an unstaged edit to a tracked source file trips", () => {
  const d = repo();
  write(d, "src/app.js", "changed\n");
  const r = run(["only-tests", "--root", d]);
  assert.equal(r.code, 1);
  assert.match(r.err, /src\/app\.js/);
});

test("GUARD-27 only-tests: a staged edit to a source file trips", () => {
  const d = repo();
  write(d, "tools/x.mjs", "x\n");
  git(d, "add", "tools/x.mjs");
  const r = run(["only-tests", "--root", d]);
  assert.equal(r.code, 1);
  assert.match(r.err, /tools\/x\.mjs/);
});

test("GUARD-28 only-tests: every offending path is listed, one per line, and allowed ones are not", () => {
  const d = repo();
  write(d, "src/foo.js");
  write(d, "tools/x.mjs");
  write(d, "package.json", "{}\n");
  write(d, "tests/ok.test.js");
  const r = run(["only-tests", "--root", d]);
  assert.equal(r.code, 1);
  for (const p of ["src/foo.js", "tools/x.mjs", "package.json"]) assert.ok(errLines(r).some((l) => l.includes(p)), `missing ${p} in:\n${r.err}`);
  assert.ok(!r.err.includes("tests/ok.test.js"), "an allowed path is not listed as an offender");
  assert.equal(errLines(r).filter((l) => /src\/foo\.js|tools\/x\.mjs|package\.json/.test(l)).length, 3, "one line per offender");
});

test("GUARD-29 only-tests: look-alike names that are not tests trip", () => {
  const traps = ["testsuite/a.js", "contest.js", "src/latest_build.py", "src/protest.js", "docs/runs.md", "docs/other.md", "docs/runs/notes.txt", ".claude/agent-runs/x.txt", ".claude/settings.json", "mytests/a.js", "src/attest.mjs"];
  for (const p of traps) {
    const d = repo();
    write(d, p);
    const r = run(["only-tests", "--root", d]);
    assert.equal(r.code, 1, `${p} is not a test file and should trip`);
    assert.ok(errLines(r).some((l) => l.includes(p)), `${p} should be listed as the offender:\n${r.err}`);
  }
});

test("GUARD-30 only-tests: deletions count (a deleted test passes, a deleted source file trips)", () => {
  const d = repo();
  fs.rmSync(path.join(d, "tests/app.test.js"));
  assert.equal(run(["only-tests", "--root", d]).code, 0, "deleting a test file is a test change");
  const d2 = repo();
  fs.rmSync(path.join(d2, "src/app.js"));
  const r = run(["only-tests", "--root", d2]);
  assert.equal(r.code, 1);
  assert.match(r.err, /src\/app\.js/);
  const d3 = repo();
  git(d3, "rm", "-q", "README.md");
  assert.equal(run(["only-tests", "--root", d3]).code, 1, "a staged deletion of a non-test file trips");
});

test("GUARD-31 only-tests: a renamed source file trips (git mv, staged)", () => {
  const d = repo();
  git(d, "mv", "src/app.js", "src/main.js");
  const r = run(["only-tests", "--root", d]);
  assert.equal(r.code, 1);
  assert.match(r.err, /src\/(app|main)\.js/);
});

test("GUARD-32 only-tests: moving a source file into tests/ still trips (the source side is deleted)", () => {
  const d = repo();
  git(d, "mv", "src/app.js", "tests/app.js");
  const r = run(["only-tests", "--root", d]);
  assert.equal(r.code, 1, "a rename's old path counts as a change");
  assert.match(r.err, /src\/app\.js/);
});

test("GUARD-33 only-tests: renaming a test file within tests/ passes", () => {
  const d = repo();
  git(d, "mv", "tests/app.test.js", "tests/renamed.test.js");
  assert.equal(run(["only-tests", "--root", d]).code, 0);
});

test("GUARD-34 only-tests: paths with a space and unicode are listed exactly as written", () => {
  const d = repo();
  write(d, "tests/with space.test.js");
  write(d, "tests/ünïcødé.test.js");
  assert.equal(run(["only-tests", "--root", d]).code, 0, "allowed test files with odd names pass");
  write(d, "src/my file.js");
  write(d, "src/naïve.js");
  const r = run(["only-tests", "--root", d]);
  assert.equal(r.code, 1);
  assert.ok(errLines(r).some((l) => l.includes("src/my file.js")), `space path not listed verbatim:\n${r.err}`);
  assert.ok(errLines(r).some((l) => l.includes("src/naïve.js")), `unicode path not listed verbatim (git quoting?):\n${r.err}`);
  assert.ok(!r.err.includes("\\303"), "no git octal escapes");
});

test("GUARD-35 only-tests: --base compares against a ref, including committed changes", () => {
  const d = repo();
  write(d, "src/committed.js");
  git(d, "add", "-A");
  git(d, "commit", "-q", "-m", "second");
  assert.equal(run(["only-tests", "--root", d]).code, 0, "versus HEAD there is nothing changed");
  const r = run(["only-tests", "--root", d, "--base", "HEAD~1"]);
  assert.equal(r.code, 1, "versus HEAD~1 the committed source file shows");
  assert.match(r.err, /src\/committed\.js/);
  const d2 = repo();
  write(d2, "tests/more.test.js");
  git(d2, "add", "-A");
  git(d2, "commit", "-q", "-m", "tests only");
  assert.equal(run(["only-tests", "--root", d2, "--base", "HEAD~1"]).code, 0);
});

test("GUARD-36 only-tests: a bad --base ref exits 2", () => {
  const d = repo();
  assert.equal(run(["only-tests", "--root", d, "--base", "no-such-ref"]).code, 2);
});

test("GUARD-37 only-tests: not a git repo exits 2; --root defaults to cwd", () => {
  const plain = fresh("plain");
  write(plain, "src/a.js");
  assert.equal(run(["only-tests", "--root", plain]).code, 2, "--root not a repo");
  assert.equal(run(["only-tests"], plain).code, 2, "cwd not a repo");
  assert.equal(run(["only-tests", "--root", path.join(tmp, "nope")]).code, 2, "missing root");
  const d = repo();
  write(d, "src/foo.js");
  assert.equal(run(["only-tests"], d).code, 1, "cwd repo with a source change trips");
});

test("GUARD-38 only-tests: run from a subfolder, paths are still repo-relative", () => {
  const d = repo();
  write(d, "src/foo.js");
  const r = run(["only-tests", "--root", path.join(d, "tests")]);
  assert.equal(r.code, 1, "a change outside the subfolder still counts");
  assert.match(r.err, /src\/foo\.js/);
});

test("GUARD-39 only-tests --json prints {ok, reasons[]} on pass and on trip", () => {
  const d = repo();
  const p = run(["only-tests", "--root", d, "--json"]);
  assert.equal(p.code, 0);
  assertJsonShape(parseJson(p), true);
  write(d, "src/foo.js");
  const t = run(["only-tests", "--root", d, "--json"]);
  assert.equal(t.code, 1);
  const j = parseJson(t);
  assertJsonShape(j, false);
  assert.ok(j.reasons.some((s) => s.includes("src/foo.js")));
});

test("GUARD-40 only-tests never modifies the repo (status, index, HEAD and stash identical before and after)", () => {
  const d = repo();
  write(d, "src/unstaged.js");
  write(d, "src/app.js", "edited\n");
  write(d, "tools/staged.mjs");
  git(d, "add", "tools/staged.mjs");
  write(d, "tests/new.test.js");
  const before = snapshot(d);
  const files = fs.readFileSync(path.join(d, "src/app.js"), "utf8");
  const first = run(["only-tests", "--root", d]);
  assert.equal(first.code, 1, "the guard ran and tripped");
  assert.match(first.err, /src\/unstaged\.js/, "it tripped on the change, not on a crash");
  assert.equal(run(["only-tests", "--root", d, "--json"]).code, 1);
  assert.equal(run(["only-tests", "--root", d, "--base", "HEAD"]).code, 1);
  assert.deepEqual(snapshot(d), before);
  assert.equal(fs.readFileSync(path.join(d, "src/app.js"), "utf8"), files);
});

test("GUARD-41 kill and cost never write files (the root and the log are untouched)", () => {
  const d = fresh("kill");
  write(d, ".claude/qa-tdd.off", "");
  const list = () => fs.readdirSync(d, { recursive: true }).sort();
  const before = list();
  assert.equal(run(["kill", "qa-tdd", "--root", d]).code, 1, "the guard ran and tripped");
  assert.equal(run(["kill", "engineer", "--root", d, "--json"]).code, 0);
  assert.deepEqual(list(), before);
  const f = logFile({ cost: "5.00" });
  const text = fs.readFileSync(f, "utf8");
  assert.equal(run(["cost", f]).code, 1, "the guard ran and tripped");
  assert.equal(fs.readFileSync(f, "utf8"), text);
  assert.deepEqual(fs.readdirSync(path.dirname(f)), ["run.md"]);
});
