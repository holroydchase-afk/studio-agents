// Failing-first tests for tools/eval-pipeline.mjs (docs/product/SPEC-EVAL-PIPELINE.md, EVPL-1..EVPL-18).
// The tool is spawned as a child process with fixtures in a temp dir; nothing is written under the repo.
// Every call goes through pipe(), which first asserts tools/eval-pipeline.mjs exists, so a missing tool turns
// every test red (never accidentally green on an "exit 1" assertion).
//
// COMMAND SURFACE PINNED BY THESE TESTS (the spec leaves it open; the builder implements exactly this):
//   Global:   --root DIR is the base for every repo-relative path (suite paths, evals/suites, evals/runs). Tests
//             always pass it and run with cwd = that temp root. --suite FILE and check-suite CONFIG take a path
//             relative to --root. --run DIR and --out are absolute or relative to --root. Exit 0 ok, 1 problems, 2 usage.
//   init --agent A --kind pairwise|cases     writes evals/suites/A.json plus stub evals/A/tasks.json ("[]") and
//                                            evals/A/rubric.md so check-suite exits 0; refuses (exit 1) to overwrite.
//   check-suite CONFIG                       one problem line per problem, each naming the field; exit 1 if any.
//   freeze --suite S / verify --suite S      writes/reads evals/suites/<agent>.frozen.json (schema 1: prompts{file,sha256},
//                                            rubric{file,sha256}, date, plus suite{file,sha256} and key_path).
//   jobs --suite S --phase dev|heldout --change ID [--stage gen|grade] [--run DIR] [--reissue] [--out DIR]
//                                            writes <run>/jobs/<id>.json (default run evals/runs/<agent>/<date>-<change>).
//                                            Default stage gen. --reissue --out DIR writes only jobs that have no result.
//   collect --run DIR [--partial]            validates <run>/results/*.json against <run>/jobs, writes <run>/run.json.
//   report --suite S [--json] [--claim]      covers every run under evals/runs/<agent>/ (v2 run.json, legacy v1 results.json).
//   sheet --suite S --run DIR --n N --out FILE, key-add --suite S --run DIR --marks "p-01=A,p-02=tie" [--replace],
//   calibrate --suite S --run DIR [--out FILE], status --suite S [--run DIR]
// FILE LAYOUTS PINNED:
//   suite config: agent, kind, tasks, rubric, split{dev,heldout}, arms, runs, votes_per_order (pairwise) | votes (cases),
//                 grader_model, agent_model, key, direct, strip (regex source strings).
//   tasks file: JSON array of {id, split, text}.
//   job (all): id, stage "gen"|"grade", model, input_sha256 (sha256 hex of the job's input/text).
//     gen job: task, arm, run (1-based int), input (the prompt text; input_sha256 is its sha256).
//     pairwise grade job: pair (opaque id, same for the AB and BA jobs), order "AB"|"BA", vote (1-based), outputs{A,B},
//       text (labels A and B, the rubric and the stripped outputs). NO arm anywhere in the job.
//     cases grade job: output (one stripped output), text. (The arm may appear in the job; cases are not blind.)
//   result: results/<jobid>.json = {id, model, input_sha256, tokens (number | "not measured"), output} for gen,
//     {id, model, input_sha256, answer} for grade; answer "A"|"B"|"tie" (pairwise) or "pass"|"fail" (cases).
//   arm tokens in run.json = sum of that arm's gen-result tokens ("not measured" if any is).
//   blind-map.json (in the run dir, never in jobs/) holds the arm behind each grading slot; sheet-map.json likewise for sheets.
//   run.json: schema 2, agent, kind, change, phase, grader_model, agent_model, arms, frozen{prompts_sha256 = sha256 of
//     the tasks file bytes, rubric_sha256}, pairs[] (eval-protocol shape) and, for cases, cases[] with pairs [].
//   ledger evals/suites/<agent>.ledger.json: any JSON that holds the change id string; a reissue adds the word "reissue".
//   sheet FILE: {pairs:[{id:"p-01", A, B}]}; key file {marks:{"p-03":{arm:"agent"|"plain"|"tie", history:[arm...]}}}.
//   calibration: evals/suites/<agent>.calibration.json {n, agreement, kappa (number | "undefined"), claim_ok, reason}.
// OUTPUT SHAPES ASSERTED LOOSELY (like tests/eval-protocol.test.mjs): report text by the spec's quoted phrases and
// numbers on the line naming them (sign, wilson, flip, cost per win, noisy, design effect); report --json by deep key
// search. Pinned JSON keys for cases: wins, losses, both_pass, both_fail, sign_p, wilson ({low,high} or [lo,hi]),
// noisy (array of case ids), design_effect ("not measured" or {verdict,wins,losses}).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = path.join(ROOT, "tools", "eval-pipeline.mjs");
const PROTOCOL = path.join(ROOT, "tools", "eval-protocol.mjs");
const REAL_V1 = path.join(ROOT, "evals/lazy-prompts/runs/2026-11-24-fresh-prompts/results.json");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "evpl-"));
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const shaFile = (p) => sha(fs.readFileSync(p));
const wr = (p, data) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, typeof data === "string" ? data : JSON.stringify(data, null, 1)); return p; };
const rd = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

function pipe(root, args) {
  assert.ok(fs.existsSync(TOOL), "missing tools/eval-pipeline.mjs");
  const r = spawnSync(process.execPath, [TOOL, ...args, "--root", root], { encoding: "utf8", timeout: 60000, cwd: root });
  return { code: r.status, out: r.stdout || "", err: r.stderr || "", all: (r.stdout || "") + (r.stderr || "") };
}
function proto(args) {
  const r = spawnSync(process.execPath, [PROTOCOL, ...args], { encoding: "utf8", timeout: 20000 });
  return { code: r.status, out: r.stdout || "", all: (r.stdout || "") + (r.stderr || "") };
}
const ok = (r, what = "") => { assert.equal(r.code, 0, `${what} exit ${r.code}\n${r.all}`); return r; };

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
const lineWith = (text, re) => text.split("\n").find((l) => re.test(l)) || "";
const nums = (s) => [...s.matchAll(/\d+\.\d+/g)].map((m) => Number(m[0]));
const near = (a, b, tol) => typeof a === "number" && Math.abs(a - b) <= tol;
const bounds = (w) => (Array.isArray(w) ? w : [w?.low ?? w?.lo, w?.high ?? w?.hi]);

// ---------- fixtures
const K = { agent: "k1", plain: "k2", "plain-rules": "k3" };
const ARM_OF = { k1: "agent", k2: "plain", k3: "plain-rules" };
const code = (task, run, arm) => `zq-${task}-${run}-${K[arm]}`;
function decode(s) {
  const m = /zq-([A-Za-z0-9_.]+)-(\d+)-(k\d)/.exec(s || "");
  return m ? { task: m[1], run: Number(m[2]), arm: ARM_OF[m[3]] } : null;
}
const T = (ids, split = "dev") => ids.map((id) => ({ id, split, text: `Write about ${id}` }));
const RUBRIC_LINE = "Pick the answer that is more useful and honest.";

