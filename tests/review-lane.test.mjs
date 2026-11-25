// Failing-first tests for docs/pipeline-plan.md "finish lanes": a fifth `review` lane for runs that review a codebase
// and cannot build or run its suites (the Hearth run: no Postgres in cloud, verify ended `blocked`, the ledger refused it).
// REVIEW-1..N, written by qa-tdd; red until the engineer builds it.
//   LANES (check-spec and pipeline-run) gain "review"; it skips tests-pre and build like docs and config.
//   In the review lane only, `done verify` accepts any valid qa verdict (green, red, flaky, blocked) and does not
//   stop the run; the verdict is stored as stages.verify.verdict and shown in status (text and --json), so `pr` can start.
//   An invalid qa block is still a validator strike. Other lanes still refuse a non-green verify; the verdict is
//   recorded on green too. Merge class ignores the lane. A ledger without the verdict field still loads (null).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PIPE = path.join(ROOT, "tools", "pipeline-run.mjs");
const CHECK_SPEC = path.join(ROOT, "tools", "check-spec.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "review-lane-"));
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));
let n = 0;

const BASE = [
  "verdict: ready",
  "bet: A review lane lets a run that cannot build still finish; it worked when verify blocked no longer ends the run",
  "step: M1.1 | add the review lane | REVIEW-1 green | 1 session",
  "criterion: REVIEW-1 | auto | Given lane: review, then the spec has 0 errors and the lane is \"review\"",
  "risk: Other lanes weaken | REVIEW-1",
  "handoff: qa-tdd | failing tests for REVIEW-1 | red for the right reason",
];
const spec = (extra = []) => `# Spec\n\n\`\`\`spec\n${[...BASE, ...extra].join("\n")}\n\`\`\`\n`;
const SPEC = "```spec\n" + BASE.join("\n") + "\n```\n";
const qa = (verdict) => ({
  green: "```qa\nverdict: green\nsuite: unit | npm test | 5/0 5/0 5/0\n```\n",
  red: "```qa\nverdict: red\nred: tests/x.test.mjs fails because y\nsuite: unit | npm test | 5/1\nQA-R1 | P1 | x | y | tests/x.test.mjs\n```\n",
  flaky: "```qa\nverdict: flaky\nsuite: unit | npm test | 5/0 5/1 5/0\nQA-R1 | P1 | x | flaky | tests/x.test.mjs\n```\n",
  blocked: "```qa\nverdict: blocked\nblocked: no Postgres in cloud, SQL suites cannot run\nQA-R1 | P1 | sql | suites never ran | none\n```\n",
}[verdict]);
const QA_BAD = "```qa\nverdict: green\n```\n";

const file = (name, text) => { const p = path.join(tmp, `${n++}-${name}`); fs.writeFileSync(p, text); return p; };
const pipe = (args) => { const r = spawnSync(process.execPath, [PIPE, ...args], { encoding: "utf8", timeout: 30000 }); return { code: r.status, out: r.stdout || "", err: r.stderr || "" }; };
const ledgerPath = () => path.join(tmp, `ledger-${n++}.json`);
const root = path.join(tmp, "root");
const init = (l, lane = "review", touches = "non-live") => pipe(["init", "--ledger", l, "--lane", lane, "--touches", touches, "--root", root]);
const start = (l, s) => pipe(["start", s, "--ledger", l, "--root", root]);
const done = (l, s, blockFile) => pipe(["done", s, "--ledger", l, "--block", blockFile]);
const statusJson = (l) => JSON.parse(pipe(["status", "--ledger", l, "--json"]).out);
const ok = (r) => { assert.equal(r.code, 0, `expected exit 0, got ${r.code}: ${r.out}${r.err}`); return r; };
const STAGES = ["staff-pm", "tests-pre", "build", "verify", "pr"];

// A ledger on `lane`, with staff-pm done and verify started.
function atVerify(lane = "review") {
  const l = ledgerPath();
  ok(init(l, lane));
  ok(start(l, "staff-pm")); ok(done(l, "staff-pm", file("spec.md", SPEC)));
  if (lane !== "docs" && lane !== "config" && lane !== "review") {
    for (const s of ["tests-pre", "build"]) { ok(start(l, s)); ok(done(l, s, file(`${s}.md`, `${s} block\ntext\n`))); }
  }
  ok(start(l, "verify"));
  return l;
}

test("REVIEW-1 check-spec and pipeline-run LANES include review, and the lists stay identical", async () => {
  const cs = await import("../tools/check-spec.mjs");
  const pr = await import("../tools/pipeline-run.mjs");
  assert.ok(cs.LANES.includes("review"), `check-spec LANES is ${cs.LANES}`);
  assert.ok(pr.LANES.includes("review"), `pipeline-run LANES is ${pr.LANES}`);
  assert.deepEqual(cs.LANES, pr.LANES);
});

