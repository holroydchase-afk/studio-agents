// Tests for tools/spec-lint.mjs: the keyword and structure linter for a staff-pm spec (docs/product/SPEC-SPEC-LINT.md,
// rules SL-1..SL-9, acceptance criteria SLINT-1..7). Written test-first by qa-tdd: red until the engineer builds the
// tool. Every test checks that the tool exists first, so each one fails on its own for the right reason.
//
// Contract under test: node tools/spec-lint.mjs <spec.md> [--json] [--rules SL-1,SL-3]
//   exit 0 no findings, 1 findings, 2 usage / unreadable / no spec block / block fails check-spec (errors printed).
//   stderr, one finding per line: "<file>:<line> SL-n name: message"; --json prints {findings:[{rule,line,message}]}
//   (plus waived); --rules limits the run; "lint-ok: SL-n <reason>" waives a rule, with no reason it is a finding.
//   Exports lintSpec(text); the CLI runs only as the main script. No clock, randomness, network or file writes.
//
// Fixtures: tests/fixtures/spec-lint/. slN-fail / slN-pass are the table examples (each wrapped in a minimal spec that
// passes check-spec and trips no other rule). hd2-* rebuild the 4 heldout-2 staff-pm failures; good-* rebuild the 8
// passing heldout-2 specs from the grader reasons (the saved transcripts are empty, see QA-R1 in the qa report).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkSpec } from "../tools/check-spec.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = path.join(ROOT, "tools", "spec-lint.mjs");
const FIX_REL = "tests/fixtures/spec-lint";
const FIX = path.join(ROOT, FIX_REL);
const rel = (name) => `${FIX_REL}/${name}`;
const read = (name) => fs.readFileSync(path.join(FIX, name), "utf8");

const NAMES = {
  "SL-1": "pinned-clock", "SL-2": "empty-input", "SL-3": "rollback", "SL-4": "phone-budget", "SL-5": "measured-bar",
  "SL-6": "auth-cases", "SL-7": "claim-parity", "SL-8": "stale-artifacts", "SL-9": "risk-rank",
};
const FINDING = /^(.+?):(\d+) (SL-\d+) ([a-z-]+): (.+)$/;

function needTool() {
  assert.ok(fs.existsSync(TOOL), "tools/spec-lint.mjs does not exist yet (red until the engineer builds it)");
}
function run(args, opts = {}) {
  needTool();
  const { nodeArgs = [], ...rest } = opts;
  return spawnSync(process.execPath, [...nodeArgs, TOOL, ...args], { cwd: ROOT, encoding: "utf8", ...rest });
}
// Findings parsed from stderr; any stderr line that is not a finding fails the parse check where it matters.
function findings(res) {
  return res.stderr.split(/\r?\n/).filter(Boolean).map((l) => FINDING.exec(l)).filter(Boolean)
    .map(([, file, line, rule, name, message]) => ({ file, line: Number(line), rule, name, message }));
}
function json(res) {
  assert.doesNotThrow(() => JSON.parse(res.stdout), `--json stdout is not JSON: ${res.stdout.slice(0, 200)}`);
  return JSON.parse(res.stdout);
}
// 1-based line of the first line containing `needle`.
function lineOf(name, needle) {
  const i = read(name).split(/\r?\n/).findIndex((l) => l.includes(needle));
  assert.ok(i >= 0, `fixture ${name} has no line with "${needle}"`);
  return i + 1;
}
// The spec says a finding sits on its first trigger line, "or line 1 of the block when the rule fires because something
// is absent". That second clause is ambiguous (QA-R2), so a finding may sit on the trigger line, the ```spec fence or
// the first line inside the block.
function allowedLines(name, needle) {
  const fence = lineOf(name, "```spec");
  return [lineOf(name, needle), fence, fence + 1];
}

