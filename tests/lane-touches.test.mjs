// Failing-first tests for docs/pipeline-plan.md build step 2: "Staff PM adds lane: and touches: lines to the spec
// block; check-spec accepts them". LANE-1..N, written by qa-tdd; red until the engineer builds it.
//   check-spec: optional `lane: ui|logic|docs|config` and `touches: live|non-live|hearth`, at most one each, unknown
//   value is an error naming the allowed values, parsed as spec.lane / spec.touches (null when absent), old specs valid.
//   pipeline-run init --ledger F --spec FILE [--root DIR]: lane and touches come from the last spec block (via
//   checkSpec); exit 2 when a key is missing, the spec is invalid, the file is missing, or --spec is mixed with
//   --lane/--touches; the ledger is identical to the explicit form. staff-pm.md documents both keys.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PIPE = path.join(ROOT, "tools", "pipeline-run.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lane-touches-"));
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));
let n = 0;

const BASE = [
  "verdict: ready",
  "bet: A lane line lets the pipeline start itself; it worked when init needs no flags",
  "step: M1.1 | read lane from spec | LANE-1 green | 1 session",
  "criterion: LANE-1 | auto | Given a spec with lane: ui, then the parsed lane is ui and the count is 1",
  "risk: Old specs break | LANE-1",
  "handoff: qa-tdd | failing tests for LANE-1 | red for the right reason",
];
const spec = (extra = [], base = BASE) => `# Spec\n\n\`\`\`spec\n${[...base, ...extra].join("\n")}\n\`\`\`\n`;
async function check(text) { return (await import("../tools/check-spec.mjs")).checkSpec(text); }
const file = (name, text) => { const p = path.join(tmp, `${n++}-${name}`); fs.writeFileSync(p, text); return p; };
const pipe = (args) => { const r = spawnSync(process.execPath, [PIPE, ...args], { encoding: "utf8", timeout: 30000 }); return { code: r.status, out: r.stdout || "", err: r.stderr || "" }; };
const ledgerPath = () => path.join(tmp, `ledger-${n++}.json`);
const initSpec = (specFile, ledger, extra = []) => pipe(["init", "--ledger", ledger, "--spec", specFile, "--root", path.join(tmp, "root"), ...extra]);

test("LANE-1 check-spec accepts lane and touches and parses them", async () => {
  const r = await check(spec(["lane: ui", "touches: live"]));
  assert.deepEqual(r.errors, []);
  assert.equal(r.spec.lane, "ui");
  assert.equal(r.spec.touches, "live");
});

test("LANE-2 every allowed lane and touches value is accepted, case-insensitively", async () => {
  for (const lane of ["ui", "logic", "docs", "config", "LOGIC"]) {
    const r = await check(spec([`lane: ${lane}`, "touches: non-live"]));
    assert.deepEqual(r.errors, [], `lane ${lane}`);
    assert.equal(r.spec.lane, lane.toLowerCase());
  }
  for (const t of ["live", "non-live", "hearth", "Hearth"]) {
    const r = await check(spec(["lane: docs", `touches: ${t}`]));
    assert.deepEqual(r.errors, [], `touches ${t}`);
    assert.equal(r.spec.touches, t.toLowerCase());
  }
});

test("LANE-3 a spec without lane and touches stays valid and parses them as null", async () => {
  const r = await check(spec());
  assert.deepEqual(r.errors, []);
  assert.equal(r.spec.lane, null);
  assert.equal(r.spec.touches, null);
});

test("LANE-4 lane or touches alone is valid (each is optional on its own)", async () => {
  const a = await check(spec(["lane: config"]));
  assert.deepEqual(a.errors, []);
  assert.equal(a.spec.touches, null);
  const b = await check(spec(["touches: hearth"]));
  assert.deepEqual(b.errors, []);
  assert.equal(b.spec.lane, null);
});

test("LANE-5 a second lane: or touches: line is an error", async () => {
  const a = await check(spec(["lane: ui", "lane: logic"]));
  assert.ok(a.errors.some((e) => /more than one lane/.test(e)), a.errors.join("\n"));
  const b = await check(spec(["touches: live", "touches: live"]));
  assert.ok(b.errors.some((e) => /more than one touches/.test(e)), b.errors.join("\n"));
});

test("LANE-6 an unknown lane or touches value is an error naming the allowed values", async () => {
  const a = await check(spec(["lane: frontend"]));
  assert.ok(a.errors.some((e) => /frontend/.test(e) && /ui, logic, docs, config/.test(e)), a.errors.join("\n"));
  const b = await check(spec(["touches: prod"]));
  assert.ok(b.errors.some((e) => /prod/.test(e) && /live, non-live, hearth/.test(e)), b.errors.join("\n"));
});

test("LANE-7 an empty lane: or touches: value is an error, not a silent null", async () => {
  const a = await check(spec(["lane:"]));
  assert.ok(a.errors.some((e) => /lane/.test(e) && /ui, logic, docs, config/.test(e)), a.errors.join("\n"));
  const b = await check(spec(["touches:   "]));
  assert.ok(b.errors.some((e) => /touches/.test(e) && /live, non-live, hearth/.test(e)), b.errors.join("\n"));
});

test("LANE-8 KEYS lists lane and touches, and the value lists equal pipeline-run's LANES and TOUCHES", async () => {
  const cs = await import("../tools/check-spec.mjs");
  const pr = await import("../tools/pipeline-run.mjs");
  assert.ok(cs.KEYS.includes("lane") && cs.KEYS.includes("touches"), `KEYS is ${cs.KEYS}`);
  // check-spec must export the lists it validates against; they must be the very same values pipeline-run uses.
  assert.deepEqual(cs.LANES, pr.LANES);
  assert.deepEqual(cs.TOUCHES, pr.TOUCHES);
  assert.deepEqual(pr.LANES, ["ui", "logic", "docs", "config", "review"]); // review added by REVIEW-1
  assert.deepEqual(pr.TOUCHES, ["live", "non-live", "hearth"]);
});

