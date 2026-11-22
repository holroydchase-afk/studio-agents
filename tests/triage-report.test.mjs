// TRIAGE-1..n: tests for tools/triage-report.mjs, the inbox for real-world agent misses.
// CLI only: no network. Each test uses its own temp dir via TRIAGE_REPORTS_DIR.
// Run: node --test tests/triage-report.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const tool = join(here, "..", "tools", "triage-report.mjs");
const mkdir = () => mkdtempSync(join(tmpdir(), "triage-"));
const run = (dir, ...a) => spawnSync("node", [tool, ...a], { encoding: "utf8", env: { ...process.env, TRIAGE_REPORTS_DIR: dir } });
const inbox = (dir) => join(dir, "inbox.jsonl");
const lines = (dir) => readFileSync(inbox(dir), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const add = (dir, ...extra) => run(dir, "add", "--product", "Example App", "--summary", "Button overlaps text", ...extra);

test("TRIAGE-1 add creates inbox.jsonl with RPT-1 and the full entry shape", () => {
  const d = mkdir();
  const r = add(d, "--lane", "ux", "--evidence", "shots/a.png", "--pattern", "overlap");
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(inbox(d)));
  const e = lines(d)[0];
  assert.equal(e.id, "RPT-1");
  assert.equal(e.product, "Example App");
  assert.deepEqual(e.lanes, ["ux"]);
  assert.equal(e.summary, "Button overlaps text");
  assert.equal(e.evidence, "shots/a.png");
  assert.equal(e.confirmed, "unchecked");
  assert.equal(e.pattern, "overlap");
  assert.deepEqual(e.split, { ux: "dev" });
  assert.equal(e.status, "open");
  assert.equal(e.case, null);
  assert.match(e.date, /^\d{4}-\d{2}-\d{2}/);
  assert.deepEqual(JSON.parse(r.stdout), e);
});

test("TRIAGE-2 ids are sequential and each line is one JSON object", () => {
  const d = mkdir();
  add(d, "--lane", "ux"); add(d, "--lane", "ux"); add(d, "--lane", "ux");
  assert.deepEqual(lines(d).map((e) => e.id), ["RPT-1", "RPT-2", "RPT-3"]);
});

test("TRIAGE-3 split alternates per lane: dev, heldout, dev", () => {
  const d = mkdir();
  add(d, "--lane", "ux"); add(d, "--lane", "ux"); add(d, "--lane", "ux");
  assert.deepEqual(lines(d).map((e) => e.split.ux), ["dev", "heldout", "dev"]);
});

test("TRIAGE-4 split counts are per lane, not global", () => {
  const d = mkdir();
  add(d, "--lane", "ux");
  add(d, "--lane", "qa-tdd");
  add(d, "--lane", "ux", "--lane", "qa-tdd");
  const e = lines(d);
  assert.deepEqual(e[1].split, { "qa-tdd": "dev" });
  assert.deepEqual(e[2].split, { ux: "heldout", "qa-tdd": "heldout" });
});

test("TRIAGE-5 lane aliases pm and qa normalise", () => {
  const d = mkdir();
  const r = add(d, "--lane", "pm", "--lane", "qa");
  assert.equal(r.status, 0, r.stderr);
  const e = lines(d)[0];
  assert.deepEqual(e.lanes, ["staff-pm", "qa-tdd"]);
  assert.deepEqual(Object.keys(e.split).sort(), ["qa-tdd", "staff-pm"]);
});

test("TRIAGE-6 stderr has one next-step line per lane naming where the case goes", () => {
  const d = mkdir();
  const r = add(d, "--lane", "ux", "--lane", "staff-pm", "--lane", "qa-tdd");
  assert.match(r.stderr, /plugins\/studio\/evals\/ux-reviewer-fresh-real-/);
  assert.match(r.stderr, /evals\/agent-misses\/staff-pm-cases/);
  assert.match(r.stderr, /evals\/agent-misses\/qa-tdd-cases/);
  assert.equal(r.stderr.split("\n").filter(Boolean).length, 3);
});

test("TRIAGE-7 add refuses bad input with exit 1 and a reason, and writes nothing", () => {
  const cases = [
    [["add", "--product", "P", "--summary", "s"], /lane/i],
    [["add", "--product", "P", "--lane", "design", "--summary", "s"], /lane/i],
    [["add", "--product", "P", "--lane", "ux", "--summary", "  "], /summary/i],
    [["add", "--product", "P", "--lane", "ux", "--summary", "s", "--confirmed", "maybe"], /confirmed/i],
    [["add", "--lane", "ux", "--summary", "s"], /product/i],
  ];
  for (const [args, re] of cases) {
    const d = mkdir();
    const r = run(d, ...args);
    assert.equal(r.status, 1, args.join(" "));
    assert.match(r.stderr, re, args.join(" "));
    assert.ok(!existsSync(inbox(d)), "nothing written for " + args.join(" "));
  }
});

test("TRIAGE-8 privacy: an email or phone number in summary or evidence is refused", () => {
  const bad = [
    ["--summary", "Contact jane.doe@example.com about it"],
    ["--summary", "Call 704-555-0143 to repro"],
    ["--summary", "ok", "--evidence", "mailto:someone@example.org"],
    ["--summary", "ok", "--evidence", "notes (304) 555 0199"],
  ];
  for (const extra of bad) {
    const d = mkdir();
    const r = run(d, "add", "--product", "P", "--lane", "ux", ...extra);
    assert.equal(r.status, 1, extra.join(" "));
    assert.match(r.stderr, /email|phone|privacy/i, extra.join(" "));
    assert.ok(!existsSync(inbox(d)));
  }
});

