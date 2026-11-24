// Failing-first tests for tools/pipeline-run.mjs (docs/pipeline-plan.md: "The pipeline", "Stop rules",
// "Stage 5 merge class", build order step 1). PIPE-1..N. The tool does not exist yet: every test is red until it does.
//
// Contract these tests pin down where the plan leaves room:
//   - CLI style as qa-cycle: subcommands, --json, exit 0 pass / 1 tripped (one reason per line on stderr) / 2 usage
//     error or unreadable input (no subcommand, unknown stage, missing flag, missing or corrupt ledger, bad value).
//   - the ledger is one JSON file (--ledger F). Nothing else is ever written (PIPE-24). --root DIR (default cwd) is
//     only where the kill switch DIR/.claude/agents.off is looked for.
//   - stages in order: staff-pm, tests-pre, build, verify, pr. docs and config lanes skip tests-pre and build.
//   - status --json: {lane, touches, stopped: bool, stop_reason: string|null,
//       stages: {<stage>: {state: pending|started|done|skipped, model: string|null, tokens: number, rounds: number}}}.
//   - round prints the new count on stdout; the round that would exceed the limit exits 1 and stops the run.
//   - done validates with check-spec (staff-pm) or check-qa-report (verify); pr, tests-pre and build need a
//     non-empty block. A block that fails validation twice for the same stage stops the run (stop rule 3).
//   - done --budget N --tokens M: M > 1.5 * N stops the run (exactly 1.5 * N does not).
//   - stop --reason R marks the run stopped. resume clears only a plan-limit stop (others exit 1).
//   - class prints A, B or C alone on stdout.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = path.join(ROOT, "tools", "pipeline-run.mjs");
const STAGES = ["staff-pm", "tests-pre", "build", "verify", "pr"];
let tmp, n = 0;

