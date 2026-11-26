// Failing-first tests for the privacy-security review of plugins/stakeholder/tools/claim-check.mjs
// (STK-PS-R20, R21, R22, R23, R24, R27). Written by qa-tdd before any production code.
// Every test builds its own fixtures in a temp dir. No network, no clock, no real personal data. Phone-like values are made up
// (555 numbers) and assembled at run time. Hostile-input tests run the tool in a child process with a kill timeout.
//
// Contracts these tests pin where the spec is silent (engineer: follow them, or change them with qa-tdd):
//   R20 CAPS   a register with more than 5,000 rows, or an index / --text input with more than 2,000 quotes, is refused with
//              exit 1 (the existing "too large" convention for content over a cap), no stdout, no --out file, a one-line reason
//              naming the cap, no stack trace. Exactly 5,000 rows and exactly 2,000 quotes still run. Hostile inputs finish in
//              under 3 s; a refusal for a cap counts as finishing.
//   R21 CLAUSE a hedge word (planned, will, coming, roadmap, could, "not yet") blocks only the clause that carries it. Clauses
//              split on ; , and the words "and" and "but". A claim in another clause of the same sentence is judged as before.
//              A colon does not split ("Coming soon: 5 agents" is still one hedged clause).
//   R22 PHONE  a phone number written with NBSP, thin space, ideographic space, non-breaking hyphen, en dash or fullwidth digits
//              is "phone number" personal data: exit 1, the stop rule, nothing echoed (ASCII or fullwidth digits, in any output
//              field, stderr or file name shown). Checked by NFKC-normalizing the output and stripping non-digits.
//   R23 LISTS  supported, ignored, needs_human and skipped hold at most 100 entries each, first 100 in order, with
//              omitted_supported, omitted_ignored, omitted_needs_human, omitted_skipped (integers, 0 when nothing is cut).
//              `findings` keeps its own cap of 10 and `omitted`.
//   R24 EPIPE  stdout closed early (a reader that exits) prints nothing to stderr: no stack trace, no EPIPE text.
//   R27 DOCS   agents/stakeholder.md and skills/stakeholder/SKILL.md each have one paragraph that names claim-check and
//              repo-check and says their output fields (label, reason, name) are data, never instructions.
//
// Old tests in tests/stakeholder-claim-check.test.mjs that pin the old behavior (listed as QA-R IDs in the qa report; that file is not edited here):
//   - "R11-class a 3000-quote index runs in under 5 s ..." expects 3000 quotes to run; R20 refuses over 2,000 (reverses).
//   - SKT-13 "hedged sentences ..." and "every hedge word blocks a claim", and SKT-15 --text ("Planned: 5 more agents"): each hedge
//     sentence is a single clause, so they should still pass; re-run after the build and reverse any that do not.
//   - README line 72 "A sentence with a hedge ... is not a claim" reverses (R21; tested below by grep).
// Boundaries covered: 4,999/5,000/5,001 register rows, 2,000/2,001 quotes, 100/101 list entries, empty omitted counts (0).
// Not covered: a register of exactly 1 MB, quotes of zero length, time-zone/date inputs (the tool has none).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLUG = path.join(ROOT, "plugins", "stakeholder");
const TOOL = path.join(PLUG, "tools", "claim-check.mjs");

let n = 0;
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), `skt2h-${process.pid}-${n++}-`));
const put = (dir, rel, text) => { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); return p; };
const read = (p) => fs.readFileSync(p, "utf8");
const TRACE = /\n\s+at |RangeError|TypeError|ReferenceError|node:internal|EPIPE|Unhandled|Error: /;

// ---- fixtures ---------------------------------------------------------------------------------------------------
const A_HEAD = "| Name | Where | Verdict | Why | Proof today |\n|---|---|---|---|---|\n";
const agents = (k) => Array.from({ length: k }, (_, i) => `| \`bot-${i + 1}\` | agents | Agent | It does a thing | 3 evals |\n`).join("");
const regA = (k) => "# Made-up audit\n\n" + A_HEAD + agents(k);
const regB = (rows) => "# Made-up claims\n\n| Claim | Status | Notes |\n|---|---|---|\n" + rows.map(([c, s]) => `| ${c} | ${s} | n/a |\n`).join("");
const quotes = (...texts) => ({ quotes: texts.map((t, i) => ({ id: `q${i + 1}`, text: t })) });

