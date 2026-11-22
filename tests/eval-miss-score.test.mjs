// Regression tests for tools/eval-miss-score.mjs: the rules in its header and the stale-results gate. Temp dirs only.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { problems, render } from "../tools/eval-miss-score.mjs";

const specs = new Map([
  ["qa-tdd-miss-a", { id: "a", agent: "qa-tdd", miss: "XX-Q1", pattern: "p", priority: "P1", split: "dev" }],
  ["qa-tdd-miss-b", { id: "b", agent: "qa-tdd", miss: "XX-Q2", pattern: "p", priority: "P2", split: "heldout" }],
]);
function dirWith(files = ["t.md"]) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "ems-"));
  for (const f of files) fs.writeFileSync(path.join(d, f), "report");
  return d;
}
const ok = (o = {}) => ({ case: "qa-tdd-miss-a", arm: "agent", pass: true, reason: "r", transcript: "t.md", ...o });
const run = (results, phase = "dev") => ({ run: "r1", date: "2026-11-22", phase, results });

test("MISS-S1 a clean dev run has no problems", () => {
  assert.deepEqual(problems(run([ok()]), dirWith(), specs), []);
});
test("MISS-S2 a held-out case in a dev run is rejected", () => {
  assert.ok(problems(run([ok({ case: "qa-tdd-miss-b" })]), dirWith(), specs).some((e) => /heldout case in a dev run/.test(e)));
});
test("MISS-S3 a case scored twice for one arm is rejected", () => {
  assert.ok(problems(run([ok(), ok()]), dirWith(), specs).some((e) => /scored twice/.test(e)));
});
test("MISS-S4 a missing transcript, an unknown case and a non-boolean pass are rejected", () => {
  const e = problems(run([ok({ transcript: "nope.md" }), ok({ case: "qa-tdd-miss-zzz" }), ok({ arm: "plain", pass: "yes" })]), dirWith(), specs);
  assert.ok(e.some((x) => /transcript file missing/.test(x)));
  assert.ok(e.some((x) => /unknown case/.test(x)));
  assert.ok(e.some((x) => /pass must be true or false/.test(x)));
});
test("MISS-S5 render counts passes and lists each case", () => {
  const md = render(run([ok(), ok({ case: "qa-tdd-miss-b", pass: false })]), specs);
  assert.match(md, /All cases \| 1 of 2/);
  assert.match(md, /qa-tdd-miss-a.*pass/);
  assert.match(md, /qa-tdd-miss-b.*FAIL/);
});

// ---- Gap tests added by qa-tdd (red against tools/eval-miss-score.mjs as shipped; the engineer fixes the tool) ----
import { spawnSync } from "node:child_process";
const TOOL = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "tools", "eval-miss-score.mjs");
function cli(args, runsDir) {
  return spawnSync(process.execPath, [TOOL, ...args], { encoding: "utf8", env: { ...process.env, EVAL_MISS_RUNS_DIR: runsDir || os.tmpdir() + "/ems-none" } });
}
function runDir(root, name, json, files = ["t.md"]) {
  const d = path.join(root, name);
  fs.mkdirSync(d, { recursive: true });
  for (const f of files) fs.writeFileSync(path.join(d, f), "report");
  fs.writeFileSync(path.join(d, "results.json"), JSON.stringify(json));
  return d;
}
const realDev = (o = {}) => ({ case: "qa-tdd-miss-weekday-clock", arm: "agent", pass: true, reason: "r", transcript: "t.md", ...o });
const realHeld = (o = {}) => ({ case: "qa-tdd-miss-night-key-utc", arm: "agent", pass: true, reason: "r", transcript: "t.md", ...o });