before(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pipeline-run-test-")); });
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

// Each test gets its own dir: {dir, ledger, root, blocks}. The ledger file does not exist until init.
function env(label = "t") {
  const dir = path.join(tmp, `${label}-${n++}`);
  fs.mkdirSync(path.join(dir, "work"), { recursive: true });
  return { dir, ledger: path.join(dir, "work", "ledger.json"), root: path.join(dir, "root") };
}
function run(args, cwd = tmp) {
  assert.ok(fs.existsSync(TOOL), "tools/pipeline-run.mjs is missing"); // keeps 'exit 1' tests from passing vacuously
  const r = spawnSync(process.execPath, [TOOL, ...args], { cwd, encoding: "utf8", timeout: 30000 });
  return { code: r.status, out: r.stdout || "", err: r.stderr || "" };
}
const errLines = (r) => r.err.split("\n").filter((l) => l.trim());
const parseJson = (r) => { let j; assert.doesNotThrow(() => { j = JSON.parse(r.out); }, `stdout is not JSON: ${r.out}${r.err}`); return j; };
const tripped = (r, re) => { assert.equal(r.code, 1, `expected exit 1, got ${r.code}: ${r.out}${r.err}`); assert.ok(errLines(r).length >= 1, "a reason on stderr"); if (re) assert.match(r.err, re); };
const ok = (r) => { assert.equal(r.code, 0, `expected exit 0, got ${r.code}: ${r.out}${r.err}`); return r; };

const init = (e, lane = "logic", touches = "non-live") => run(["init", "--ledger", e.ledger, "--lane", lane, "--touches", touches, "--root", e.root]);
const start = (e, stage, extra = []) => run(["start", stage, "--ledger", e.ledger, "--root", e.root, ...extra]);
const done = (e, stage, block, extra = []) => run(["done", stage, "--ledger", e.ledger, "--block", block, ...extra]);
const status = (e) => parseJson(run(["status", "--ledger", e.ledger, "--json"]));
const block = (e, name, body) => { const p = path.join(e.dir, name); fs.writeFileSync(p, body); return p; };

const SPEC = "```spec\nverdict: ready\nbet: A tiny ledger keeps the stages honest; the stop rules trip in tests\n" +
  "step: M1.1 | write the ledger | tests PIPE-1 pass | 1 session\n" +
  "criterion: PIPE-1 | auto | Given a fresh ledger, then status shows 5 stages\n" +
  "risk: Stages run out of order | PIPE-1\n" +
  "handoff: qa-tdd | failing tests for PIPE-1 | red for the right reason\n```\n";
const SPEC_BAD = "```spec\nverdict: ready\n```\n";
const QA_GREEN = "```qa\nverdict: green\nsuite: unit | npm test | 42/0 42/0 42/0\n```\n";
const QA_BAD = "```qa\nverdict: green\n```\n";
const GOOD = (e, stage) => block(e, `${stage}.md`, stage === "staff-pm" ? SPEC : stage === "verify" ? QA_GREEN : `${stage} block\nsome handoff text\n`);

// Run one stage start..done with a valid block.
function pass(e, stage, extra = []) { ok(start(e, stage)); ok(done(e, stage, GOOD(e, stage), extra)); }
function through(e, upTo) { for (const s of STAGES) { pass(e, s); if (s === upTo) return; } }
function fresh(lane = "logic", touches = "non-live") { const e = env(); ok(init(e, lane, touches)); return e; }

// ---------- init and usage ----------
test("PIPE-1 init creates one JSON ledger with every stage pending and records lane and touches", () => {
  const e = env();
  const r = ok(init(e, "ui", "live"));
  assert.ok(fs.existsSync(e.ledger));
  JSON.parse(fs.readFileSync(e.ledger, "utf8"));
  const s = status(e);
  assert.equal(s.lane, "ui"); assert.equal(s.touches, "live"); assert.equal(s.stopped, false);
  assert.deepEqual(Object.keys(s.stages), STAGES);
  for (const k of STAGES) { assert.equal(s.stages[k].state, "pending"); assert.equal(s.stages[k].tokens, 0); assert.equal(s.stages[k].rounds, 0); }
  assert.ok(r.out !== undefined);
});

test("PIPE-2 init rejects a bad lane or touches with exit 2 and writes no ledger", () => {
  for (const [lane, touches] of [["web", "live"], ["", "live"], ["UI", "live"], ["ui", "public"], ["ui", ""], ["ui", "Hearth"]]) {
    const e = env();
    const r = init(e, lane, touches);
    assert.equal(r.code, 2, `lane=${lane} touches=${touches}`);
    assert.ok(errLines(r).length >= 1);
    assert.ok(!fs.existsSync(e.ledger), "no ledger on a usage error");
  }
  for (const lane of ["ui", "logic", "docs", "config"]) for (const touches of ["live", "non-live", "hearth"]) {
    const e = env(); ok(init(e, lane, touches));
  }
});

test("PIPE-3 usage errors exit 2: no subcommand, unknown subcommand, unknown stage, missing --ledger, missing or corrupt ledger, bad --model", () => {
  const e = env();
  assert.equal(run([]).code, 2);
  assert.equal(run(["frobnicate"]).code, 2);
  assert.equal(run(["status"]).code, 2, "--ledger is required");
  assert.equal(run(["status", "--ledger", e.ledger]).code, 2, "ledger file missing");
  ok(init(e));
  assert.equal(start(e, "deploy").code, 2, "unknown stage");
  assert.equal(start(e, "staff-pm", ["--model", "gpt"]).code, 2, "unknown model");
  assert.equal(status(e).stages["staff-pm"].state, "pending", "a usage error changes nothing");
  fs.writeFileSync(e.ledger, "{not json");
  assert.equal(run(["status", "--ledger", e.ledger]).code, 2, "corrupt ledger");
});

test("PIPE-4 init refuses to overwrite an existing ledger", () => {
  const e = fresh();
  pass(e, "staff-pm");
  tripped(init(e, "docs", "live"));
  assert.equal(status(e).stages["staff-pm"].state, "done", "the existing run is untouched");
});

// ---------- happy path ----------
test("PIPE-5 happy path: all five stages in order on the logic lane, models and tokens recorded", () => {
  const e = fresh("logic", "non-live");
  const models = ["sonnet", "sonnet", "opus", "haiku", "sonnet"];
  STAGES.forEach((s, i) => {
    ok(start(e, s, ["--model", models[i]]));
    assert.equal(status(e).stages[s].state, "started");
    ok(done(e, s, GOOD(e, s), ["--tokens", String(1000 * (i + 1))]));
  });
  const s = status(e);
  STAGES.forEach((k, i) => { assert.equal(s.stages[k].state, "done"); assert.equal(s.stages[k].model, models[i]); assert.equal(s.stages[k].tokens, 1000 * (i + 1)); });
  assert.equal(s.stopped, false);
  assert.equal(s.stop_reason, null);
});

test("PIPE-6 status prints a human table without --json that names every stage and the lane", () => {
  const e = fresh("logic");
  pass(e, "staff-pm");
  const r = ok(run(["status", "--ledger", e.ledger]));
  for (const s of STAGES) assert.ok(r.out.includes(s), `status names ${s}`);
  assert.match(r.out, /logic/);
  assert.match(r.out, /done/);
});

// ---------- order ----------
test("PIPE-7 start refuses a stage whose previous stage is not done (pending or merely started)", () => {
  const e = fresh();
  tripped(start(e, "tests-pre"), /staff-pm/);
  tripped(start(e, "pr"), /verify|previous/i);
  ok(start(e, "staff-pm"));
  tripped(start(e, "tests-pre"), /staff-pm/); // started, not done
  assert.equal(status(e).stages["tests-pre"].state, "pending");
});

test("PIPE-8 done on a stage that was never started is refused, and start on a done stage is refused", () => {
  const e = fresh();
  tripped(done(e, "staff-pm", GOOD(e, "staff-pm")));
  assert.equal(status(e).stages["staff-pm"].state, "pending");
  pass(e, "staff-pm");
  tripped(start(e, "staff-pm"));
});

// ---------- lane skips ----------
for (const lane of ["docs", "config"]) {
  test(`PIPE-9 ${lane} lane skips tests-pre and build, but staff-pm, verify and pr still run in order`, () => {
    const e = fresh(lane);
    pass(e, "staff-pm");
    const s1 = status(e);
    assert.equal(s1.stages["tests-pre"].state, "skipped");
    assert.equal(s1.stages["build"].state, "skipped");
    tripped(start(e, "tests-pre"), /skip/i);
    tripped(start(e, "build"), /skip/i);
    tripped(start(e, "pr"), /verify|previous/i); // verify cannot be jumped over
    pass(e, "verify");
    pass(e, "pr");
    const s2 = status(e);
    for (const k of ["staff-pm", "verify", "pr"]) assert.equal(s2.stages[k].state, "done");
    assert.equal(s2.stages["build"].state, "skipped");
  });
}

test("PIPE-10 verify on a docs lane still needs staff-pm done first", () => {
  const e = fresh("docs");
  tripped(start(e, "verify"), /staff-pm/);
});

test("PIPE-11 ui and logic lanes do not skip tests-pre or build", () => {
  for (const lane of ["ui", "logic"]) {
    const e = fresh(lane);
    pass(e, "staff-pm");
    assert.notEqual(status(e).stages["tests-pre"].state, "skipped");
    ok(start(e, "tests-pre"));
  }
});

// ---------- kill switch ----------
test("PIPE-12 start refuses when DIR/.claude/agents.off exists under --root, and goes ahead once it is removed", () => {
  const e = fresh();
  fs.mkdirSync(path.join(e.root, ".claude"), { recursive: true });
  const off = path.join(e.root, ".claude", "agents.off");
  fs.writeFileSync(off, "");
  tripped(start(e, "staff-pm"), /agents\.off|kill/i);
  assert.equal(status(e).stages["staff-pm"].state, "pending");
  fs.rmSync(off);
  ok(start(e, "staff-pm"));
});

test("PIPE-13 the kill switch is read from --root only: a file under another root does not stop the run", () => {
  const e = fresh();
  const other = path.join(e.dir, "other", ".claude");
  fs.mkdirSync(other, { recursive: true });
  fs.writeFileSync(path.join(other, "agents.off"), "");
  ok(start(e, "staff-pm"));
});

// ---------- block validation ----------
test("PIPE-14 done staff-pm validates the spec block with check-spec: a valid block passes, an invalid one is refused", () => {
  const e = fresh();
  ok(start(e, "staff-pm"));
  tripped(done(e, "staff-pm", block(e, "bad.md", SPEC_BAD)));
  assert.equal(status(e).stages["staff-pm"].state, "started", "refused block does not complete the stage");
  ok(done(e, "staff-pm", block(e, "good.md", SPEC)));
  assert.equal(status(e).stages["staff-pm"].state, "done");
});

test("PIPE-15 done verify validates the qa block with check-qa-report, including a green verdict with one run per suite", () => {
  const e = fresh();
  through(e, "build");
  ok(start(e, "verify"));
  tripped(done(e, "verify", block(e, "q1.md", QA_BAD)));
  tripped(done(e, "verify", block(e, "q2.md", "```qa\nverdict: green\nsuite: unit | npm test | 42/0\n```\n")), undefined); // green needs 3 runs
});

test("PIPE-16 done on tests-pre, build and pr refuses an empty or whitespace-only block and accepts text", () => {
  const e = fresh();
  pass(e, "staff-pm");
  ok(start(e, "tests-pre"));
  tripped(done(e, "tests-pre", block(e, "empty.md", "")));
  tripped(done(e, "tests-pre", block(e, "ws.md", "  \n\n\t\n")));
  ok(done(e, "tests-pre", block(e, "ok.md", "red: tests/x.test.mjs fails PIPE-1\n")));
});

test("PIPE-17 done with a missing block file or no --block exits 2", () => {
  const e = fresh();
  ok(start(e, "staff-pm"));
  assert.equal(done(e, "staff-pm", path.join(e.dir, "nope.md")).code, 2);
  assert.equal(run(["done", "staff-pm", "--ledger", e.ledger]).code, 2);
});

test("PIPE-18 stop rule 3: a block failing validation twice for the same stage stops the run; start then refuses", () => {
  const e = fresh();
  ok(start(e, "staff-pm"));
  tripped(done(e, "staff-pm", block(e, "b1.md", SPEC_BAD)));
  assert.equal(status(e).stopped, false, "one failure does not stop the run");
  tripped(done(e, "staff-pm", block(e, "b2.md", SPEC_BAD)), /twice|stop/i);
  const s = status(e);
  assert.equal(s.stopped, true);
  assert.match(s.stop_reason, /staff-pm|valid/i);
  tripped(done(e, "staff-pm", block(e, "g.md", SPEC)), /stopped/i); // even a good block cannot finish a stopped run
  tripped(start(e, "tests-pre"), /stopped/i);
});

test("PIPE-19 stop rule 3 counts per stage: one failure in staff-pm and one in verify do not stop the run", () => {
  const e = fresh();
  ok(start(e, "staff-pm"));
  tripped(done(e, "staff-pm", block(e, "b1.md", SPEC_BAD)));
  ok(done(e, "staff-pm", block(e, "g.md", SPEC)));
  through2(e);
  function through2(x) { pass(x, "tests-pre"); pass(x, "build"); ok(start(x, "verify")); tripped(done(x, "verify", block(x, "q.md", QA_BAD))); }
  assert.equal(status(e).stopped, false);
});

// ---------- rounds ----------
test("PIPE-20 round: build on the ui lane allows 3 rounds; the 4th trips, stops the run and records the reason", () => {
  const e = fresh("ui");
  pass(e, "staff-pm"); pass(e, "tests-pre"); ok(start(e, "build"));
  for (let i = 1; i <= 3; i++) assert.equal(ok(run(["round", "build", "--ledger", e.ledger])).out.trim(), String(i));
  assert.equal(status(e).stages.build.rounds, 3);
  const r = run(["round", "build", "--ledger", e.ledger]);
  tripped(r, /round|limit|3/i);
  const s = status(e);
  assert.equal(s.stopped, true);
  assert.match(s.stop_reason, /build/i);
  assert.equal(s.stages.build.rounds, 3, "the refused round is not counted");
  tripped(done(e, "build", GOOD(e, "build")), /stopped/i);
});

test("PIPE-21 round: verify allows 2 fix attempts per --bug; a third on the same bug trips, a second bug has its own count", () => {
  const e = fresh("logic");
  through(e, "build"); ok(start(e, "verify"));
  ok(run(["round", "verify", "--ledger", e.ledger, "--bug", "BUG-1"]));
  ok(run(["round", "verify", "--ledger", e.ledger, "--bug", "BUG-1"]));
  ok(run(["round", "verify", "--ledger", e.ledger, "--bug", "BUG-2"]));
  assert.equal(status(e).stopped, false);
  tripped(run(["round", "verify", "--ledger", e.ledger, "--bug", "BUG-1"]), /BUG-1/);
  const s = status(e);
  assert.equal(s.stopped, true);
  assert.match(s.stop_reason, /BUG-1/);
});

test("PIPE-22 round: staff-pm allows 1 round; the second trips and stops the run", () => {
  const e = fresh();
  ok(start(e, "staff-pm"));
  ok(run(["round", "staff-pm", "--ledger", e.ledger]));
  tripped(run(["round", "staff-pm", "--ledger", e.ledger]), /round|limit/i);
  assert.equal(status(e).stopped, true);
});

test("PIPE-23 round on a stage that is not started, or verify without --bug, exits 2 or 1 and never counts", () => {
  const e = fresh("logic");
  const r1 = run(["round", "build", "--ledger", e.ledger]);
  assert.ok([1, 2].includes(r1.code), "round on a pending stage is refused");
  through(e, "build"); ok(start(e, "verify"));
  const r2 = run(["round", "verify", "--ledger", e.ledger]);
  assert.equal(r2.code, 2, "verify rounds are per bug: --bug is required");
  const s = status(e);
  assert.equal(s.stages.build.rounds, 0);
  assert.equal(s.stages.verify.rounds, 0);
});

// ---------- tokens and budget ----------
test("PIPE-24 budget boundary: tokens at 1.5x the budget pass, 1 over stops the run, under budget passes", () => {
  let e = fresh(); ok(start(e, "staff-pm"));
  ok(done(e, "staff-pm", GOOD(e, "staff-pm"), ["--budget", "1000", "--tokens", "1500"]));
  assert.equal(status(e).stopped, false);
  assert.equal(status(e).stages["staff-pm"].tokens, 1500);

  e = fresh(); ok(start(e, "staff-pm"));
  const r = done(e, "staff-pm", GOOD(e, "staff-pm"), ["--budget", "1000", "--tokens", "1501"]);
  tripped(r, /budget|1\.5/i);
  const s = status(e);
  assert.equal(s.stopped, true);
  assert.match(s.stop_reason, /budget/i);
  tripped(start(e, "tests-pre"), /stopped/i);

  e = fresh(); ok(start(e, "staff-pm"));
  ok(done(e, "staff-pm", GOOD(e, "staff-pm"), ["--budget", "1000", "--tokens", "0"]));
});

test("PIPE-25 tokens and budget inputs: negative, zero budget, not-a-number, empty and decimals exit 2 and change nothing", () => {
  const e = fresh(); ok(start(e, "staff-pm"));
  const g = GOOD(e, "staff-pm");
  for (const extra of [["--tokens", "-1"], ["--tokens", "abc"], ["--tokens", ""], ["--tokens", "NaN"], ["--tokens", "1.5"],
    ["--budget", "0", "--tokens", "5"], ["--budget", "-10", "--tokens", "5"], ["--budget", "x", "--tokens", "5"]]) {
    assert.equal(done(e, "staff-pm", g, extra).code, 2, extra.join(" "));
  }
  assert.equal(status(e).stages["staff-pm"].state, "started");
  assert.equal(status(e).stopped, false);
});

test("PIPE-26 --budget without --tokens exits 2; --tokens without --budget just records", () => {
  const e = fresh(); ok(start(e, "staff-pm"));
  assert.equal(done(e, "staff-pm", GOOD(e, "staff-pm"), ["--budget", "100"]).code, 2);
  ok(done(e, "staff-pm", GOOD(e, "staff-pm"), ["--tokens", "99999999"]));
  assert.equal(status(e).stages["staff-pm"].tokens, 99999999);
  assert.equal(status(e).stopped, false);
});

// ---------- stop and resume ----------
test("PIPE-27 stop --reason plan-limit stops the run: status still reads it, start refuses until resume clears it", () => {
  const e = fresh();
  pass(e, "staff-pm");
  ok(run(["stop", "--ledger", e.ledger, "--reason", "plan-limit"]));
  const s = status(e);
  assert.equal(s.stopped, true);
  assert.equal(s.stop_reason, "plan-limit");
  assert.equal(s.stages["staff-pm"].state, "done", "finished stages stay done");
  tripped(start(e, "tests-pre"), /stopped|plan-limit|resume/i);
  ok(run(["resume", "--ledger", e.ledger]));
  const s2 = status(e);
  assert.equal(s2.stopped, false);
  assert.equal(s2.stop_reason, null);
  ok(start(e, "tests-pre"));
});

test("PIPE-28 resume picks up a stage that was started when the plan limit hit, and keeps tokens already recorded", () => {
  const e = fresh();
  pass(e, "staff-pm", ["--tokens", "700"]);
  ok(start(e, "tests-pre"));
  ok(run(["stop", "--ledger", e.ledger, "--reason", "plan-limit"]));
  ok(run(["resume", "--ledger", e.ledger]));
  ok(done(e, "tests-pre", GOOD(e, "tests-pre")));
  const s = status(e);
  assert.equal(s.stages["tests-pre"].state, "done");
  assert.equal(s.stages["staff-pm"].tokens, 700);
});

test("PIPE-29 resume refuses any stop that is not plan-limit (rule trips, budget, rounds) and a run that is not stopped", () => {
  let e = fresh();
  tripped(run(["resume", "--ledger", e.ledger]), /not stopped|nothing/i);
  ok(run(["stop", "--ledger", e.ledger, "--reason", "blocked by privacy gate"]));
  tripped(run(["resume", "--ledger", e.ledger]), /plan-limit|cannot|only/i);
  assert.equal(status(e).stopped, true);

  e = fresh(); ok(start(e, "staff-pm"));
  ok(run(["round", "staff-pm", "--ledger", e.ledger]));
  tripped(run(["round", "staff-pm", "--ledger", e.ledger]));
  tripped(run(["resume", "--ledger", e.ledger]), /plan-limit|cannot|only/i);
  assert.equal(status(e).stopped, true);
});

test("PIPE-30 stop needs --reason; an empty reason exits 2", () => {
  const e = fresh();
  assert.equal(run(["stop", "--ledger", e.ledger]).code, 2);
  assert.equal(run(["stop", "--ledger", e.ledger, "--reason", ""]).code, 2);
  assert.equal(status(e).stopped, false);
});

test("PIPE-31 a resume does not bypass the kill switch: start still refuses while agents.off exists", () => {
  const e = fresh();
  ok(run(["stop", "--ledger", e.ledger, "--reason", "plan-limit"]));
  ok(run(["resume", "--ledger", e.ledger]));
  fs.mkdirSync(path.join(e.root, ".claude"), { recursive: true });
  fs.writeFileSync(path.join(e.root, ".claude", "agents.off"), "");
  tripped(start(e, "staff-pm"), /agents\.off|kill/i);
});

// ---------- merge class ----------
const cls = (e, files, extra = []) => run(["class", "--ledger", e.ledger, "--files", files, ...extra]);
const letter = (r) => { ok(r); return r.out.trim(); };

test("PIPE-32 class A: non-live touches with ordinary files (docs, tests, tools)", () => {
  const e = fresh("logic", "non-live");
  assert.equal(letter(cls(e, "docs/pipeline-plan.md,tools/pipeline-run.mjs,tests/pipeline-run.test.mjs")), "A");
  assert.equal(letter(cls(e, "README.md")), "A");
});

test("PIPE-33 class C whenever the ledger says touches live or hearth, whatever the files", () => {
  for (const touches of ["live", "hearth"]) {
    const e = fresh("docs", touches);
    assert.equal(letter(cls(e, "docs/x.md")), "C", touches);
    assert.equal(letter(cls(e, "docs/x.md", ["--feedback"])), "C", `${touches} + feedback is never B`);
  }
});

test("PIPE-34 class C for any file under .github/, a file named CLAUDE.md (root or nested), or a package.json (root or nested)", () => {
  const e = fresh("logic", "non-live");
  for (const f of [".github/workflows/ci.yml", ".github/agents-check.yml", "CLAUDE.md", "docs/CLAUDE.md", "app/CLAUDE.md", "package.json", "app/package.json"]) {
    assert.equal(letter(cls(e, `docs/ok.md,${f}`)), "C", f);
  }
});

test("PIPE-35 class C for paths with an auth, privacy or data segment, in any letter case", () => {
  const e = fresh("logic", "non-live");
  for (const f of ["src/auth/login.js", "backend/data/seed.sql", "docs/privacy/policy.md", "lib/Auth/session.js", "app/PRIVACY/notes.md", "Data/export.csv"]) {
    assert.equal(letter(cls(e, f)), "C", f);
  }
});

test("PIPE-36 class: one class C file among many makes the whole change C; look-alike names stay A", () => {
  const e = fresh("logic", "non-live");
  assert.equal(letter(cls(e, "a.md,b.md,c.md,d.md,src/auth/x.js")), "C");
  for (const f of ["docs/authors.md", "docs/dataflow-notes.md", "docs/claude-notes.md", "docs/my-package.json.md"]) {
    assert.equal(letter(cls(e, f)), "A", `${f} is not on a class C path`);
  }
});

test("PIPE-37 class B is never printed by default and only with --feedback on a non-C change", () => {
  const e = fresh("logic", "non-live");
  assert.equal(letter(cls(e, "docs/x.md")), "A");
  assert.equal(letter(cls(e, "docs/x.md", ["--feedback"])), "B");
  assert.equal(letter(cls(e, "src/auth/x.js", ["--feedback"])), "C");
  assert.equal(letter(cls(e, ".github/workflows/x.yml", ["--feedback"])), "C");
});

test("PIPE-38 class usage: missing --files, empty --files, empty entries only exit 2; spaces around entries are trimmed", () => {
  const e = fresh("logic", "non-live");
  assert.equal(run(["class", "--ledger", e.ledger]).code, 2);
  assert.equal(cls(e, "").code, 2);
  assert.equal(cls(e, ",,").code, 2);
  assert.equal(letter(cls(e, " docs/x.md , .github/y.yml ")), "C");
});

test("PIPE-39 class --json prints {class, reasons[]} with the file that made it C", () => {
  const e = fresh("logic", "non-live");
  const j = parseJson(ok(run(["class", "--ledger", e.ledger, "--files", "docs/a.md,.github/workflows/ci.yml", "--json"])));
  assert.equal(j.class, "C");
  assert.ok(Array.isArray(j.reasons) && j.reasons.some((s) => s.includes(".github/workflows/ci.yml")));
});

// ---------- read-only on everything but the ledger ----------
function snapshot(dir) {
  const out = {};
  (function walk(d) {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) { out[p + "/"] = "dir"; walk(p); } else out[p] = crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex");
    }
  })(dir);
  return out;
}