// The table examples. trigger: text on the line that makes the rule apply.
const RULES = [
  { id: "SL-1", fail: "sl1-fail.md", pass: "sl1-pass.md", trigger: "Given it is Monday" },
  { id: "SL-2", fail: "sl2-fail.md", pass: "sl2-pass.md", trigger: "Given 3 items" },
  { id: "SL-3", fail: "sl3-fail.md", pass: "sl3-pass.md", trigger: "Deploy the page to Pages" },
  { id: "SL-4", fail: "sl4-fail.md", pass: "sl4-pass.md", trigger: "at 360px" },
  { id: "SL-5", fail: "sl5-fail.md", pass: "sl5-pass.md", trigger: "fairness comes before precision" },
  { id: "SL-6", fail: "sl6-fail.md", pass: "sl6-pass.md", trigger: "owner-only behind sign-in" },
  { id: "SL-7", fail: "sl7-fail.md", pass: "sl7-pass.md", trigger: "Update the README quickstart" },
  { id: "SL-8", fail: "sl8-fail.md", pass: "sl8-pass.md", trigger: "Done when the code merges" },
  { id: "SL-9", fail: "sl9-fail.md", pass: "sl9-pass.md", trigger: "Risk (P1)" },
];

test("SLINT-T0 fixture check (passes before the build): every fixture except the two error cases passes check-spec, and none holds personal data", () => {
  for (const f of fs.readdirSync(FIX).filter((x) => x.endsWith(".md"))) {
    const text = read(f);
    const { errors } = checkSpec(text);
    if (f === "bad-block.md" || f === "no-block.md") assert.ok(errors.length > 0, `${f} must fail check-spec`);
    else assert.deepEqual(errors, [], `${f} must pass check-spec`);
    assert.doesNotMatch(text, /claude\.ai|@[A-Za-z0-9-]+\.[A-Za-z]{2,}/, `${f} holds a link or email`);
  }
});

test("SLINT-T1 the tool exports lintSpec and importing it does not run the CLI or exit", async () => {
  needTool();
  const mod = await import("../tools/spec-lint.mjs");
  assert.equal(typeof mod.lintSpec, "function");
  assert.doesNotThrow(() => mod.lintSpec(read("sl3-pass.md")));
});

// SLINT-1: one finding of the right rule on the failing example, none on the passing one.
for (const [i, r] of RULES.entries()) {
  test(`SLINT-T${2 + i} ${r.id} ${NAMES[r.id]}: the failing table example gives exactly 1 ${r.id} finding at its line; the passing one gives 0`, () => {
    const bad = run([rel(r.fail)]);
    assert.equal(bad.status, 1, `${r.fail} should exit 1, got ${bad.status}: ${bad.stderr}`);
    const got = findings(bad);
    assert.deepEqual(got.map((f) => f.rule), [r.id], `${r.fail} findings: ${bad.stderr}`);
    assert.equal(got[0].name, NAMES[r.id]);
    assert.ok(allowedLines(r.fail, r.trigger).includes(got[0].line), `${r.id} at line ${got[0].line}, want ${allowedLines(r.fail, r.trigger)}`);
    const good = run([rel(r.pass)]);
    assert.equal(good.status, 0, `${r.pass} should exit 0, got ${good.status}: ${good.stderr}`);
    assert.deepEqual(findings(good), []);
  });
}

test("SLINT-T11 SL-1 pinned-clock: the finding is on the criterion line, in the exact <file>:<line> SL-n name: message format", () => {
  const res = run([rel("sl1-fail.md")]);
  assert.equal(res.status, 1);
  const lines = res.stderr.split(/\r?\n/).filter(Boolean);
  assert.equal(lines.length, 1, `want one stderr line, got: ${res.stderr}`);
  const want = new RegExp(`^${rel("sl1-fail.md").replace(/[.]/g, "\\.")}:${lineOf("sl1-fail.md", "Given it is Monday")} SL-1 pinned-clock: \\S.*$`);
  assert.match(lines[0], want);
});