test("TRIAGE-9 confirmed accepts yes, no and unchecked", () => {
  const d = mkdir();
  for (const c of ["yes", "no", "unchecked"]) assert.equal(add(d, "--lane", "ux", "--confirmed", c).status, 0);
  assert.deepEqual(lines(d).map((e) => e.confirmed), ["yes", "no", "unchecked"]);
});

test("TRIAGE-10 suggest routes by keyword", () => {
  const d = mkdir();
  const s = (t) => JSON.parse(run(d, "suggest", t).stdout);
  assert.deepEqual(s("The tap target is too small and the contrast is ugly").lanes, ["ux"]);
  assert.deepEqual(s("Missing requirement: we should have asked about scope").lanes, ["staff-pm"]);
  assert.deepEqual(s("Regression: wrong number shown after save").lanes, ["qa-tdd"]);
  const r = s("Button overlap, and it passes tests but crashed");
  assert.ok(r.lanes.includes("ux") && r.lanes.includes("qa-tdd"), JSON.stringify(r));
  assert.ok(Array.isArray(r.reasons) && r.reasons.length >= 2);
});

test("TRIAGE-11 suggest with no keyword match returns no lanes and says to route by hand", () => {
  const r = JSON.parse(run(mkdir(), "suggest", "the weather was nice").stdout);
  assert.deepEqual(r.lanes, []);
  assert.deepEqual(r.reasons, ["no keyword match: route by hand"]);
});

test("TRIAGE-12 list prints one line per entry and filters by lane and status", () => {
  const d = mkdir();
  add(d, "--lane", "ux"); add(d, "--lane", "qa");
  run(d, "status", "RPT-2", "rejected");
  const all = run(d, "list").stdout.trim().split("\n");
  assert.equal(all.length, 2);
  assert.match(all[0], /^RPT-1 \| Example App \| ux \| open \| Button overlaps text$/);
  assert.match(all[1], /^RPT-2 \| Example App \| qa-tdd \| rejected \| /);
  assert.equal(run(d, "list", "--lane", "qa-tdd").stdout.trim().split("\n").length, 1);
  assert.match(run(d, "list", "--status", "open").stdout, /^RPT-1 /);
  assert.equal(run(d, "list", "--status", "open").stdout.includes("RPT-2"), false);
});

test("TRIAGE-13 status case-added needs --case and updates the entry", () => {
  const d = mkdir();
  add(d, "--lane", "ux");
  const no = run(d, "status", "RPT-1", "case-added");
  assert.equal(no.status, 1);
  assert.match(no.stderr, /case/i);
  assert.equal(lines(d)[0].status, "open");
  const ok = run(d, "status", "RPT-1", "case-added", "--case", "fresh-real-01");
  assert.equal(ok.status, 0, ok.stderr);
  const e = lines(d)[0];
  assert.equal(e.status, "case-added");
  assert.equal(e.case, "fresh-real-01");
});

test("TRIAGE-14 status rejects an unknown id or status with exit 1", () => {
  const d = mkdir();
  add(d, "--lane", "ux");
  assert.equal(run(d, "status", "RPT-9", "rejected").status, 1);
  assert.equal(run(d, "status", "RPT-1", "done").status, 1);
  assert.equal(lines(d)[0].status, "open");
});

test("TRIAGE-15 --check passes a clean inbox", () => {
  const d = mkdir();
  add(d, "--lane", "ux"); add(d, "--lane", "pm", "--lane", "qa");
  const r = run(d, "--check");
  assert.equal(r.status, 0, r.stderr);
});

test("TRIAGE-16 --check reports one reason per bad line", () => {
  const d = mkdir();
  add(d, "--lane", "ux"); add(d, "--lane", "ux");
  const good = lines(d);
  const bad = [
    good[0],
    { ...good[1], id: "RPT-5" },                                  // not sequential
    { ...good[0], id: "RPT-3", lanes: ["design"], split: { design: "dev" } }, // unknown lane
    { ...good[0], id: "RPT-4", split: { qa: "dev" } },            // split does not match lanes
    { ...good[0], id: "RPT-5", summary: "mail me at a.b@example.com" }, // email
  ];
  writeFileSync(inbox(d), bad.map((e) => JSON.stringify(e)).join("\n") + "\nnot json\n");
  const r = run(d, "--check");
  assert.equal(r.status, 1);
  const reasons = r.stderr.split("\n").filter(Boolean);
  assert.ok(reasons.length >= 5, r.stderr);
  for (const n of [2, 3, 4, 5, 6]) assert.ok(reasons.some((l) => l.includes(String(n))), `line ${n} named: ${r.stderr}`);
  assert.ok(reasons.some((l) => /sequential|id/i.test(l)));
  assert.ok(reasons.some((l) => /lane/i.test(l)));
  assert.ok(reasons.some((l) => /split/i.test(l)));
  assert.ok(reasons.some((l) => /email/i.test(l)));
  assert.ok(reasons.some((l) => /parse|json/i.test(l)));
});

test("TRIAGE-17 default dir is evals/reports when TRIAGE_REPORTS_DIR is unset", () => {
  const cwd = mkdir();
  const env = { ...process.env }; delete env.TRIAGE_REPORTS_DIR;
  const r = spawnSync("node", [tool, "add", "--product", "P", "--lane", "ux", "--summary", "s"], { encoding: "utf8", cwd, env });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(cwd, "evals", "reports", "inbox.jsonl")));
});
