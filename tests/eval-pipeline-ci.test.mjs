// Failing-first tests for P4 of tools/eval-pipeline.mjs (docs/product/SPEC-EVAL-PIPELINE.md, EVPL-26..29).
// Same style as tests/eval-pipeline-migrate.test.mjs (helpers copied from it).
//
// PINNED BY THESE TESTS (the builder implements these):
//   ci-check [--root DIR]  for every evals/suites/*.json that is a suite config (skip *.frozen.json, *.ledger.json,
//     *.index.json, *.calibration.json, *.key.json, *.tasks.json): check-suite; if <agent>.frozen.json exists, verify;
//     <agent>.ledger.json must be {schema:1, changes:{}}; every evals/runs/<agent>/*/run.json must pass eval-protocol
//     checkRun and its frozen.prompts_sha256 / rubric_sha256 must equal the suite's current tasks and rubric files
//     (else a line "stale run <run folder basename>..."). Success prints "ci-check: N suites ok", exit 0. Any problem:
//     one line per problem on stdout, exit 1, no "ci-check:" ok line. Never writes anything.
//   run-gated  EVAL_API_KEY unset: prints exactly "skipped: no key", exit 0. Set to any text: prints exactly
//     "key present: no model runner is built into this tool yet", exit 0, never prints the key.
//   .github/workflows/eval-pipeline.yml: job A runs `node tools/eval-pipeline.mjs ci-check` and mentions no secrets;
//     job B runs `run-gated` with env EVAL_API_KEY from secrets.EVAL_API_KEY.
//   EVPL-28 reading of "its suite config path": agent-misses/README.md names evals/suites/staff-pm.cases.json and
//     evals/suites/qa-tdd.json (the two suites built from it), not staff-pm.json; stakeholder and ux-build only
//     need the "evals/suites/" prefix plus (ux-build) ux-reviewer.json.
//   EVPL-29: LEAKS is exported by tools/check-story-entry.mjs, so it is imported, not copied.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { LEAKS } from "../tools/check-story-entry.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = path.join(ROOT, "tools", "eval-pipeline.mjs");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "evplc-"));
const wr = (p, data) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, typeof data === "string" ? data : JSON.stringify(data, null, 1)); return p; };
const rd = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

function pipe(root, args, env) {
  assert.ok(fs.existsSync(TOOL), "missing tools/eval-pipeline.mjs");
  const e = { ...process.env, ...(env || {}) };
  if (env === null || (env && env.EVAL_API_KEY === undefined)) delete e.EVAL_API_KEY;
  const r = spawnSync(process.execPath, [TOOL, ...args, "--root", root], { encoding: "utf8", timeout: 120000, cwd: root, env: e });
  return { code: r.status, out: r.stdout || "", err: r.stderr || "", all: (r.stdout || "") + (r.stderr || "") };
}
const ok = (r, what = "") => { assert.equal(r.code, 0, `${what} exit ${r.code}\n${r.all}`); return r; };
const noKey = { EVAL_API_KEY: undefined };

// ---------- fixtures (copied from eval-pipeline-migrate.test.mjs)
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
const codeOf = (arms, task, run, arm) => `zq-${task}-${run}-k${arms.indexOf(arm)}`;
const decodeOf = (arms) => (s) => { const m = /zq-([A-Za-z0-9_.]+)-(\d+)-k(\d+)/.exec(s || ""); return m ? { task: m[1], run: Number(m[2]), arm: arms[Number(m[3])] } : null; };
function answerGen(s, run) {
  const tokens = { agent: 6000, plain: 2000 };
  for (const j of jobsOf(run, "gen")) {
    wr(path.join(run, "results", `${j.id}.json`), { id: j.id, model: j.model, input_sha256: j.input_sha256, tokens: tokens[j.arm] ?? 1000, output: codeOf(s.cfg.arms, j.task, j.run, j.arm) });
  }
}
function answerGradePairwise(s, run) {
  const dec = decodeOf(s.cfg.arms);
  for (const j of jobsOf(run, "grade")) {
    const a = dec(j.outputs.A), b = dec(j.outputs.B);
    const x = a.arm === "plain" ? b : a;
    wr(path.join(run, "results", `${j.id}.json`), { id: j.id, model: j.model, input_sha256: j.input_sha256, answer: a.arm === x.arm ? "A" : "B" });
  }
}
function drive(o) {
  const s = mkSuite(o);
  const change = "chg1", run = runDir(s, change), base = ["--suite", s.suite];
  ok(pipe(s.root, ["freeze", ...base]), "freeze");
  ok(pipe(s.root, ["jobs", ...base, "--phase", "dev", "--change", change, "--stage", "gen", "--run", run]), "jobs gen");
  answerGen(s, run);
  ok(pipe(s.root, ["collect", "--run", run]), "collect gen");
  ok(pipe(s.root, ["jobs", ...base, "--phase", "dev", "--change", change, "--stage", "grade", "--run", run]), "jobs grade");
  answerGradePairwise(s, run);
  ok(pipe(s.root, ["collect", "--run", run]), "collect grade");
  return { ...s, run, change };
}
const P5 = ["p1", "p2", "p3", "p4", "p5"];

