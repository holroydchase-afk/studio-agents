// UXISSUE-1: tests for tools/ux-issues.mjs, the planner behind the ux-reviewer's file-issues step.
// Pure functions and the CLI only: no network, no GitHub calls. Run: node --test tests/ux-issues.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { planIssues, renderBody } from "../tools/ux-issues.mjs";
import { checkUxRun } from "../tools/check-ux-run.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const tool = join(here, "..", "tools", "ux-issues.mjs");
const fx = (n) => join(here, "fixtures", "ux-issues", n);
const cli = (...a) => spawnSync("node", [tool, ...a], { encoding: "utf8" });
const runOf = (n) => { const r = checkUxRun(readFileSync(fx(n), "utf8")); assert.deepEqual(r.errors, []); return r.run; };
const existing = () => JSON.parse(readFileSync(fx("existing.json"), "utf8"));
const ids = (l) => l.map((i) => i.id);
const mk = (id, priority, extra = {}) => ({ id, priority, rule: "G1", shots: "shots/x.png", ...extra });
const synth = (findings, tier = "supervised") => ({ date: "2026-11-20", product: "Example App", tier, findings });

test("UXISSUE-1 check-ux-run accepts a 6-part finding and returns problem and fix", () => {
  const r = checkUxRun(readFileSync(join(here, "fixtures", "ux-run", "valid-finding-with-fix.md"), "utf8"));
  assert.deepEqual(r.errors, []);
  assert.equal(r.run.findings[0].problem, "Sign in button is below the fold on a phone");
  assert.equal(r.run.findings[0].fix, "Move the button above the keyboard area");
  assert.equal(r.run.findings[1].problem, null); // 4-part line: null, not undefined
  assert.equal(r.run.findings[1].fix, null);
});

test("UXISSUE-1 check-ux-run rejects a 5-part finding and still names finding", () => {
  const r = checkUxRun(readFileSync(join(here, "fixtures", "ux-run", "invalid-finding-five-parts.md"), "utf8"));
  assert.ok(r.errors.some((e) => /finding/.test(e)), JSON.stringify(r.errors));
});

test("UXISSUE-1 advisory tier files nothing and says why", () => {
  const p = planIssues(runOf("advisory.md"), { existing: [] });
  assert.deepEqual(p.issues, []);
  assert.equal(p.errors.length, 1);
  assert.match(p.errors[0], /advisory/);
});

test("UXISSUE-1 allowAdvisory true plans issues for an advisory log", () => {
  const p = planIssues(runOf("advisory.md"), { allowAdvisory: true });
  assert.deepEqual(p.errors, []);
  assert.ok(p.issues.length > 0);
});

test("UXISSUE-1 only P0 and P1 become issues; P2 is skipped with a P2 reason", () => {
  const p = planIssues(runOf("supervised-mixed.md"), { max: 10 });
  assert.ok(!ids(p.issues).includes("UX-R2"));
  const s = p.skipped.find((x) => x.id === "UX-R2");
  assert.ok(s && /P2/.test(s.reason), JSON.stringify(p.skipped));
});

test("UXISSUE-1 an open issue with the id is a duplicate; a closed one does not block", () => {
  const p = planIssues(runOf("supervised-mixed.md"), { existing: existing(), max: 10 });
  const d = p.skipped.find((x) => x.id === "UX-R4");
  assert.ok(d && /duplicate/.test(d.reason), JSON.stringify(p.skipped));
  assert.ok(ids(p.issues).includes("UX-R5"), "UX-R5 only has a closed issue, so it is filed");
  assert.ok(!ids(p.issues).includes("UX-R4"));
});

test("UXISSUE-1 default cap is 3, P0 first then P1 in input order; extras skipped with a cap reason", () => {
  const p = planIssues(runOf("supervised-mixed.md"), { existing: existing() });
  assert.deepEqual(p.errors, []);
  assert.deepEqual(ids(p.issues), ["UX-R3", "UX-R1", "UX-R5"]);
  const c = p.skipped.find((x) => x.id === "UX-R6");
  assert.ok(c && /cap/.test(c.reason), JSON.stringify(p.skipped));
  assert.ok(p.skipped.some((x) => x.id === "UX-R4" && /duplicate/.test(x.reason)), "duplicates do not use the cap");
  assert.ok(p.skipped.some((x) => x.id === "UX-R2" && /P2/.test(x.reason)));
});

test("UXISSUE-1 max overrides the cap", () => {
  assert.equal(planIssues(runOf("supervised-mixed.md"), { max: 1 }).issues.length, 1);
  assert.deepEqual(ids(planIssues(runOf("supervised-mixed.md"), { max: 1 }).issues), ["UX-R3"]);
  assert.equal(planIssues(runOf("supervised-mixed.md"), { max: 10 }).issues.length, 5); // R1 R3 R4 R5 R6
});