test("REVIEW-2 a spec with lane: review validates and parses as review", async () => {
  const { checkSpec } = await import("../tools/check-spec.mjs");
  const r = checkSpec(spec(["lane: review", "touches: non-live"]));
  assert.deepEqual(r.errors, []);
  assert.equal(r.spec.lane, "review");
  assert.equal(checkSpec(spec(["lane: REVIEW"])).spec.lane, "review");
});

test("REVIEW-3 the check-spec lane error still lists every valid lane, review included", async () => {
  const { checkSpec } = await import("../tools/check-spec.mjs");
  const r = checkSpec(spec(["lane: frontend"]));
  assert.ok(r.errors.some((e) => /frontend/.test(e) && /ui, logic, docs, config, review/.test(e)), r.errors.join("\n"));
  const empty = checkSpec(spec(["lane:"]));
  assert.ok(empty.errors.some((e) => /ui, logic, docs, config, review/.test(e)), empty.errors.join("\n"));
  const f = file("s.md", spec(["lane: review", "touches: hearth"]));
  const cli = spawnSync(process.execPath, [CHECK_SPEC, f, "--json"], { encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).lane, "review");
});

test("REVIEW-4 pipeline-run init --lane review works, and an unknown lane error lists review", () => {
  const l = ledgerPath();
  ok(init(l, "review"));
  assert.equal(statusJson(l).lane, "review");
  const bad = pipe(["init", "--ledger", ledgerPath(), "--lane", "audit", "--touches", "live", "--root", root]);
  assert.equal(bad.code, 2);
  assert.match(bad.err, /review/);
});

test("REVIEW-5 init --spec with lane: review writes the same ledger as the explicit form", () => {
  const f = file("s.md", spec(["lane: review", "touches: non-live"]));
  const a = ledgerPath(), b = ledgerPath();
  ok(pipe(["init", "--ledger", a, "--spec", f, "--root", root]));
  ok(init(b, "review", "non-live"));
  assert.equal(fs.readFileSync(a, "utf8"), fs.readFileSync(b, "utf8"));
});

test("REVIEW-6 the review lane skips tests-pre and build, and staff-pm, verify, pr remain in order", () => {
  const l = ledgerPath();
  ok(init(l));
  const s = statusJson(l);
  assert.deepEqual(Object.keys(s.stages), STAGES);
  assert.equal(s.stages["tests-pre"].state, "skipped");
  assert.equal(s.stages.build.state, "skipped");
  for (const st of ["staff-pm", "verify", "pr"]) assert.equal(s.stages[st].state, "pending", st);
  const r = start(l, "build");
  assert.equal(r.code, 1, r.out + r.err);
  assert.match(r.err, /skipped/);
  // verify cannot start before staff-pm is done; pr cannot start before verify is done
  assert.equal(start(l, "verify").code, 1);
  ok(start(l, "staff-pm")); ok(done(l, "staff-pm", file("spec.md", SPEC)));
  assert.equal(start(l, "pr").code, 1);
  ok(start(l, "verify"));
});

for (const verdict of ["green", "red", "flaky", "blocked"]) {
  test(`REVIEW-7 review lane: done verify accepts a ${verdict} qa block, records the verdict and does not stop the run`, () => {
    const l = atVerify("review");
    ok(done(l, "verify", file(`qa-${verdict}.md`, qa(verdict))));
    const s = statusJson(l);
    assert.equal(s.stages.verify.state, "done");
    assert.equal(s.stages.verify.verdict, verdict);
    assert.equal(s.stopped, false);
    assert.equal(s.stop_reason, null);
    assert.equal(JSON.parse(fs.readFileSync(l, "utf8")).stages.verify.verdict, verdict, "stored in the ledger");
    // pr can now be started and finished
    ok(start(l, "pr"));
    ok(done(l, "pr", file("pr.md", "pr block\nbody text\n")));
    assert.equal(statusJson(l).stages.pr.state, "done");
  });
}

test("REVIEW-8 status text shows the recorded verify verdict", () => {
  const l = atVerify("review");
  ok(done(l, "verify", file("qa.md", qa("blocked"))));
  const r = ok(pipe(["status", "--ledger", l]));
  const line = r.out.split("\n").find((x) => x.startsWith("verify"));
  assert.ok(line && /blocked/.test(line), r.out);
});

test("REVIEW-9 review lane: an invalid qa block is refused and two strikes stop the run", () => {
  const l = atVerify("review");
  const bad = file("bad.md", QA_BAD);
  const r1 = done(l, "verify", bad);
  assert.equal(r1.code, 1, r1.out + r1.err);
  assert.equal(statusJson(l).stopped, false);
  assert.equal(statusJson(l).stages.verify.state, "started");
  const r2 = done(l, "verify", bad);
  assert.equal(r2.code, 1);
  const s = statusJson(l);
  assert.equal(s.stopped, true);
  assert.match(s.stop_reason, /verify block failed validation twice/);
  assert.equal(s.stages.verify.verdict ?? null, null);
});