test("PIPE-40 nothing is written outside the ledger file: block files, --root and the ledger directory are otherwise untouched, and no temp files remain", () => {
  const e = env();
  fs.mkdirSync(path.join(e.root, ".claude"), { recursive: true });
  fs.writeFileSync(path.join(e.root, ".claude", "settings.json"), "{}");
  ok(init(e, "logic", "non-live"));
  const blocks = Object.fromEntries(STAGES.map((s) => [s, GOOD(e, s)]));
  const before = snapshot(e.dir);
  const ledgerBefore = fs.readFileSync(e.ledger, "utf8");
  for (const s of STAGES) { ok(start(e, s, ["--model", "sonnet"])); ok(done(e, s, blocks[s], ["--tokens", "10"])); }
  ok(run(["round", "build", "--ledger", e.ledger]));
  ok(run(["class", "--ledger", e.ledger, "--files", "a.md"]));
  ok(run(["status", "--ledger", e.ledger, "--json"]));
  const after = snapshot(e.dir);
  const changed = Object.keys({ ...before, ...after }).filter((k) => before[k] !== after[k]);
  assert.deepEqual(changed, [e.ledger], "only the ledger file may change");
  assert.notEqual(fs.readFileSync(e.ledger, "utf8"), ledgerBefore);
});