function mkSuite({ agent = "demo", kind = "pairwise", tasks, arms = ["agent", "plain"], runs = 3, extra = {} }) {
  const root = tmp();
  wr(path.join(root, `evals/${agent}/tasks.json`), tasks);
  wr(path.join(root, `evals/${agent}/rubric.md`), `${RUBRIC_LINE}\nAnswer A, B or tie.\n`);
  const cfg = {
    agent, kind, tasks: `evals/${agent}/tasks.json`, rubric: `evals/${agent}/rubric.md`,
    split: { dev: tasks.filter((t) => t.split === "dev").length, heldout: tasks.filter((t) => t.split === "heldout").length },
    arms, runs, grader_model: "model-grader-9", agent_model: "model-alpha-1",
    key: `evals/suites/${agent}.key.json`, direct: false, strip: ["\\[spec:[^\\]]*\\]"], ...extra,
  };
  if (kind === "pairwise") cfg.votes_per_order = 3; else cfg.votes = 3;
  const suite = `evals/suites/${agent}.json`;
  wr(path.join(root, suite), cfg);
  return { root, agent, kind, suite, cfg };
}
const runDir = (s, change) => path.join(s.root, "evals/runs", s.agent, `2026-11-25-${change}`);
const jobsOf = (run, stage) => {
  const d = path.join(run, "jobs");
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => rd(path.join(d, f))).filter((j) => !stage || j.stage === stage);
};
const TOK = { agent: 6000, plain: 2000, "plain-rules": 3000 };
function answerGen(run, tokens = TOK, only) {
  for (const j of jobsOf(run, "gen")) {
    if (only && !only(j)) continue;
    wr(path.join(run, "results", `${j.id}.json`), {
      id: j.id, model: j.model, input_sha256: j.input_sha256,
      tokens: typeof tokens === "string" ? tokens : tokens[j.arm], output: `[spec:alpha] ${code(j.task, j.run, j.arm)}`,
    });
  }
}
// planPair(task, run) -> "AB:aaa/BA:aaa" style votes for the agent arm (a agent, p plain, t tie); other arms always tie.
function answerGradePairwise(run, planPair) {
  const parsed = {};
  for (const j of jobsOf(run, "grade")) {
    const a = decode(j.outputs.A), b = decode(j.outputs.B);
    const x = a.arm === "plain" ? b : a, other = a.arm === "plain" ? a : b;
    assert.equal(other.arm, "plain", "every pair compares an arm with plain");
    let letter = "t";
    if (x.arm === "agent") {
      const key = `${x.task}/${x.run}`;
      parsed[key] ??= Object.fromEntries(planPair(x.task, x.run).split("/").map((p) => p.split(":")));
      letter = parsed[key][j.order][j.vote - 1];
    }
    const winner = letter === "a" ? "agent" : letter === "p" ? "plain" : "tie";
    const answer = winner === "tie" ? "tie" : a.arm === winner ? "A" : "B";
    wr(path.join(run, "results", `${j.id}.json`), { id: j.id, model: j.model, input_sha256: j.input_sha256, answer });
  }
}
function answerGradeCases(run, planCase) {
  for (const j of jobsOf(run, "grade")) {
    const d = decode(j.output);
    wr(path.join(run, "results", `${j.id}.json`), { id: j.id, model: j.model, input_sha256: j.input_sha256, answer: planCase(d.task, d.arm, d.run) ? "pass" : "fail" });
  }
}
function drive(o) {
  const s = mkSuite(o);
  const change = o.change || "chg1", phase = o.phase || "dev", run = runDir(s, change);
  const base = ["--suite", s.suite];
  ok(pipe(s.root, ["freeze", ...base]), "freeze");
  ok(pipe(s.root, ["jobs", ...base, "--phase", phase, "--change", change, "--stage", "gen", "--run", run]), "jobs gen");
  answerGen(run, o.tokens);
  ok(pipe(s.root, ["collect", "--run", run]), "collect gen");
  ok(pipe(s.root, ["jobs", ...base, "--phase", phase, "--change", change, "--stage", "grade", "--run", run]), "jobs grade");
  if (s.kind === "pairwise") answerGradePairwise(run, o.planPair || (() => "AB:ttt/BA:ttt")); else answerGradeCases(run, o.planCase);
  ok(pipe(s.root, ["collect", "--run", run]), "collect grade");
  return { ...s, run, change };
}

// P: the F1 run of tests/eval-protocol.test.mjs (same vote arrays), 5 prompts x 3 runs, arm agent only.
const AAA = "AB:aaa/BA:aaa", PPP = "AB:ppp/BA:ppp", TTT = "AB:ttt/BA:ttt";
const F1 = { p1: [AAA, AAA, AAA], p2: [AAA, AAA, PPP], p3: [AAA, PPP, PPP], p4: [AAA, AAA, AAA], p5: ["AB:aaa/BA:ppp", TTT, TTT] };
const planP = (task, run) => F1[task][run - 1];
const driveP = (o = {}) => drive({ tasks: T(["p1", "p2", "p3", "p4", "p5"]), planPair: planP, ...o });

// C1: 12 cases x 3 runs, arms agent and plain. passes = runs passed out of 3.
const C1 = {
  c1: [3, 0], c2: [3, 0], c3: [3, 0], c4: [3, 0], c5: [3, 0], c6: [3, 0], c7: [3, 0], c8: [3, 0],
  c9: [2, 0], c10: [3, 3], c11: [0, 2], c12: [0, 0],
};
const casePlan = (table) => (task, arm, run) => {
  const [a, p] = table[task];
  return run <= (arm === "agent" ? a : arm === "plain" ? p : a);
};
const driveC = (table = C1, o = {}) => drive({ kind: "cases", tasks: T(Object.keys(table)), planCase: casePlan(table), ...o });

// K1: 20 pairs, 1 run, grader verdict per task; Chase's marks chosen per task index.
const graderK = (idx) => (idx <= 10 ? "a" : "p");
const K1_MARKS = (i) => (i <= 9 || i === 11 ? "agent" : "plain"); // 10 agent, 10 plain; mismatches at 10 and 11
const K_BAD_MARKS = (i) => ((i <= 6 || (i >= 11 && i <= 14)) ? "agent" : "plain"); // 12 of 20 agree, marginals 10/10
function sheetRun(grader = graderK) {
  const ids = Array.from({ length: 20 }, (_, i) => `t${String(i + 1).padStart(2, "0")}`);
  const s = drive({ tasks: T(ids), runs: 1, change: "cal", planPair: (task) => (grader(Number(task.slice(1))) === "a" ? AAA : PPP) });
  const sheetFile = path.join(s.root, "sheet.json");
  ok(pipe(s.root, ["sheet", "--suite", s.suite, "--run", s.run, "--n", "20", "--out", sheetFile]), "sheet");
  const pairs = rd(sheetFile).pairs.map((p) => ({ ...p, a: decode(p.A), b: decode(p.B) }));
  return { ...s, sheetFile, pairs };
}
function marksFor(pairs, chase, omit = []) {
  return pairs.filter((p) => !omit.includes(Number(p.a.task.slice(1))))
    .map((p) => `${p.id}=${p.a.arm === chase(Number(p.a.task.slice(1))) ? "A" : "B"}`).join(",");
}
function calibrateWith(sr, chase, omit = []) {
  ok(pipe(sr.root, ["key-add", "--suite", sr.suite, "--run", sr.run, "--marks", marksFor(sr.pairs, chase, omit)]), "key-add");
  const r = pipe(sr.root, ["calibrate", "--suite", sr.suite, "--run", sr.run]);
  const f = path.join(sr.root, "evals/suites/demo.calibration.json");
  return { r, cal: fs.existsSync(f) ? rd(f) : undefined };
}

