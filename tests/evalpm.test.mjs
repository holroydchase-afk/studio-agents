// Failing-first tests for EvalPM (docs/product/SPEC-EVALPM.md, EVPM-1..10 and the file-existence half of EVPM-13).
// Style of tests/eval-pipeline-migrate.test.mjs: spawn the CLI, fixtures in temp dirs. EVPM-11, 12, 14 are later steps (skipped here).
//
// CHOICES PINNED BY THESE TESTS (the spec leaves them open; the builder implements these):
//   Entrypoint: `node evalpm/evalpm.mjs <demo|init|check|jobs|collect|report|calibrate> [args]`. It only dispatches to
//     tools/eval-pipeline.mjs (import its exported main(argv), or spawn it). init = init, check = check-suite, the rest map by name.
//     Args pass through unchanged, including `--root DIR`, so stdout, stderr and exit code equal the tool's (tested).
//     evalpm.mjs holds no signP, wilson, kappa, binomial or verdict code (grep test).
//   demo: takes no arguments, works from any cwd, copies evalpm/demo/ to a temp dir, runs collect and report (and calibrate on
//     the bundled invented 20 marks) offline on prerecorded result files, never writes into the repo, and prints exactly the
//     text of evalpm/demo/expected-report.txt (stdout equal, exit 0, well under 5 s). First line contains "SAMPLE DATA".
//     The demo suite is 8 invented tasks (evalpm/demo/tasks.json) of an invented "Release Notes Writer" agent, arms agent and
//     plain, with at least one task plain wins and one tie, so the verdict is "not proven". The report names a plain loss
//     (a line with "losses" followed by a non-zero number) and the word "tie".
//   Report text stays the tool's: "verdict: not proven" / "edge shown", a line with "sign test", a line with "interval".
//   report --claim blocked: exit 1, stdout holds "claim blocked: <reason>" (the tool's current behaviour).
//   Held-out ledger: a second `jobs --phase heldout` for the same --change exits 1.
//   Fixtures here use `freeze` from tools/eval-pipeline.mjs directly (setup only); everything under test goes through evalpm.
//   Calibration for the claim tests is written as evals/suites/<agent>.calibration.json (the tool's own file) rather than by
//   marking 20 pairs, to keep the fixtures small; the demo test covers real calibrate output.
//   CI: some .github/workflows/*.yml has a job named evalpm whose steps run a file named evalpm.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EP = path.join(ROOT, "evalpm", "evalpm.mjs");
const TOOL = path.join(ROOT, "tools", "eval-pipeline.mjs");
const DEMO = path.join(ROOT, "evalpm", "demo");
const GOLD = path.join(DEMO, "expected-report.txt");
const SENTINEL = ["sk", "sentinel-DO-NOT-PRINT-7f3a91"].join("-"); // built at runtime so secret scanners do not flag this file

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "evpm-"));
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const wr = (p, data) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, typeof data === "string" ? data : JSON.stringify(data, null, 1)); return p; };
const rd = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const lineWith = (text, re) => text.split("\n").find((l) => re.test(l)) || "";
const hashDir = (dir) => {
  const out = [];
  const walk = (d) => { for (const f of fs.readdirSync(d).sort()) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : out.push(path.relative(dir, p) + ":" + sha(fs.readFileSync(p))); } };
  if (fs.existsSync(dir)) walk(dir);
  return out.join("\n");
};

function ep(args, { cwd = os.tmpdir(), env = {}, timeout = 60000 } = {}) {
  assert.ok(fs.existsSync(EP), "missing evalpm/evalpm.mjs");
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [EP, ...args], { encoding: "utf8", timeout, cwd, env: { ...process.env, ...env } });
  return { code: r.status, out: r.stdout || "", err: r.stderr || "", all: (r.stdout || "") + (r.stderr || ""), ms: Date.now() - t0 };
}
const epRoot = (root, args, opts = {}) => ep([...args, "--root", root], { ...opts, cwd: root });
const tool = (root, args) => {
  const r = spawnSync(process.execPath, [TOOL, ...args, "--root", root], { encoding: "utf8", cwd: root, timeout: 60000 });
  return { code: r.status, out: r.stdout || "", err: r.stderr || "" };
};
const ok = (r, what = "") => { assert.equal(r.code, 0, `${what} exit ${r.code}\n${r.all}`); return r; };