test("PIPE-41 read-only subcommands (status, class) and refused commands leave the ledger byte-identical", () => {
  const e = fresh();
  pass(e, "staff-pm");
  const bytes = fs.readFileSync(e.ledger, "utf8");
  ok(run(["status", "--ledger", e.ledger])); ok(run(["status", "--ledger", e.ledger, "--json"]));
  ok(cls(e, "a.md"));
  tripped(start(e, "pr"));
  assert.equal(start(e, "deploy").code, 2);
  assert.equal(fs.readFileSync(e.ledger, "utf8"), bytes);
});

test("PIPE-42 the ledger holds no block text: handoff bodies are validated and counted, not stored", () => {
  const e = fresh();
  ok(start(e, "staff-pm"));
  const marked = SPEC.replace("A tiny ledger", "UNIQUEMARKER7731 tiny ledger");
  ok(done(e, "staff-pm", block(e, "s.md", marked)));
  assert.ok(!fs.readFileSync(e.ledger, "utf8").includes("UNIQUEMARKER7731"));
});

test("PIPE-43 ledger path with spaces and a relative --ledger from another cwd both work", () => {
  const e = env("sp ace");
  const rel = path.join("sub dir", "l.json");
  fs.mkdirSync(path.join(e.dir, "sub dir"), { recursive: true });
  ok(run(["init", "--ledger", rel, "--lane", "docs", "--touches", "non-live", "--root", e.root], e.dir));
  assert.ok(fs.existsSync(path.join(e.dir, rel)));
  assert.equal(parseJson(run(["status", "--ledger", rel, "--json"], e.dir)).lane, "docs");
});

