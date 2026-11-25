// EVPL-23: the ux-reviewer suite is built from the 23 "UX eval miss" issues (#47 to #69).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const tool = (...a) => spawnSync(process.execPath, [path.join(ROOT, "tools/eval-pipeline.mjs"), ...a, "--root", ROOT], { encoding: "utf8" });

test("EVPL-23 ux-reviewer.json passes check-suite and has one task per miss issue, 47 to 69", () => {
  const r = tool("check-suite", "evals/suites/ux-reviewer.json");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const t = rd("evals/suites/ux-reviewer.tasks.json");
  assert.deepEqual(t.map((x) => x.issue), Array.from({ length: 23 }, (_, i) => 47 + i));
  const cfg = rd("evals/suites/ux-reviewer.json");
  assert.deepEqual(cfg.split, { dev: t.filter((x) => x.split === "dev").length, heldout: t.filter((x) => x.split === "heldout").length });
  assert.ok(cfg.split.dev > 0 && cfg.split.heldout > cfg.split.dev);
});

test("EVPL-23 the agent never sees what was wrong: task text holds the screen only, the rubric holds the miss", () => {
  for (const x of rd("evals/suites/ux-reviewer.tasks.json")) {
    assert.ok(x.rubric.startsWith("Pass only if the reply raises"), x.id);
    assert.ok(!x.text.includes(x.rubric.slice(60, 140)), `${x.id}: the miss leaked into the task text`);
    assert.ok(/Review this screen/.test(x.text));
  }
});