// ---------- fixtures (neutral names: agent / plain, invented "demo" agent)
const T = (ids, split = "dev") => ids.map((id) => ({ id, split, text: `Write about ${id}` }));
function mkSuite({ kind = "cases", tasks, arms = ["agent", "plain"], runs = 3 }) {
  const root = tmp(), agent = "demo";
  wr(path.join(root, `evals/${agent}/tasks.json`), tasks);
  wr(path.join(root, `evals/${agent}/rubric.md`), "Pick the answer that is more useful and honest.\nAnswer A, B or tie.\n");
  const cfg = {
    agent, kind, tasks: `evals/${agent}/tasks.json`, rubric: `evals/${agent}/rubric.md`,
    split: { dev: tasks.filter((t) => t.split === "dev").length, heldout: tasks.filter((t) => t.split === "heldout").length },
    arms, runs, grader_model: "model-grader-9", agent_model: "model-alpha-1", key: `evals/suites/${agent}.key.json`, direct: false, strip: [],
  };
  if (kind === "pairwise") cfg.votes_per_order = 3; else cfg.votes = 3;
  const suite = `evals/suites/${agent}.json`;
  wr(path.join(root, suite), cfg);
  return { root, agent, kind, suite, cfg };
}
const jobsOf = (run, stage) => {
  const d = path.join(run, "jobs");
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => rd(path.join(d, f))).filter((j) => !stage || j.stage === stage);
};
const codeOf = (arms, task, run, arm) => `zq-${task}-${run}-k${arms.indexOf(arm)}`;
const decodeOf = (arms) => (s) => { const m = /zq-([A-Za-z0-9_.]+)-(\d+)-k(\d+)/.exec(s || ""); return m ? { task: m[1], run: Number(m[2]), arm: arms[Number(m[3])] } : null; };
function answerGen(s, run) {
  for (const j of jobsOf(run, "gen")) wr(path.join(run, "results", `${j.id}.json`), { id: j.id, model: j.model, input_sha256: j.input_sha256, tokens: 1000, output: codeOf(s.cfg.arms, j.task, j.run, j.arm) });
}
function answerGrade(s, run, passes) { // cases: passes(task, arm, run); pairwise: agent wins every pair when passes is true-ish for agent
  const dec = decodeOf(s.cfg.arms);
  for (const j of jobsOf(run, "grade")) {
    let answer;
    if (s.kind === "cases") answer = passes(j.task, j.arm, j.run) ? "pass" : "fail";
    else { const a = dec(j.outputs.A), b = dec(j.outputs.B); const x = a.arm === "plain" ? b : a; const w = passes(x.task) ? x.arm : "plain"; answer = a.arm === w ? "A" : "B"; }
    wr(path.join(run, "results", `${j.id}.json`), { id: j.id, model: j.model, input_sha256: j.input_sha256, answer });
  }
}
// Runs a dev round through evalpm. cases default: agent passes every task except `plainWins`, plain passes only `plainWins`.
function drive({ kind = "cases", n = 12, plainWins = [], change = "chg1", arms }) {
  const ids = Array.from({ length: n }, (_, i) => `c${i + 1}`);
  const s = mkSuite({ kind, tasks: T(ids), arms });
  const run = path.join(s.root, "evals/runs", s.agent, `2026-11-25-${change}`);
  const base = ["--suite", s.suite];
  assert.equal(tool(s.root, ["freeze", ...base]).code, 0, "fixture freeze");
  ok(epRoot(s.root, ["jobs", ...base, "--phase", "dev", "--change", change, "--stage", "gen", "--run", run]), "jobs gen");
  answerGen(s, run);
  ok(epRoot(s.root, ["collect", "--run", run]), "collect gen");
  ok(epRoot(s.root, ["jobs", ...base, "--phase", "dev", "--change", change, "--stage", "grade", "--run", run]), "jobs grade");
  const passes = (task, arm) => (kind === "cases" ? (plainWins.includes(task) ? arm === "plain" : arm !== "plain") : !plainWins.includes(task));
  answerGrade(s, run, passes);
  ok(epRoot(s.root, ["collect", "--run", run]), "collect grade");
  return { ...s, run, change };
}
const calib = (s, c) => wr(path.join(s.root, `evals/suites/${s.agent}.calibration.json`), { schema: 1, run: "r", date: "2026-11-25", ...c });