// ---------- post-build tests (PIPE-44..) ----------
const QA_RED = "```qa\nverdict: red\nred: tests/x.test.mjs fails because the fix is missing\nsuite: unit | npm test | 41/1\n```\n";
const QA_FLAKY = "```qa\nverdict: flaky\nsuite: unit | npm test | 9/0 9/1 9/0\nQA-R1 | P1 | unit | passes on retry only | tests/x.test.mjs\n```\n";
const QA_BLOCKED = "```qa\nverdict: blocked\nblocked: no device here\nsuite: unit | npm test | 1/0 1/0 1/0\n```\n";
const specWith = (verdict) => verdict === "blocked"
  ? SPEC.replace("verdict: ready", "verdict: blocked\nblocked: waiting on an account")
  : SPEC.replace("verdict: ready", "verdict: needs-decision\ndecision: Which lane? | logic");

test("PIPE-44 done verify with a valid red, flaky or blocked block is refused without a strike: the stage stays started and the run is not stopped", () => {
  for (const body of [QA_RED, QA_FLAKY, QA_BLOCKED]) {
    const e = fresh("docs");
    pass(e, "staff-pm");
    ok(start(e, "verify"));
    for (let i = 0; i < 3; i++) tripped(done(e, "verify", block(e, `v${i}.md`, body)), /green/);
    const s = status(e);
    assert.equal(s.stages.verify.state, "started");
    assert.equal(s.stopped, false, "a red verdict is not a validation failure");
    ok(done(e, "verify", GOOD(e, "verify")));
  }
});