// ---------- EVPL-1 check-suite
test("EVPL-1 check-suite: bad kind and missing rubric give 2 problem lines naming kind and rubric", () => {
  const s = mkSuite({ tasks: T(["p1"]) });
  const bad = { ...s.cfg, kind: "triple" }; delete bad.rubric;
  wr(path.join(s.root, "evals/suites/bad.json"), bad);
  const r = pipe(s.root, ["check-suite", "evals/suites/bad.json"]);
  assert.equal(r.code, 1, r.all);
  const lines = r.all.split("\n").filter((l) => l.trim());
  assert.equal(lines.length, 2, "want exactly 2 problem lines, got:\n" + r.all);
  assert.ok(lines.some((l) => /kind/.test(l)), r.all);
  assert.ok(lines.some((l) => /rubric/.test(l)), r.all);
});

test("EVPL-1 check-suite: runs 2 on a cases suite gives 1 problem line naming runs", () => {
  const s = mkSuite({ kind: "cases", tasks: T(["c1"]), runs: 2 });
  const r = pipe(s.root, ["check-suite", s.suite]);
  assert.equal(r.code, 1, r.all);
  const lines = r.all.split("\n").filter((l) => l.trim());
  assert.equal(lines.length, 1, r.all);
  assert.match(lines[0], /runs/);
});

test("EVPL-1 check-suite: arms without plain, and a missing tasks file, are each one problem naming the field", () => {
  const s = mkSuite({ tasks: T(["p1"]), arms: ["agent", "plain-rules"] });
  const a = pipe(s.root, ["check-suite", s.suite]);
  assert.equal(a.code, 1, a.all);
  assert.match(a.all, /arms/);
  assert.equal(a.all.split("\n").filter((l) => l.trim()).length, 1, a.all);
  const s2 = mkSuite({ tasks: T(["p1"]) });
  fs.unlinkSync(path.join(s2.root, "evals/demo/tasks.json"));
  const b = pipe(s2.root, ["check-suite", s2.suite]);
  assert.equal(b.code, 1, b.all);
  assert.match(b.all, /tasks/);
});

test("EVPL-1 check-suite: a complete pairwise config with plain in arms exits 0; output shows basenames only", () => {
  const s = mkSuite({ tasks: T(["p1", "p2"]), arms: ["agent", "plain", "plain-rules"] });
  const r = pipe(s.root, ["check-suite", s.suite]);
  assert.equal(r.code, 0, r.all);
  assert.ok(!r.all.includes(s.root), "output must not hold the full temp path");
});

test("EVPL-1 usage: no args, unknown subcommand, missing config and bad JSON exit 2", () => {
  const root = tmp();
  assert.equal(pipe(root, []).code, 2);
  assert.equal(pipe(root, ["nonsense"]).code, 2);
  assert.equal(pipe(root, ["check-suite"]).code, 2);
  assert.equal(pipe(root, ["check-suite", "evals/suites/missing.json"]).code, 2);
  wr(path.join(root, "evals/suites/bad.json"), "{not json");
  assert.equal(pipe(root, ["check-suite", "evals/suites/bad.json"]).code, 2);
  assert.equal(pipe(root, ["jobs", "--suite", "evals/suites/missing.json", "--phase", "dev", "--change", "x"]).code, 2);
});

// ---------- EVPL-2 init
test("EVPL-2 init --agent demo --kind cases writes the default config; check-suite exits 0; a second init exits 1 and changes nothing", () => {
  const root = tmp();
  ok(pipe(root, ["init", "--agent", "demo", "--kind", "cases"]), "init");
  const f = path.join(root, "evals/suites/demo.json");
  const c = rd(f);
  assert.equal(c.agent, "demo");
  assert.equal(c.kind, "cases");
  assert.deepEqual(c.arms, ["agent", "plain", "plain-rules"]);
  assert.equal(c.runs, 3);
  assert.equal(c.votes, 3);
  assert.equal(typeof c.key, "string");
  assert.ok(c.split && "heldout" in c.split, "split must have a heldout field");
  assert.equal(ok(pipe(root, ["check-suite", "evals/suites/demo.json"]), "check-suite after init").code, 0);
  const before = fs.readFileSync(f);
  const again = pipe(root, ["init", "--agent", "demo", "--kind", "cases"]);
  assert.equal(again.code, 1, again.all);
  assert.deepEqual(fs.readFileSync(f), before);
});

test("EVPL-2 init --kind pairwise has plain in arms, votes_per_order 3 and passes check-suite; a bad kind exits 2", () => {
  const root = tmp();
  ok(pipe(root, ["init", "--agent", "pw", "--kind", "pairwise"]), "init");
  const c = rd(path.join(root, "evals/suites/pw.json"));
  assert.ok(c.arms.includes("plain"));
  assert.equal(c.votes_per_order, 3);
  ok(pipe(root, ["check-suite", "evals/suites/pw.json"]), "check-suite");
  assert.equal(pipe(root, ["init", "--agent", "x", "--kind", "triple"]).code, 2);
});

// ---------- EVPL-3 freeze, verify
test("EVPL-3 freeze then verify exits 0; frozen.json holds the config hash, the key path and basenames only; eval-protocol verify reads it", () => {
  const s = mkSuite({ tasks: T(["p1", "p2"]) });
  ok(pipe(s.root, ["freeze", "--suite", s.suite]), "freeze");
  const fz = path.join(s.root, "evals/suites/demo.frozen.json");
  const j = rd(fz);
  assert.equal(j.schema, 1);
  assert.equal(j.prompts.file, "tasks.json");
  assert.equal(j.prompts.sha256, shaFile(path.join(s.root, "evals/demo/tasks.json")));
  assert.equal(j.rubric.sha256, shaFile(path.join(s.root, "evals/demo/rubric.md")));
  assert.equal(j.suite.file, "demo.json");
  assert.equal(j.suite.sha256, shaFile(path.join(s.root, s.suite)));
  assert.equal(j.key_path, "evals/suites/demo.key.json");
  assert.ok(!fs.readFileSync(fz, "utf8").includes(s.root), "frozen.json must not hold a full path");
  ok(pipe(s.root, ["verify", "--suite", s.suite]), "verify");
  const next = tmp();
  fs.copyFileSync(path.join(s.root, "evals/demo/tasks.json"), path.join(next, "tasks.json"));
  fs.copyFileSync(path.join(s.root, "evals/demo/rubric.md"), path.join(next, "rubric.md"));
  fs.copyFileSync(fz, path.join(next, "frozen.json"));
  assert.equal(proto(["verify", path.join(next, "frozen.json")]).code, 0, "schema 1 must stay readable by eval-protocol verify");
});

