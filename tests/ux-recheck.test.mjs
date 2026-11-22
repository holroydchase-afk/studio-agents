// UXRECHK-1: tests for tools/ux-recheck.mjs, the planner behind the ux-reviewer's recheck step.
// Pure functions and the CLI only: no network, no GitHub calls. Run: node --test tests/ux-recheck.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { planRecheck } from "../tools/ux-recheck.mjs";
import { checkUxRun } from "../tools/check-ux-run.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const tool = join(here, "..", "tools", "ux-recheck.mjs");
const fx = (n) => join(here, "fixtures", "ux-recheck", n);
const cli = (...a) => spawnSync("node", [tool, ...a], { encoding: "utf8" });
const runOf = (n) => { const r = checkUxRun(readFileSync(fx(n), "utf8")); assert.deepEqual(r.errors, []); return r.run; };
const existing = () => JSON.parse(readFileSync(fx("existing.json"), "utf8"));
const ids = (l) => l.map((i) => i.id);
const mk = (id, priority = "P1", extra = {}) => ({ id, priority, rule: "G1", shots: `shots/${id}.png`, ...extra });
const synth = (findings, extra = {}) => ({ date: "2026-11-20", product: "Example App", tier: "supervised", rechecked: "yes", findings, ...extra });
const empty = { close: [], reopen: [], keep: [], newFindings: [], errors: [] };

test("UXRECHK-1 a finding gone from the new run with an open issue is closed, with a reason", () => {
  const p = planRecheck(runOf("before.md"), runOf("after-fixed.md"), { existing: existing() });
  assert.deepEqual(p.errors, []);
  assert.deepEqual(ids(p.close), ["UX-R1"]);
  assert.equal(typeof p.close[0].reason, "string");
  assert.ok(p.close[0].reason.length > 0);
});

test("UXRECHK-1 a finding gone with a closed issue, or no issue, plans nothing", () => {
  const p = planRecheck(runOf("before.md"), runOf("after-fixed.md"), { existing: existing() });
  // UX-R4 gone with a closed issue, UX-R5 gone with no issue
  for (const id of ["UX-R4", "UX-R5"]) {
    for (const k of ["close", "reopen", "keep", "newFindings"]) assert.ok(!ids(p[k]).includes(id), `${id} in ${k}`);
  }
});

test("UXRECHK-1 a persisting finding with a closed issue is reopened with priority, new evidence and a reason", () => {
  const p = planRecheck(runOf("before.md"), runOf("after-fixed.md"), { existing: existing() });
  assert.deepEqual(ids(p.reopen), ["UX-R2"]);
  assert.equal(p.reopen[0].priority, "P0");
  assert.equal(p.reopen[0].evidence, "shots2/b.png"); // the after finding's shots, not the before ones
  assert.ok(typeof p.reopen[0].reason === "string" && p.reopen[0].reason.length > 0);
});

test("UXRECHK-1 a persisting finding with an open issue, or no issue, is kept", () => {
  const p = planRecheck(runOf("before.md"), runOf("after-fixed.md"), { existing: existing() });
  assert.deepEqual(p.keep, [{ id: "UX-R3" }, { id: "UX-R6" }]); // R3 open issue, R6 no issue; input order
});

test("UXRECHK-1 a finding only in the new run is a new finding, passed through whole", () => {
  const after = runOf("after-fixed.md");
  const p = planRecheck(runOf("before.md"), after, { existing: existing() });
  assert.deepEqual(ids(p.newFindings), ["UX-R7"]);
  assert.deepEqual(p.newFindings[0], after.findings.find((f) => f.id === "UX-R7"));
});

test("UXRECHK-1 the full plan for the fixtures", () => {
  const p = planRecheck(runOf("before.md"), runOf("after-fixed.md"), { existing: existing() });
  assert.deepEqual(ids(p.close), ["UX-R1"]);
  assert.deepEqual(ids(p.reopen), ["UX-R2"]);
  assert.deepEqual(p.keep, [{ id: "UX-R3" }, { id: "UX-R6" }]);
  assert.deepEqual(ids(p.newFindings), ["UX-R7"]);
  assert.deepEqual(p.errors, []);
});

test("UXRECHK-1 opts is optional: existing defaults to [], so nothing closes or reopens", () => {
  const p = planRecheck(runOf("before.md"), runOf("after-fixed.md"));
  assert.deepEqual(p.close, []);
  assert.deepEqual(p.reopen, []);
  assert.deepEqual(p.keep, [{ id: "UX-R2" }, { id: "UX-R3" }, { id: "UX-R6" }]);
  assert.deepEqual(ids(p.newFindings), ["UX-R7"]);
});

test("UXRECHK-1 a run that was not rechecked plans nothing and the error names rechecked", () => {
  const p = planRecheck(runOf("before.md"), runOf("after-not-rechecked.md"), { existing: existing() });
  assert.equal(p.errors.length, 1);
  assert.match(p.errors[0], /rechecked/);
  assert.deepEqual({ ...p, errors: [] }, empty);
});

test("UXRECHK-1 a different product plans nothing and the error names product", () => {
  const p = planRecheck(runOf("before.md"), runOf("other-product.md"), { existing: existing() });
  assert.equal(p.errors.length, 1);
  assert.match(p.errors[0], /product/);
  assert.deepEqual({ ...p, errors: [] }, empty);
});