test("SLINT-T12 SL-1 pinned-clock is per criterion: two unpinned criteria give 2 findings on their own lines", () => {
  const got = findings(run([rel("sl1-two.md")]));
  assert.deepEqual(got.map((f) => [f.rule, f.line]), [
    ["SL-1", lineOf("sl1-two.md", "Given it is Monday")],
    ["SL-1", lineOf("sl1-two.md", "per day")],
  ]);
});

test("SLINT-T13 SL-1 pinned-clock: an ISO date in another criterion does not pin this one, and MONDAY in capitals still triggers", () => {
  const got = findings(run([rel("sl1-mixed.md")]));
  assert.deepEqual(got.map((f) => [f.rule, f.line]), [["SL-1", lineOf("sl1-mixed.md", "MONDAY")]]);
});

test("SLINT-T14 SL-6 auth-cases: one finding per missing half (no signed-out and no different-user case gives 2)", () => {
  const res = run([rel("sl6-neither.md")]);
  assert.equal(res.status, 1);
  assert.deepEqual(findings(res).map((f) => f.rule), ["SL-6", "SL-6"]);
  const msgs = findings(res).map((f) => f.message.toLowerCase()).join(" | ");
  assert.match(msgs, /signed.out/, "one message names the signed-out case");
  assert.match(msgs, /different|another|non-owner/, "one message names the different-user case");
});

test("SLINT-T15 SL-9 risk-rank: a P2 risk that is not privacy, secret, live data or an unreleased claim is not flagged", () => {
  const res = run([rel("sl9-pass-other.md")]);
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(findings(res), []);
});

test("SLINT-T16 SL-3 rollback: the message names what to add and never quotes the link from the spec", () => {
  const got = findings(run([rel("sl3-fail-link.md")]));
  assert.deepEqual(got.map((f) => f.rule), ["SL-3"]);
  assert.match(got[0].message, /rollback|revert|roll back|undo/i);
  assert.doesNotMatch(got[0].message, /https?:|example\.com|7f3a9c/);
});

// SLINT-2: the four heldout-2 staff-pm failures.
const HELDOUT_FAILS = [
  ["hd2-phone-height.md", "SL-4", "CC-S3 phone page height, no screen budget"],
  ["hd2-geofence-fairness.md", "SL-5", "CK-S5 geofence with no measured fairness bar"],
  ["hd2-recruiter-rollback.md", "SL-6", "RR-S7 recruiter page with no different-user case"],
  ["hd2-readme-unreleased.md", "SL-9", "CC-S5 README unreleased features ranked P1 not P0"],
];
for (const [i, [file, rule, what]] of HELDOUT_FAILS.entries()) {
  test(`SLINT-T${17 + i} ${rule} ${NAMES[rule]}: heldout-2 failure ${what} is flagged`, () => {
    const res = run([file].map(rel));
    assert.equal(res.status, 1, `${file} should exit 1: ${res.stderr}`);
    assert.ok(findings(res).some((f) => f.rule === rule), `${file} not flagged by ${rule}: ${res.stderr}`);
  });
}

test("SLINT-T21 SL-6 auth-cases: the recruiter spec is flagged only for the different-user half (it has signed-out cases)", () => {
  const sl6 = findings(run([rel("hd2-recruiter-rollback.md")])).filter((f) => f.rule === "SL-6");
  assert.equal(sl6.length, 1, JSON.stringify(sl6));
  assert.match(sl6[0].message.toLowerCase(), /different|another|non-owner/);
});

// SLINT-3: false-positive budget on the known-good specs.
const GOOD = fs.readdirSync(FIX).filter((f) => f.startsWith("good-")).sort();
test("SLINT-T22 fixture check (passes before the build): at least 6 known-good fixtures exist (8 rebuilt heldout-2 passes)", () => {
  assert.ok(GOOD.length >= 6, `only ${GOOD.length} good-* fixtures`);
});
for (const [i, file] of GOOD.entries()) {
  test(`SLINT-T${23 + i} all rules: known-good ${file} gives at most 1 finding`, () => {
    const res = run([rel(file)]);
    assert.ok(res.status === 0 || res.status === 1, `exit ${res.status}: ${res.stderr}`);
    assert.ok(findings(res).length <= 1, `${file}: ${res.stderr}`);
  });
}