test("EVPL-3 one byte appended to the suite config: verify exits 1 naming the config only, and jobs exits 1 writing no job file", () => {
  const s = mkSuite({ tasks: T(["p1", "p2"]) });
  ok(pipe(s.root, ["freeze", "--suite", s.suite]), "freeze");
  fs.appendFileSync(path.join(s.root, s.suite), " ");
  const v = pipe(s.root, ["verify", "--suite", s.suite]);
  assert.equal(v.code, 1, v.all);
  assert.match(v.all, /\bdemo\.json\b/);
  assert.doesNotMatch(v.all, /tasks\.json|rubric\.md/);
  const run = runDir(s, "c1");
  const j = pipe(s.root, ["jobs", "--suite", s.suite, "--phase", "dev", "--change", "c1", "--stage", "gen", "--run", run]);
  assert.equal(j.code, 1, j.all);
  assert.equal(jobsOf(run).length, 0, "no job file may be written");
});

test("EVPL-3 jobs on a suite that was never frozen exits 1 and writes nothing", () => {
  const s = mkSuite({ tasks: T(["p1"]) });
  const run = runDir(s, "c1");
  const j = pipe(s.root, ["jobs", "--suite", s.suite, "--phase", "dev", "--change", "c1", "--run", run]);
  assert.equal(j.code, 1, j.all);
  assert.equal(jobsOf(run).length, 0);
});

// ---------- EVPL-4 jobs
test("EVPL-4 pairwise with arms agent, plain, plain-rules: 45 gen jobs, then 180 grading jobs after collect", () => {
  const s = mkSuite({ tasks: T(["p1", "p2", "p3", "p4", "p5"]), arms: ["agent", "plain", "plain-rules"] });
  const run = runDir(s, "c1");
  ok(pipe(s.root, ["freeze", "--suite", s.suite]));
  ok(pipe(s.root, ["jobs", "--suite", s.suite, "--phase", "dev", "--change", "c1", "--stage", "gen", "--run", run]));
  const gen = jobsOf(run, "gen");
  assert.equal(gen.length, 45);
  assert.equal(new Set(gen.map((j) => j.id)).size, 45, "job ids must be unique");
  for (const j of gen) {
    assert.ok(j.id && j.task && ["agent", "plain", "plain-rules"].includes(j.arm), JSON.stringify(j));
    assert.ok(Number.isInteger(j.run) && j.run >= 1 && j.run <= 3);
    assert.equal(j.model, "model-alpha-1");
    assert.match(j.input_sha256, /^[0-9a-f]{64}$/);
    assert.equal(j.input_sha256, sha(j.input), "input_sha256 must be the sha256 of input");
  }
  answerGen(run);
  ok(pipe(s.root, ["collect", "--run", run]));
  ok(pipe(s.root, ["jobs", "--suite", s.suite, "--phase", "dev", "--change", "c1", "--stage", "grade", "--run", run]));
  const grade = jobsOf(run, "grade");
  assert.equal(grade.length, 180);
  for (const j of grade) assert.equal(j.model, "model-grader-9");
});

test("EVPL-4 pairwise with arms agent and plain only: 90 grading jobs", () => {
  const s = mkSuite({ tasks: T(["p1", "p2", "p3", "p4", "p5"]) });
  const run = runDir(s, "c1");
  ok(pipe(s.root, ["freeze", "--suite", s.suite]));
  ok(pipe(s.root, ["jobs", "--suite", s.suite, "--phase", "dev", "--change", "c1", "--stage", "gen", "--run", run]));
  assert.equal(jobsOf(run, "gen").length, 30);
  answerGen(run);
  ok(pipe(s.root, ["collect", "--run", run]));
  ok(pipe(s.root, ["jobs", "--suite", s.suite, "--phase", "dev", "--change", "c1", "--stage", "grade", "--run", run]));
  assert.equal(jobsOf(run, "grade").length, 90);
});

test("EVPL-4 jobs --stage grade before collect exits 1; the default run dir is evals/runs/<agent>/<date>-<change>; status names the next command", () => {
  const s = mkSuite({ tasks: T(["p1", "p2"]), runs: 1 });
  const base = ["--suite", s.suite, "--phase", "dev", "--change", "c1"];
  const st0 = ok(pipe(s.root, ["status", "--suite", s.suite]), "status unfrozen");
  assert.match(lineWith(st0.out, /next:/i), /freeze/, st0.out);
  ok(pipe(s.root, ["freeze", "--suite", s.suite]));
  assert.match(lineWith(ok(pipe(s.root, ["status", "--suite", s.suite])).out, /next:/i), /jobs.*--stage gen/);
  ok(pipe(s.root, ["jobs", ...base, "--stage", "gen"]));
  const dir = path.join(s.root, "evals/runs/demo");
  const made = fs.readdirSync(dir).filter((d) => /^\d{4}-\d{2}-\d{2}-c1$/.test(d));
  assert.equal(made.length, 1, "default run dir evals/runs/demo/<date>-c1 missing");
  const run = path.join(dir, made[0]);
  assert.ok(jobsOf(run, "gen").length > 0);
  assert.equal(pipe(s.root, ["jobs", ...base, "--stage", "grade", "--run", run]).code, 1, "grade before collect must be refused");
  assert.match(lineWith(ok(pipe(s.root, ["status", "--suite", s.suite, "--run", run])).out, /next:/i), /collect/);
  answerGen(run);
  ok(pipe(s.root, ["collect", "--run", run]));
  assert.match(lineWith(ok(pipe(s.root, ["status", "--suite", s.suite, "--run", run])).out, /next:/i), /jobs.*--stage grade/);
});

