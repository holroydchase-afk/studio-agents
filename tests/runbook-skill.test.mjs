// RUNBOOK-1..5: the pipeline runbook skill (docs/pipeline-plan.md build step 4) exists and stays in step with
// tools/pipeline-run.mjs, so the chief of staff never follows stale commands.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STAGES, LANES, ROUND_LIMITS } from "../tools/pipeline-run.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "plugins/studio/skills/pipeline/SKILL.md");
const text = () => fs.readFileSync(FILE, "utf8");

test("RUNBOOK-1 skill exists with name pipeline and a description saying when to use it", () => {
  const t = text();
  assert.match(t, /^---\nname: pipeline\ndescription: .{40,}\n---/);
});
test("RUNBOOK-2 names every pipeline-run subcommand", () => {
  for (const c of ["init", "start", "done", "round", "stop", "resume", "class", "status"]) assert.match(text(), new RegExp(`pipeline-run(\\.mjs)? ${c}\\b`), c);
});
test("RUNBOOK-3 names every stage and every lane", () => {
  for (const s of [...STAGES, ...LANES]) assert.ok(text().includes(s), s);
});
test("RUNBOOK-4 states the round limits and the kill switch", () => {
  const t = text();
  for (const [stage, n] of Object.entries(ROUND_LIMITS)) assert.ok(new RegExp(`${stage}[^\\n]*\\b${n}\\b`).test(t), `${stage} ${n}`);
  assert.ok(t.includes(".claude/agents.off"));
});
test("RUNBOOK-5 says merge class C is never merged by the pipeline, and no dollar caps", () => {
  const t = text();
  assert.match(t, /class C[^\n]*Chase/i);
  assert.doesNotMatch(t, /\$\d/);
});

// ---- RUNBOOK-6+: added by qa-tdd after reading the skill against tools/pipeline-run.mjs ----
import { spawnSync } from "node:child_process";
import os from "node:os";
const TOOL = path.join(ROOT, "tools/pipeline-run.mjs");
function run(args, cwd) { const r = spawnSync("node", [TOOL, ...args], { cwd, encoding: "utf8" }); return { code: r.status, out: r.stdout.trim(), err: r.stderr.trim() }; }
function tmpLedger(lane = "logic", touches = "non-live") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rb-"));
  const ledger = path.join(dir, "L.json");
  assert.equal(run(["init", "--ledger", ledger, "--lane", lane, "--touches", touches], dir).code, 0);
  return { dir, ledger };
}

test("RUNBOOK-6 class B tells the thread how to run feedback-merge-check (the command, --repo and the files)", () => {
  assert.match(text(), /node tools\/feedback-merge-check\.mjs[^\n]*--repo/);
});
test("RUNBOOK-7 class --feedback never prints B for a path feedback-merge-check refuses (index.html, demo/, secret)", () => {
  const { dir, ledger } = tmpLedger();
  for (const f of ["index.html", "demo/a.js", "secret/x.md"]) {
    const r = run(["class", "--ledger", ledger, "--files", f, "--feedback"], dir);
    assert.notEqual(r.out, "B", `${f} is refused by feedback-merge-check but class printed B`);
  }
});
test("RUNBOOK-8 the skill says the tool enforces the kill switch, so round and done must trip under .claude/agents.off", () => {
  const { dir, ledger } = tmpLedger();
  assert.equal(run(["start", "staff-pm", "--ledger", ledger], dir).code, 0);
  fs.mkdirSync(path.join(dir, ".claude"));
  fs.writeFileSync(path.join(dir, ".claude/agents.off"), "");
  assert.equal(run(["round", "staff-pm", "--ledger", ledger], dir).code, 1, "round ignored the kill switch");
  const blk = path.join(dir, "b.md"); fs.writeFileSync(blk, "x");
  assert.equal(run(["done", "staff-pm", "--ledger", ledger, "--block", blk], dir).code, 1, "done ignored the kill switch");
});
test("RUNBOOK-9 (stronger RUNBOOK-3) each lane appears as a whole word; 'ui' alone is inside 'build'", () => {
  for (const l of LANES) assert.match(text(), new RegExp(`\\b${l}\\b`), l);
  assert.match(text(), /\bui\b/, "lane ui is not named as a word");
});
test("RUNBOOK-10 every --flag on a pipeline-run line in the skill is one the tool accepts", () => {
  const usage = run(["nope"], ROOT).err;
  const flags = new Set(usage.match(/--[a-z]+/g));
  for (const line of text().split("\n").filter((l) => /pipeline-run/.test(l)))
    for (const f of line.match(/--[a-z]+/g) || []) assert.ok(flags.has(f), `${f} in: ${line.slice(0, 60)}`);
});
