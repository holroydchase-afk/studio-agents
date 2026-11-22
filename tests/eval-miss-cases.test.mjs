// Regression tests for tools/eval-miss-cases.mjs (QA-R1..R6 from the qa-tdd review). Uses temp dirs only.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TOOL = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "tools", "eval-miss-cases.mjs");
const good = {
  id: "demo", miss: "XX-Q1", pattern: "p", priority: "P1", split: "dev", src: "cc", ask: "It adds numbers.",
  file: "add.mjs", code: "export const add = (a, b) => a - b;\n",
  testFile: "add.test.mjs", test: 'import {test} from "node:test";import assert from "node:assert/strict";import {add} from "./add.mjs";\ntest("A-1",()=>assert.equal(add(2,0),2));\n',
  gapName: "gapt.mjs", gap: 'import {test} from "node:test";import assert from "node:assert/strict";import {add} from "./add.mjs";\ntest("G",()=>assert.equal(add(2,3),5));\n',
  gapText: "add subtracts", gapTest: "add(2,3) is 5",
};
function run(spec, args = [], pre, pm = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "emc-"));
  const specPath = path.join(dir, "spec.mjs");
  fs.writeFileSync(specPath, `export const QA_CASES = ${JSON.stringify(spec)};`);
  const pmSpec = path.join(dir, "pm.mjs");
  fs.writeFileSync(pmSpec, `export const PM_CASES = ${JSON.stringify(pm)};`);
  const evals = path.join(dir, "evals"); fs.mkdirSync(evals);
  if (pre) pre(evals);
  const env = { ...process.env, EVAL_MISS_SPEC: specPath, EVAL_MISS_PM_SPEC: pmSpec, EVAL_MISS_EVALS_DIR: evals };
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, [TOOL, ...args], { encoding: "utf8", env });
  return { ...r, evals };
}
test("MISS-T1 (QA-R2) an unknown flag exits 2 and writes nothing", () => {
  const r = run([good], ["--chek"]);
  assert.equal(r.status, 2);
  assert.deepEqual(fs.readdirSync(r.evals), []);
});
test("MISS-T2 write mode creates the case folder", () => {
  const r = run([good], [], undefined);
  assert.equal(r.status, 0);
  assert.ok(fs.existsSync(path.join(r.evals, "qa-tdd-miss-demo", "prompt.md")));
});
test("MISS-T3 (QA-R3) --check flags an extra grader file", () => {
  const r = run([good], ["--check"], (e) => {
    const d = path.join(e, "qa-tdd-miss-demo", "graders"); fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, "extra.md"), "x");
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /extra .*extra\.md/);
});
test("MISS-T4 (QA-R1) --verify rejects a gap test that fails on an import error", () => {
  const bad = { ...good, gap: good.gap.replace("./add.mjs", "./nope.mjs") };
  const r = run([bad], ["--verify"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /wrong reason/);
});
test("MISS-T5 --verify passes a real gap and rejects a gap that passes", () => {
  assert.equal(run([good], ["--verify"]).status, 0);
  const noGap = { ...good, gap: good.gap.replace("add(2,3),5", "add(2,0),2") };
  assert.equal(run([noGap], ["--verify"]).status, 1);
});
test("MISS-T6 (QA-R6) validate rejects a path-like id, a missing field and a fence in the code", () => {
  for (const bad of [{ ...good, id: "../x" }, { ...good, gapTest: "" }, { ...good, code: "```\n" }, { ...good, gapName: "add.mjs" }]) {
    const r = run([bad], ["--check"]);
    assert.equal(r.status, 1, JSON.stringify(bad).slice(0, 60));
  }
});
const pmGood = {
  id: "demo-pm", miss: "XX-S1", pattern: "p", priority: "P1", split: "heldout", src: "cc",
  ask: "Spec the export button.", context: "Exports run on the server.", mustCover: "a size limit with a test",
};
test("MISS-T7 staff-pm cases are written, checked and pruned like qa-tdd ones", () => {
  const w = run([], [], undefined, [pmGood]);
  assert.equal(w.status, 0);
  const prompt = path.join(w.evals, "staff-pm-miss-demo-pm", "prompt.md");
  assert.ok(fs.existsSync(prompt));
  assert.match(fs.readFileSync(prompt, "utf8"), /tags: \[staff-pm, miss, p1, src-cc, p, split-heldout\]/);
  const orphan = run([], ["--check"], (e) => fs.mkdirSync(path.join(e, "staff-pm-miss-old"), { recursive: true }), []);
  assert.equal(orphan.status, 1);
  assert.match(orphan.stderr, /orphan staff-pm-miss-old/);
});
test("MISS-T8 validatePm rejects a context that hints at the miss and a missing mustCover", () => {
  for (const bad of [{ ...pmGood, context: "There is a bug in export." }, { ...pmGood, mustCover: "" }, { ...pmGood, id: "../x" }]) {
    assert.equal(run([], ["--check"], undefined, [bad]).status, 1, JSON.stringify(bad).slice(0, 50));
  }
});
test("MISS-T9 (QA-R12) hint words are caught in other forms, and a fence in mustCover is rejected", () => {
  for (const bad of [{ ...pmGood, context: "That was fixed last week." }, { ...pmGood, ask: "Cover the gaps." }, { ...pmGood, mustCover: "x ``` y" }])
    assert.equal(run([], ["--check"], undefined, [bad]).status, 1, JSON.stringify(bad).slice(0, 50));
});
test("MISS-T10 (QA-R13) a pattern that could break the front matter is rejected for both families", () => {
  const evil = 'a], b: "c';
  assert.equal(run([], ["--check"], undefined, [{ ...pmGood, pattern: evil }]).status, 1);
  assert.equal(run([{ ...good, pattern: evil }], ["--check"]).status, 1);
});
test("MISS-T11 (QA-R11) staff-pm stale, missing and extra files are caught; qa and pm cases with one id stay separate", () => {
  const both = (evals) => run([{ ...good, id: "same" }], [], undefined, [{ ...pmGood, id: "same" }]);
  const w = both();
  assert.equal(w.status, 0);
  const qa = path.join(w.evals, "qa-tdd-miss-same"), pm = path.join(w.evals, "staff-pm-miss-same");
  assert.ok(fs.existsSync(qa) && fs.existsSync(pm));
  // second run on the same dirs: stale pm file, missing pm grader, extra file in the qa folder
  const spec = (e) => e;
  const r = run([{ ...good, id: "same" }], ["--check"], (e) => {
    for (const d of ["qa-tdd-miss-same", "staff-pm-miss-same"]) fs.cpSync(path.join(w.evals, d), path.join(e, d), { recursive: true });
    fs.appendFileSync(path.join(e, "staff-pm-miss-same", "prompt.md"), "edited");
    fs.rmSync(path.join(e, "staff-pm-miss-same", "graders", "criteria.md"));
    fs.writeFileSync(path.join(e, "qa-tdd-miss-same", "notes.md"), "x");
  }, [{ ...pmGood, id: "same" }]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /stale .*staff-pm-miss-same.*prompt\.md/);
  assert.match(r.stderr, /missing .*staff-pm-miss-same.*criteria\.md/);
  assert.match(r.stderr, /extra .*qa-tdd-miss-same.*notes\.md/);
  assert.doesNotMatch(r.stderr, /stale .*qa-tdd-miss-same/);
});
test("MISS-T12 (QA-R14) the --check message says how to clear an orphan", () => {
  const r = run([], ["--check"], (e) => fs.mkdirSync(path.join(e, "qa-tdd-miss-old"), { recursive: true }));
  assert.match(r.stderr, /delete an orphan folder by hand/);
});