// ---------- EVPL-5 blind grading
test("EVPL-5 a grading job holds only A and B, the rubric and stripped outputs, no arm names, model ids or strip patterns; the map is sealed in blind-map.json", () => {
  const s = mkSuite({ tasks: T(["p1", "p2"]), runs: 1, arms: ["agent", "plain", "plain-rules"] });
  const run = runDir(s, "c1");
  ok(pipe(s.root, ["freeze", "--suite", s.suite]));
  ok(pipe(s.root, ["jobs", "--suite", s.suite, "--phase", "dev", "--change", "c1", "--stage", "gen", "--run", run]));
  answerGen(run);
  ok(pipe(s.root, ["collect", "--run", run]));
  ok(pipe(s.root, ["jobs", "--suite", s.suite, "--phase", "dev", "--change", "c1", "--stage", "grade", "--run", run]));
  const grade = jobsOf(run, "grade");
  assert.equal(grade.length, 2 * 2 * 2 * 3);
  const byPair = {};
  for (const j of grade) {
    assert.match(j.text, /\bA\b/); assert.match(j.text, /\bB\b/);
    assert.ok(j.text.includes(RUBRIC_LINE), "grading text must hold the rubric");
    assert.ok(j.text.includes(j.outputs.A.trim()) && j.text.includes(j.outputs.B.trim()), "text must hold both outputs");
    for (const bad of ["agent", "plain-rules", "model-alpha-1", "[spec:alpha]"]) {
      assert.ok(!j.text.includes(bad), `grading text leaks ${bad}`);
      assert.ok(!JSON.stringify(j).includes(bad), `grading job file leaks ${bad}`);
    }
    assert.ok(!("arm" in j), "a grading job has no arm field");
    (byPair[j.pair] ??= []).push(j);
  }
  assert.equal(Object.keys(byPair).length, 4);
  for (const js of Object.values(byPair)) {
    const ab = js.filter((j) => j.order === "AB"), ba = js.filter((j) => j.order === "BA");
    assert.equal(ab.length, 3); assert.equal(ba.length, 3);
    assert.equal(ab[0].outputs.A, ba[0].outputs.B, "AB and BA must swap the same two outputs");
    assert.equal(ab[0].outputs.B, ba[0].outputs.A);
  }
  const map = path.join(run, "blind-map.json");
  assert.ok(fs.existsSync(map), "missing blind-map.json");
  const mt = fs.readFileSync(map, "utf8");
  assert.ok(mt.includes("agent") && mt.includes("plain-rules"), "blind-map.json must hold the arm mapping");
  assert.ok(!fs.existsSync(path.join(run, "jobs", "blind-map.json")));
});

// ---------- EVPL-6 collect
test("EVPL-6 collect of all 45 generation results exits 0, writes a schema 2 run.json with the frozen hashes, and eval-protocol check-run accepts it", () => {
  const s = mkSuite({ tasks: T(["p1", "p2", "p3", "p4", "p5"]), arms: ["agent", "plain", "plain-rules"] });
  const run = runDir(s, "c1");
  ok(pipe(s.root, ["freeze", "--suite", s.suite]));
  ok(pipe(s.root, ["jobs", "--suite", s.suite, "--phase", "dev", "--change", "c1", "--stage", "gen", "--run", run]));
  answerGen(run);
  ok(pipe(s.root, ["collect", "--run", run]), "collect");
  const j = rd(path.join(run, "run.json"));
  assert.equal(j.schema, 2);
  assert.equal(j.frozen.prompts_sha256, shaFile(path.join(s.root, "evals/demo/tasks.json")));
  assert.equal(j.frozen.rubric_sha256, shaFile(path.join(s.root, "evals/demo/rubric.md")));
  assert.equal(j.grader_model, "model-grader-9");
  assert.equal(j.agent_model, "model-alpha-1");
  assert.deepEqual([j.arms.agent.tokens, j.arms.plain.tokens, j.arms["plain-rules"].tokens], [90000, 30000, 45000]);
  assert.equal(proto(["check-run", path.join(run, "run.json")]).code, 0, proto(["check-run", path.join(run, "run.json")]).all);
});

// ---------- EVPL-7 collect problems
test("EVPL-7 collect prints 6 problem lines, each naming the job id and the field, and exits 1", () => {
  const s = mkSuite({ tasks: T(["p1", "p2", "p3"]), runs: 1 });
  const run = runDir(s, "c1"), base = ["--suite", s.suite, "--phase", "dev", "--change", "c1", "--run", run];
  ok(pipe(s.root, ["freeze", "--suite", s.suite]));
  ok(pipe(s.root, ["jobs", ...base, "--stage", "gen"]));
  answerGen(run);
  ok(pipe(s.root, ["collect", "--run", run]));
  ok(pipe(s.root, ["jobs", ...base, "--stage", "grade"]));
  answerGradePairwise(run, () => AAA);
  const g = jobsOf(run, "gen"), h = jobsOf(run, "grade");
  const res = (j) => path.join(run, "results", `${j.id}.json`);
  const edit = (j, fn) => { const r = rd(res(j)); fn(r); wr(res(j), r); };
  edit(g[0], (r) => { delete r.model; });
  edit(g[1], (r) => { r.tokens = "lots"; });
  edit(g[2], (r) => { r.input_sha256 = "f".repeat(64); });
  wr(path.join(run, "results", `dup-${g[3].id}.json`), rd(res(g[3])));
  wr(path.join(run, "results", "ghost.json"), { ...rd(res(g[4])), id: "zz-nojob" });
  edit(h[0], (r) => { r.answer = "C"; });
  const r = pipe(s.root, ["collect", "--run", run]);
  assert.equal(r.code, 1, r.all);
  const at = (id) => new RegExp(`(?<![\\w-])${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`);
  const want = [[g[0].id, /model/], [g[1].id, /tokens/], [g[2].id, /input_sha256/], [g[3].id, /duplicate|id/i], ["zz-nojob", /unknown|id/i], [h[0].id, /answer/]];
  const lines = r.all.split("\n").filter((l) => l.trim());
  for (const [id, field] of want) {
    const hits = lines.filter((l) => at(id).test(l));
    assert.equal(hits.length, 1, `want exactly 1 line naming ${id}, got ${hits.length}:\n${r.all}`);
    assert.match(hits[0], field, hits[0]);
  }
  assert.equal(lines.filter((l) => want.some(([id]) => at(id).test(l))).length, 6);
});

test("EVPL-7 a missing result without --partial lists the missing id and exits 1; with --partial exits 0", () => {
  const s = mkSuite({ tasks: T(["p1", "p2"]), runs: 1 });
  const run = runDir(s, "c1");
  ok(pipe(s.root, ["freeze", "--suite", s.suite]));
  ok(pipe(s.root, ["jobs", "--suite", s.suite, "--phase", "dev", "--change", "c1", "--stage", "gen", "--run", run]));
  const g = jobsOf(run, "gen");
  answerGen(run, TOK, (j) => j.id !== g[0].id);
  const r = pipe(s.root, ["collect", "--run", run]);
  assert.equal(r.code, 1, r.all);
  assert.ok(r.all.includes(g[0].id), `must list the missing id ${g[0].id}:\n${r.all}`);
  ok(pipe(s.root, ["collect", "--run", run, "--partial"]), "collect --partial");
});