// ---------- EVPL-26 ci-check
test("EVPL-26 ci-check on the real repo exits 0 and prints 'ci-check: N suites ok'", () => {
  const r = pipe(ROOT, ["ci-check"]);
  ok(r, "ci-check");
  const m = /^ci-check: (\d+) suites ok$/m.exec(r.out);
  assert.ok(m, `no ok line:\n${r.all}`);
  assert.ok(Number(m[1]) >= 4, `expected at least the 4 real suites, got ${m[1]}`);
});

test("EVPL-26 ci-check on a clean frozen fixture with a run exits 0; non-config files in evals/suites are skipped; nothing is written", () => {
  const s = drive({ tasks: T(P5) });
  for (const f of ["x.frozen.json", "x.index.json", "x.calibration.json", "x.key.json", "x.tasks.json"]) wr(path.join(s.root, "evals/suites", f), f.endsWith("tasks.json") ? [] : {});
  const before = fs.readdirSync(path.join(s.root, "evals/suites")).sort().join();
  const r = ok(pipe(s.root, ["ci-check"]), "ci-check");
  assert.match(r.out, /^ci-check: 1 suites ok$/m);
  assert.equal(fs.readdirSync(path.join(s.root, "evals/suites")).sort().join(), before, "ci-check wrote into evals/suites");
});

test("EVPL-26 (a) a broken suite config exits 1 with a problem line naming the suite and the field", () => {
  const s = mkSuite({ tasks: T(P5) });
  wr(path.join(s.root, s.suite), { ...s.cfg, kind: "triple" });
  const r = pipe(s.root, ["ci-check"]);
  assert.equal(r.code, 1, r.all);
  assert.match(r.out, /demo.*kind|kind.*demo/i);
  assert.doesNotMatch(r.out, /ci-check: \d+ suites ok/);
});

test("EVPL-26 (b) a frozen suite whose prompts changed exits 1 naming tasks.json and 'changed since freeze'", () => {
  const s = mkSuite({ tasks: T(P5) });
  ok(pipe(s.root, ["freeze", "--suite", s.suite]), "freeze");
  wr(path.join(s.root, s.cfg.tasks), T(P5).map((t) => ({ ...t, text: t.text + " (edited)" })));
  const r = pipe(s.root, ["ci-check"]);
  assert.equal(r.code, 1, r.all);
  assert.match(r.out, /tasks\.json.*changed since freeze/);
});

test("EVPL-26 (c) a ledger that is not {schema:1, changes:{}} exits 1 with a line naming the ledger", () => {
  const s = mkSuite({ tasks: T(P5) });
  wr(path.join(s.root, "evals/suites/demo.ledger.json"), { schema: 1, changes: [] });
  const r = pipe(s.root, ["ci-check"]);
  assert.equal(r.code, 1, r.all);
  assert.match(r.out, /ledger/i);
  // and the good shape passes
  wr(path.join(s.root, "evals/suites/demo.ledger.json"), { schema: 1, changes: {} });
  ok(pipe(s.root, ["ci-check"]), "good ledger");
});

test("EVPL-26 (d) a run whose frozen hashes differ from the suite's current files is a 'stale run' line naming the run folder", () => {
  const s = drive({ tasks: T(P5) });
  const rj = path.join(s.run, "run.json");
  const j = rd(rj);
  j.frozen.prompts_sha256 = "a".repeat(64);
  wr(rj, j);
  const r = pipe(s.root, ["ci-check"]);
  assert.equal(r.code, 1, r.all);
  assert.match(r.out, /stale run.*2026-11-25-chg1/);
  // rubric hash too
  const j2 = rd(rj); j2.frozen.prompts_sha256 = rd(path.join(s.root, "evals/suites/demo.frozen.json")).prompts.sha256; j2.frozen.rubric_sha256 = "b".repeat(64);
  wr(rj, j2);
  const r2 = pipe(s.root, ["ci-check"]);
  assert.equal(r2.code, 1, r2.all);
  assert.match(r2.out, /stale run.*2026-11-25-chg1/);
});

