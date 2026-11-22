// Failing-first tests for tools/qa-run3.mjs: run a suite N times, report counts only, print a verdict and a
// suite line that tools/check-qa-report.mjs accepts. Fixtures are tiny node scripts in a temp dir; nothing else.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkQaReport } from "../tools/check-qa-report.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = path.join(ROOT, "tools", "qa-run3.mjs");
const MARKER = "QARUN3-SECRET-7f3a9c";
let dir, n = 0;
const F = {};

const FIXTURES = {
  pass9: `console.log("# tests 9\\n# pass 9\\n# fail 0");`,
  fail1: `console.log("9 passed, 1 failed"); process.exit(1);`,
  sep: `console.log("7 passed\\n0 failed");`,
  plain0: `console.log("hello, no counts here");`,
  plain1: `console.log("nothing to count"); process.exit(1);`,
  passFail: `console.log("# pass 9\\n# fail 1");`, // exit 0 but a failed count
  // counter-file fixtures: argv[2] is the counter path
  flaky: `const fs=require("fs");const c=process.argv[2];const k=(fs.existsSync(c)?+fs.readFileSync(c,"utf8"):0)+1;fs.writeFileSync(c,String(k));process.exit(k%2===0?1:0);`,
  drift: `const fs=require("fs");const c=process.argv[2];const k=(fs.existsSync(c)?+fs.readFileSync(c,"utf8"):0)+1;fs.writeFileSync(c,String(k));console.log("# pass "+(8+k)+"\\n# fail 0");`,
  redMixed: `const fs=require("fs");const c=process.argv[2];const k=(fs.existsSync(c)?+fs.readFileSync(c,"utf8"):0)+1;fs.writeFileSync(c,String(k));console.log("# pass 1\\n# fail "+k);process.exit(1);`,
  sleep: `setTimeout(()=>{}, 30000);`,
  secret: `console.log("${MARKER}");console.error("${MARKER}");console.log("# pass 1\\n# fail 0");`,
  touch: `require("fs").writeFileSync(process.argv[2], "ran");`,
};

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "qarun3-test-"));
  for (const [k, src] of Object.entries(FIXTURES)) {
    F[k] = path.join(dir, `${k}.cjs`);
    fs.writeFileSync(F[k], src);
  }
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

const counter = () => path.join(dir, `counter-${n++}`);
function run(args, opts = {}) {
  const r = spawnSync(process.execPath, [TOOL, ...args], { cwd: opts.cwd || dir, encoding: "utf8", timeout: 90000 });
  return { code: r.status, out: r.stdout || "", err: r.stderr || "" };
}
const runLines = (out) => out.split("\n").filter((l) => /^run \d+:/.test(l));
const verdictOf = (out) => (/^verdict: (\w+)$/m.exec(out) || [])[1];
const suiteOf = (out) => (/^suite: .*$/m.exec(out) || [])[0];
const json = (r) => { assert.equal(r.code !== 2, true, `usage error: ${r.err}`); return JSON.parse(r.out); };

test("QARUN3-1 the tool exists at tools/qa-run3.mjs", () => {
  assert.ok(fs.existsSync(TOOL), "tools/qa-run3.mjs is missing");
});

test("QARUN3-2 usage errors exit 2 and never run the command", () => {
  const cases = [
    [],                                        // nothing at all
    ["--runs", "3"],                           // no -- and no command
    ["--"],                                    // -- with nothing after it
    ["--", ""],                                // empty command
    ["--runs", "0", "--", "node", F.touch],    // below 1
    ["--runs", "11", "--", "node", F.touch],   // above 10
    ["--runs", "-1", "--", "node", F.touch],   // negative
    ["--runs", "2.5", "--", "node", F.touch],  // not an integer
    ["--runs", "abc", "--", "node", F.touch],  // not a number
    ["--runs", "--", "node", F.touch],         // missing value
    ["--bogus", "--", "node", F.touch],        // unknown flag
  ];
  for (const args of cases) {
    const mark = path.join(dir, `ran-${n++}`);
    const a = args.map((x) => (x === F.touch ? `${F.touch} ${mark}` : x));
    const r = run(a.flatMap((x) => (x.startsWith(F.touch) ? x.split(" ") : [x])));
    assert.equal(r.code, 2, `args ${JSON.stringify(args)} should be a usage error, got ${r.code}: ${r.err}`);
    assert.match(r.err, /usage/i, `args ${JSON.stringify(args)} should print usage on stderr`);
    assert.ok(!fs.existsSync(mark), `args ${JSON.stringify(args)} ran the command`);
  }
});