// ---------- EVPL-8 held-out ledger
test("EVPL-8 held-out is emitted once per change id; c2 is allowed; dev is unlimited and never enters the ledger", () => {
  const tasks = [...T(["d1", "d2", "d3"]), ...T(["h1", "h2"], "heldout")];
  const s = drive({ tasks, runs: 1, phase: "heldout", change: "c1" });
  const ledger = path.join(s.root, "evals/suites/demo.ledger.json");
  assert.ok(fs.existsSync(ledger), "ledger missing");
  assert.ok(fs.readFileSync(ledger, "utf8").includes("c1"));
  const again = pipe(s.root, ["jobs", "--suite", s.suite, "--phase", "heldout", "--change", "c1", "--stage", "gen", "--run", path.join(s.root, "evals/runs/demo/other")]);
  assert.equal(again.code, 1, again.all);
  assert.match(again.all, /held-out already run for change c1/);
  assert.equal(jobsOf(path.join(s.root, "evals/runs/demo/other")).length, 0);
  const c2 = pipe(s.root, ["jobs", "--suite", s.suite, "--phase", "heldout", "--change", "c2", "--stage", "gen", "--run", path.join(s.root, "evals/runs/demo/c2")]);
  assert.equal(c2.code, 0, c2.all);
  assert.ok(fs.readFileSync(ledger, "utf8").includes("c2"));
  for (let i = 0; i < 3; i++) {
    const d = pipe(s.root, ["jobs", "--suite", s.suite, "--phase", "dev", "--change", "dev-x", "--stage", "gen", "--run", path.join(s.root, `evals/runs/demo/dev${i}`)]);
    assert.equal(d.code, 0, d.all);
  }
  assert.ok(!fs.readFileSync(ledger, "utf8").includes("dev-x"), "dev phase must not burn a change id");
});

test("EVPL-8 --reissue emits only the job ids still missing for the same run, logs it, and is refused for a change id never emitted", () => {
  const tasks = [...T(["d1"]), ...T(["h1", "h2", "h3"], "heldout")];
  const s = mkSuite({ tasks, runs: 1 });
  const run = runDir(s, "c1"), base = ["--suite", s.suite, "--phase", "heldout", "--change", "c1"];
  ok(pipe(s.root, ["freeze", "--suite", s.suite]));
  ok(pipe(s.root, ["jobs", ...base, "--stage", "gen", "--run", run]));
  const g = jobsOf(run, "gen");
  assert.equal(g.length, 6);
  const missing = [g[1].id, g[4].id];
  answerGen(run, TOK, (j) => !missing.includes(j.id));
  const out = path.join(s.root, "reissue-jobs");
  ok(pipe(s.root, ["jobs", ...base, "--stage", "gen", "--run", run, "--reissue", "--out", out]), "reissue");
  const ids = fs.readdirSync(out).filter((f) => f.endsWith(".json")).map((f) => rd(path.join(out, f)).id).sort();
  assert.deepEqual(ids, [...missing].sort());
  assert.match(fs.readFileSync(path.join(s.root, "evals/suites/demo.ledger.json"), "utf8"), /reissue/);
  const never = pipe(s.root, ["jobs", "--suite", s.suite, "--phase", "heldout", "--change", "c9", "--stage", "gen", "--run", path.join(s.root, "evals/runs/demo/c9"), "--reissue", "--out", path.join(s.root, "r9")]);
  assert.equal(never.code, 1, never.all);
});

// ---------- EVPL-9 splits
test("EVPL-9 dev jobs come from the 5 dev tasks only and held-out jobs from the 3 held-out tasks only", () => {
  const tasks = [...T(["d1", "d2", "d3", "d4", "d5"]), ...T(["h1", "h2", "h3"], "heldout")];
  const s = mkSuite({ tasks, runs: 1 });
  ok(pipe(s.root, ["freeze", "--suite", s.suite]));
  const d = path.join(s.root, "evals/runs/demo/dev"), h = path.join(s.root, "evals/runs/demo/held");
  ok(pipe(s.root, ["jobs", "--suite", s.suite, "--phase", "dev", "--change", "cd", "--stage", "gen", "--run", d]));
  ok(pipe(s.root, ["jobs", "--suite", s.suite, "--phase", "heldout", "--change", "ch", "--stage", "gen", "--run", h]));
  assert.deepEqual([...new Set(jobsOf(d, "gen").map((j) => j.task))].sort(), ["d1", "d2", "d3", "d4", "d5"]);
  assert.deepEqual([...new Set(jobsOf(h, "gen").map((j) => j.task))].sort(), ["h1", "h2", "h3"]);
});

test("EVPL-9 held-out jobs for a suite with no held-out tasks exit 1, write nothing and burn no change id", () => {
  const s = mkSuite({ tasks: T(["d1", "d2"]), runs: 1 });
  ok(pipe(s.root, ["freeze", "--suite", s.suite]));
  const run = path.join(s.root, "evals/runs/demo/held");
  const r = pipe(s.root, ["jobs", "--suite", s.suite, "--phase", "heldout", "--change", "ch", "--stage", "gen", "--run", run]);
  assert.equal(r.code, 1, r.all);
  assert.match(r.all, /held-?out/i);
  assert.equal(jobsOf(run).length, 0);
  const ledger = path.join(s.root, "evals/suites/demo.ledger.json");
  assert.ok(!fs.existsSync(ledger) || !fs.readFileSync(ledger, "utf8").includes("ch"));
});

// ---------- EVPL-10 pairwise report == protocol
test("EVPL-10 fixture P: report --json pairs 9/3/3 equal eval-protocol's on the same run.json; sign p 0.625, Wilson 0.30-0.95, flips 1/15, not proven", () => {
  const s = driveP();
  const runJson = path.join(s.run, "run.json");
  assert.equal(proto(["check-run", runJson]).code, 0, proto(["check-run", runJson]).all);
  const rep = ok(pipe(s.root, ["report", "--suite", s.suite, "--json"]), "report --json");
  const j = JSON.parse(rep.out);
  const c = findObj(j, ["wins", "losses", "ties"]);
  assert.ok(c, "no wins/losses/ties in " + rep.out);
  assert.deepEqual([c.wins, c.losses, c.ties], [9, 3, 3]);
  const pj = JSON.parse(proto(["report", runJson, "--json"]).out);
  const pc = findObj(pj, ["wins", "losses", "ties"]);
  assert.deepEqual([c.wins, c.losses, c.ties], [pc.wins, pc.losses, pc.ties], "must equal eval-protocol report on the same file");
  const t = ok(pipe(s.root, ["report", "--suite", s.suite])).out;
  assert.match(lineWith(t, /sign/i), /0\.625/, t);
  const w = nums(lineWith(t, /wilson/i));
  assert.ok(w.some((x) => near(x, 0.30, 0.01)) && w.some((x) => near(x, 0.95, 0.01)), "wilson line: " + lineWith(t, /wilson/i));
  assert.match(lineWith(t, /flip/i), /1\/15/);
  assert.match(t, /not proven/);
  assert.doesNotMatch(t, /edge shown/);
  assert.match(t, /pairs are not independent/);
});

test("EVPL-10 the pipeline imports the protocol functions and does not define its own signP, wilson or pair verdict logic", () => {
  assert.ok(fs.existsSync(TOOL), "missing tools/eval-pipeline.mjs");
  const src = fs.readFileSync(TOOL, "utf8");
  assert.match(src, /import[^;]*from\s*["'][^"']*eval-protocol\.mjs["']/s, "must import from eval-protocol.mjs");
  assert.match(src, /import[^;]*\b(signP|wilson)\b[^;]*studio-scorecard\.mjs/s, "must import signP and wilson from studio-scorecard.mjs");
  assert.doesNotMatch(src, /function\s+(signP|wilson|pairVerdict|buildReport|checkRun)\b|const\s+(signP|wilson|pairVerdict|buildReport|checkRun)\s*=/, "protocol functions must be imported, not copied");
});