test("SLINT-T31 SL-2/SL-3/SL-4: a docs-only spec with no numbers, lists, public change or phone lints clean, exit 0", () => {
  const res = run([rel("docs-only.md")]);
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(findings(res), []);
  assert.equal(res.stderr.trim(), "");
});

test("SLINT-T32 --json prints {findings:[{rule,line,message}]} on stdout and still exits 1", () => {
  const res = run([rel("sl1-fail.md"), "--json"]);
  assert.equal(res.status, 1);
  const out = json(res);
  assert.ok(Array.isArray(out.findings));
  assert.equal(out.findings.length, 1);
  const [f] = out.findings;
  assert.equal(f.rule, "SL-1");
  assert.equal(f.line, lineOf("sl1-fail.md", "Given it is Monday"));
  assert.equal(typeof f.message, "string");
  assert.ok(f.message.length > 0);
});

test("SLINT-T33 --json on a clean spec gives an empty findings array and exit 0", () => {
  const res = run([rel("sl3-pass.md"), "--json"]);
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(json(res).findings, []);
});

test("SLINT-T34 --rules SL-1,SL-3 limits a 3-rule failure (SL-1, SL-3, SL-8) to those two", () => {
  const all = findings(run([rel("multi-fail.md")])).map((f) => f.rule).sort();
  assert.deepEqual(all, ["SL-1", "SL-3", "SL-8"]);
  const res = run([rel("multi-fail.md"), "--rules", "SL-1,SL-3"]);
  assert.equal(res.status, 1);
  assert.deepEqual(findings(res).map((f) => f.rule).sort(), ["SL-1", "SL-3"]);
});

test("SLINT-T35 --rules for a rule that does not fire gives exit 0 and no findings", () => {
  const res = run([rel("sl1-fail.md"), "--rules", "SL-3"]);
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(findings(res), []);
});

test("SLINT-T36 --rules with an unknown rule id (SL-99, sl-x, empty) exits 2", () => {
  for (const bad of [["--rules", "SL-99"], ["--rules", "SL-1,SL-x"], ["--rules", ""], ["--rules"]]) {
    const res = run([rel("sl1-fail.md"), ...bad]);
    assert.equal(res.status, 2, `${bad.join(" ")} exited ${res.status}`);
    assert.deepEqual(findings(res), [], "no lint findings on a usage error");
  }
});

test("SLINT-T37 SL-3 waiver: 'lint-ok: SL-3 internal tool only' silences SL-3 and lists it under waived", () => {
  const plain = run([rel("sl3-waived.md")]);
  assert.equal(plain.status, 0, plain.stderr);
  assert.deepEqual(findings(plain), []);
  const res = run([rel("sl3-waived.md"), "--json"]);
  const out = json(res);
  assert.deepEqual(out.findings, []);
  assert.ok(Array.isArray(out.waived) && out.waived.length === 1, `waived: ${JSON.stringify(out.waived)}`);
  assert.match(JSON.stringify(out.waived), /SL-3/);
  assert.match(JSON.stringify(out.waived), /internal tool only/);
});

test("SLINT-T38 SL-3 waiver with no reason ('lint-ok: SL-3') is itself 1 finding at the waiver line", () => {
  const res = run([rel("sl3-waiver-noreason.md")]);
  assert.equal(res.status, 1);
  const got = findings(res);
  assert.equal(got.length, 1, res.stderr);
  assert.equal(got[0].line, lineOf("sl3-waiver-noreason.md", "lint-ok: SL-3"));
  assert.match(got[0].message, /reason/i);
  assert.match(got[0].message, /SL-3/);
});

test("SLINT-T39 exit 2: a block that fails check-spec prints the check-spec errors and no SL finding", () => {
  const res = run([rel("bad-block.md")]);
  assert.equal(res.status, 2);
  assert.deepEqual(findings(res), []);
  assert.doesNotMatch(res.stderr, / SL-\d+ /);
  for (const e of checkSpec(read("bad-block.md")).errors) assert.ok(res.stderr.includes(e), `missing check-spec error: ${e}`);
});

