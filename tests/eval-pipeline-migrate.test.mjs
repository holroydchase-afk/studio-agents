// Failing-first tests for P2 of tools/eval-pipeline.mjs (docs/product/SPEC-EVAL-PIPELINE.md, EVPL-19..22, plus the
// "Added design notes": extra named arms and optional per-result tool_calls). Same style as tests/eval-pipeline.test.mjs:
// the tool is spawned with --root DIR and fixtures in a temp dir (EVPL-20/21 read the real repo, read-only).
// Every call goes through pipe(), which asserts tools/eval-pipeline.mjs exists first.
//
// COMMAND SURFACE AND FILE LAYOUTS PINNED BY THESE TESTS (the spec leaves them open; the builder implements these):
//   import-v1 --suite S --run DIR     DIR holds a v1 results.json (any folder under --root). Writes the suite index
//                                     evals/suites/<agent>.index.json and nothing inside DIR. Exit 2 if DIR has no results.json.
//     index entry (found by deep search): {run: <basename>, version: 1 or "v1", tally: {agent, plain}, sha256: <sha256 of results.json>}.
//     report re-hashes results.json: on a mismatch it exits 1 printing "legacy file changed"; otherwise the stored tally is
//     printed under the existing label "v1: single vote, order unknown, not recomputed".
//   tasks --suite S --json            prints the normalized task list [{id, split, text}] after the per-suite adapter
//                                     (prompts.json -> pairwise tasks; the agent-misses case specs -> cases tasks).
//   Real suite configs: evals/suites/staff-pm.json (pairwise, tasks evals/lazy-prompts/prompts.json),
//     evals/suites/staff-pm.cases.json (cases, 55 staff-pm cases: 13 dev, 42 heldout), evals/suites/qa-tdd.json (cases, 40 cases).
//   Arms: besides agent, plain and plain-rules, an arm may be "cross", "orchestrated" or "ablate:<component>" (non-empty
//     component). plain stays required; anything else is still a problem on the "arms" field. Every extra arm is compared
//     against plain only (never against agent). Report text has, per extra arm, a line naming the arm, "vs plain" and
//     "wins N"; report --json for pairwise holds runs[].report.arms["<arm>"].
//   tool_calls: an optional non-negative number on a gen result. run.json arms.<arm>.tool_calls = sum over that arm's gen
//     results, or "not measured" if any result of the arm lacks it. Report prints one line "tool calls: agent 60, plain 15"
//     (the word "not measured" and no number for an arm without data). A non-number tool_calls makes collect exit 1
//     with a problem line naming the job id and tool_calls.
//   reply-checks (staff-pm suites only): collect on a gen stage adds run.json reply_checks, one entry per gen job:
//     {id, dated_next_step, asks, lint_ok_lines, words} computed by eval-protocol's replyChecks on the (stripped) output.
//     Report flags an output with lint_ok_lines > 0 on a line naming "lint-ok" and the job's task; the verdict is unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = path.join(ROOT, "tools", "eval-pipeline.mjs");
const PROTOCOL = path.join(ROOT, "tools", "eval-protocol.mjs");
const SCORE = path.join(ROOT, "tools", "eval-miss-score.mjs");
const REAL_RUN = path.join(ROOT, "evals/lazy-prompts/runs/2026-11-24-fresh-prompts");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "evplm-"));
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const wr = (p, data) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, typeof data === "string" ? data : JSON.stringify(data, null, 1)); return p; };
const rd = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

function pipe(root, args) {
  assert.ok(fs.existsSync(TOOL), "missing tools/eval-pipeline.mjs");
  const r = spawnSync(process.execPath, [TOOL, ...args, "--root", root], { encoding: "utf8", timeout: 120000, cwd: root });
  return { code: r.status, out: r.stdout || "", err: r.stderr || "", all: (r.stdout || "") + (r.stderr || "") };
}
const ok = (r, what = "") => { assert.equal(r.code, 0, `${what} exit ${r.code}\n${r.all}`); return r; };
const lineWith = (text, re) => text.split("\n").find((l) => re.test(l)) || "";
function findKey(v, key) {
  if (v && typeof v === "object") {
    if (!Array.isArray(v) && key in v) return v[key];
    for (const x of Object.values(v)) { const r = findKey(x, key); if (r !== undefined) return r; }
  }
  return undefined;
}
function findObj(v, keys) {
  if (v && typeof v === "object") {
    if (!Array.isArray(v) && keys.every((k) => k in v)) return v;
    for (const x of Object.values(v)) { const r = findObj(x, keys); if (r) return r; }
  }
  return undefined;
}
function folderHash(dir) {
  const out = [];
  const walk = (d) => { for (const f of fs.readdirSync(d).sort()) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : out.push(path.relative(dir, p) + ":" + sha(fs.readFileSync(p))); } };
  walk(dir);
  return out.join("\n");
}

