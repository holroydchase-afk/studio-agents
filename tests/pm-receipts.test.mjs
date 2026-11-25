// Failing-first tests for tools/pm-receipts.mjs (PMR-1..PMR-6) and the staff-pm.md reply rules.
// The grader marked staff-pm down for "tool checks it couldn't have run". pm-receipts runs the checks itself and
// prints the only text the agent may use to describe them, so every claim is a real exit code.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = path.join(ROOT, "tools", "pm-receipts.mjs");
const GOOD = path.join(ROOT, "tests", "fixtures", "spec-lint", "good-weekly-rebuild.md");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pm-receipts-"));
const run = (args, opts = {}) => spawnSync("node", [TOOL, ...args], { encoding: "utf8", ...opts });

test("PMR-1 a good spec -> exit 0 and one receipt line per check with its exit code", () => {
  const r = run([GOOD, "--root", tmp]);
  assert.equal(r.status, 0, r.stderr);
  const lines = r.stdout.trim().split("\n");
  assert.match(lines[0], /^Checks: /);
  assert.match(r.stdout, /agent-guard kill staff-pm \| ok \| exit 0/);
  assert.match(r.stdout, /check-spec \| ok \| exit 0/);
  assert.match(r.stdout, /spec-lint \| ok \| exit 0/);
});

test("PMR-2 a spec that fails check-spec -> exit 1 and that line says failed with the real exit code", () => {
  const bad = path.join(ROOT, "tests", "fixtures", "spec-lint", "bad-block.md");
  const r = run([bad, "--root", tmp]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /check-spec \| failed \| exit [12]/);
});

test("PMR-3 the kill switch trips -> exit 1 and the kill line says failed", () => {
  const root = fs.mkdtempSync(path.join(tmp, "off-"));
  fs.mkdirSync(path.join(root, ".claude"));
  fs.writeFileSync(path.join(root, ".claude", "staff-pm.off"), "");
  const r = run([GOOD, "--root", root]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /agent-guard kill staff-pm \| failed \| exit 1/);
});

test("PMR-4 spec file missing -> exit 2 and stdout holds no 'ok' receipt", () => {
  const r = run([path.join(tmp, "nope.md"), "--root", tmp]);
  assert.equal(r.status, 2);
  assert.doesNotMatch(r.stdout, /\| ok \|/);
});

test("PMR-5 waivers are counted in the receipt, never listed as prose", () => {
  const r = run([GOOD, "--root", tmp]);
  assert.match(r.stdout, /waivers: \d+/);
});

test("PMR-7 --out FILE writes the receipts to FILE and prints nothing on stdout", () => {
  const out = path.join(tmp, "r.receipts");
  const r = run([GOOD, "--root", tmp, "--out", out]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, "");
  const body = fs.readFileSync(out, "utf8");
  assert.match(body, /^Checks: all 3 passed/);
  assert.match(body, /check-spec \| ok \| exit 0/);
});

test("PMR-6 staff-pm.md: receipts line is the only way to mention tool results, lint-ok stays out of chat, one decision", () => {
  const t = fs.readFileSync(path.join(ROOT, "plugins", "studio", "agents", "staff-pm.md"), "utf8");
  assert.match(t, /pm-receipts\.mjs/);
  assert.match(t, /--out/);
  assert.match(t, /never mention (a )?(check|tool)/i);
  assert.match(t, /never in the chat reply/i);
  assert.match(t, /at most one `decision:`/i);
});

test("PMR-8 staff-pm.md: a one-line ask gets a one-to-three line answer first, no spec block", () => {
  const t = fs.readFileSync(path.join(ROOT, "plugins", "studio", "agents", "staff-pm.md"), "utf8");
  assert.match(t, /one-line answer/i);
  assert.match(t, /1 to 3 lines/i);
  assert.match(t, /no spec block/i);
});

test("PMR-9 sync-tools.sh pm-receipts alone also copies the three tools it spawns, so the receipt never says 'not run' in a product repo", () => {
  const repo = fs.mkdtempSync(path.join(tmp, "sync-"));
  const s = spawnSync("bash", [path.join(ROOT, "scripts", "sync-tools.sh"), repo, "pm-receipts"], { encoding: "utf8" });
  assert.equal(s.status, 0, s.stderr);
  for (const f of ["pm-receipts", "agent-guard", "check-spec", "spec-lint"]) {
    assert.ok(fs.existsSync(path.join(repo, "scripts", `${f}.mjs`)), `scripts/${f}.mjs missing after syncing pm-receipts alone`);
  }
  const r = spawnSync("node", [path.join(repo, "scripts", "pm-receipts.mjs"), GOOD, "--root", repo], { encoding: "utf8" });
  assert.doesNotMatch(r.stdout, /not run/);
  assert.equal(r.status, 0, r.stdout);
});
