// EvalPM polish (ux-reviewer EVPM-UX-R1, R2, R8, R9): written red first, then fixed.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EP = path.join(ROOT, "evalpm/evalpm.mjs");
const ep = (...a) => { const r = spawnSync(process.execPath, [EP, ...a], { encoding: "utf8" }); return { code: r.status, out: r.stdout || "", err: r.stderr || "" }; };

test("EVPM-UX-R1 the report says '1 loss' and never '1 losses' or '1 wins' or '1 ties'", () => {
  const out = ep("demo").out;
  assert.doesNotMatch(out, /\b1 (losses|wins|ties)\b/);
  assert.match(out, /\b1 loss\b/);
});

test("EVPM-UX-R8 the demo repeats the SAMPLE DATA marker after the calibration block", () => {
  const lines = ep("demo").out.trimEnd().split("\n");
  assert.match(lines[lines.length - 1], /SAMPLE DATA/);
  assert.match(lines[lines.length - 1], /invented/);
});

test("EVPM-UX-R9 a bare run prints help that names demo and exits 0; an unknown command is named and exits 2", () => {
  const bare = ep();
  assert.equal(bare.code, 0);
  assert.match(bare.out, /node evalpm\/evalpm\.mjs demo/);
  for (const c of ["init", "check", "jobs", "collect", "report", "calibrate"]) assert.match(bare.out, new RegExp(`\\b${c}\\b`));
  const bad = ep("frobnicate");
  assert.equal(bad.code, 2);
  assert.match(bad.err, /unknown command "frobnicate"/);
});

test("EVPM-UX-R2 every relative link in evalpm/README.md resolves from where the README sits", () => {
  const md = fs.readFileSync(path.join(ROOT, "evalpm/README.md"), "utf8");
  const links = [...md.matchAll(/\]\((?!https?:|#)([^)#\s]+)/g)].map((m) => m[1]);
  assert.ok(links.length >= 5, "README should link its files");
  for (const l of links) assert.ok(fs.existsSync(path.join(ROOT, "evalpm", l)), `dangling link ${l}`);
});