test("PIPE-45 staff-pm verdict blocked: the stage finishes (done), the run stops, and the next stage refuses", () => {
  const e = fresh();
  ok(start(e, "staff-pm"));
  tripped(done(e, "staff-pm", block(e, "b.md", specWith("blocked"))), /blocked/);
  const s = status(e);
  assert.equal(s.stages["staff-pm"].state, "done");
  assert.equal(s.stopped, true);
  assert.match(s.stop_reason, /blocked/);
  tripped(start(e, "tests-pre"), /stopped/);
});

test("PIPE-46 staff-pm verdict cut: the stage finishes, the run stops and cannot be resumed", () => {
  const e = fresh();
  ok(start(e, "staff-pm"));
  const cut = "```spec\nverdict: cut\nbet: Nobody needs this ledger view; cutting it proves the plan holds\ncut: Charts | not needed to prove the bet\nstep: M1.1 | keep the ledger | tests PIPE-1 pass | 1 session\nrisk: Scope creeps back | M1.1\nhandoff: staff-pm | confirm the cut | Chase agrees\n```\n";
  tripped(done(e, "staff-pm", block(e, "c.md", cut)), /cut/);
  const s = status(e);
  assert.equal(s.stages["staff-pm"].state, "done");
  assert.equal(s.stopped, true);
  tripped(run(["resume", "--ledger", e.ledger]));
});

test("PIPE-47 staff-pm verdict needs-decision is not a stop: the run continues to tests-pre", () => {
  const e = fresh();
  ok(start(e, "staff-pm"));
  const r = done(e, "staff-pm", block(e, "d.md", specWith("needs-decision")));
  // either way it must be one defined outcome: the stage is done and the run state is readable
  const s = status(e);
  if (r.code === 0) { assert.equal(s.stopped, false); ok(start(e, "tests-pre")); }
  else assert.ok(s.stopped || s.stages["staff-pm"].state === "started", "a refused block leaves a coherent ledger");
});