// ---------- fixtures
const T = (ids, split = "dev") => ids.map((id) => ({ id, split, text: `Write about ${id}` }));
function mkSuite({ agent = "demo", kind = "pairwise", tasks, arms = ["agent", "plain"], runs = 3, extra = {} }) {
  const root = tmp();
  wr(path.join(root, `evals/${agent}/tasks.json`), tasks);
  wr(path.join(root, `evals/${agent}/rubric.md`), "Pick the answer that is more useful and honest.\nAnswer A, B or tie.\n");
  const cfg = {
    agent, kind, tasks: `evals/${agent}/tasks.json`, rubric: `evals/${agent}/rubric.md`,
    split: { dev: tasks.filter((t) => t.split === "dev").length, heldout: tasks.filter((t) => t.split === "heldout").length },
    arms, runs, grader_model: "model-grader-9", agent_model: "model-alpha-1",
    key: `evals/suites/${agent}.key.json`, direct: false, strip: [], ...extra,
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
// Output text names task, run and the arm's index in the suite's arm list; never the arm name.
const codeOf = (arms, task, run, arm) => `zq-${task}-${run}-k${arms.indexOf(arm)}`;
const decodeOf = (arms) => (s) => { const m = /zq-([A-Za-z0-9_.]+)-(\d+)-k(\d+)/.exec(s || ""); return m ? { task: m[1], run: Number(m[2]), arm: arms[Number(m[3])] } : null; };

// opts: tokens {arm:n}, toolCalls {arm:n} (omit a key to omit the field), body(job) extra output text
function answerGen(s, run, opts = {}) {
  const tokens = opts.tokens || { agent: 6000, plain: 2000 };
  for (const j of jobsOf(run, "gen")) {
    const res = { id: j.id, model: j.model, input_sha256: j.input_sha256, tokens: tokens[j.arm] ?? 1000, output: codeOf(s.cfg.arms, j.task, j.run, j.arm) + (opts.body ? "\n" + opts.body(j) : "") };
    if (opts.toolCalls && opts.toolCalls[j.arm] !== undefined) res.tool_calls = opts.toolCalls[j.arm];
    wr(path.join(run, "results", `${j.id}.json`), res);
  }
}
// beats: arms that win every pair against plain; every other arm loses every pair.
function answerGradePairwise(s, run, beats) {
  const dec = decodeOf(s.cfg.arms);
  for (const j of jobsOf(run, "grade")) {
    const a = dec(j.outputs.A), b = dec(j.outputs.B);
    const x = a.arm === "plain" ? b : a;
    const winner = beats.includes(x.arm) ? x.arm : "plain";
    wr(path.join(run, "results", `${j.id}.json`), { id: j.id, model: j.model, input_sha256: j.input_sha256, answer: a.arm === winner ? "A" : "B" });
  }
}
function answerGradeCases(run, passes) {
  for (const j of jobsOf(run, "grade")) {
    wr(path.join(run, "results", `${j.id}.json`), { id: j.id, model: j.model, input_sha256: j.input_sha256, answer: passes(j.task, j.arm, j.run) ? "pass" : "fail" });
  }
}
function drive(o) {
  const s = mkSuite(o);
  const change = o.change || "chg1", run = runDir(s, change), base = ["--suite", s.suite];
  ok(pipe(s.root, ["freeze", ...base]), "freeze");
  ok(pipe(s.root, ["jobs", ...base, "--phase", "dev", "--change", change, "--stage", "gen", "--run", run]), "jobs gen");
  answerGen(s, run, o);
  ok(pipe(s.root, ["collect", "--run", run]), "collect gen");
  ok(pipe(s.root, ["jobs", ...base, "--phase", "dev", "--change", change, "--stage", "grade", "--run", run]), "jobs grade");
  if (s.kind === "pairwise") answerGradePairwise(s, run, o.beats || ["agent"]); else answerGradeCases(run, o.passes);
  ok(pipe(s.root, ["collect", "--run", run]), "collect grade");
  return { ...s, run, change };
}
const P5 = ["p1", "p2", "p3", "p4", "p5"];

// ---------- EVPL-19 import-v1
function importFixture() {
  const root = tmp();
  const runName = "2026-11-24-fresh-prompts";
  const dest = path.join(root, "evals/lazy-prompts/runs", runName);
  fs.cpSync(REAL_RUN, dest, { recursive: true });
  const s = mkSuite({ agent: "staff-pm", tasks: T(P5) });
  fs.cpSync(path.join(s.root, "evals"), path.join(root, "evals"), { recursive: true });
  return { root, dest, runName, suite: "evals/suites/staff-pm.json" };
}

test("EVPL-19 import-v1 on the Nov 24 lazy-prompts run records a v1 index entry (tally agent 10, plain 5, sha256, basenames only) and changes nothing in the run folder", () => {
  assert.ok(fs.existsSync(path.join(REAL_RUN, "results.json")), "real v1 run missing from the repo");
  const f = importFixture();
  const before = folderHash(f.dest);
  ok(pipe(f.root, ["import-v1", "--suite", f.suite, "--run", f.dest]), "import-v1");
  assert.equal(folderHash(f.dest), before, "import-v1 must not touch the run folder");
  const idxFile = path.join(f.root, "evals/suites/staff-pm.index.json");
  assert.ok(fs.existsSync(idxFile), "missing evals/suites/staff-pm.index.json");
  const raw = fs.readFileSync(idxFile, "utf8");
  const entry = findObj(JSON.parse(raw), ["tally", "sha256"]);
  assert.ok(entry, "no index entry with tally and sha256:\n" + raw);
  assert.equal(entry.tally.agent, 10);
  assert.equal(entry.tally.plain, 5);
  assert.equal(entry.sha256, sha(fs.readFileSync(path.join(f.dest, "results.json"))));
  assert.ok([1, "v1"].includes(entry.version), "entry must be marked v1");
  assert.equal(entry.run, f.runName);
  assert.ok(!raw.includes(f.root), "index must hold basenames, not full paths");
});

test("EVPL-19 report prints the imported v1 tally under the v1 label; a byte change to results.json makes report exit 1 with 'legacy file changed'", () => {
  const f = importFixture();
  ok(pipe(f.root, ["import-v1", "--suite", f.suite, "--run", f.dest]), "import-v1");
  const good = ok(pipe(f.root, ["report", "--suite", f.suite]), "report before change").out;
  const at = good.indexOf("v1: single vote, order unknown, not recomputed");
  assert.ok(at >= 0, good);
  assert.match(good.slice(at), /\b10\b/);
  assert.match(good.slice(at), /\b5\b/);
  fs.appendFileSync(path.join(f.dest, "results.json"), " ");
  const bad = pipe(f.root, ["report", "--suite", f.suite]);
  assert.equal(bad.code, 1, bad.all);
  assert.match(bad.all, /legacy file changed/);
  assert.ok(!bad.all.includes(f.root), "no full path in output");
});

test("EVPL-19 import-v1 on a folder with no results.json exits 2 and writes no index", () => {
  const f = importFixture();
  const empty = path.join(f.root, "evals/lazy-prompts/runs/empty");
  fs.mkdirSync(empty, { recursive: true });
  const r = pipe(f.root, ["import-v1", "--suite", f.suite, "--run", empty]);
  assert.equal(r.code, 2, r.all);
  assert.doesNotMatch(r.all, /usage:/, "must be a specific no-results.json message, not the generic usage line");
  assert.match(r.all, /results\.json/);
  assert.ok(!fs.existsSync(path.join(f.root, "evals/suites/staff-pm.index.json")));
});

// ---------- EVPL-20 staff-pm suites over the existing files
test("EVPL-20 staff-pm.json: check-suite exits 0, tasks are the prompts in evals/lazy-prompts/prompts.json with their splits kept", () => {
  const c = ok(pipe(ROOT, ["check-suite", "evals/suites/staff-pm.json"]), "check-suite staff-pm.json");
  assert.ok(!c.all.includes(ROOT), "basenames only");
  const cfg = rd(path.join(ROOT, "evals/suites/staff-pm.json"));
  assert.equal(cfg.kind, "pairwise");
  assert.equal(cfg.tasks, "evals/lazy-prompts/prompts.json");
  const want = rd(path.join(ROOT, "evals/lazy-prompts/prompts.json"));
  const got = JSON.parse(ok(pipe(ROOT, ["tasks", "--suite", "evals/suites/staff-pm.json", "--json"]), "tasks").out);
  assert.deepEqual(got.map((t) => [t.id, t.split]), want.map((t) => [t.id, t.split]));
  assert.ok(got.every((t) => typeof t.text === "string" && t.text.length > 0));
  assert.equal(got.find((t) => t.id === want[0].id).text, want[0].prompt);
});

test("EVPL-20 staff-pm.cases.json: check-suite exits 0, tasks equal the staff-pm cases in evals/agent-misses, dev plus heldout equal the total", async () => {
  ok(pipe(ROOT, ["check-suite", "evals/suites/staff-pm.cases.json"]), "check-suite staff-pm.cases.json");
  const cfg = rd(path.join(ROOT, "evals/suites/staff-pm.cases.json"));
  assert.equal(cfg.kind, "cases");
  const { PM_CASES } = await import(pathToFileURL(path.join(ROOT, "evals/agent-misses/staff-pm-cases.mjs")).href);
  const got = JSON.parse(ok(pipe(ROOT, ["tasks", "--suite", "evals/suites/staff-pm.cases.json", "--json"]), "tasks").out);
  assert.equal(got.length, PM_CASES.length);
  const dev = got.filter((t) => t.split === "dev").length, held = got.filter((t) => t.split === "heldout").length;
  assert.equal(dev + held, PM_CASES.length);
  assert.equal(dev, PM_CASES.filter((c) => c.split === "dev").length);
  for (const c of PM_CASES) assert.ok(got.some((t) => t.id.endsWith(c.id) && t.split === c.split), `case ${c.id} missing or wrong split`);
  assert.deepEqual(cfg.split, { dev, heldout: held });
});

// ---------- EVPL-21 qa-tdd suite and the cross arm
test("EVPL-21 qa-tdd.json: check-suite exits 0 and its task count equals the qa-tdd cases in evals/agent-misses", async () => {
  ok(pipe(ROOT, ["check-suite", "evals/suites/qa-tdd.json"]), "check-suite qa-tdd.json");
  const cfg = rd(path.join(ROOT, "evals/suites/qa-tdd.json"));
  assert.equal(cfg.kind, "cases");
  assert.ok(cfg.arms.includes("cross"), "the cross arm from old runs must be a configured arm");
  const { QA_CASES } = await import(pathToFileURL(path.join(ROOT, "evals/agent-misses/qa-tdd-cases.mjs")).href);
  const got = JSON.parse(ok(pipe(ROOT, ["tasks", "--suite", "evals/suites/qa-tdd.json", "--json"]), "tasks").out);
  assert.equal(got.length, QA_CASES.length);
  for (const c of QA_CASES) assert.ok(got.some((t) => t.id.endsWith(c.id) && t.split === c.split), `case ${c.id} missing or wrong split`);
});

test("EVPL-21 eval-miss-score --check-all still exits 0 unchanged (guard: already green before the build)", () => {
  const r = spawnSync(process.execPath, [SCORE, "--check-all"], { encoding: "utf8", timeout: 60000 });
  assert.equal(r.status, 0, (r.stdout || "") + (r.stderr || ""));
});

test("EVPL-21 check-suite accepts cross, orchestrated and ablate:<component> as extra arms; unknown arms, empty ablate and a missing plain are still problems on arms", () => {
  for (const arms of [["agent", "plain", "cross"], ["agent", "plain", "orchestrated"], ["agent", "plain", "ablate:job-block", "ablate:rubric"]]) {
    const s = mkSuite({ kind: "cases", tasks: T(["c1"]), arms });
    ok(pipe(s.root, ["check-suite", s.suite]), `arms ${arms.join(",")}`);
  }
  for (const arms of [["agent", "plain", "bogus"], ["agent", "plain", "ablate:"], ["agent", "cross"]]) {
    const s = mkSuite({ kind: "cases", tasks: T(["c1"]), arms });
    const r = pipe(s.root, ["check-suite", s.suite]);
    assert.equal(r.code, 1, `${arms.join(",")}\n${r.all}`);
    assert.match(r.all, /arms/);
    assert.equal(r.all.split("\n").filter((l) => l.trim()).length, 1, r.all);
  }
});

// ---------- extra arms reported against plain only
test("extra arms pairwise: ablate:job-block and orchestrated get 3 x 15 x 2 x 3 grading jobs, every pair holds plain, and the report lists each against plain only", () => {
  const arms = ["agent", "plain", "ablate:job-block", "orchestrated"];
  const s = drive({ tasks: T(P5), arms, beats: ["agent", "ablate:job-block"] });
  assert.equal(jobsOf(s.run, "gen").length, 5 * 4 * 3);
  const grade = jobsOf(s.run, "grade");
  assert.equal(grade.length, 15 * 3 * 2 * 3);
  const dec = decodeOf(arms);
  for (const j of grade) assert.ok(dec(j.outputs.A).arm === "plain" || dec(j.outputs.B).arm === "plain", "a pair that does not hold plain");
  const t = ok(pipe(s.root, ["report", "--suite", s.suite])).out;
  assert.match(lineWith(t, /ablate:job-block[^\n]*vs plain/), /wins 15/);
  assert.match(lineWith(t, /orchestrated[^\n]*vs plain/), /losses 15/);
  assert.match(lineWith(t, /\bagent[^\n]*vs plain/), /wins 15/);
  assert.doesNotMatch(t, /vs agent|agent vs (ablate|orchestrated)/i, "extra arms are compared with plain only");
  const j = JSON.parse(ok(pipe(s.root, ["report", "--suite", s.suite, "--json"])).out);
  const armsJson = findKey(j, "arms");
  for (const a of ["agent", "ablate:job-block", "orchestrated"]) assert.ok(armsJson && a in armsJson, `report --json lacks arm ${a}`);
  const protocol = spawnSync(process.execPath, [PROTOCOL, "check-run", path.join(s.run, "run.json")], { encoding: "utf8" });
  assert.equal(protocol.status, 0, "eval-protocol check-run must accept the extra arm names\n" + protocol.stdout + protocol.stderr);
});

test("extra arms cases: cross arm is counted against plain only; agent vs plain numbers are unchanged by it", () => {
  const ids = Array.from({ length: 12 }, (_, i) => `c${i + 1}`);
  const passes = (task, arm) => (arm === "plain" ? false : arm === "agent" ? true : Number(task.slice(1)) <= 4);
  const s = drive({ kind: "cases", tasks: T(ids), arms: ["agent", "plain", "cross"], passes });
  const t = ok(pipe(s.root, ["report", "--suite", s.suite])).out;
  assert.match(lineWith(t, /cross[^\n]*vs plain/), /wins 4/);
  assert.match(lineWith(t, /agent[^\n]*vs plain|wins 12/), /wins 12/);
  assert.doesNotMatch(t, /cross vs agent|agent vs cross/i);
  const noCross = drive({ kind: "cases", tasks: T(ids), arms: ["agent", "plain"], passes });
  const t2 = ok(pipe(noCross.root, ["report", "--suite", noCross.suite])).out;
  assert.equal(lineWith(t, /sign test/), lineWith(t2, /sign test/));
});

// ---------- tool_calls per arm
test("tool_calls: summed per arm into run.json, check-run still accepts it, and the report prints tool calls per arm beside tokens", () => {
  const s = drive({ tasks: T(P5), toolCalls: { agent: 4, plain: 1 } });
  const run = rd(path.join(s.run, "run.json"));
  assert.equal(run.arms.agent.tool_calls, 60);
  assert.equal(run.arms.plain.tool_calls, 15);
  const p = spawnSync(process.execPath, [PROTOCOL, "check-run", path.join(s.run, "run.json")], { encoding: "utf8" });
  assert.equal(p.status, 0, p.stdout + p.stderr);
  const t = ok(pipe(s.root, ["report", "--suite", s.suite])).out;
  const l = lineWith(t, /tool.?calls/i);
  assert.match(l, /agent\D*60/);
  assert.match(l, /plain\D*15/);
  assert.match(t, /tokens?:[^\n]*90,?000/i, "tokens still reported");
});

test("tool_calls absent: 'not measured' in run.json and on the report line, never a number", () => {
  const s = drive({ tasks: T(P5) });
  const run = rd(path.join(s.run, "run.json"));
  assert.equal(run.arms.agent.tool_calls, "not measured");
  assert.equal(run.arms.plain.tool_calls, "not measured");
  const l = lineWith(ok(pipe(s.root, ["report", "--suite", s.suite])).out, /tool.?calls/i);
  assert.match(l, /not measured/);
  assert.doesNotMatch(l.replace(/tool.?calls/i, ""), /\d/);
});

test("tool_calls measured for one arm only: the other arm says not measured and the sum is never guessed", () => {
  const s = drive({ tasks: T(P5), toolCalls: { agent: 2 } });
  const run = rd(path.join(s.run, "run.json"));
  assert.equal(run.arms.agent.tool_calls, 30);
  assert.equal(run.arms.plain.tool_calls, "not measured");
  const l = lineWith(ok(pipe(s.root, ["report", "--suite", s.suite])).out, /tool.?calls/i);
  assert.match(l, /agent\D*30/);
  assert.match(l, /plain\D*not measured/);
});

test("tool_calls 'many' on one result: collect exits 1 with a problem line naming the job id and tool_calls", () => {
  const s = mkSuite({ tasks: T(["p1", "p2"]) });
  const run = runDir(s, "chg-bad");
  ok(pipe(s.root, ["freeze", "--suite", s.suite]));
  ok(pipe(s.root, ["jobs", "--suite", s.suite, "--phase", "dev", "--change", "chg-bad", "--stage", "gen", "--run", run]));
  answerGen(s, run, { toolCalls: { agent: 3, plain: 1 } });
  const id = jobsOf(run, "gen")[0].id;
  const f = path.join(run, "results", `${id}.json`);
  wr(f, { ...rd(f), tool_calls: "many" });
  const r = pipe(s.root, ["collect", "--run", run]);
  assert.equal(r.code, 1, r.all);
  const line = r.all.split("\n").find((l) => l.includes(id));
  assert.ok(line && /tool_calls/.test(line), r.all);
});

// ---------- EVPL-22 reply-checks wired into collect for staff-pm
const REPLY = (j) => (j.arm === "agent" && j.task === "p2" && j.run === 1
  ? "Here is the plan.\nNext: ship the draft by 2026-12-01.\nlint-ok: banned-word reason"
  : "Short reply for you. Should we start now?");
test("EVPL-22 collect on a staff-pm pairwise run stores reply-checks counts per generation output in run.json", async () => {
  const { replyChecks } = await import(pathToFileURL(PROTOCOL).href);
  const s = drive({ agent: "staff-pm", tasks: T(P5), body: REPLY });
  const run = rd(path.join(s.run, "run.json"));
  const rc = run.reply_checks;
  assert.ok(rc, "run.json has no reply_checks");
  const list = Array.isArray(rc) ? rc : Object.entries(rc).map(([id, v]) => ({ id, ...v }));
  assert.equal(list.length, 5 * 2 * 3, "one entry per generation job");
  for (const e of list) for (const k of ["dated_next_step", "asks", "lint_ok_lines", "words"]) assert.ok(k in e, `entry ${e.id} lacks ${k}`);
  const lintJob = jobsOf(s.run, "gen").find((j) => j.arm === "agent" && j.task === "p2" && j.run === 1);
  const mine = list.find((e) => e.id === lintJob.id);
  assert.ok(mine, "entry for the lint job missing");
  const want = replyChecks(rd(path.join(s.run, "results", `${lintJob.id}.json`)).output);
  assert.equal(mine.lint_ok_lines, 1);
  assert.equal(mine.dated_next_step, true);
  assert.equal(mine.words, want.words);
  assert.equal(list.filter((e) => e.lint_ok_lines > 0).length, 1);
  assert.ok(!fs.readFileSync(path.join(s.run, "run.json"), "utf8").includes("ship the draft"), "run.json must hold counts, not reply text");
});

test("EVPL-22 a reply with lint_ok_lines 1 is flagged in the report and the verdict does not change", () => {
  const flagged = drive({ agent: "staff-pm", tasks: T(P5), body: REPLY });
  const clean = drive({ agent: "staff-pm", tasks: T(P5), body: () => "Short reply for you. Should we start now?" });
  const tf = ok(pipe(flagged.root, ["report", "--suite", flagged.suite])).out;
  const l = lineWith(tf, /lint-ok/i);
  assert.ok(l, "report has no lint-ok flag line:\n" + tf);
  assert.match(l, /p2/);
  const tc = ok(pipe(clean.root, ["report", "--suite", clean.suite])).out;
  assert.doesNotMatch(tc, /lint-ok/i, "no flag when no reply has a lint-ok line");
  const arms = (root, suite) => JSON.stringify(findKey(JSON.parse(ok(pipe(root, ["report", "--suite", suite, "--json"])).out), "arms"));
  assert.equal(arms(flagged.root, flagged.suite), arms(clean.root, clean.suite), "verdict and counts must not depend on reply-checks");
});

test("EVPL-22 reply-checks are for staff-pm only: a demo suite run has no reply_checks in run.json", () => {
  const s = drive({ agent: "demo", tasks: T(P5), body: REPLY });
  assert.equal(rd(path.join(s.run, "run.json")).reply_checks, undefined);
});