test("QARUN3-3 defaults: 3 runs, name is the first word of the command, green exits 0", () => {
  const r = run(["--", "node", F.pass9]);
  assert.equal(r.code, 0, r.err);
  assert.equal(runLines(r.out).length, 3);
  assert.match(runLines(r.out)[0], /^run 1: exit 0, 9 passed, 0 failed, \d+ ms$/);
  assert.equal(verdictOf(r.out), "green");
  assert.equal(suiteOf(r.out), `suite: node | node ${F.pass9} | 9/0 9/0 9/0`);
});

test("QARUN3-4 --name sets the suite name", () => {
  const r = run(["--name", "unit", "--", "node", F.pass9]);
  assert.equal(r.code, 0, r.err);
  assert.equal(suiteOf(r.out), `suite: unit | node ${F.pass9} | 9/0 9/0 9/0`);
});

test("QARUN3-5 --runs 1 and --runs 10 are the bounds and run exactly that many times", () => {
  const one = run(["--runs", "1", "--", "node", F.pass9]);
  assert.equal(one.code, 0, one.err);
  assert.equal(runLines(one.out).length, 1);
  assert.match(suiteOf(one.out), /\| 9\/0$/);
  const c = counter();
  const ten = run(["--runs", "10", "--json", "--", "node", F.drift, c]);
  assert.equal(fs.readFileSync(c, "utf8"), "10", "the command ran a different number of times than --runs");
  assert.equal(json(ten).runs.length, 10);
  assert.deepEqual(json(ten).runs.map((x) => x.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("QARUN3-6 flaky: exit codes differ between runs (counter file fails every second run)", () => {
  const r = run(["--", "node", F.flaky, counter()]);
  assert.equal(verdictOf(r.out), "flaky");
  assert.equal(r.code, 1);
  assert.match(suiteOf(r.out), /\| 1\/0 0\/1 1\/0$/);
});

test("QARUN3-7 flaky: every run exits 0 but passed counts differ, so never green", () => {
  const r = run(["--", "node", F.drift, counter()]);
  assert.equal(verdictOf(r.out), "flaky");
  assert.equal(r.code, 1);
  assert.match(suiteOf(r.out), /\| 9\/0 10\/0 11\/0$/);
});

test("QARUN3-8 flaky wins over red when every run fails but failed counts differ", () => {
  const r = run(["--", "node", F.redMixed, counter()]);
  assert.equal(verdictOf(r.out), "flaky");
  assert.equal(r.code, 1);
});

test("QARUN3-9 red: every run fails the same way, exit 1, counts from 'N passed, M failed'", () => {
  const r = run(["--", "node", F.fail1]);
  assert.equal(verdictOf(r.out), "red");
  assert.equal(r.code, 1);
  assert.match(runLines(r.out)[0], /^run 1: exit 1, 9 passed, 1 failed, \d+ ms$/);
  assert.match(suiteOf(r.out), /\| 9\/1 9\/1 9\/1$/);
});

test("QARUN3-10 a failed count above 0 is never green even when the exit code is 0", () => {
  const r = run(["--", "node", F.passFail]);
  assert.ok(verdictOf(r.out), "no verdict line printed");
  assert.notEqual(verdictOf(r.out), "green");
  assert.equal(r.code, 1);
});

test("QARUN3-11 counts parse from separate 'N passed' and 'M failed' lines", () => {
  const j = json(run(["--json", "--", "node", F.sep]));
  assert.equal(j.verdict, "green");
  assert.deepEqual(j.runs.map((x) => [x.passed, x.failed]), [[7, 0], [7, 0], [7, 0]]);
});

test("QARUN3-12 node:test '# pass N' / '# fail M' lines parse into counts", () => {
  const j = json(run(["--json", "--", "node", F.pass9]));
  assert.deepEqual(j.runs.map((x) => [x.passed, x.failed]), [[9, 0], [9, 0], [9, 0]]);
});

test("QARUN3-13 no counts found: passed and failed are null, exit code decides, suite line uses 1/0 and 0/1", () => {
  const ok = run(["--json", "--", "node", F.plain0]);
  assert.equal(ok.code, 0, ok.err);
  const j = JSON.parse(ok.out);
  assert.equal(j.verdict, "green");
  assert.ok(j.runs.every((x) => x.passed === null && x.failed === null));
  assert.match(j.suite, /1\/0 1\/0 1\/0$/);
  const bad = run(["--", "node", F.plain1]);
  assert.equal(verdictOf(bad.out), "red");
  assert.match(suiteOf(bad.out), /\| 0\/1 0\/1 0\/1$/);
  assert.doesNotMatch(bad.out, /\?/, "a ? count is not valid in a qa block");
});

test("QARUN3-14 a command that does not exist is a failing run (red, exit 1), not a usage error", () => {
  const r = run(["--", "qarun3-no-such-command-xyz"]);
  assert.equal(verdictOf(r.out), "red");
  assert.equal(r.code, 1);
  assert.equal(runLines(r.out).length, 3);
});

test("QARUN3-15 timeout kills the run, marks it failed with timedOut, and the remaining runs still happen", () => {
  const t0 = Date.now();
  const r = run(["--runs", "2", "--timeout", "1", "--json", "--", "node", F.sleep]);
  const took = Date.now() - t0;
  assert.ok(took < 20000, `took ${took} ms: the sleeping child (or its shell's child) was not killed`);
  const j = json(r);
  assert.equal(j.runs.length, 2, "the run after a timeout must still happen");
  assert.ok(j.runs.every((x) => x.timedOut === true));
  assert.ok(j.runs.every((x) => x.ms >= 900 && x.ms < 10000), `ms: ${j.runs.map((x) => x.ms)}`);
  assert.equal(j.verdict, "red");
  assert.equal(r.code, 1);
});

test("QARUN3-16 the command's own output is never echoed (stdout or stderr), human or --json", () => {
  for (const extra of [[], ["--json"]]) {
    const r = run([...extra, "--", "node", F.secret]);
    assert.ok(r.out.length > 0, "the tool printed nothing");
    assert.ok(!r.out.includes(MARKER), `marker leaked to stdout (${extra.join(" ") || "human"})`);
    assert.ok(!r.err.includes(MARKER), `marker leaked to stderr (${extra.join(" ") || "human"})`);
  }
});

test("QARUN3-17 --json prints only the JSON object with the documented shape", () => {
  const r = run(["--json", "--name", "unit", "--", "node", F.pass9]);
  assert.equal(r.code, 0, r.err);
  const j = JSON.parse(r.out); // throws if anything else is on stdout
  assert.deepEqual(Object.keys(j).sort(), ["command", "name", "runs", "suite", "verdict"]);
  assert.equal(j.verdict, "green");
  assert.equal(j.name, "unit");
  assert.equal(j.command, `node ${F.pass9}`);
  assert.equal(j.runs.length, 3);
  for (const [i, x] of j.runs.entries()) {
    assert.deepEqual(Object.keys(x).sort(), ["error", "exit", "failed", "ms", "n", "passed", "timedOut"]);
    assert.equal(x.n, i + 1);
    assert.equal(x.exit, 0);
    assert.equal(typeof x.ms, "number");
    assert.ok(x.ms >= 0);
    assert.equal(x.timedOut, false);
  }
  assert.match(j.suite, /unit \| node .* \| 9\/0 9\/0 9\/0$/);
});

test("QARUN3-18 the printed suite line passes checkQaReport in a qa block (green, null counts, flaky, piped command)", () => {
  const block = (verdict, suite, extra = "") => "```qa\nverdict: " + verdict + "\n" + suite + "\n" + extra + "```\n";
  const green = suiteOf(run(["--", "node", F.pass9]).out);
  assert.ok(green, "no suite line printed");
  assert.deepEqual(checkQaReport(block("green", green)).errors, []);
  const nulls = suiteOf(run(["--", "node", F.plain0]).out);
  assert.ok(nulls, "no suite line printed");
  assert.deepEqual(checkQaReport(block("green", nulls)).errors, []);
  const flaky = suiteOf(run(["--", "node", F.flaky, counter()]).out);
  assert.ok(flaky, "no suite line printed");
  assert.deepEqual(checkQaReport(block("flaky", flaky, "QA-R1 | P1 | x | flaky | tests/x.test.mjs\n")).errors, []);
  // A command with a shell pipe still has to give a 3-field suite line.
  const piped = suiteOf(run(["--", "node", F.pass9, "|", "cat"]).out);
  assert.ok(piped, "no suite line printed for a piped command");
  assert.deepEqual(checkQaReport(block("green", piped)).errors, []);
});

test("QARUN3-19 leaves no stray files in the working directory or the temp dir", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "qarun3-cwd-"));
  const tmpBefore = new Set(fs.readdirSync(os.tmpdir()).filter((x) => /qa-?run3/i.test(x) && !x.startsWith("qarun3-")));
  try {
    const r = run(["--", "node", F.pass9], { cwd });
    assert.equal(r.code, 0, r.err);
    run(["--runs", "1", "--timeout", "1", "--", "node", F.sleep], { cwd });
    assert.deepEqual(fs.readdirSync(cwd), [], "files left in the working directory");
    const tmpAfter = fs.readdirSync(os.tmpdir()).filter((x) => /qa-?run3/i.test(x) && !x.startsWith("qarun3-") && !tmpBefore.has(x));
    assert.deepEqual(tmpAfter, [], "files left in the temp dir");
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
