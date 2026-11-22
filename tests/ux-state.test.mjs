// UXSTATE: tests for tools/ux-state.mjs, the state kept between ux-reviewer runs.
// Pure functions and the CLI only. Run: node --test tests/ux-state.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, mkdtempSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { recordRun } from "../tools/ux-state.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const tool = join(here, "..", "tools", "ux-state.mjs");
const fx = (n) => join(here, "fixtures", "ux-recheck", n);
const cli = (...a) => spawnSync("node", [tool, ...a], { encoding: "utf8" });
const tmp = () => mkdtempSync(join(tmpdir(), "uxstate-"));
const mk = (id, priority = "P1", extra = {}) => ({ id, priority, rule: "G1", shots: `s/${id}.png`, problem: `Problem ${id}`, fix: null, ...extra });
const run = (date, findings, extra = {}) => ({ date, product: "Example App", tier: "supervised", verdict: "Ready", rechecked: "no", score: 80, findings, ...extra });

test("UXSTATE-1 recording into an empty or null state sets product, a runs entry and findings", () => {
  for (const start of [{}, null]) {
    const s = recordRun(start, run("2026-11-20", [mk("UX-R1", "P0")]));
    assert.equal(s.product, "Example App");
    assert.deepEqual(s.runs, [{ date: "2026-11-20", score: 80, verdict: "Ready", tier: "supervised", rechecked: "no", findingIds: ["UX-R1"] }]);
    assert.deepEqual(s.findings["UX-R1"], { priority: "P0", rule: "G1", title: "Problem UX-R1", firstSeen: "2026-11-20", lastSeen: "2026-11-20", status: "open" });
  }
});

test("UXSTATE-2 recordRun returns a new state and never mutates its inputs", () => {
  const a = recordRun({}, run("2026-11-20", [mk("UX-R1")]));
  const r = run("2026-11-27", [mk("UX-R2")]);
  const before = JSON.stringify([a, r]);
  const b = recordRun(a, r);
  assert.notEqual(a, b);
  assert.equal(JSON.stringify([a, r]), before);
});

test("UXSTATE-3 a finding seen again keeps firstSeen and moves lastSeen", () => {
  const s = recordRun(recordRun({}, run("2026-11-20", [mk("UX-R1")])), run("2026-11-27", [mk("UX-R1")]));
  assert.equal(s.findings["UX-R1"].firstSeen, "2026-11-20");
  assert.equal(s.findings["UX-R1"].lastSeen, "2026-11-27");
  assert.equal(s.findings["UX-R1"].status, "open");
});

test("UXSTATE-4 absent from a rechecked run becomes fixed with fixedOn", () => {
  const s = recordRun(recordRun({}, run("2026-11-20", [mk("UX-R1"), mk("UX-R2")])), run("2026-11-27", [mk("UX-R2")], { rechecked: "yes" }));
  assert.equal(s.findings["UX-R1"].status, "fixed");
  assert.equal(s.findings["UX-R1"].fixedOn, "2026-11-27");
  assert.equal(s.findings["UX-R2"].status, "open");
});

test("UXSTATE-5 absent from a non-rechecked run stays open", () => {
  const s = recordRun(recordRun({}, run("2026-11-20", [mk("UX-R1")])), run("2026-11-27", [], { rechecked: "no" }));
  assert.equal(s.findings["UX-R1"].status, "open");
  assert.equal(s.findings["UX-R1"].fixedOn, undefined);
});

test("UXSTATE-6 a fixed finding seen again reopens with reopened:true", () => {
  let s = recordRun({}, run("2026-11-20", [mk("UX-R1")]));
  s = recordRun(s, run("2026-11-27", [], { rechecked: "yes" }));
  s = recordRun(s, run("2026-12-04", [mk("UX-R1")]));
  assert.equal(s.findings["UX-R1"].status, "open");
  assert.equal(s.findings["UX-R1"].reopened, true);
  assert.equal(s.findings["UX-R1"].lastSeen, "2026-12-04");
});

test("UXSTATE-7 issues option stores issue numbers on findings", () => {
  const s = recordRun({}, run("2026-11-20", [mk("UX-R1"), mk("UX-R2")]), { issues: { "UX-R1": 42 } });
  assert.equal(s.findings["UX-R1"].issue, 42);
  assert.equal(s.findings["UX-R2"].issue, undefined);
});

test("UXSTATE-8 recording the same run twice is idempotent", () => {
  const r = run("2026-11-20", [mk("UX-R1")]);
  const once = recordRun({}, r);
  const twice = recordRun(once, r);
  assert.equal(twice.runs.length, 1);
  assert.deepEqual(twice, once);
});

test("UXSTATE-9 a run for a different product throws when the state has a product", () => {
  const s = recordRun({}, run("2026-11-20", [mk("UX-R1")]));
  assert.throws(() => recordRun(s, run("2026-11-27", [], { product: "Other App" })), /product/);
});

test("UXSTATE-10 CLI record creates the state file, exits 0 and prints one summary line", () => {
  const f = join(tmp(), "state.json");
  const r = cli("record", fx("before.md"), "--state", f);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim().split("\n").length, 1);
  assert.ok(existsSync(f));
  const s = JSON.parse(readFileSync(f, "utf8"));
  assert.equal(s.product, "Example App");
  assert.equal(Object.keys(s.findings).length, 6);
});

test("UXSTATE-11 CLI show prints open findings; a rechecked run's fixed findings are not listed", () => {
  const f = join(tmp(), "state.json");
  assert.equal(cli("record", fx("before.md"), "--state", f).status, 0);
  assert.equal(cli("record", fx("after-fixed.md"), "--state", f).status, 0);
  const r = cli("show", "--state", f);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /UX-R2/);
  assert.match(r.stdout, /UX-R7/);
  assert.doesNotMatch(r.stdout, /UX-R1\b/);
});

test("UXSTATE-12 CLI invalid run log exits 1 with reasons on stderr and writes nothing", () => {
  const f = join(tmp(), "state.json");
  const r = cli("record", join(here, "fixtures", "ux-issues", "invalid.md"), "--state", f);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /tier/);
  assert.equal(existsSync(f), false);
});

test("UXSTATE-13 CLI usage errors and unreadable files exit 2", () => {
  const d = tmp();
  const bad = join(d, "bad.json"); writeFileSync(bad, "not json");
  assert.equal(cli().status, 2);
  assert.equal(cli("nope").status, 2);
  assert.equal(cli("record", fx("before.md")).status, 2);
  assert.equal(cli("record", "--state", join(d, "s.json")).status, 2);
  assert.equal(cli("record", fx("no-such.md"), "--state", join(d, "s.json")).status, 2);
  assert.equal(cli("show").status, 2);
  assert.equal(cli("show", "--state", join(d, "missing.json")).status, 2);
  assert.equal(cli("show", "--state", bad).status, 2);
});
