// Tests for tools/ux-rules.mjs. The browser cases skip when Playwright isn't installed.
// Run: node --test tests/ux-rules.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, contrast, markdown, run } from "../tools/ux-rules.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (n) => join(here, "fixtures", n);
let hasPlaywright = true;
try { createRequire(join(process.cwd(), "package.json"))("playwright"); } catch {
  try { createRequire(import.meta.url)("playwright"); } catch { hasPlaywright = false; }
}

test("parseArgs reads options and rejects mistakes", () => {
  const o = parseArgs(["page.html", "--primary", ".cta", "--click", "#open", "--out", "x", "--strict"]);
  assert.deepEqual([o.target, o.primary, o.clicks, o.out, o.strict], ["page.html", ".cta", ["#open"], "x", true]);
  assert.throws(() => parseArgs([]), /usage/);
  assert.throws(() => parseArgs(["a", "--nope"]), /unknown option/);
  assert.throws(() => parseArgs(["a", "--primary"]), /needs a value/);
});

test("contrast matches the WCAG formula", () => {
  assert.equal(Math.round(contrast([0, 0, 0], [255, 255, 255]) * 10) / 10, 21);
  assert.ok(contrast([204, 204, 204], [238, 238, 238]) < 1.5);
  assert.ok(contrast([255, 255, 255], [31, 92, 68]) > 4.5);
});

test("markdown names each rule and says clean when clean", () => {
  const md = markdown([{ view: "home-phone", url: "x", findings: [{ rule: "G1", what: "2 primary buttons", where: "button \"A\"" }] }, { view: "home-laptop", url: "x", findings: [] }], "x");
  assert.match(md, /G1/);
  assert.match(md, /home-laptop: clean/);
});

test("a page that breaks the rules fails each code-checked rule", { skip: !hasPlaywright && "Playwright not installed" }, async () => {
  const out = mkdtempSync(join(tmpdir(), "ux-rules-"));
  const report = await run({ target: fixture("rules-bad.html"), out, primary: ".primary, .btn-primary, [data-primary]", clicks: [] });
  const rules = new Set(report.flatMap((v) => v.findings.map((f) => f.rule)));
  for (const r of ["G1", "G2", "G3", "G4", "G5", "G7", "G8", "G9", "G11"]) assert.ok(rules.has(r), `expected ${r}, got ${[...rules]}`);
  const g8 = report.find((v) => v.view === "home-reflow").findings.filter((f) => f.rule === "G8");
  assert.equal(g8.length, 1);
  assert.match(readFileSync(join(out, "report.md"), "utf8"), /G3/);
});

test("a page that follows the rules is clean", { skip: !hasPlaywright && "Playwright not installed" }, async () => {
  const out = mkdtempSync(join(tmpdir(), "ux-rules-"));
  const report = await run({ target: fixture("rules-good.html"), out, primary: ".primary, .btn-primary, [data-primary]", clicks: [] });
  assert.deepEqual(report.flatMap((v) => v.findings), []);
});

test("a page that passes every G rule but has no visual system fails the V checks", { skip: !hasPlaywright && "Playwright not installed" }, async () => {
  const out = mkdtempSync(join(tmpdir(), "ux-rules-"));
  const report = await run({ target: fixture("visual-bad.html"), out, primary: ".primary, .btn-primary, [data-primary]", clicks: [] });
  const laptop = report.find((v) => v.view === "home-laptop").findings;
  assert.deepEqual(laptop.filter((f) => f.rule.startsWith("G")), [], "the fixture should pass Layer 1");
  for (const r of ["V2", "V5", "V9"]) assert.ok(laptop.some((f) => f.rule === r), `expected ${r}, got ${laptop.map((f) => f.rule)}`);
  assert.ok(laptop.some((f) => f.rule === "V2" && /famil/.test(f.what)), "V2 should also count font families");
  assert.match(readFileSync(join(out, "report.md"), "utf8"), /V9/);
});

test("--strict ignores V findings unless --strict-visual is set", () => {
  assert.equal(parseArgs(["a"]).strictVisual, false);
  assert.equal(parseArgs(["a", "--strict-visual"]).strictVisual, true);
});