const MULTIPLIER = [/\b\d+(\.\d+)?\s*x\b/i, /\btimes\s+(better|more|as)\b/i, /\d+\s*%\s*better/i, /\bx\s+better\b/i, /\bfold\b/i];
const noMultiplier = (text, what) => { for (const re of MULTIPLIER) assert.doesNotMatch(text, re, `${what}: multiplier wording ${re}\n${text}`); };

// ---------- EVPM-1 demo
test("EVPM-1 demo with no key and no network exits 0 in under 5 s and prints exactly evalpm/demo/expected-report.txt", () => {
  assert.ok(fs.existsSync(GOLD), "missing evalpm/demo/expected-report.txt");
  const r = ep(["demo"], { env: { ANTHROPIC_API_KEY: "", EVAL_API_KEY: "" } });
  assert.equal(r.code, 0, r.all);
  assert.ok(r.ms < 5000, `demo took ${r.ms} ms`);
  assert.equal(r.out.trimEnd(), fs.readFileSync(GOLD, "utf8").trimEnd());
});

test("EVPM-1 demo works from any cwd, takes no arguments, and never writes into the repo", () => {
  const before = hashDir(path.join(ROOT, "evalpm")) + "|" + hashDir(path.join(ROOT, "evals"));
  const a = ep(["demo"], { cwd: tmp() });
  const b = ep(["demo"], { cwd: "/" });
  ok(a, "demo in a temp cwd"); ok(b, "demo in /");
  assert.equal(a.out, b.out, "demo output depends on cwd");
  assert.equal(hashDir(path.join(ROOT, "evalpm")) + "|" + hashDir(path.join(ROOT, "evals")), before, "demo wrote into the repo");
  assert.ok(fs.existsSync(path.join(DEMO, "tasks.json")) && fs.existsSync(path.join(DEMO, "SAMPLE-DATA.md")), "demo data files missing");
  assert.equal(rd(path.join(DEMO, "tasks.json")).length, 8, "demo has 8 invented tasks");
});

// ---------- EVPM-2 labeled, mixed picture
test("EVPM-2 demo first line says SAMPLE DATA; report shows a plain win, a tie, a calibrate kappa and verdict not proven", () => {
  const r = ok(ep(["demo"]), "demo");
  assert.match(r.out.split("\n")[0], /SAMPLE DATA/);
  assert.match(r.out, /losses\s+[1-9]/i, "no task where plain wins");
  assert.match(r.out, /tie/i, "no tie shown");
  assert.match(r.out, /kappa/i, "calibrate output missing");
  assert.match(lineWith(r.out, /verdict/i), /not proven/);
  assert.doesNotMatch(r.out, /edge shown/);
});