test("SLINT-T40 exit 2: no spec block, an empty file, a missing file, a directory, and no arguments", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "spec-lint-"));
  const empty = path.join(tmp, "empty.md");
  fs.writeFileSync(empty, "");
  try {
    for (const args of [[rel("no-block.md")], [empty], [rel("does-not-exist.md")], [FIX_REL], []]) {
      const res = run(args);
      assert.equal(res.status, 2, `${args.join(" ") || "(no args)"} exited ${res.status}`);
      assert.deepEqual(findings(res), []);
    }
    assert.match(run([rel("no-block.md")]).stderr, /no ```spec block/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("SLINT-T41 exit codes: 0 for a clean spec, 1 for findings, 2 for two files", () => {
  assert.equal(run([rel("sl8-pass.md")]).status, 0);
  assert.equal(run([rel("sl8-fail.md")]).status, 1);
  assert.equal(run([rel("sl8-fail.md"), rel("sl8-pass.md")]).status, 2);
});

test("SLINT-T42 determinism: the same spec twice gives byte-identical stdout, stderr and exit, plain and --json", () => {
  for (const args of [[rel("multi-fail.md")], [rel("multi-fail.md"), "--json"], [rel("good-sf-remote.md")]]) {
    const a = run(args), b = run(args, { env: { ...process.env, TZ: "Pacific/Kiritimati" } });
    assert.equal(a.status, b.status);
    assert.equal(a.stdout, b.stdout);
    assert.equal(a.stderr, b.stderr);
  }
});

function snapshot(dir) {
  return fs.readdirSync(dir).sort().map((f) => {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    return `${f} ${st.size} ${st.mtimeMs} ${crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex")}`;
  }).join("\n");
}

test("SLINT-T43 no file writes and no network: runs under a read-only permission model with sockets blocked, fixture dir unchanged", () => {
  needTool();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "spec-lint-net-"));
  const guard = path.join(tmp, "no-net.mjs");
  fs.writeFileSync(guard, [
    'import net from "node:net";',
    'const no = () => { process.stderr.write("NETWORK-ATTEMPT\\n"); process.exit(97); };',
    "net.Socket.prototype.connect = no; net.connect = no; net.createConnection = no;",
    "globalThis.fetch = no;",
  ].join("\n"));
  try {
    const before = snapshot(FIX);
    const before2 = snapshot(path.join(ROOT, "tools"));
    for (const f of ["sl3-pass.md", "multi-fail.md", "sl3-waived.md"]) {
      for (const extra of [[], ["--json"]]) {
        const res = run([rel(f), ...extra], { nodeArgs: ["--permission", "--allow-fs-read=*", "--import", guard] });
        assert.doesNotMatch(res.stderr, /NETWORK-ATTEMPT|ERR_ACCESS_DENIED/, `${f}: ${res.stderr}`);
        assert.ok(res.status === 0 || res.status === 1, `${f} ${extra} exited ${res.status}: ${res.stderr}`);
      }
    }
    assert.equal(snapshot(FIX), before, "fixture dir changed");
    assert.equal(snapshot(path.join(ROOT, "tools")), before2, "tools dir changed");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("SLINT-T44 no network or clock in the source: no net/http/https/dgram import, fetch, Date or Math.random", () => {
  needTool();
  const src = fs.readFileSync(TOOL, "utf8");
  assert.doesNotMatch(src, /from\s+["'](?:node:)?(?:net|http|https|dgram|tls|dns)["']/);
  assert.doesNotMatch(src, /\bfetch\s*\(|\bnew Date\b|Date\.now|Math\.random/);
  assert.doesNotMatch(src, /writeFileSync|appendFileSync|createWriteStream|\bwriteFile\b/);
  assert.match(src, /from\s+["']\.\/check-spec\.mjs["']/, "it imports checkSpec from ./check-spec.mjs");
});