test("EVPL-26 a run.json that fails eval-protocol checkRun is a problem line naming the run folder", () => {
  const s = drive({ tasks: T(P5) });
  const rj = path.join(s.run, "run.json");
  const j = rd(rj); delete j.date; wr(rj, j);
  const r = pipe(s.root, ["ci-check"]);
  assert.equal(r.code, 1, r.all);
  assert.match(r.out, /2026-11-25-chg1/);
  assert.match(r.out, /date/);
});

// ---------- EVPL-26 run-gated
test("EVPL-26 run-gated with EVAL_API_KEY unset prints exactly 'skipped: no key' and exits 0", () => {
  const r = ok(pipe(tmp(), ["run-gated"], noKey), "run-gated");
  assert.equal(r.out.trim(), "skipped: no key");
});
test("EVPL-26 run-gated with a key prints 'key present: no model runner is built into this tool yet', exits 0, never prints the key", () => {
  const key = "fixture-not-a-real-key-Zx81Qp";
  const r = ok(pipe(tmp(), ["run-gated"], { EVAL_API_KEY: key }), "run-gated");
  assert.equal(r.out.trim(), "key present: no model runner is built into this tool yet");
  assert.ok(!r.all.includes(key), "the key was printed");
});

// ---------- EVPL-26 workflow (text parse, no YAML library)
function jobBlocks(text) {
  const i = text.search(/^jobs:\s*$/m);
  assert.ok(i >= 0, "no jobs: section");
  const lines = text.slice(i).split("\n").slice(1);
  const jobs = []; let cur = null;
  for (const l of lines) {
    const m = /^  ([A-Za-z0-9_-]+):\s*$/.exec(l);
    if (m) { cur = { name: m[1], text: "" }; jobs.push(cur); } else if (cur) cur.text += l + "\n";
  }
  return jobs;
}
test("EVPL-26 .github/workflows/eval-pipeline.yml has a no-secret ci-check job and a run-gated job with EVAL_API_KEY from secrets", () => {
  const f = ".github/workflows/eval-pipeline.yml";
  assert.ok(fs.existsSync(path.join(ROOT, f)), `missing ${f}`);
  const jobs = jobBlocks(read(f));
  const check = jobs.find((j) => /node tools\/eval-pipeline\.mjs ci-check/.test(j.text));
  const gated = jobs.find((j) => /node tools\/eval-pipeline\.mjs run-gated/.test(j.text));
  assert.ok(check, "no job runs `node tools/eval-pipeline.mjs ci-check`");
  assert.ok(gated, "no job runs `node tools/eval-pipeline.mjs run-gated`");
  assert.notEqual(check.name, gated.name, "the two commands must be separate jobs");
  assert.doesNotMatch(check.text, /secrets\./, "the ci-check job must not use secrets");
  assert.doesNotMatch(check.text, /run-gated/);
  assert.match(gated.text, /EVAL_API_KEY:\s*\$\{\{\s*secrets\.[A-Za-z0-9_]+\s*\}\}/);
  assert.doesNotMatch(read(f), /EVAL_API_KEY:\s*[^$\s]/, "no literal key value");
});

// ---------- EVPL-27 runbook skill
test("EVPL-27 eval-runbook SKILL.md: frontmatter name and description, commands in order, 'one subagent', listed in README Skills", () => {
  const f = "plugins/studio/skills/eval-runbook/SKILL.md";
  assert.ok(fs.existsSync(path.join(ROOT, f)), `missing ${f}`);
  const t = read(f);
  const fm = /^---\n([\s\S]*?)\n---/.exec(t);
  assert.ok(fm, "no frontmatter");
  assert.match(fm[1], /^name:\s*eval-runbook\s*$/m);
  assert.match(fm[1], /^description:\s*\S+/m);
  let at = -1;
  for (const w of ["status", "jobs", "collect", "sheet", "key-add", "calibrate", "report"]) {
    const i = t.indexOf("`" + w + "`", at + 1);
    assert.ok(i > at, `command \`${w}\` missing or out of order (after offset ${at})`);
    at = i;
  }
  assert.ok(t.includes("one subagent"), "must say each job runs as 'one subagent'");
  const skills = read("README.md").split("\n").find((l) => /^Skills/.test(l)) || "";
  assert.ok(skills.includes("`eval-runbook`"), "README Skills paragraph does not list `eval-runbook`");
});