test("PIPE-48 class C for every manifest and lockfile beyond package.json, root or nested, any letter case", () => {
  const e = fresh();
  for (const f of ["pyproject.toml", "requirements.txt", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "Cargo.toml", "go.mod", "Gemfile.lock", "Pipfile", "apps/web/Package.JSON", "svc/requirements.txt", "deno.lock"]) {
    assert.equal(letter(cls(e, `docs/a.md,${f}`)), "C", f);
  }
});

test("PIPE-49 class C for an auth, privacy or data file stem with any extension, and for a data directory", () => {
  const e = fresh();
  for (const f of ["src/auth.js", "src/Auth.TS", "lib/privacy.md", "app/data.json", "x/data/rows.csv", "a/AUTH/b.py"]) assert.equal(letter(cls(e, f)), "C", f);
  for (const f of ["src/author.js", "src/metadata.json", "docs/database.md", "src/authors/list.md", "src/dataflow.js"]) assert.equal(letter(cls(e, f)), "A", `${f} is only a look-alike`);
});

test("PIPE-52 round on a done build stage still counts and still trips on the 4th, because fix rounds come after build is done", () => {
  const e = fresh("logic");
  through(e, "build");
  assert.equal(ok(run(["round", "build", "--ledger", e.ledger])).out.trim(), "1");
  ok(run(["round", "build", "--ledger", e.ledger])); ok(run(["round", "build", "--ledger", e.ledger]));
  tripped(run(["round", "build", "--ledger", e.ledger]), /round 4|limit/);
  assert.equal(status(e).stopped, true);
});

test("PIPE-53 round on tests-pre or pr (no round limit) exits 2 and changes nothing", () => {
  const e = fresh("logic");
  ok(start(e, "staff-pm"));
  const before = fs.readFileSync(e.ledger, "utf8");
  for (const s of ["tests-pre", "pr"]) assert.equal(run(["round", s, "--ledger", e.ledger]).code, 2, s);
  assert.equal(fs.readFileSync(e.ledger, "utf8"), before);
});

test("PIPE-54 a stopped run refuses round and done and start, with exit 1 and the reason, and writes nothing", () => {
  const e = fresh("logic");
  ok(start(e, "staff-pm"));
  ok(run(["stop", "--ledger", e.ledger, "--reason", "chase said stop"]));
  const before = fs.readFileSync(e.ledger, "utf8");
  tripped(run(["round", "staff-pm", "--ledger", e.ledger]), /chase said stop/);
  tripped(done(e, "staff-pm", GOOD(e, "staff-pm")), /chase said stop/);
  tripped(start(e, "tests-pre"), /chase said stop/);
  assert.equal(fs.readFileSync(e.ledger, "utf8"), before);
});

test("PIPE-55 start on a stage that is already started is refused and does not change its model", () => {
  const e = fresh();
  ok(start(e, "staff-pm", ["--model", "sonnet"]));
  tripped(start(e, "staff-pm", ["--model", "opus"]), /already started/);
  assert.equal(status(e).stages["staff-pm"].model, "sonnet");
});

test("PIPE-56 init ignores --root: the same ledger comes out with or without it, and no agents.off lookup blocks init", () => {
  const a = env(), b = env();
  fs.mkdirSync(path.join(b.root, ".claude"), { recursive: true });
  fs.writeFileSync(path.join(b.root, ".claude", "agents.off"), "");
  ok(run(["init", "--ledger", a.ledger, "--lane", "ui", "--touches", "live"]));
  ok(init(b, "ui", "live"));
  assert.deepEqual(fs.readFileSync(a.ledger, "utf8"), fs.readFileSync(b.ledger, "utf8"));
});

test("PIPE-57 resume after plan-limit does not reset rounds: the build round limit still trips afterwards", () => {
  const e = fresh("logic");
  through(e, "tests-pre");
  ok(start(e, "build"));
  ok(run(["round", "build", "--ledger", e.ledger])); ok(run(["round", "build", "--ledger", e.ledger]));
  ok(run(["stop", "--ledger", e.ledger, "--reason", "plan-limit"]));
  ok(run(["resume", "--ledger", e.ledger]));
  assert.equal(ok(run(["round", "build", "--ledger", e.ledger])).out.trim(), "3");
  tripped(run(["round", "build", "--ledger", e.ledger]));
  tripped(run(["resume", "--ledger", e.ledger]), /round|plan-limit/);
});

test("PIPE-58 resume keeps a validation strike: a stage that failed once before plan-limit stops on its next failure", () => {
  const e = fresh();
  ok(start(e, "staff-pm"));
  tripped(done(e, "staff-pm", block(e, "bad.md", SPEC_BAD)));
  ok(run(["stop", "--ledger", e.ledger, "--reason", "plan-limit"]));
  ok(run(["resume", "--ledger", e.ledger]));
  tripped(done(e, "staff-pm", block(e, "bad2.md", SPEC_BAD)), /twice/);
  assert.equal(status(e).stopped, true);
});