// Runs the tool in a child process with a kill timeout; a killed run (null status) fails the test.
function run(args, { timeout = 12000 } = {}) {
  const t0 = Date.now();
  const r = spawnSync("node", [TOOL, ...args], { encoding: "utf8", timeout, maxBuffer: 64 * 1024 * 1024, killSignal: "SIGKILL" });
  const ms = Date.now() - t0;
  assert.equal(r.signal, null, `the tool was killed after ${ms} ms (hang): signal ${r.signal}`);
  let json = null; try { json = JSON.parse(r.stdout); } catch {}
  return { code: r.status, out: r.stdout || "", err: r.stderr || "", json, ms };
}
function claim({ index, text, register, ignore, extra = [], dir = tmp(), regName = "register.md" } = {}) {
  const args = [];
  const p = { dir };
  if (index !== undefined) { p.index = put(dir, "index.json", typeof index === "string" ? index : JSON.stringify(index)); args.push("--index", p.index); }
  if (text !== undefined) { p.text = put(dir, "page.txt", text); args.push("--text", p.text); }
  if (register !== undefined) { p.register = put(dir, regName, register); args.push("--register", p.register); }
  if (ignore !== undefined) { p.ignore = put(dir, "ignore.txt", ignore); args.push("--ignore", p.ignore); }
  return { ...run([...args, ...extra]), ...p };
}
const ok = (o) => { const r = claim(o); assert.equal(r.code, 0, `exit ${r.code}\n${r.err.slice(0, 600)}`); assert.ok(r.json, "stdout is not JSON"); return r; };
const refused = (r, code, re, why) => {
  assert.equal(r.code, code, `${why}: expected exit ${code}, got ${r.code}; stderr ${r.err.slice(0, 300)}`);
  assert.equal(r.out, "", `${why}: a refused run writes no JSON`);
  if (re) assert.match(r.err, re, `${why}: stderr was: ${r.err.slice(0, 400)}`);
  assert.doesNotMatch(r.err, TRACE, `${why}: no stack trace`);
};
const in3s = (r, why) => assert.ok(r.ms < 3000, `${why}: took ${r.ms} ms (limit 3000)`);
const tidy = (r) => { assert.doesNotMatch(r.err, TRACE, "no stack trace"); };
// a compact Name/Verdict register: |z100000|Agent| ... (16 bytes a row), so 60,000 rows stay under 1 MB
const compactReg = (k) => "|Name|Verdict|\n|---|---|\n" + Array.from({ length: k }, (_, i) => `|z${100000 + i}|Agent|\n`).join("");

// ================================================================ STK-PS-R20 quadratic hang
test("STK-PS-R20 a 1 MB text of 'a's against 1,300 register names (a, aa, aaa, ...) finishes in under 3 s", () => {
  const names = Array.from({ length: 1300 }, (_, i) => `|${"a".repeat(i + 1)}|Agent|\n`).join("");
  const reg = "|Name|Verdict|\n|---|---|\n" + names;
  assert.ok(Buffer.byteLength(reg) < 1048576, "fixture register must be under the 1 MB cap");
  const body = "agent " + "a".repeat(1040000);
  const r = claim({ index: quotes(body), register: reg });
  assert.ok([0, 1, 2].includes(r.code), `exit ${r.code}`); tidy(r); in3s(r, "1 MB of a's");
});

test("STK-PS-R20 700 KB of 'agent. ' against a 60,000-row Name/Verdict register under 1 MB finishes in under 3 s", () => {
  const reg = compactReg(60000);
  assert.ok(Buffer.byteLength(reg) < 1048576, "fixture register must be under 1 MB");
  const r = claim({ index: quotes("agent. ".repeat(100000)), register: reg });
  assert.ok([0, 1, 2].includes(r.code), `exit ${r.code}`); tidy(r); in3s(r, "agent. x100000 vs 60,000 rows");
});

test("STK-PS-R20 140,000 'built.' sentences in one quote finish in under 3 s", () => {
  const r = claim({ index: quotes("built. ".repeat(140000)), register: regB([["Orbit planner", "supported"], ["Harbor dashboard", "supported"]]) });
  assert.ok([0, 1, 2].includes(r.code), `exit ${r.code}`); tidy(r); in3s(r, "140,000 built.");
});