test("UXISSUE-1 a P1 listed before a P0 still files after it", () => {
  const p = planIssues(synth([mk("UX-R1", "P1"), mk("UX-R2", "P0")]), { max: 1 });
  assert.deepEqual(ids(p.issues), ["UX-R2"]);
});

test("UXISSUE-1 issue shape: id, title starts with [id], body, labels", () => {
  const p = planIssues(runOf("supervised-mixed.md"), { max: 10 });
  const one = p.issues.find((i) => i.id === "UX-R1");
  assert.ok(one.title.startsWith("[UX-R1] "), one.title);
  assert.ok(one.title.includes("Sign in button is below the fold"), one.title);
  assert.deepEqual(one.labels, ["ux", "p1"]);
  assert.deepEqual(p.issues.find((i) => i.id === "UX-R3").labels, ["ux", "p0"]);
  assert.equal(typeof one.body, "string");
});

test("UXISSUE-1 title falls back to the rule when there is no problem, and is at most 120 chars", () => {
  const p = planIssues(runOf("supervised-mixed.md"), { max: 10 });
  const t = p.issues.find((i) => i.id === "UX-R5").title;
  assert.ok(t.startsWith("[UX-R5] ") && t.includes("G3"), t);
  const long = planIssues(synth([mk("UX-R1", "P1", { problem: "x".repeat(300) })]), {});
  assert.ok(long.issues[0].title.length <= 120 && long.issues[0].title.startsWith("[UX-R1] "), long.issues[0].title.length);
});

test("UXISSUE-1 renderBody has id, priority, rule, evidence, product, date, problem and fix", () => {
  const run = runOf("supervised-mixed.md");
  const b = renderBody(run.findings[0], run);
  for (const s of ["UX-R1", "P1", "G4", "shots/a.png", "Example App", "2026-11-20",
    "Sign in button is below the fold on a phone", "Move the button above the keyboard area"]) assert.ok(b.includes(s), `body lacks ${s}`);
  const bare = renderBody(run.findings.find((f) => f.id === "UX-R5"), run);
  for (const s of ["UX-R5", "P1", "G3", "shots/e.png", "Example App", "2026-11-20"]) assert.ok(bare.includes(s), `bare body lacks ${s}`);
  assert.ok(!/null|undefined/.test(bare), "no null or undefined text when problem and fix are absent");
});

test("UXISSUE-1 planIssues never mutates its input and tolerates no opts", () => {
  const run = runOf("supervised-mixed.md"); const before = JSON.stringify(run);
  planIssues(run);
  assert.equal(JSON.stringify(run), before);
  assert.deepEqual(planIssues(synth([])), { issues: [], skipped: [], errors: [] });
});

test("UXISSUE-1 CLI prints the plan as JSON and exits 0", () => {
  const r = cli(fx("supervised-mixed.md"), "--existing", fx("existing.json"));
  assert.equal(r.status, 0, r.stderr);
  const plan = JSON.parse(r.stdout);
  assert.deepEqual(ids(plan.issues), ["UX-R3", "UX-R1", "UX-R5"]);
  assert.deepEqual(plan, planIssues(runOf("supervised-mixed.md"), { existing: existing() }));
  assert.equal(JSON.parse(cli(fx("supervised-mixed.md"), "--max", "1").stdout).issues.length, 1);
});

test("UXISSUE-1 CLI advisory log without --allow-advisory prints the plan with the error and exits 0", () => {
  const r = cli(fx("advisory.md"));
  assert.equal(r.status, 0, r.stderr);
  const plan = JSON.parse(r.stdout);
  assert.deepEqual(plan.issues, []);
  assert.match(plan.errors[0], /advisory/);
  const ok = JSON.parse(cli(fx("advisory.md"), "--allow-advisory").stdout);
  assert.deepEqual(ok.errors, []);
  assert.ok(ok.issues.length > 0);
});

test("UXISSUE-1 CLI invalid run log exits 1 with reasons on stderr and nothing on stdout", () => {
  const r = cli(fx("invalid.md"));
  assert.equal(r.status, 1);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, /tier/);
});

test("UXISSUE-1 CLI usage errors and unreadable files exit 2", () => {
  assert.equal(cli().status, 2);
  assert.equal(cli(fx("supervised-mixed.md"), "--nope").status, 2);
  assert.equal(cli(fx("supervised-mixed.md"), "--max").status, 2);
  assert.equal(cli(fx("supervised-mixed.md"), "--max", "abc").status, 2);
  assert.equal(cli(fx("supervised-mixed.md"), "--existing").status, 2);
  assert.equal(cli(fx("no-such.md")).status, 2);
  assert.equal(cli(fx("supervised-mixed.md"), "--existing", fx("no-such.json")).status, 2);
  assert.equal(cli(fx("supervised-mixed.md"), "--existing", fx("supervised-mixed.md")).status, 2); // not JSON
});
