// UXREF: tests for tools/ux-refs.mjs and the reference library. Run: node --test tests/ux-refs.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRefs, searchRefs } from "../tools/ux-refs.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tool = join(root, "tools", "ux-refs.mjs");
const cli = (...a) => spawnSync("node", [tool, "--root", root, ...a], { encoding: "utf8" });
const tmp = mkdtempSync(join(tmpdir(), "uxref-"));
const review = (txt) => { const f = join(tmp, `r${Math.random()}.md`); writeFileSync(f, txt); return f; };
const refs = loadRefs(root);
const hardDark = refs.filter((r) => r.id.startsWith("DARK-") && r.strength === "hard");

test("UXREF-1 every entry has id, strength, status and an https source; ids are unique", () => {
  assert.ok(refs.length >= 8, "library has entries");
  assert.equal(new Set(refs.map((r) => r.id)).size, refs.length);
  for (const r of refs) {
    assert.match(r.id, /^[A-Z]+-\d+$/);
    assert.ok(["hard", "guide"].includes(r.strength), r.id);
    assert.ok(["fetched", "search-summary", "pending"].includes(r.status), r.id);
    assert.match(r.source, /^https:\/\//, r.id);
  }
});

test("UXREF-2 search ranks dark-mode entries first for a dark-mode query", () => {
  const out = searchRefs("dark mode pure black background", refs, { limit: 3 });
  assert.ok(out.length >= 1);
  assert.match(out[0].id, /^DARK-/);
});

test("UXREF-3 show prints an entry; unknown id exits 1", () => {
  const ok = cli("show", refs[0].id);
  assert.equal(ok.status, 0);
  assert.ok(ok.stdout.includes(refs[0].source));
  assert.equal(cli("show", "NOPE-99").status, 1);
});

test("UXREF-4 cite fails on a reference id that does not exist", () => {
  const r = cli("cite", review("UX-R1 | P1 | DARK-999 | x | y | z\n"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /DARK-999/);
});

test("UXREF-5 cite --topics dark fails when a hard rule is neither cited nor listed", () => {
  assert.ok(hardDark.length >= 3, "dark topic has hard rules");
  const r = cli("cite", "--topics", "dark", review("UX-R1 | P1 | V6 | x | y | z\n"));
  assert.equal(r.status, 1);
  for (const h of hardDark) assert.ok(r.stderr.includes(h.id), `names ${h.id}`);
});

test("UXREF-6 cite passes when every hard rule is cited or listed under Hard rules checked", () => {
  const [first, ...rest] = hardDark;
  const txt = `UX-R1 | P1 | ${first.id} | x | y | z\n\nHard rules checked: ${rest.map((h) => `${h.id} pass`).join(", ")}\n`;
  const r = cli("cite", "--topics", "dark", review(txt));
  assert.equal(r.status, 0, r.stderr);
});

test("UXREF-7 entries are paraphrases: short bodies", () => {
  for (const r of refs) assert.ok(r.body.length <= 600, `${r.id} is ${r.body.length} chars`);
});

test("UXREF-8 the agent file wires in the tool, the checklist line and the research step", () => {
  const a = readFileSync(join(root, "plugins/studio/agents/ux-reviewer.md"), "utf8");
  assert.ok(a.includes("ux-refs.mjs") && a.includes("Hard rules checked") && /## Research/.test(a));
});

// QA-R gaps in the cite check (red until the engineer closes them).
const allHard = hardDark.map((h) => h.id).join(" ");
const fakeRoot = (entry) => {
  const d = mkdtempSync(join(tmpdir(), "uxroot-"));
  mkdirSync(join(d, "docs", "references", "ux"), { recursive: true });
  writeFileSync(join(d, "docs", "references", "ux", "dark-mode.md"), entry);
  return d;
};

test("UXREF-10 QA-R1 a hard rule named only in prose does not count as checked", () => {
  const r = cli("cite", "--topics", "dark", review(`I never looked at ${allHard} in this pass.\n`));
  assert.equal(r.status, 1, "prose mention must not satisfy hard rules");
});

test("UXREF-11 QA-R2 a hard rule marked fail on the checked line needs a finding", () => {
  const line = hardDark.map((h) => `${h.id} fail`).join(", ");
  const r = cli("cite", "--topics", "dark", review(`Hard rules checked: ${line}\n`));
  assert.equal(r.status, 1, "a 'fail' with no finding must be rejected");
});

test("UXREF-12 QA-R3 a typo in strength or status is an error, not a silent skip", () => {
  const d = fakeRoot("## DARK-1 T\n- strength: Hard\n- status: fetched\n- source: https://x.test\n- tags: a\nbody\n");
  const r = spawnSync("node", [tool, "--root", d, "cite", "--topics", "dark", review("nothing\n")], { encoding: "utf8" });
  assert.notEqual(r.status, 0, "strength: Hard must not silently skip enforcement");
  const d2 = fakeRoot("## DARK-1 T\n- strength: hard\n- status: Pending\n- source: https://x.test\n- tags: a\nbody\n");
  const r2 = spawnSync("node", [tool, "--root", d2, "cite", "--topics", "dark", review("nothing\n")], { encoding: "utf8" });
  assert.notEqual(r2.status, 0, "status: Pending must not silently skip enforcement");
});

test("UXREF-13 QA-R4 topics with spaces, and unknown topics, are handled loudly", () => {
  const sp = cli("cite", "--topics", "dark, contrast", review("x\n"));
  assert.match(sp.stderr, /CONTRAST-1/, "' contrast' after a comma+space must still be enforced");
  const bad = cli("cite", "--topics", "drak", review("x\n"));
  assert.notEqual(bad.status, 0, "an unknown topic must not pass silently");
});

test("UXREF-14 QA-R5 topic case and other-family ids are not mishandled", () => {
  const up = cli("cite", "--topics", "DARK", review("x\n"));
  assert.equal(up.status, 1);
  const other = cli("cite", review(`UX-R1 DS-1 G7 WCAG-2 ${hardDark[0].id}\n`));
  assert.equal(other.status, 0, other.stderr);
});