test("LANE-9 existing specs and fixtures in the repo still pass check-spec (backward compatible)", async () => {
  const { checkSpec } = await import("../tools/check-spec.mjs");
  const cs = spec();
  assert.deepEqual(checkSpec(cs).errors, []);
  // the staff-pm.md example block is the canonical existing spec and must stay valid
  const pm = fs.readFileSync(path.join(ROOT, "plugins/studio/agents/staff-pm.md"), "utf8");
  const ex = pm.match(/```spec\n[\s\S]*?\n```/g);
  assert.ok(ex && ex.length, "staff-pm.md has a spec example");
  const r = checkSpec(ex[ex.length - 1] + "\n");
  assert.deepEqual(r.errors, []);
});

test("LANE-10 the --json output carries lane and touches", () => {
  const f = file("s.md", spec(["lane: logic", "touches: non-live"]));
  const r = spawnSync(process.execPath, [path.join(ROOT, "tools", "check-spec.mjs"), f, "--json"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout);
  assert.equal(j.lane, "logic");
  assert.equal(j.touches, "non-live");
});

test("LANE-11 init --spec writes the same ledger as the explicit --lane and --touches form", () => {
  const f = file("s.md", spec(["lane: docs", "touches: non-live"]));
  const a = ledgerPath(), b = ledgerPath();
  const r = initSpec(f, a);
  assert.equal(r.code, 0, r.out + r.err);
  assert.equal(pipe(["init", "--ledger", b, "--lane", "docs", "--touches", "non-live", "--root", path.join(tmp, "root")]).code, 0);
  assert.equal(fs.readFileSync(a, "utf8"), fs.readFileSync(b, "utf8"));
  assert.equal(JSON.parse(fs.readFileSync(a, "utf8")).lane, "docs");
});

test("LANE-12 init --spec reads the last spec block when a file has several", () => {
  const quoted = "```spec\n" + [...BASE, "lane: ui", "touches: live"].join("\n") + "\n```\n\nand the real one:\n\n";
  const f = file("s.md", quoted + spec(["lane: config", "touches: hearth"]));
  const a = ledgerPath();
  assert.equal(initSpec(f, a).code, 0);
  const l = JSON.parse(fs.readFileSync(a, "utf8"));
  assert.equal(l.lane, "config");
  assert.equal(l.touches, "hearth");
});

test("LANE-13 init --spec exits 2 when the spec lacks lane or touches, and writes no ledger", () => {
  for (const extra of [[], ["lane: ui"], ["touches: live"]]) {
    const a = ledgerPath();
    const r = initSpec(file("s.md", spec(extra)), a);
    assert.equal(r.code, 2, `${extra}: ${r.out}${r.err}`);
    assert.match(r.err, /spec/i, "the error names the spec as the source");
    assert.match(r.err, /lane|touches/);
    assert.equal(fs.existsSync(a), false);
  }
});

test("LANE-14 init --spec exits 2 for an invalid spec, a missing file and a file with no spec block", () => {
  const bad = ledgerPath();
  const r1 = initSpec(file("s.md", spec(["lane: ui", "touches: live"], BASE.filter((l) => !l.startsWith("bet:")))), bad);
  assert.equal(r1.code, 2, r1.out + r1.err);
  assert.match(r1.err, /bet/, "the spec's own error is shown");
  assert.equal(fs.existsSync(bad), false);
  const r2 = initSpec(path.join(tmp, "nope.md"), ledgerPath());
  assert.equal(r2.code, 2, r2.out + r2.err);
  assert.match(r2.err, /nope\.md/);
  const r3 = initSpec(file("s.md", "# no block here\n"), ledgerPath());
  assert.equal(r3.code, 2, r3.out + r3.err);
  assert.match(r3.err, /spec/i);
});

test("LANE-15 init --spec combined with --lane or --touches exits 2", () => {
  const f = file("s.md", spec(["lane: ui", "touches: live"]));
  for (const extra of [["--lane", "ui"], ["--touches", "live"], ["--lane", "ui", "--touches", "live"]]) {
    const a = ledgerPath();
    const r = initSpec(f, a, extra);
    assert.equal(r.code, 2, `${extra}: ${r.out}${r.err}`);
    assert.match(r.err, /--spec/);
    assert.equal(fs.existsSync(a), false);
  }
});

test("LANE-16 init --spec never overwrites an existing ledger (still exit 1, as the explicit form)", () => {
  const f = file("s.md", spec(["lane: ui", "touches: live"]));
  const a = ledgerPath();
  assert.equal(initSpec(f, a).code, 0);
  const before = fs.readFileSync(a, "utf8");
  const r = initSpec(f, a);
  assert.equal(r.code, 1, r.out + r.err);
  assert.equal(fs.readFileSync(a, "utf8"), before);
});

test("LANE-17 staff-pm.md documents lane: and touches: with allowed values and says merge class stays with pipeline-run class", () => {
  const pm = fs.readFileSync(path.join(ROOT, "plugins/studio/agents/staff-pm.md"), "utf8");
  assert.match(pm, /`lane:`/);
  assert.match(pm, /`touches:`/);
  assert.match(pm, /ui, logic, docs/);
  assert.match(pm, /live, non-live, hearth|live, non-live or hearth|live\W+non-live\W+(or\s+)?hearth/);
  assert.match(pm, /pipeline-run class/);
  assert.match(pm, /not (decided )?by (the )?Staff PM|Staff PM does not decide|staff-pm does not decide|not by staff-pm/i);
});