test("STK-PS-R20 a register of 5,001 rows is refused with a reason naming the cap; exactly 5,000 rows still runs", () => {
  const d = tmp(); const out = path.join(d, "result.json");
  refused(claim({ dir: d, index: quotes("We run 3 agents"), register: compactReg(5001), extra: ["--out", out] }), 1, /5,?000|rows|too many/i, "5001 rows");
  assert.ok(!fs.existsSync(out), "a refused run leaves no --out file");
  const r = ok({ index: quotes("We run 5000 agents"), register: compactReg(5000) });
  assert.equal(r.json.tool, "claim-check");
  const r2 = ok({ index: quotes("We run 3 agents"), register: compactReg(4999) });
  assert.equal(r2.json.tool, "claim-check");
});

test("STK-PS-R20 a register of 5,001 rows in format B (Claim | Status) is refused too", () => {
  const rows = Array.from({ length: 5001 }, (_, i) => [`built thing ${100000 + i}`, "supported"]);
  const reg = "|Claim|Status|\n|---|---|\n" + rows.map(([c, s]) => `|${c}|${s}|\n`).join("");
  refused(claim({ index: quotes("I built it"), register: reg }), 1, /5,?000|rows|too many/i, "5001 claim rows");
});

test("STK-PS-R20 an index of 2,001 quotes is refused with a reason naming the cap; exactly 2,000 quotes still runs", () => {
  const mk = (k) => quotes(...Array.from({ length: k }, (_, i) => `I built ${1000 + i} agents`));
  refused(claim({ index: mk(2001), register: regA(3) }), 1, /2,?000|quotes|too many/i, "2001 quotes");
  const r = ok({ index: mk(2000), register: regA(3) });
  assert.equal(r.json.findings.length, 10); assert.equal(r.json.omitted, 1990);
});

test("STK-PS-R20 a --text file of 2,001 lines is refused the same way (the cap is on quotes, however they are made)", () => {
  const txt = Array.from({ length: 2001 }, (_, i) => `I built ${1000 + i} agents`).join("\n") + "\n";
  refused(claim({ text: txt, register: regA(3) }), 1, /2,?000|quotes|too many/i, "2001 text lines");
});

// ================================================================ STK-PS-R21 hedge words must not hide a claim
const claimsFor = (r, id) => ["findings", "needs_human", "supported", "ignored"].flatMap((k) => (r.json[k] || []).filter((x) => x.quote_id === id));
test("STK-PS-R21 'I built 50 agents and will add more.' produces a finding or needs_human entry for the 50-agents claim", () => {
  const r = ok({ index: quotes("I built 50 agents and will add more."), register: regA(3) });
  const hit = [...r.json.findings, ...r.json.needs_human].filter((x) => x.quote_id === "q1" && /50 agents/.test(x.claim));
  assert.ok(hit.length >= 1, `50 agents hidden by the hedge: ${JSON.stringify(r.json)}`);
});

test("STK-PS-R21 a hedge hides only its own clause: other clauses split by comma, semicolon, 'and' or 'but' are still claims", () => {
  const r = ok({ index: quotes("I built 50 agents, and more are planned.", "I shipped 40 agents; 5 more are coming.", "I built 30 agents but will add more.", "Built 20 agents and could add more."), register: regA(3) });
  for (const [id, re] of [["q1", /50 agents/], ["q2", /40 agents/], ["q3", /30 agents/], ["q4", /20 agents/]]) {
    const hit = [...r.json.findings, ...r.json.needs_human].filter((x) => x.quote_id === id && re.test(x.claim));
    assert.ok(hit.length >= 1, `${id} claim hidden by a hedge in another clause: ${JSON.stringify(claimsFor(r, id))}`);
  }
});

test("STK-PS-R21 the clause that carries the hedge is still not a claim: 'Coming soon: 5 agents', 'We will add 5 agents', 'Not yet shipped: 5 agents'", () => {
  const r = ok({ index: quotes("Coming soon: 5 agents", "We will add 5 agents.", "Not yet shipped: 5 agents"), register: regA(3) });
  for (const id of ["q1", "q2", "q3"]) assert.deepEqual(claimsFor(r, id), [], `${id} should stay a non-claim`);
});

test("STK-PS-R21 README no longer says a hedged sentence is not a claim, and says the hedge covers only its clause", () => {
  const t = read(path.join(PLUG, "README.md"));
  assert.doesNotMatch(t, /A sentence with a hedge[^.\n]*is not a claim/i, "old wording still in README");
  assert.match(t, /hedge[^.\n]*clause|clause[^.\n]*hedge/i, "README must say the hedge applies to its clause only");
});