// ---------- EVPM-3 no network, no key env
test("EVPM-3 no evalpm command makes a network call or prints a key from the environment (net, http, https, fetch, dns stubbed to fail)", () => {
  const dir = tmp(), marker = path.join(dir, "hit.log");
  const stub = wr(path.join(dir, "nonet.cjs"), `
const fs = require("fs"); const hit = (w) => { fs.appendFileSync(${JSON.stringify(marker)}, w + "\\n"); throw new Error("network use blocked: " + w); };
const net = require("net"); net.Socket.prototype.connect = function () { hit("net.connect"); };
for (const m of ["http", "https"]) { const x = require(m); x.request = () => hit(m + ".request"); x.get = () => hit(m + ".get"); }
globalThis.fetch = () => hit("fetch");
const dns = require("dns"); dns.lookup = () => hit("dns.lookup");
`);
  const env = { NODE_OPTIONS: `--require ${stub}`, ANTHROPIC_API_KEY: SENTINEL, EVAL_API_KEY: SENTINEL, OPENAI_API_KEY: SENTINEL, API_TOKEN: SENTINEL };
  const outs = [];
  outs.push(ok(ep(["demo"], { env }), "demo"));
  const s = drive({ n: 12 });
  outs.push(ok(epRoot(s.root, ["check", s.suite], { env }), "check"));
  outs.push(ok(epRoot(s.root, ["report", "--suite", s.suite], { env }), "report"));
  outs.push(ok(epRoot(s.root, ["calibrate", "--suite", s.suite, "--run", s.run], { env }), "calibrate"));
  assert.ok(!fs.existsSync(marker), "network was touched:\n" + (fs.existsSync(marker) ? fs.readFileSync(marker, "utf8") : ""));
  for (const o of outs) assert.ok(!o.all.includes(SENTINEL), "an env secret leaked into output");
});