// ---------- EVPL-11 cases report
test("EVPL-11 fixture C1: wins 9, losses 1, both-pass 1, both-fail 1, sign p 0.021, Wilson 0.60-0.98, noisy c9 and c11, edge shown, design effect not measured", () => {
  const s = driveC();
  const runJson = path.join(s.run, "run.json");
  assert.equal(proto(["check-run", runJson]).code, 0, proto(["check-run", runJson]).all);
  const rep = ok(pipe(s.root, ["report", "--suite", s.suite, "--json"]));
  const j = JSON.parse(rep.out);
  const c = findObj(j, ["wins", "losses", "both_pass", "both_fail"]);
  assert.ok(c, "no object with wins/losses/both_pass/both_fail in " + rep.out);
  assert.deepEqual([c.wins, c.losses, c.both_pass, c.both_fail], [9, 1, 1, 1]);
  assert.ok(near(findKey(j, "sign_p"), 0.021, 0.002), "sign_p " + findKey(j, "sign_p"));
  const [lo, hi] = bounds(findKey(j, "wilson"));
  assert.ok(near(lo, 0.60, 0.01) && near(hi, 0.98, 0.01), `wilson ${lo} ${hi}`);
  assert.deepEqual([...findKey(j, "noisy")].sort(), ["c11", "c9"]);
  assert.match(JSON.stringify(j), /edge shown/);
  assert.equal(findKey(j, "design_effect"), "not measured");
  const t = ok(pipe(s.root, ["report", "--suite", s.suite])).out;
  assert.match(lineWith(t, /sign/i), /0\.02\d/, t);
  const nl = lineWith(t, /noisy/i);
  assert.ok(/c9/.test(nl) && /c11/.test(nl) && /2 of 12/.test(nl), "noisy line: " + nl);
  assert.match(t, /edge shown/);
  assert.match(lineWith(t, /design effect/i), /not measured/);
});

// ---------- EVPL-12 cases thresholds
test("EVPL-12 only the first 9 cases of C1 give not proven because there are 9 cases", () => {
  const nine = Object.fromEntries(Object.entries(C1).slice(0, 9));
  const s = driveC(nine);
  const t = ok(pipe(s.root, ["report", "--suite", s.suite])).out;
  assert.match(t, /not proven/);
  assert.doesNotMatch(t, /edge shown/);
});

test("EVPL-12 12 cases with 5 wins and 5 losses give sign p 1.0 and not proven", () => {
  const table = { w1: [3, 0], w2: [3, 0], w3: [3, 0], w4: [3, 0], w5: [3, 0], l1: [0, 3], l2: [0, 3], l3: [0, 3], l4: [0, 3], l5: [0, 3], b1: [3, 3], b2: [0, 0] };
  const s = driveC(table);
  const j = JSON.parse(ok(pipe(s.root, ["report", "--suite", s.suite, "--json"])).out);
  const c = findObj(j, ["wins", "losses", "both_pass", "both_fail"]);
  assert.deepEqual([c.wins, c.losses], [5, 5]);
  assert.equal(findKey(j, "sign_p"), 1);
  const t = ok(pipe(s.root, ["report", "--suite", s.suite])).out;
  assert.match(t, /not proven/);
  assert.doesNotMatch(t, /edge shown/);
});

// ---------- EVPL-13 design effect
test("EVPL-13 plain-rules passing the same cases as the agent: design effect not proven with 0 wins and 0 losses, edge over plain may come from the rules alone", () => {
  const s = driveC(C1, { arms: ["agent", "plain", "plain-rules"] });
  const j = JSON.parse(ok(pipe(s.root, ["report", "--suite", s.suite, "--json"])).out);
  const de = findKey(j, "design_effect");
  assert.ok(de && typeof de === "object", "design_effect must be an object when a plain-rules arm exists: " + JSON.stringify(de));
  assert.equal(de.wins, 0);
  assert.equal(de.losses, 0);
  assert.match(String(de.verdict), /not proven/);
  const t = ok(pipe(s.root, ["report", "--suite", s.suite])).out;
  assert.match(lineWith(t, /design effect/i), /not proven/);
  assert.match(t, /may come from the rules alone/i);
  assert.match(t, /edge shown/, "agent vs plain verdict is still reported");
});

// ---------- EVPL-14 calibrate
test("EVPL-14 fixture K1: 20 marked pairs give agreement 0.90, kappa 0.80, n 20, claim_ok true", () => {
  const sr = sheetRun();
  const { r, cal } = calibrateWith(sr, K1_MARKS);
  ok(r, "calibrate");
  assert.ok(cal, "calibration.json missing");
  assert.equal(cal.n, 20);
  assert.ok(near(cal.agreement, 0.9, 0.005), "agreement " + cal.agreement);
  assert.ok(near(cal.kappa, 0.8, 0.005), "kappa " + cal.kappa);
  assert.equal(cal.claim_ok, true);
  assert.match(lineWith(r.out, /agreement/i), /0\.90?\b/);
  assert.match(lineWith(r.out, /kappa/i), /0\.80?\b/);
  assert.match(r.out, /\bn\s*[=:]?\s*20\b/);
});

test("EVPL-14 K1 cut to 19 marked pairs: claim_ok false, reason fewer than 20 marked pairs", () => {
  const sr = sheetRun();
  const { r, cal } = calibrateWith(sr, K1_MARKS, [1]);
  ok(r, "calibrate");
  assert.equal(cal.n, 19);
  assert.equal(cal.claim_ok, false);
  assert.match(cal.reason, /fewer than 20 marked pairs/);
  assert.match(r.out, /fewer than 20 marked pairs/);
});

test("EVPL-14 20 pairs with agreement 0.60 and kappa 0.20: claim_ok false, reason kappa below 0.6", () => {
  const sr = sheetRun();
  const { r, cal } = calibrateWith(sr, K_BAD_MARKS);
  ok(r, "calibrate");
  assert.ok(near(cal.agreement, 0.6, 0.005) && near(cal.kappa, 0.2, 0.005), JSON.stringify(cal));
  assert.equal(cal.claim_ok, false);
  assert.match(cal.reason, /kappa below 0\.6/);
});

test("EVPL-14 all marks identical: kappa prints undefined and claim_ok is false", () => {
  const sr = sheetRun(() => "a");
  const { r, cal } = calibrateWith(sr, () => "agent");
  ok(r, "calibrate");
  assert.equal(cal.kappa, "undefined");
  assert.equal(cal.claim_ok, false);
  assert.match(lineWith(r.out, /kappa/i), /undefined/);
});