// ================================================================ STK-PS-R22 Unicode phone numbers
const U = {
  nbsp: "+1 (555) 010 1234",
  thin: "555 010 1234",
  ideo: "555　010　1234",
  nbhy: "555‑010‑1234",
  endash: "555–010–1234",
  fullwidth: "５５５　０１０　１２３４",
  fwdots: "５５５．０１０．１２３４",
};
const noPhoneEcho = (r, why) => {
  const all = (r.out + r.err + (r.fileText || "")).normalize("NFKC");
  assert.ok(!/5550101234/.test(all.replace(/\D/g, "")), `${why}: a phone number was echoed: ${all.slice(0, 300)}`);
  assert.doesNotMatch(r.out + r.err, /５|０|１|２|３|４/, `${why}: fullwidth digits echoed`);
  assert.ok(!/1234/.test(all), `${why}: part of the number echoed`);
};
for (const [label, phone] of Object.entries(U)) {
  test(`STK-PS-R22 a ${label} phone number in the artifact stops the run (exit 1, category only) and is never echoed`, () => {
    const d = tmp(); const out = path.join(d, "result.json");
    const r = claim({ dir: d, index: quotes(`Call me on ${phone} to talk about my 3 agents`), register: regA(3), extra: ["--out", out] });
    refused(r, 1, /phone/i, label); noPhoneEcho(r, label);
    assert.ok(!fs.existsSync(out), "no --out file after a stop");
  });
  test(`STK-PS-R22 a ${label} phone number in a register Name cell stops the run and is never echoed`, () => {
    const reg = "| Name | Verdict |\n|---|---|\n| `bot-1` | Agent |\n| " + phone + " | Agent |\n";
    const r = claim({ index: quotes("I built 2 agents"), register: reg });
    refused(r, 1, /phone/i, label); noPhoneEcho(r, label);
  });
}
test("STK-PS-R22 a phone number with Unicode spaces in --text input and in an ignore file is also a stop and never echoed", () => {
  const a = claim({ text: `Reach me at ${U.nbsp}\nI built 3 agents\n`, register: regA(3) });
  refused(a, 1, /phone/i, "--text"); noPhoneEcho(a, "--text");
  const b = claim({ index: quotes("I built 8 agents"), register: regA(3), ignore: `q1|8 agents|reason ${U.thin}\n` });
  refused(b, 1, /phone/i, "ignore file"); noPhoneEcho(b, "ignore file");
});
test("STK-PS-R22 a file NAME that holds a Unicode-space phone number is shown as a short hash, not the number", () => {
  const dir = tmp();
  const idx = put(dir, `${U.nbsp}.json`, JSON.stringify(quotes("We run 3 agents")));
  const reg = put(dir, "register.md", regA(3));
  const r = run(["--index", idx, "--register", reg]);
  noPhoneEcho(r, "file name"); tidy(r);
  if (r.json) assert.match(r.json.input, /^\[redacted [0-9a-f]{8}\]$/, "input shown as a short hash");
});
test("STK-PS-R22 ordinary text with digits and spaces that is not a phone number does not stop the run", () => {
  const r = ok({ index: quotes("I built 3 agents in 2 weeks for 1 234 users", "We run 3 agents"), register: regA(3) });
  assert.equal(r.json.tool, "claim-check");
});