test("EVPM-3 evalpm.mjs reads no env var named like a key and does not expose the key-gated runner", () => {
  assert.ok(fs.existsSync(EP), "missing evalpm/evalpm.mjs");
  const src = fs.readFileSync(EP, "utf8");
  assert.doesNotMatch(src, /process\.env(\.|\[)[^;\n]*(KEY|TOKEN|SECRET)/i);
  assert.doesNotMatch(src, /run-gated|api\.anthropic|https?:\/\/|fetch\(/);
});

// ---------- EVPM-4 privacy of printed output
test("EVPM-4 demo and a fixture report print basenames only: no home dir, temp path, email, token or other check-private pattern", async () => {
  const { scanText } = await import(pathToFileURL(path.join(ROOT, "tools", "check-private.mjs")).href);
  const s = drive({ n: 12 });
  const outs = [ok(ep(["demo"]), "demo").all, ok(epRoot(s.root, ["report", "--suite", s.suite]), "report").all, ok(epRoot(s.root, ["collect", "--run", s.run]), "collect").all];
  for (const o of outs) {
    assert.deepEqual(scanText(o), [], "check-private pattern in output:\n" + o);
    assert.ok(!o.includes(os.homedir() + "/") || os.homedir() === "/", "home dir in output");
    assert.ok(!o.includes(s.root) && !o.includes(os.tmpdir() + "/evpm-") && !o.includes(ROOT + "/"), "full path in output:\n" + o);
  }
  const dem = ep(["demo"]).out;
  assert.doesNotMatch(dem, /(^|\s)\/(home|tmp|var|Users|root)\//, "absolute path in demo output");
  assert.doesNotMatch(dem, /[A-Za-z]:\\/, "windows path in demo output");
});

// ---------- EVPM-5 thin dispatcher, no duplicated logic
test("EVPM-5 evalpm.mjs defines no signP, wilson, kappa, binomial or verdict logic and points at tools/eval-pipeline.mjs", () => {
  assert.ok(fs.existsSync(EP), "missing evalpm/evalpm.mjs");
  const src = fs.readFileSync(EP, "utf8");
  assert.match(src, /eval-pipeline\.mjs/, "must delegate to tools/eval-pipeline.mjs");
  for (const re of [/signP/, /wilson/i, /kappa/i, /binom/i, /edge shown/, /not proven/, /Math\.(pow|sqrt|log)/, /\bverdict\b/i])
    assert.doesNotMatch(src, re, `evalpm.mjs duplicates logic: ${re}`);
  assert.ok(src.split("\n").length < 120, "dispatcher should be small");
});

test("EVPM-5 report and check through evalpm equal the tool's own output byte for byte (known-output check)", () => {
  const s = drive({ n: 12, plainWins: ["c1"] });
  const viaEp = ok(epRoot(s.root, ["report", "--suite", s.suite]), "evalpm report");
  const viaTool = tool(s.root, ["report", "--suite", s.suite]);
  assert.equal(viaEp.out, viaTool.out);
  assert.match(viaEp.out, /wins 11, losses 1/);
  assert.match(viaEp.out, /sign test p = 0\.006/);
  const c = epRoot(s.root, ["check", s.suite]);
  const ct = tool(s.root, ["check-suite", s.suite]);
  assert.equal(c.code, ct.code); assert.equal(c.out, ct.out);
});

test("EVPM-5 an unknown command exits 2 with a usage line", () => {
  const r = ep(["frobnicate"]);
  assert.equal(r.code, 2, r.all);
  assert.match(r.all, /usage/i);
});

// ---------- EVPM-6 under 10 tasks is "not proven"
test("EVPM-6 a suite with 9 tasks is 'not proven' even when the agent wins every task; 10 tasks can show an edge (boundary)", () => {
  const nine = drive({ n: 9 });
  const t9 = ok(epRoot(nine.root, ["report", "--suite", nine.suite]), "report 9").out;
  assert.match(lineWith(t9, /verdict/), /not proven/);
  assert.doesNotMatch(t9, /edge shown/);
  const ten = drive({ n: 10 });
  assert.match(lineWith(ok(epRoot(ten.root, ["report", "--suite", ten.suite]), "report 10").out, /verdict/), /edge shown/);
});

test("EVPM-6 a pairwise suite with 5 tasks is 'not proven' whatever the tally", () => {
  const s = drive({ kind: "pairwise", n: 5 });
  const t = ok(epRoot(s.root, ["report", "--suite", s.suite]), "report pairwise").out;
  assert.match(t, /not proven/);
  assert.doesNotMatch(t, /edge shown/);
});

// ---------- EVPM-7 claim gate
test("EVPM-7 report --claim exits 1 with a reason when there is no calibration, fewer than 20 marks, or kappa below 0.6; exits 0 with 20 marks and kappa 0.8", () => {
  const s = drive({ n: 12, plainWins: ["c1"] }); // agent 11, plain 1: edge shown
  assert.match(lineWith(ok(epRoot(s.root, ["report", "--suite", s.suite]), "plain report").out, /verdict/), /edge shown/);
  const claim = () => epRoot(s.root, ["report", "--suite", s.suite, "--claim"]);

  let r = claim();
  assert.equal(r.code, 1, r.all); assert.match(r.out, /claim blocked/); assert.match(r.out, /calibrat/i);

  calib(s, { n: 12, kappa: 0.8, agreement: 0.9, claim_ok: false, reason: "fewer than 20 marked pairs" });
  r = claim();
  assert.equal(r.code, 1, r.all); assert.match(r.out, /claim blocked: fewer than 20 marked pairs/);

  calib(s, { n: 20, kappa: 0.5, agreement: 0.7, claim_ok: false, reason: "kappa below 0.6" });
  r = claim();
  assert.equal(r.code, 1, r.all); assert.match(r.out, /claim blocked: kappa below 0.6/);

  calib(s, { n: 20, kappa: 0.8, agreement: 0.9, claim_ok: true });
  r = claim();
  assert.equal(r.code, 0, r.all); assert.doesNotMatch(r.out, /claim blocked/);
  assert.match(lineWith(r.out, /verdict/), /edge shown/);
});

test("EVPM-7 even with a passing calibration, --claim is blocked when no run shows an edge", () => {
  const s = drive({ n: 9 }); // not proven
  calib(s, { n: 20, kappa: 0.8, agreement: 0.9, claim_ok: true });
  const r = epRoot(s.root, ["report", "--suite", s.suite, "--claim"]);
  assert.equal(r.code, 1, r.all); assert.match(r.out, /claim blocked/);
});

// ---------- EVPM-8 held-out is one shot per change id
test("EVPM-8 jobs --phase heldout a second time for the same change id exits 1; a new change id still works", () => {
  const tasks = [...T(["d1", "d2", "d3"]), ...T(["h1", "h2", "h3"], "heldout")];
  const s = mkSuite({ tasks });
  assert.equal(tool(s.root, ["freeze", "--suite", s.suite]).code, 0, "fixture freeze");
  const run = (c) => path.join(s.root, "evals/runs", s.agent, `2026-11-25-${c}`);
  const jobs = (c) => epRoot(s.root, ["jobs", "--suite", s.suite, "--phase", "heldout", "--change", c, "--stage", "gen", "--run", run(c)]);
  ok(jobs("chg-a"), "first held-out emit");
  const n = jobsOf(run("chg-a"), "gen").length;
  assert.ok(n > 0, "first emit wrote no jobs");
  const again = jobs("chg-a");
  assert.equal(again.code, 1, again.all);
  assert.match(again.all, /held-out already run/i);
  assert.equal(jobsOf(run("chg-a"), "gen").length, n, "second emit changed the jobs");
  ok(jobs("chg-b"), "a different change id is a new shot");
});

// ---------- EVPM-9 no multiplier wording
test("EVPM-9 demo and report output carry no multiplier wording and every verdict has counts and an interval", () => {
  noMultiplier(ok(ep(["demo"]), "demo").out, "demo");
  for (const s of [drive({ n: 12, plainWins: ["c1"] }), drive({ n: 9 })]) {
    const t = ok(epRoot(s.root, ["report", "--suite", s.suite]), "report").out;
    noMultiplier(t, "cases report");
    assert.match(t, /wins \d+, losses \d+/);
    assert.match(t, /interval/i);
  }
  noMultiplier(ok(epRoot(drive({ kind: "pairwise", n: 5 }).root, ["report", "--suite", "evals/suites/demo.json"]), "pairwise report").out, "pairwise report");
});

// ---------- EVPM-10 neutral names
test("EVPM-10 no studio agent name appears in evalpm/ outside examples/", () => {
  assert.ok(fs.existsSync(path.join(ROOT, "evalpm")), "missing evalpm/ folder");
  const names = /(staff-pm|qa-tdd|ux-reviewer|stakeholder|positioning|privacy-security|engineer|architect)/i;
  const hits = [];
  const walk = (d) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f), rel = path.relative(path.join(ROOT, "evalpm"), p);
      if (rel === "examples") continue;
      if (fs.statSync(p).isDirectory()) { walk(p); continue; }
      const text = fs.readFileSync(p, "utf8");
      text.split("\n").forEach((l, i) => { if (names.test(l)) hits.push(`${rel}:${i + 1}: ${l.trim().slice(0, 80)}`); });
    }
  };
  walk(path.join(ROOT, "evalpm"));
  assert.deepEqual(hits, [], "studio agent names leaked into the core");
});