test("UXRECHK-1 issues match by [id] in the title, not by substring of another id", () => {
  const before = synth([mk("UX-R1"), mk("UX-R10")]);
  const after = synth([]);
  const p = planRecheck(before, after, { existing: [{ title: "[UX-R10] Something", state: "open" }] });
  assert.deepEqual(ids(p.close), ["UX-R10"]);
  const q = planRecheck(before, after, { existing: [{ title: "Mentions UX-R1 in passing", state: "open" }] });
  assert.deepEqual(q.close, []);
});

test("UXRECHK-1 order follows input order within each list", () => {
  const before = synth([mk("UX-R3"), mk("UX-R1"), mk("UX-R2")]);
  const after = synth([mk("UX-R9"), mk("UX-R2"), mk("UX-R8")]);
  const ex = ["UX-R3", "UX-R1"].map((id) => ({ title: `[${id}] t`, state: "open" }));
  const p = planRecheck(before, after, { existing: ex });
  assert.deepEqual(ids(p.close), ["UX-R3", "UX-R1"]);
  assert.deepEqual(ids(p.newFindings), ["UX-R9", "UX-R8"]);
});

test("UXRECHK-1 an empty after run closes every open issue; empty both is an empty plan", () => {
  const p = planRecheck(synth([mk("UX-R1")]), synth([]), { existing: [{ title: "[UX-R1] t", state: "open" }] });
  assert.deepEqual(ids(p.close), ["UX-R1"]);
  assert.deepEqual(planRecheck(synth([]), synth([])), empty);
});

test("UXRECHK-1 planRecheck never mutates its inputs", () => {
  const b = runOf("before.md"), a = runOf("after-fixed.md"), e = existing();
  const s = JSON.stringify([b, a, e]);
  planRecheck(b, a, { existing: e });
  assert.equal(JSON.stringify([b, a, e]), s);
});

test("UXRECHK-1 CLI prints the plan as JSON and exits 0", () => {
  const r = cli(fx("before.md"), fx("after-fixed.md"), "--existing", fx("existing.json"));
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), planRecheck(runOf("before.md"), runOf("after-fixed.md"), { existing: existing() }));
  const bare = cli(fx("before.md"), fx("after-fixed.md"));
  assert.equal(bare.status, 0, bare.stderr);
  assert.deepEqual(JSON.parse(bare.stdout), planRecheck(runOf("before.md"), runOf("after-fixed.md")));
});

test("UXRECHK-1 CLI prints a not-rechecked or other-product plan with its error and exits 0", () => {
  for (const [f, re] of [["after-not-rechecked.md", /rechecked/], ["other-product.md", /product/]]) {
    const r = cli(fx("before.md"), fx(f));
    assert.equal(r.status, 0, r.stderr);
    assert.match(JSON.parse(r.stdout).errors[0], re);
  }
});

test("UXRECHK-1 CLI invalid run log exits 1, stdout empty, stderr prefixed with the file that failed", () => {
  const bad = join(here, "fixtures", "ux-issues", "invalid.md");
  const r1 = cli(bad, fx("after-fixed.md"));
  assert.equal(r1.status, 1);
  assert.equal(r1.stdout, "");
  assert.ok(r1.stderr.includes("invalid.md"), r1.stderr);
  assert.match(r1.stderr, /tier/);
  const r2 = cli(fx("before.md"), bad);
  assert.equal(r2.status, 1);
  assert.equal(r2.stdout, "");
  assert.ok(r2.stderr.includes("invalid.md"), r2.stderr);
});

test("UXRECHK-1 CLI usage errors and unreadable files exit 2", () => {
  assert.equal(cli().status, 2);
  assert.equal(cli(fx("before.md")).status, 2);
  assert.equal(cli(fx("before.md"), fx("after-fixed.md"), fx("before.md")).status, 2);
  assert.equal(cli(fx("before.md"), fx("after-fixed.md"), "--nope").status, 2);
  assert.equal(cli(fx("before.md"), fx("after-fixed.md"), "--existing").status, 2);
  assert.equal(cli(fx("no-such.md"), fx("after-fixed.md")).status, 2);
  assert.equal(cli(fx("before.md"), fx("no-such.md")).status, 2);
  assert.equal(cli(fx("before.md"), fx("after-fixed.md"), "--existing", fx("no-such.json")).status, 2);
  assert.equal(cli(fx("before.md"), fx("after-fixed.md"), "--existing", fx("before.md")).status, 2); // not JSON
  assert.equal(cli(fx("before.md"), fx("after-fixed.md"), "--existing", fx("other-product.md")).status, 2);
});

test("UXRECHK-1 CLI a valid-JSON --existing that is not an array, or has bad items, exits 2", async () => {
  const { writeFileSync, mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const d = mkdtempSync(join(tmpdir(), "uxrecheck-"));
  for (const [n, body] of [["obj.json", "{}"], ["str.json", '"x"'], ["bad-item.json", '[{"title": 5, "state": "open"}]']]) {
    writeFileSync(join(d, n), body);
    assert.equal(cli(fx("before.md"), fx("after-fixed.md"), "--existing", join(d, n)).status, 2, n);
  }
});