// ---------- EVPL-15 claim gate
test("EVPL-15 report --claim exits 1 with the reason and no verdict line when claim_ok is false or calibration is missing; exits 0 with claim_ok true and edge shown", () => {
  const s = driveC();
  const cal = path.join(s.root, "evals/suites/demo.calibration.json");
  const plain = ok(pipe(s.root, ["report", "--suite", s.suite]));
  assert.match(plain.out, /edge shown/, "plain report still shows the verdict");
  const none = pipe(s.root, ["report", "--suite", s.suite, "--claim"]);
  assert.equal(none.code, 1, none.all);
  assert.match(none.all, /calibrat/i);
  assert.doesNotMatch(none.all, /edge shown|not proven|verdict/i);
  wr(cal, { n: 20, agreement: 0.6, kappa: 0.2, claim_ok: false, reason: "kappa below 0.6" });
  const no = pipe(s.root, ["report", "--suite", s.suite, "--claim"]);
  assert.equal(no.code, 1, no.all);
  assert.match(no.all, /kappa below 0\.6/);
  assert.doesNotMatch(no.all, /edge shown|not proven|verdict/i);
  wr(cal, { n: 20, agreement: 0.9, kappa: 0.8, claim_ok: true });
  const yes = pipe(s.root, ["report", "--suite", s.suite, "--claim"]);
  assert.equal(yes.code, 0, yes.all);
  assert.match(yes.out, /edge shown/);
});

// ---------- EVPL-16 sheet and key-add
test("EVPL-16 sheet hides the arms and seals the map; key-add stores the arm behind label A; unknown id writes nothing; re-mark needs --replace and keeps history", () => {
  const sr = sheetRun();
  const sheetText = fs.readFileSync(sr.sheetFile, "utf8");
  assert.ok(!/agent|plain/.test(sheetText), "sheet must not name an arm");
  assert.ok(!sheetText.includes("[spec:"), "sheet outputs must be stripped");
  assert.equal(sr.pairs.length, 20);
  assert.ok(sr.pairs.some((p) => p.id === "p-03") && sr.pairs.some((p) => p.id === "p-04"));
  const map = path.join(sr.run, "sheet-map.json");
  assert.ok(fs.existsSync(map), "missing sheet-map.json");
  assert.ok(/agent/.test(fs.readFileSync(map, "utf8")) && /plain/.test(fs.readFileSync(map, "utf8")));
  const key = path.join(sr.root, "evals/suites/demo.key.json");
  const p3 = sr.pairs.find((p) => p.id === "p-03");
  ok(pipe(sr.root, ["key-add", "--suite", sr.suite, "--run", sr.run, "--marks", "p-03=A,p-04=tie"]), "key-add");
  let k = rd(key);
  assert.equal(k.marks["p-03"].arm, p3.a.arm, "label A must resolve to the arm it hid");
  assert.equal(k.marks["p-04"].arm, "tie");
  const before = fs.readFileSync(key);
  const unk = pipe(sr.root, ["key-add", "--suite", sr.suite, "--run", sr.run, "--marks", "p-05=A,p-99=B"]);
  assert.equal(unk.code, 1, unk.all);
  assert.match(unk.all, /p-99/);
  assert.deepEqual(fs.readFileSync(key), before, "an unknown pair id must write nothing, not even the valid mark");
  const re = pipe(sr.root, ["key-add", "--suite", sr.suite, "--run", sr.run, "--marks", "p-03=B"]);
  assert.equal(re.code, 1, re.all);
  assert.match(re.all, /p-03/);
  assert.deepEqual(fs.readFileSync(key), before);
  ok(pipe(sr.root, ["key-add", "--suite", sr.suite, "--run", sr.run, "--marks", "p-03=B", "--replace"]), "replace");
  k = rd(key);
  assert.equal(k.marks["p-03"].arm, p3.b.arm);
  assert.ok(JSON.stringify(k.marks["p-03"].history).includes(p3.a.arm), "history must keep the old mark");
});

// ---------- EVPL-17 tokens and header
test("EVPL-17 agent 90000 and plain 30000 tokens with 9 pair wins: tokens per arm and cost per win 10000; header names models, runs, votes and change id", () => {
  const s = driveP({ tokens: { agent: 6000, plain: 2000 }, change: "chg-17" });
  const t = ok(pipe(s.root, ["report", "--suite", s.suite])).out;
  const tl = t.split("\n").filter((l) => /token/i.test(l)).join("\n");
  assert.match(tl, /90,?000/); assert.match(tl, /30,?000/);
  assert.match(lineWith(t, /cost per win/i), /10,?000\b/);
  assert.match(t, /grader model[^\n]*model-grader-9/i);
  assert.match(t, /agent model[^\n]*model-alpha-1/i);
  assert.match(t, /runs?[^\n]*\b3\b/i);
  assert.match(t, /votes?[^\n]*\b3\b/i);
  assert.ok(t.includes("chg-17"), "change id missing");
});

test("EVPL-17 tokens 'not measured' print not measured on the cost per win line and never a number", () => {
  const s = driveP({ tokens: "not measured" });
  const t = ok(pipe(s.root, ["report", "--suite", s.suite])).out;
  const l = lineWith(t, /cost per win/i);
  assert.match(l, /not measured/);
  assert.doesNotMatch(l, /\d/);
  const run = rd(path.join(s.run, "run.json"));
  assert.equal(run.arms.agent.tokens, "not measured");
  assert.equal(proto(["check-run", path.join(s.run, "run.json")]).code, 0);
});

// ---------- EVPL-18 legacy v1
test("EVPL-18 a v1 run under the suite prints its stored tally under the v1 label with no derived verdict, flip rate or interval, and below the v2 runs", () => {
  const s = driveP({ change: "chg-v2" });
  const legacy = path.join(s.root, "evals/runs/demo/2026-11-24-legacy/results.json");
  fs.mkdirSync(path.dirname(legacy), { recursive: true });
  if (fs.existsSync(REAL_V1)) fs.copyFileSync(REAL_V1, legacy);
  else wr(legacy, { schema: 1, tally: { agent: 10, plain: 5 }, per_prompt: {} });
  const before = fs.readFileSync(legacy);
  const t = ok(pipe(s.root, ["report", "--suite", s.suite])).out;
  const label = "v1: single vote, order unknown, not recomputed";
  const at = t.indexOf(label);
  assert.ok(at >= 0, "missing the v1 label in:\n" + t);
  assert.ok(t.indexOf("chg-v2") >= 0 && t.indexOf("chg-v2") < at, "v2 runs must be listed above the v1 section");
  const v1 = t.slice(at);
  assert.match(v1, /\b10\b/); assert.match(v1, /\b5\b/);
  assert.doesNotMatch(v1, /wilson|sign p|edge shown|not proven|pairs are not independent/i);
  for (const l of v1.split("\n").filter((x) => /flip/i.test(x))) assert.match(l, /not available/i, "v1 flip line must not carry a number: " + l);
  assert.deepEqual(fs.readFileSync(legacy), before, "report must not touch the legacy file");
});