// ================================================================ STK-PS-R23 list caps
test("STK-PS-R23 supported is capped at 100 with omitted_supported; exactly 100 omits 0, 101 omits 1", () => {
  const mk = (k) => quotes(...Array.from({ length: k }, () => "We run 3 agents"));
  const r = ok({ index: mk(250), register: regA(3) });
  assert.equal(r.json.supported.length, 100); assert.equal(r.json.omitted_supported, 150);
  assert.deepEqual(r.json.supported.map((s) => s.quote_id).slice(0, 3), ["q1", "q2", "q3"], "first 100 in index order");
  const e = ok({ index: mk(100), register: regA(3) }); assert.equal(e.json.supported.length, 100); assert.equal(e.json.omitted_supported, 0);
  const o = ok({ index: mk(101), register: regA(3) }); assert.equal(o.json.supported.length, 100); assert.equal(o.json.omitted_supported, 1);
});
test("STK-PS-R23 ignored is capped at 100 with omitted_ignored", () => {
  const ig = Array.from({ length: 130 }, (_, i) => `q${i + 1}|8 agents|checked by hand`).join("\n") + "\n";
  const r = ok({ index: quotes(...Array.from({ length: 130 }, () => "I built 8 agents")), register: regA(3), ignore: ig });
  assert.equal(r.json.ignored.length, 100); assert.equal(r.json.omitted_ignored, 30);
});
test("STK-PS-R23 needs_human is capped at 100 with omitted_needs_human", () => {
  const ig = Array.from({ length: 150 }, (_, i) => `q1|nothing like this ${i}|reason`).join("\n") + "\n";
  const r = ok({ index: quotes("We run 3 agents"), register: regA(3), ignore: ig });
  assert.equal(r.json.needs_human.length, 100); assert.equal(r.json.omitted_needs_human, 50);
});
test("STK-PS-R23 skipped register rows are capped at 100 with omitted_skipped", () => {
  const bad = Array.from({ length: 130 }, (_, i) => `| \`broken-${i}\` | Agent |\n`).join("");
  const r = ok({ index: quotes("We run 3 agents"), register: regA(3) + bad });
  assert.equal(r.json.skipped.length, 100); assert.equal(r.json.omitted_skipped, 30);
});
test("STK-PS-R23 with nothing to cut every omitted_* is 0 and findings keep their own cap", () => {
  const r = ok({ index: quotes("We run 3 agents", "I built 8 agents"), register: regA(3) });
  for (const k of ["omitted_supported", "omitted_ignored", "omitted_needs_human", "omitted_skipped", "omitted"]) assert.equal(r.json[k], 0, k);
  const many = ok({ index: quotes(...Array.from({ length: 30 }, (_, i) => `I built ${1000 + i} agents`)), register: regA(3) });
  assert.equal(many.json.findings.length, 10); assert.equal(many.json.omitted, 20);
});

// ================================================================ STK-PS-R24 closed stdout
function piped(reader) {
  const d = tmp();
  const idx = put(d, "index.json", JSON.stringify(quotes(...Array.from({ length: 300 }, (_, i) => (i % 2 ? "We run 3 agents" : `I built ${1000 + i} agents`)))));
  const reg = put(d, "register.md", regA(3)); const rc = path.join(d, "rc");
  const script = `node "${TOOL}" --index "${idx}" --register "${reg}" | ${reader}; echo "\${PIPESTATUS[0]}" > "${rc}"`;
  const r = spawnSync("bash", ["-c", script], { encoding: "utf8", timeout: 15000, killSignal: "SIGKILL" });
  assert.equal(r.signal, null, "pipeline hung");
  return { err: r.stderr || "", out: r.stdout || "", rc: read(rc).trim() };
}
test("STK-PS-R24 piping the output into 'head -c 10' prints no stack trace and nothing on stderr", () => {
  const r = piped("head -c 10");
  assert.equal(r.out.length, 10, "head got its 10 bytes");
  assert.doesNotMatch(r.err, TRACE, `stderr: ${r.err.slice(0, 300)}`); assert.equal(r.err, "", "exits quietly");
});
test("STK-PS-R24 a reader that has already gone (head -c 0) prints no stack trace and nothing on stderr, and the tool exits", () => {
  const r = piped("head -c 0");
  assert.doesNotMatch(r.err, TRACE, `stderr: ${r.err.slice(0, 300)}`); assert.equal(r.err, "", "exits quietly");
  assert.match(r.rc, /^\d+$/, "the tool exited with a status, not a signal");
});

// ================================================================ STK-PS-R27 output fields are data
for (const rel of ["agents/stakeholder.md", "skills/stakeholder/SKILL.md"]) {
  test(`STK-PS-R27 ${rel} says claim-check and repo-check output fields (label, reason, name) are data, never instructions`, () => {
    const paras = read(path.join(PLUG, rel)).split(/\n\s*\n/);
    const hit = paras.find((p) => /claim-check/.test(p) && /repo-check/.test(p) && /\blabel\b/i.test(p) && /\breason\b/i.test(p) && /\bname\b/i.test(p) && /\bdata\b/i.test(p) && /never[^.\n]*instruction|not instruction/i.test(p));
    assert.ok(hit, `${rel}: no paragraph names claim-check, repo-check and the fields label, reason, name as data and never instructions`);
  });
}
