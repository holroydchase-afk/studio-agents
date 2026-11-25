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
