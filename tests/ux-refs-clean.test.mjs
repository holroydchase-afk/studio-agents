// CLEANQA: gaps found in review of a6ec3b1 (CLEAN-1..5). Run: node --test tests/ux-refs-clean.test.mjs
// These are expected RED until the engineer fixes them. Not yet wired into tests/check.sh.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tool = join(root, "tools", "ux-refs.mjs");
const cli = (...a) => spawnSync("node", [tool, "--root", root, ...a], { encoding: "utf8" });
const tmp = mkdtempSync(join(tmpdir(), "cleanqa-"));
const review = (txt) => { const f = join(tmp, `r${Math.random()}.md`); writeFileSync(f, txt); return f; };
const ids = [1, 2, 3, 4, 5].map((n) => `CLEAN-${n}`);

const graderRegex = () => {
  const g = readFileSync(join(root, "plugins/studio/evals/ux-reviewer-clean-hard-rules-listed/graders/checked-line.md"), "utf8");
  return new RegExp(/pattern:\s*'([^']*)'/.exec(g)[1]);
};

test("CLEANQA-1 eval regex accepts all five ids in any order (fails first is natural)", () => {
  const re = graderRegex();
  const shuffled = "Hard rules checked: CLEAN-5 fail (UX-R1), CLEAN-1 pass, CLEAN-2 pass (1 family), CLEAN-3 pass, CLEAN-4 pass";
  assert.ok(re.test(shuffled), "ids out of order must still count");
});

test("CLEANQA-2 eval regex does not treat CLEAN-10 as CLEAN-1", () => {
  const re = graderRegex();
  assert.ok(!re.test("Hard rules checked: CLEAN-10, CLEAN-20, CLEAN-30, CLEAN-40, CLEAN-50"));
});

test("CLEANQA-3 cite without --topics still enforces clean once a review lists any CLEAN id", () => {
  const r = cli("cite", review("Hard rules checked: CLEAN-1 pass, CLEAN-2 pass\n"));
  assert.equal(r.status, 1, "partial CLEAN list passed silently because --topics was omitted");
});

test("CLEANQA-4 a fetched hard CLEAN rule cannot be dodged with 'open'", () => {
  const line = ids.map((i) => `${i} open`).join(", ");
  const r = cli("cite", "--topics", "clean", review(`Hard rules checked: ${line}\n`));
  assert.equal(r.status, 1, "'open' is only valid for pending entries");
});

test("CLEANQA-5 stale 'not loaded' and 'CLEAN-1 pending' wording is gone", () => {
  assert.ok(!existsSync(join(root, "docs/design-references/sources/medium-clean-ui-NOT-LOADED.md")), "NOT-LOADED note still present");
  assert.ok(!/CLEAN-1 pending/.test(readFileSync(join(root, "HANDOFF.md"), "utf8")), "HANDOFF.md still says CLEAN-1 pending");
  assert.ok(!/Medium article content \(blocked/.test(readFileSync(join(root, "docs/product/SPEC-UX-REFERENCES.md"), "utf8")), "spec still says Medium blocked");
});

test("CLEANQA-6 agent file ids exist in the library and its cite command names clean", () => {
  const agent = readFileSync(join(root, "plugins/studio/agents/ux-reviewer.md"), "utf8");
  assert.match(agent, /--topics dark,contrast,clean/);
  for (const id of ids) assert.equal(cli("show", id).status, 0, id);
});
