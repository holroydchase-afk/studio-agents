// EVPM-12: every sample-results number in evalpm/README.md matches the named run folder, and v1 runs carry their label.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const readme = read("evalpm/README.md");
const row = (run) => readme.split("\n").find((l) => l.includes(run)) || "";

test("EVPM-12 the v1 lazy-prompts row matches its results.json tally and carries the v1 label", () => {
  const run = "evals/lazy-prompts/runs/2026-11-24-fresh-prompts";
  const r = JSON.parse(read(`${run}/results.json`));
  const l = row(run);
  assert.ok(l, "README does not name the run");
  assert.ok(l.includes(`agent ${r.tally.agent}, plain ${r.tally.plain}`), `README row does not show ${JSON.stringify(r.tally)}`);
  assert.match(l, /single vote, order unknown/);
  const per = Object.values(r.per_prompt);
  assert.ok(l.includes(`agent won ${per.filter((p) => p.agent > p.plain).length} prompts, plain won ${per.filter((p) => p.plain > p.agent).length}`));
});

test("EVPM-12 the batch 6 held-out row matches its results.md", () => {
  const run = "evals/agent-misses/runs/2026-11-22-batch6-heldout";
  const md = read(`${run}/results.md`);
  const l = row(run);
  assert.ok(l, "README does not name the run");
  assert.match(md, /All cases \| 0 of 5 \| 0 of 5/);
  assert.ok(l.includes("agent passed 0 of 5, plain 0 of 5"));
});

test("EVPM-12 README claims nothing proven and names no multiplier", () => {
  assert.match(readme, /nothing is proven/i);
  assert.doesNotMatch(readme, /\b\d+(\.\d+)?\s*x\b|times better|% better/i);
});
