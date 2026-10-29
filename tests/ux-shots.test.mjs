// Tests for tools/ux-shots.mjs. The browser cases skip when Playwright isn't installed.
// Run: node --test tests/ux-shots.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, pageUrls, issueCount, markdown, run } from "../tools/ux-shots.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (n) => join(here, "fixtures", n);
let hasPlaywright = true;
try { createRequire(join(process.cwd(), "package.json"))("playwright"); } catch {
  try { createRequire(import.meta.url)("playwright"); } catch { hasPlaywright = false; }
}

test("parseArgs reads options and rejects mistakes", () => {
  const o = parseArgs(["page.html", "--click", "[role=tab]", "--path", "/about", "--out", "x", "--tap", "48", "--strict"]);
  assert.deepEqual([o.target, o.clicks, o.paths, o.out, o.tap, o.strict], ["page.html", ["[role=tab]"], ["/about"], "x", 48, true]);
  assert.throws(() => parseArgs([]), /usage/);
  assert.throws(() => parseArgs(["a", "b"]), /one target only/);
  assert.throws(() => parseArgs(["a", "--nope"]), /unknown option/);
  assert.throws(() => parseArgs(["a", "--out"]), /needs a value/);
  assert.throws(() => parseArgs(["a", "--tap", "0"]), /positive/);
});

test("pageUrls resolves extra paths against the target", () => {
  assert.deepEqual(pageUrls("https://x.dev/app/", ["/about", "help"]), [
    ["home", "https://x.dev/app/"], ["about", "https://x.dev/about"], ["help", "https://x.dev/app/help"]]);
  assert.match(pageUrls("demo/index.html")[0][1], /^file:\/\/.*demo\/index\.html$/);
});

test("markdown says clean or lists each issue", () => {
  const clean = { name: "home-phone-light", shot: "a.png", full: "b.png", sideways: null, smallTargets: [], brokenImages: [], unfinished: [], deadLinks: [], consoleErrors: [], failedRequests: [] };
  const bad = { ...clean, name: "home-phone-dark", sideways: "page is 900px wide", unfinished: ["TODO"] };
  assert.equal(issueCount(clean), 0);
  assert.equal(issueCount(bad), 2);
  const md = markdown([clean, bad], "page.html");
  assert.match(md, /home-phone-light: clean/);
  assert.match(md, /home-phone-dark: 2 issues/);
  assert.match(md, /Sideways scroll: page is 900px wide/);
});

test("a clean page shoots 4 sizes and schemes plus each tab, with no issues", { skip: !hasPlaywright && "Playwright not installed" }, async () => {
  const out = mkdtempSync(join(tmpdir(), "ux-shots-"));
  const report = await run({ ...parseArgs([fixture("ux-good.html"), "--click", "[role=tab]", "--out", out]) });
  assert.equal(report.length, 12); // (home + 2 tabs) x 2 sizes x 2 schemes
  assert.deepEqual(report.filter((r) => issueCount(r)).map((r) => r.name), []);
  assert.ok(existsSync(join(out, "home-phone-dark.png")) && existsSync(join(out, "home-phone-dark-full.png")));
  assert.ok(existsSync(join(out, "home-role-tab-second-tab-laptop-light.png")));
  assert.match(readFileSync(join(out, "report.md"), "utf8"), /12 shots, 0 with issues/);
});

test("a broken page reports every kind of issue", { skip: !hasPlaywright && "Playwright not installed" }, async () => {
  const out = mkdtempSync(join(tmpdir(), "ux-shots-"));
  const report = await run(parseArgs([fixture("ux-bad.html"), "--out", out]));
  const phone = report.find((r) => r.name === "home-phone-light");
  const laptop = report.find((r) => r.name === "home-laptop-light");
  assert.match(phone.sideways, /900px|9\d\dpx/);
  assert.equal(laptop.sideways, null);
  assert.ok(phone.smallTargets.some((t) => t.startsWith("button#tiny")));
  assert.deepEqual(phone.unfinished, ["TODO"]);
  assert.deepEqual(phone.deadLinks, ["https://example.com/job"]);
  assert.ok(phone.brokenImages.some((s) => s.endsWith("missing-image.png")));
  assert.ok(phone.consoleErrors.some((e) => e.includes("boom from the page")));
  assert.ok(phone.failedRequests.some((e) => e.includes("missing-image.png")));
});
