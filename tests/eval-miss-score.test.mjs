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
  const md = render(run([ok(), ok({ case: "qa-tdd-miss-b", pass: false })].slice(0, 1)), specs);
  assert.match(md, /All cases \| 1 of 1/);
  assert.match(md, /qa-tdd-miss-a/);
});