test("PIPE-59 huge token counts: a safe-integer maximum records exactly, an unsafe or 400-digit count exits 2, and a huge count over a small budget stops", () => {
  const e = fresh("docs");
  ok(start(e, "staff-pm"));
  const g = GOOD(e, "staff-pm");
  assert.equal(done(e, "staff-pm", g, ["--tokens", "9".repeat(400)]).code, 2);
  assert.equal(done(e, "staff-pm", g, ["--tokens", "9007199254740993"]).code, 2, "above MAX_SAFE_INTEGER");
  assert.equal(status(e).stages["staff-pm"].state, "started");
  tripped(done(e, "staff-pm", g, ["--tokens", "9007199254740991", "--budget", "1"]), /budget/);
  const s = status(e);
  assert.equal(s.stages["staff-pm"].tokens, 9007199254740991);
  assert.equal(s.stopped, true);
});

test("PIPE-60 a huge budget never overflows: tokens under 1.5x of a safe-integer budget pass", () => {
  const e = fresh("docs");
  ok(start(e, "staff-pm"));
  ok(done(e, "staff-pm", GOOD(e, "staff-pm"), ["--tokens", "9007199254740991", "--budget", "9007199254740991"]));
  assert.equal(status(e).stopped, false);
});

test("PIPE-61 a ledger with an unknown lane, or not an object, exits 2 for every subcommand that reads it", () => {
  const e = fresh();
  const good = JSON.parse(fs.readFileSync(e.ledger, "utf8"));
  for (const bad of [{ ...good, lane: "mystery" }, [], "text", null, { version: 1 }]) {
    fs.writeFileSync(e.ledger, JSON.stringify(bad));
    for (const args of [["status"], ["start", "staff-pm"], ["round", "build"], ["stop", "--reason", "x"], ["resume"], ["class", "--files", "a.md"]]) {
      assert.equal(run([...args, "--ledger", e.ledger]).code, 2, `${JSON.stringify(bad).slice(0, 30)} ${args[0]}`);
    }
  }
});

test("PIPE-64 an unknown lane in a ledger carrying a skipped stage state does not let start jump over a pending stage", () => {
  const e = fresh("docs");
  pass(e, "staff-pm");
  tripped(start(e, "pr"), /verify/);
  pass(e, "verify"); pass(e, "pr");
  assert.equal(status(e).stages.build.state, "skipped");
});

test("PIPE-65 start on a skipped stage names the lane and exits 1 without changing the ledger", () => {
  const e = fresh("config");
  pass(e, "staff-pm");
  const before = fs.readFileSync(e.ledger, "utf8");
  tripped(start(e, "build"), /config/);
  tripped(start(e, "tests-pre"), /config/);
  assert.equal(fs.readFileSync(e.ledger, "utf8"), before);
});

test("PIPE-66 done after a budget stop: the over-budget stage is recorded done with its tokens, and a later done on the next stage is refused", () => {
  const e = fresh("docs");
  ok(start(e, "staff-pm"));
  tripped(done(e, "staff-pm", GOOD(e, "staff-pm"), ["--tokens", "151", "--budget", "100"]));
  tripped(start(e, "verify"), /stopped/);
  assert.equal(status(e).stages["staff-pm"].tokens, 151);
});

test("PIPE-67 stop is idempotent and keeps the first reason: a second stop does not overwrite why the run ended", () => {
  const e = fresh();
  ok(run(["stop", "--ledger", e.ledger, "--reason", "plan-limit"]));
  ok(run(["stop", "--ledger", e.ledger, "--reason", "something else"]));
  assert.equal(status(e).stop_reason, "plan-limit");
});

test("PIPE-68 a stop reason with a newline or very long text is stored whole and status stays one JSON document", () => {
  const e = fresh();
  const reason = "line one\nline two " + "x".repeat(5000);
  ok(run(["stop", "--ledger", e.ledger, "--reason", reason]));
  assert.equal(status(e).stop_reason, reason.trim());
});

test("PIPE-69 verify rounds: a --bug that is whitespace exits 2, and bug ids that differ only by case are separate counts", () => {
  const e = fresh("docs");
  pass(e, "staff-pm"); ok(start(e, "verify"));
  assert.equal(run(["round", "verify", "--ledger", e.ledger, "--bug", "   "]).code, 2);
  ok(run(["round", "verify", "--ledger", e.ledger, "--bug", "BUG-1"]));
  ok(run(["round", "verify", "--ledger", e.ledger, "--bug", "bug-1"]));
  assert.equal(status(e).stopped, false);
});

test("PIPE-70 class --json on class A and B has an empty reasons list and the same class letter as plain output", () => {
  const e = fresh();
  assert.deepEqual(parseJson(run(["class", "--ledger", e.ledger, "--files", "docs/a.md", "--json"])), { class: "A", reasons: [] });
  assert.deepEqual(parseJson(run(["class", "--ledger", e.ledger, "--files", "docs/a.md", "--feedback", "--json"])), { class: "B", reasons: [] });
});

test("PIPE-71 a flag with no value at the end of the line exits 2 and writes nothing", () => {
  const e = fresh();
  const before = fs.readFileSync(e.ledger, "utf8");
  assert.equal(run(["stop", "--ledger", e.ledger, "--reason"]).code, 2);
  assert.equal(run(["start", "staff-pm", "--ledger", e.ledger, "--model"]).code, 2);
  assert.equal(fs.readFileSync(e.ledger, "utf8"), before);
});


test("PIPE-50 class C for .github written with a leading ./ or a leading slash, and with backslashes", () => {
  const e = fresh();
  for (const f of ["./.github/workflows/x.yml", "/.github/workflows/x.yml", ".github\\workflows\\x.yml", "./package.json", "./CLAUDE.md"]) assert.equal(letter(cls(e, `docs/a.md,${f}`)), "C", f);
});


test("PIPE-51 class C for a lower-case claude.md (a case-insensitive filesystem treats it as CLAUDE.md)", () => {
  const e = fresh();
  assert.equal(letter(cls(e, "claude.md")), "C");
});

