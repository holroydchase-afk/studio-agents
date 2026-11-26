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

const words = (t) => t.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
const sharesRun = (miss, text, n) => {
  const m = words(miss), t = words(text).join(" ");
  for (let i = 0; i + n <= m.length; i++) if (t.includes(m.slice(i, i + n).join(" "))) return true;
  return false;
};
test("EVPL-23 the agent never sees what was wrong: no run of 6 words from the miss appears in the task text, and every miss is real text", () => {
  for (const x of rd("evals/suites/ux-reviewer.tasks.json")) {
    assert.ok(x.rubric.startsWith("Pass only if the reply raises"), x.id);
    const miss = x.rubric.slice(x.rubric.indexOf(":") + 1).trim();
    assert.ok(words(miss).length >= 12, `${x.id}: the miss is empty or too short`);
    assert.ok(!sharesRun(miss, x.text, 6), `${x.id}: the miss leaked into the task text`);
    assert.ok(/Review this screen/.test(x.text));
  }
});

test("EVPL-23 the leak check itself catches a partial and a late leak (QA-R1)", () => {
  const miss = "the section links are underlined text that scroll away and the pinned brand bar has no navigation on it at all";
  assert.ok(sharesRun(miss, "intro the pinned brand bar has no navigation on it", 6));
  assert.ok(sharesRun(miss, "x brand bar has no navigation on it at all", 6));
  assert.ok(!sharesRun(miss, "Charlie, main navigation tabs at 390", 6));
});

test("EVPL-23 no URL in the published task text or rubric (the issues link to private repos)", () => {
  for (const x of rd("evals/suites/ux-reviewer.tasks.json")) assert.doesNotMatch(x.text + x.rubric, /https?:\/\//, x.id);
});