// ---------- EVPM-13 files and CI (existence half)
test("EVPM-13 evalpm/ has LICENSE (MIT), README.md, METHOD.md, LIMITS.md and package.json with no dependencies", () => {
  for (const f of ["LICENSE", "README.md", "METHOD.md", "LIMITS.md", "package.json"]) assert.ok(fs.existsSync(path.join(ROOT, "evalpm", f)), `missing evalpm/${f}`);
  assert.match(fs.readFileSync(path.join(ROOT, "evalpm", "LICENSE"), "utf8"), /MIT License/);
  const pj = rd(path.join(ROOT, "evalpm", "package.json"));
  assert.deepEqual(Object.keys(pj.dependencies || {}), []);
  assert.deepEqual(Object.keys(pj.devDependencies || {}), []);
});

test("EVPM-13 a CI workflow has a job named evalpm that runs the evalpm test", () => {
  const dir = path.join(ROOT, ".github", "workflows");
  const hit = fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).map((f) => fs.readFileSync(path.join(dir, f), "utf8"))
    .find((t) => /^\s{2}evalpm:\s*$/m.test(t) || /^\s*name:\s*evalpm\s*$/m.test(t));
  assert.ok(hit, "no workflow job named evalpm");
  const job = hit.split(/^\s{2}evalpm:\s*$/m)[1] ?? hit;
  assert.match(job, /evalpm\.test\.mjs/, "the evalpm job must run evalpm.test.mjs");
});