test("REVIEW-10 review lane: a missing or garbled qa block is not accepted as a verdict", () => {
  const l = atVerify("review");
  const r = done(l, "verify", file("empty.md", "no block here\n"));
  assert.equal(r.code, 1, r.out + r.err);
  assert.equal(statusJson(l).stages.verify.state, "started");
});

for (const lane of ["ui", "logic", "docs", "config"]) {
  for (const verdict of ["red", "flaky", "blocked"]) {
    test(`REVIEW-11 regression: ${lane} lane still refuses a ${verdict} verify, leaves it started and records no verdict`, () => {
      const l = atVerify(lane);
      const r = done(l, "verify", file(`qa-${verdict}.md`, qa(verdict)));
      assert.equal(r.code, 1, r.out + r.err);
      assert.match(r.err, /green/);
      const s = statusJson(l);
      assert.equal(s.stages.verify.state, "started");
      assert.equal(s.stopped, false);
      assert.equal(s.stages.verify.verdict ?? null, null);
      assert.equal(start(l, "pr").code, 1, "pr cannot start while verify is not done");
    });
  }
}

test("REVIEW-12 in the other lanes a green verify is accepted and the verdict green is recorded too", () => {
  for (const lane of ["ui", "logic", "docs", "config"]) {
    const l = atVerify(lane);
    ok(done(l, "verify", file("qa.md", qa("green"))));
    assert.equal(statusJson(l).stages.verify.verdict, "green", lane);
  }
});

test("REVIEW-13 status --json gives verify.verdict null before verify is done, and the other stages carry no verdict", () => {
  const l = ledgerPath();
  ok(init(l, "logic"));
  const s = statusJson(l);
  assert.equal(s.stages.verify.verdict, null);
  assert.equal("verdict" in s.stages.verify, true, "the verdict key is always present on verify");
  for (const st of ["staff-pm", "tests-pre", "build", "pr"]) assert.equal(s.stages[st].verdict, undefined, st);
});

test("REVIEW-14 merge class does not depend on the lane: review of live or hearth is still C, non-live docs-only files are A", () => {
  const cls = (touches, files, extra = []) => { const l = ledgerPath(); ok(init(l, "review", touches)); return ok(pipe(["class", "--ledger", l, "--files", files, ...extra])).out.trim(); };
  assert.equal(cls("hearth", "docs/a.md"), "C");
  assert.equal(cls("live", "docs/a.md"), "C");
  assert.equal(cls("non-live", "docs/a.md"), "A");
  assert.equal(cls("non-live", "docs/a.md", ["--feedback"]), "B");
  assert.equal(cls("non-live", ".github/workflows/x.yml"), "C");
  assert.equal(cls("non-live", "docs/a.md,package.json"), "C");
  // same answer as a docs-lane ledger
  const l = ledgerPath(); ok(init(l, "docs", "hearth"));
  assert.equal(ok(pipe(["class", "--ledger", l, "--files", "docs/a.md"])).out.trim(), "C");
});

test("REVIEW-15 an older ledger without the verdict field still loads, with verdict null in status (text and --json)", () => {
  const l = atVerify("logic");
  ok(done(l, "verify", file("qa.md", qa("green"))));
  const j = JSON.parse(fs.readFileSync(l, "utf8"));
  delete j.stages.verify.verdict;
  fs.writeFileSync(l, JSON.stringify(j));
  const s = statusJson(l);
  assert.equal(s.stages.verify.state, "done");
  assert.equal(s.stages.verify.verdict, null);
  ok(pipe(["status", "--ledger", l]));
  ok(start(l, "pr"));
});

test("REVIEW-16 a review-lane ledger with an unrecorded verdict (older tool) can still finish verify and start pr", () => {
  const l = atVerify("review");
  const j = JSON.parse(fs.readFileSync(l, "utf8"));
  delete j.stages.verify.verdict;
  fs.writeFileSync(l, JSON.stringify(j));
  ok(done(l, "verify", file("qa.md", qa("red"))));
  assert.equal(statusJson(l).stages.verify.verdict, "red");
});

test("REVIEW-17 a ledger with a verdict outside the four qa verdicts is refused as unusable (exit 2)", () => {
  const l = atVerify("review");
  ok(done(l, "verify", file("qa.md", qa("blocked"))));
  const j = JSON.parse(fs.readFileSync(l, "utf8"));
  j.stages.verify.verdict = "maybe";
  fs.writeFileSync(l, JSON.stringify(j));
  const r = pipe(["status", "--ledger", l]);
  assert.equal(r.code, 2, r.out + r.err);
  assert.match(r.err, /verdict/);
});