// ---------- EVPL-28 docs
test("EVPL-28 the four eval READMEs name their suite config and say 'old runs stay v1'", () => {
  const want = {
    "evals/lazy-prompts/README.md": ["evals/suites/staff-pm.json"],
    "evals/agent-misses/README.md": ["evals/suites/staff-pm.cases.json", "evals/suites/qa-tdd.json"],
    "evals/stakeholder/README.md": ["evals/suites/"],
    "evals/ux-build/README.md": ["evals/suites/ux-reviewer.json"],
  };
  const bad = [];
  for (const [f, needles] of Object.entries(want)) {
    if (!fs.existsSync(path.join(ROOT, f))) { bad.push(`${f}: missing`); continue; }
    const t = read(f);
    for (const n of needles) if (!t.includes(n)) bad.push(`${f}: no ${n}`);
    if (!t.includes("old runs stay v1")) bad.push(`${f}: no 'old runs stay v1'`);
  }
  assert.deepEqual(bad, []);
});

test("EVPL-28 docs/agent-training-plan.md has a '- 2026-11-25' update-log line for each of Eval pipeline P1, P2, P3, P4", () => {
  const lines = read("docs/agent-training-plan.md").split("\n").filter((l) => l.startsWith("- 2026-11-25"));
  const missing = ["P1", "P2", "P3", "P4"].filter((p) => !lines.some((l) => l.includes(`Eval pipeline ${p}`)));
  assert.deepEqual(missing, [], "no '- 2026-11-25' line mentioning 'Eval pipeline <p>' for these");
});

// ---------- EVPL-29 no paths, no prompt text, no leaks
test("EVPL-29 run.json, report output and calibration hold no temp-root path, no prompt text beyond task ids, 0 LEAKS matches", () => {
  const s = drive({ tasks: T(P5) });
  const sheet = path.join(s.root, "sheet.json");
  ok(pipe(s.root, ["sheet", "--suite", s.suite, "--run", s.run, "--n", "5", "--out", sheet]), "sheet");
  const marks = rd(sheet).pairs.map((p, i) => `${p.id}=${i % 2 ? "A" : "B"}`).join(",");
  ok(pipe(s.root, ["key-add", "--suite", s.suite, "--run", s.run, "--marks", marks]), "key-add");
  ok(pipe(s.root, ["calibrate", "--suite", s.suite, "--run", s.run]), "calibrate");
  const rep = ok(pipe(s.root, ["report", "--suite", s.suite]), "report");
  const repJson = ok(pipe(s.root, ["report", "--suite", s.suite, "--json"]), "report --json");
  const files = {
    "run.json": fs.readFileSync(path.join(s.run, "run.json"), "utf8"),
    "report": rep.out, "report --json": repJson.out,
    "calibration.json": fs.readFileSync(path.join(s.root, "evals/suites/demo.calibration.json"), "utf8"),
  };
  const ledger = path.join(s.root, "evals/suites/demo.ledger.json");
  if (fs.existsSync(ledger)) files["ledger.json"] = fs.readFileSync(ledger, "utf8");
  const real = fs.realpathSync(s.root);
  for (const [name, text] of Object.entries(files)) {
    for (const p of new Set([s.root, real, os.tmpdir(), path.dirname(s.root)])) assert.ok(!text.includes(p), `${name} holds the path ${p}`);
    assert.doesNotMatch(text, /\/home\/|\/Users\/|[A-Za-z]:\\\\/, `${name} holds an absolute path`);
    assert.ok(!text.includes("Write about"), `${name} holds prompt text`);
    assert.ok(!text.includes("Pick the answer that is more useful"), `${name} holds rubric text`);
    for (const [re, what] of LEAKS) assert.ok(!re.test(text), `${name} matches the LEAKS pattern for ${what}`);
  }
  const rj = JSON.parse(files["run.json"]);
  for (const p of rj.pairs) assert.ok(P5.includes(p.prompt), `pair prompt ${p.prompt} is not a task id`);
});