test("MISS-S6 QA-R1 a transcript path that escapes the run dir is rejected", () => {
  const outside = path.join(os.tmpdir(), "ems-outside.md");
  fs.writeFileSync(outside, "x");
  const d = dirWith();
  assert.ok(problems(run([ok({ transcript: "../ems-outside.md" })], "dev"), d, specs).length > 0, "relative ../ escape accepted");
  assert.ok(problems(run([ok({ transcript: outside })], "dev"), d, specs).length > 0, "absolute path accepted");
});
test("MISS-S7 QA-R2 a null or non-object entry in results is reported, not thrown", () => {
  let e;
  assert.doesNotThrow(() => { e = problems(run([null, "x", ok()]), dirWith(), specs); });
  assert.ok(e.length > 0);
});
test("MISS-S8 QA-R3 a run with zero results is rejected", () => {
  assert.ok(problems(run([]), dirWith(), specs).length > 0);
});
test("MISS-S9 QA-R4 a blank or non-string reason is rejected", () => {
  for (const reason of ["   ", 42, {}]) assert.ok(problems(run([ok({ reason })]), dirWith(), specs).some((x) => /reason/.test(x)), `reason ${JSON.stringify(reason)} accepted`);
});
test("MISS-S10 the stale gate (coverage added, passes): edited results.md or changed results.json fails --check", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ems-root-"));
  const d = runDir(root, "r1", { run: "r1", date: "2026-11-22", phase: "dev", results: [realDev()] });
  assert.equal(cli([d], root).status, 0);
  assert.equal(cli(["--check", d], root).status, 0);
  fs.appendFileSync(path.join(d, "results.md"), "hand edit\n");
  assert.equal(cli(["--check", d], root).status, 1, "hand-edited results.md passed");
  cli([d], root);
  fs.writeFileSync(path.join(d, "results.json"), JSON.stringify({ run: "r1", date: "2026-11-22", phase: "dev", results: [realDev({ pass: false })] }));
  assert.equal(cli(["--check-all"], root).status, 1, "stale results.md passed --check-all");
});
test("MISS-S11 QA-R5 a second held-out run must carry `change` and a new run id", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ems-root-"));
  const a = runDir(root, "h1", { run: "h1", date: "2026-11-22", phase: "heldout", results: [realHeld()] });
  const b = runDir(root, "h2", { run: "h2", date: "2026-11-23", phase: "heldout", results: [realHeld()] });
  cli([a], root); cli([b], root);
  assert.equal(cli(["--check-all"], root).status, 1, "second held-out run without change accepted");
  const c = runDir(root, "h3", { run: "h1", change: "tightened rule", date: "2026-11-24", phase: "heldout", results: [realHeld()] });
  fs.rmSync(b, { recursive: true }); cli([c], root);
  assert.equal(cli(["--check-all"], root).status, 1, "duplicate run id across dirs accepted");
});
test("MISS-S12 QA-R6 malformed results.json gives a one-line error, not a stack trace", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ems-root-"));
  const d = path.join(root, "bad"); fs.mkdirSync(d);
  fs.writeFileSync(path.join(d, "results.json"), "{not json");
  const r = cli(["--check", d], root);
  assert.equal(r.status, 1);
  assert.doesNotMatch(r.stderr, /\n\s+at /, "stack trace leaked");
});
test("MISS-S13 QA-R7 --check-all fails when the runs directory is missing", () => {
  assert.equal(cli(["--check-all"], path.join(os.tmpdir(), "ems-does-not-exist-" + process.pid)).status, 1);
});
test("MISS-S14 a cross-lane arm is accepted and labelled", () => {
  const rows = [ok(), ok({ arm: "cross", by: "staff-pm", transcript: "u.md" })];
  assert.deepEqual(problems(run(rows), dirWith(["t.md", "u.md"]), specs), []);
  assert.match(render(run(rows), specs), /Other agent \(cross-lane\)/);
});

// ---- Cross-arm tests added by qa-tdd (Nov 22). S15-S16 are coverage; S17-S20 are red until the engineer fixes the tool. ----
const pm = new Map([...specs, ["staff-pm-miss-c", { id: "c", agent: "staff-pm", miss: "XX-S1", pattern: "q", priority: "P0", split: "dev" }]]);
const cells = (line) => line.split("|").slice(1, -1).length;
test("MISS-S15 a cross result scored twice for one case is rejected, and cross does not collide with agent", () => {
  assert.ok(problems(run([ok({ arm: "cross" }), ok({ arm: "cross" })]), dirWith(), specs).some((e) => /cross: scored twice/.test(e)));
  assert.deepEqual(problems(run([ok(), ok({ arm: "cross", by: "staff-pm", transcript: "u.md" })]), dirWith(["t.md", "u.md"]), specs), []);
});
test("MISS-S16 mixed agent/cross/plain arms render aligned columns in a fixed order with n/a for empty slices", () => {
  const md = render(run([ok(), ok({ arm: "plain", pass: false }), ok({ case: "staff-pm-miss-c", arm: "cross" })]), pm);
  assert.match(md, /\| \| With agent \| Other agent \(cross-lane\) \| Plain session \|/);
  for (const line of md.split("## Cases")[0].split("\n").filter((l) => l.startsWith("|"))) assert.equal(cells(line), 4, `misaligned row: ${line}`);
  assert.match(md, /\| qa-tdd \| 1 of 1 \| n\/a \| 0 of 1 \|/);
  assert.match(md, /\| staff-pm \| n\/a \| 1 of 1 \| n\/a \|/);
  assert.match(md, /\| P0 \| n\/a \| 1 of 1 \| n\/a \|/);
});
test("MISS-S17 QA-R1 a cross result with no agent result for the same case is rejected (nothing to compare it to)", () => {
  assert.ok(problems(run([ok({ case: "staff-pm-miss-c", arm: "cross" })]), dirWith(), pm).some((e) => /cross/.test(e)), "orphan cross result accepted");
});
test("MISS-S18 QA-R2 a cross result names which agent ran it, and that agent is not the case's own", () => {
  const d = dirWith(["t.md", "u.md"]);
  const base = ok({ case: "staff-pm-miss-c" });
  assert.ok(problems(run([base, ok({ case: "staff-pm-miss-c", arm: "cross", transcript: "u.md" })]), d, pm).some((e) => /cross/.test(e)), "cross result with no `by` agent accepted");
  assert.ok(problems(run([base, ok({ case: "staff-pm-miss-c", arm: "cross", by: "staff-pm", transcript: "u.md" })]), d, pm).some((e) => /cross/.test(e)), "cross result run by the case's own agent accepted");
});
test("MISS-S19 QA-R3 two arms of one case cannot share one transcript (one report graded twice)", () => {
  assert.ok(problems(run([ok(), ok({ arm: "cross" })]), dirWith(), specs).some((e) => /transcript/.test(e)), "shared transcript accepted");
});
test("MISS-S20 QA-R4 the results.json format in the tool header lists the cross arm", () => {
  assert.match(fs.readFileSync(TOOL, "utf8").split("\n").slice(0, 12).join("\n"), /"arm": "agent"\|"plain"\|"cross"|"cross"/);
});
