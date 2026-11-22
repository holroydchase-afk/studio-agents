// Tests for tools/check-spec.mjs: validates the ```spec block that ends every staff-pm spec, the way
// tools/check-qa-report.mjs validates the ```qa block. Written test-first by qa-tdd (CHKSPEC-1..): red until the
// engineer builds the tool. Each test loads the tool itself, so every test fails on its own for the right reason.
//
// Contract under test: key: value lines inside one ```spec block (last block wins; unclosed is an error; unknown keys
// are errors). verdict (ready | needs-decision | blocked | cut, once, case-insensitive); bet (once, non-empty);
// step: ID | what | done when | size (1+, unique IDs); criterion: ID | auto|manual | text (1+, unique, 1+ auto, text has
// "then" or "->" plus a digit or a quoted value); cut: thing | reason (0+; cut verdict needs 1+, and drops the step,
// criterion and auto minimums); risk: risk | existing step or criterion ID (1+); decision: question | recommendation
// (0+; needs-decision needs 1+); handoff: known agent | task | done when (1+; ready needs one to qa-tdd);
// blocked: reason exactly when verdict is blocked. Leak scan (LEAKS from check-story-entry.mjs) over the whole file.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = path.join(ROOT, "tools", "check-spec.mjs");
const load = () => import("../tools/check-spec.mjs");
async function check(text) {
  const { checkSpec } = await load();
  return checkSpec(text);
}
const block = (lines, before = "# Spec: weekly pace\n\nSome prose about the work.\n\n") => `${before}\`\`\`spec\n${lines.join("\n")}\n\`\`\`\n`;

// A valid ready spec. Variants below change one line so each test breaks exactly one rule.
const READY = [
  "verdict: ready",
  "bet: Chase sees his weekly pace on the tracker; it worked when he checks it twice a week unprompted",
  "step: M1.1 | Pace math in core | PACE-1 green | 1 session",
  "step: M1.2 | Pace card on the page | card renders with sample data | 0.5 session",
  "criterion: PACE-1 | auto | Given a clock of Mon 2026-11-16 00:00, then the average is 0.40",
  'criterion: PACE-2 | manual | Open the page on a small phone -> the card reads "0.40 per day"',
  "cut: Charts | not needed to prove the bet",
  "risk: Time zone drift at midnight | PACE-1",
  "risk: Card overflows on a small phone | M1.2",
  "handoff: qa-tdd | failing tests for PACE-1 | red for the right reason",
  "handoff: engineer | build M1.1 and M1.2 | PACE-1 green 3x",
];
const swap = (lines, key, ...repl) => {
  const i = lines.findIndex((l) => l.toLowerCase().startsWith(key));
  assert.ok(i >= 0, `fixture has no ${key} line`);
  const out = [...lines];
  out.splice(i, 1, ...repl);
  return out;
};
const drop = (lines, key) => lines.filter((l) => !l.toLowerCase().startsWith(key));
const add = (lines, ...more) => [...lines, ...more];

async function valid(text) {
  const r = await check(text);
  assert.deepEqual(r.errors, [], `expected no errors, got:\n${r.errors.join("\n")}`);
  assert.ok(r.spec && typeof r.spec === "object", "spec should be an object when valid");
  return r.spec;
}
async function invalid(text, re) {
  const r = await check(text);
  assert.ok(Array.isArray(r.errors) && r.errors.length > 0, "expected at least one error");
  assert.ok(r.errors.some((e) => re.test(e)), `no error matches ${re}; got:\n${r.errors.join("\n")}`);
  return r;
}

// ---- Valid specs, one per verdict ----
test("CHKSPEC-1 a valid ready spec passes and reports its verdict, steps and criteria", async () => {
  const spec = await valid(block(READY));
  assert.equal(spec.verdict, "ready");
  const s = JSON.stringify(spec);
  for (const id of ["M1.1", "M1.2", "PACE-1", "PACE-2"]) assert.ok(s.includes(id), `spec object lacks ${id}`);
});
test("CHKSPEC-2 a valid needs-decision spec (with a decision line) passes", async () => {
  const lines = add(swap(READY, "verdict", "verdict: needs-decision"), "decision: Show pace per day or per week? | Per day, it matches the tracker");
  assert.equal((await valid(block(lines))).verdict, "needs-decision");
});
test("CHKSPEC-3 a valid blocked spec (with a blocked: reason) passes", async () => {
  const lines = add(swap(READY, "verdict", "verdict: blocked"), "blocked: needs the tracker's sample export from Chase");
  assert.equal((await valid(block(lines))).verdict, "blocked");
});
test("CHKSPEC-4 a valid cut spec needs no criterion and passes with a cut: line", async () => {
  const lines = [
    "verdict: cut",
    "bet: Nobody asked for streaks; cutting them frees a session for the pace card",
    "step: M0.1 | Remove the streaks stub | no streaks code left | 0.5 session",
    "cut: Streaks | no user asked and it costs a session",
    "risk: Someone relied on the stub | M0.1",
    "handoff: engineer | delete the stub | suite green",
  ];
  assert.equal((await valid(block(lines))).verdict, "cut");
});

// ---- verdict ----
test("CHKSPEC-5 rule verdict: a missing verdict: line is an error", async () => {
  await invalid(block(drop(READY, "verdict")), /verdict/i);
});
test("CHKSPEC-6 rule verdict: two verdict: lines is an error", async () => {
  await invalid(block(add(READY, "verdict: cut")), /verdict/i);
});
test("CHKSPEC-7 rule verdict: a value outside ready|needs-decision|blocked|cut is an error", async () => {
  await invalid(block(swap(READY, "verdict", "verdict: green")), /verdict|green/i);
});
test("CHKSPEC-8 rule verdict is case-insensitive: VERDICT value READY passes as ready", async () => {
  assert.equal((await valid(block(swap(READY, "verdict", "verdict: READY")))).verdict, "ready");
});

// ---- bet ----
test("CHKSPEC-9 rule bet: a missing bet: line is an error", async () => {
  await invalid(block(drop(READY, "bet")), /bet/i);
});
test("CHKSPEC-10 rule bet: an empty bet: line is an error", async () => {
  await invalid(block(swap(READY, "bet", "bet:   ")), /bet/i);
});
test("CHKSPEC-11 rule bet: two bet: lines is an error", async () => {
  await invalid(block(add(READY, "bet: a second bet that says 2 things")), /bet/i);
});

// ---- step ----
test("CHKSPEC-12 rule step: a non-cut spec with no step: line is an error", async () => {
  const lines = drop(READY, "step").map((l) => l.replace("| M1.2", "| PACE-2"));
  await invalid(block(lines), /step/i);
});
test("CHKSPEC-13 rule step: a step with three parts instead of four is an error", async () => {
  await invalid(block(swap(READY, "step: m1.2", "step: M1.2 | Pace card on the page | 0.5 session")), /M1\.2|step/i);
});
test("CHKSPEC-14 rule step: a step with an empty part (done when) is an error", async () => {
  await invalid(block(swap(READY, "step: m1.2", "step: M1.2 | Pace card on the page |  | 0.5 session")), /M1\.2|empty|done/i);
});
test("CHKSPEC-15 rule step: duplicate step IDs are an error", async () => {
  await invalid(block(swap(READY, "step: m1.2", "step: M1.1 | Pace card on the page | renders | 0.5 session")), /duplicate|M1\.1/i);
});
test("CHKSPEC-16 rule step: a step ID not shaped like M1.1 is an error", async () => {
  const lines = swap(READY, "step: m1.2", "step: card | Pace card on the page | renders | 0.5 session").map((l) => l.replace("| M1.2", "| M1.1"));
  await invalid(block(lines), /card|step id|ID/i);
});
test("CHKSPEC-17 rule step: a size not like '1 session' or '0.5 session' is an error", async () => {
  await invalid(block(swap(READY, "step: m1.2", "step: M1.2 | Pace card on the page | renders | soon")), /size|soon|session/i);
});

// ---- criterion ----
test("CHKSPEC-18 rule criterion: a non-cut spec with no criterion: line is an error", async () => {
  const lines = drop(READY, "criterion").map((l) => l.replace("| PACE-1", "| M1.1").replace("for PACE-1", "for M1.1").replace("PACE-1 green", "M1.1 green"));
  await invalid(block(lines), /criterion|criteria/i);
});
test("CHKSPEC-19 rule criterion: no auto criterion (all manual) is an error", async () => {
  await invalid(block(swap(READY, "criterion: pace-1", "criterion: PACE-1 | manual | Given a clock of Mon 2026-11-16 00:00, then the average is 0.40")), /auto/i);
});
test("CHKSPEC-20 rule criterion: a kind other than auto or manual is an error", async () => {
  await invalid(block(swap(READY, "criterion: pace-2", 'criterion: PACE-2 | sometimes | Open the page -> the card reads "0.40 per day"')), /auto|manual|sometimes/i);
});
test("CHKSPEC-21 rule criterion: duplicate criterion IDs are an error", async () => {
  await invalid(block(swap(READY, "criterion: pace-2", 'criterion: PACE-1 | manual | Open the page -> the card reads "0.40 per day"')), /duplicate|PACE-1/i);
});
test("CHKSPEC-22 rule criterion: an ID not shaped like PACE-1 or SZ-12 is an error", async () => {
  await invalid(block(swap(READY, "criterion: pace-2", 'criterion: pace two | manual | Open the page -> the card reads "0.40 per day"')), /pace two|criterion id|ID/i);
});
test("CHKSPEC-23 rule criterion: text with neither 'then' nor '->' is an error", async () => {
  await invalid(block(swap(READY, "criterion: pace-2", "criterion: PACE-2 | manual | The card shows 0.40 per day")), /PACE-2|then|->/i);
});
test("CHKSPEC-24 rule criterion: text with no digit or quoted value ('it should be fast, then fine') is an error", async () => {
  await invalid(block(swap(READY, "criterion: pace-2", "criterion: PACE-2 | manual | it should be fast, then fine")), /PACE-2|concrete|digit|quoted|value/i);
});
test("CHKSPEC-25 rule criterion: an empty text part is an error", async () => {
  await invalid(block(swap(READY, "criterion: pace-2", "criterion: PACE-2 | manual | ")), /PACE-2|empty|text/i);
});
test("CHKSPEC-26 rule criterion: a quoted value with 'then' and no digit passes (concrete enough)", async () => {
  await valid(block(swap(READY, "criterion: pace-2", "criterion: PACE-2 | manual | Open the page, then the card reads 'on pace'")));
});

// ---- cut ----
test("CHKSPEC-27 rule cut: a cut: line with no reason is an error", async () => {
  await invalid(block(swap(READY, "cut", "cut: Charts | ")), /cut|reason|Charts/i);
});
test("CHKSPEC-28 rule cut: verdict cut with no cut: line is an error", async () => {
  const lines = drop(swap(READY, "verdict", "verdict: cut"), "cut:");
  await invalid(block(lines), /cut/i);
});

// ---- risk ----
test("CHKSPEC-29 rule risk: a spec with no risk: line is an error", async () => {
  await invalid(block(drop(READY, "risk")), /risk/i);
});
test("CHKSPEC-30 rule risk: a risk with no handled-by ID is an error", async () => {
  await invalid(block(swap(READY, "risk: time", "risk: Time zone drift at midnight")), /risk|handled/i);
});
test("CHKSPEC-31 rule risk: a handled-by ID that is not a step or criterion is an error", async () => {
  await invalid(block(swap(READY, "risk: time", "risk: Time zone drift at midnight | PACE-99")), /PACE-99/);
});

// ---- decision ----
test("CHKSPEC-32 rule decision: a decision with no recommendation is an error", async () => {
  await invalid(block(add(READY, "decision: Show pace per day or per week? | ")), /decision|recommend/i);
});
test("CHKSPEC-33 rule decision: needs-decision with no decision: line is an error", async () => {
  await invalid(block(swap(READY, "verdict", "verdict: needs-decision")), /decision/i);
});

// ---- handoff ----
test("CHKSPEC-34 rule handoff: a spec with no handoff: line is an error", async () => {
  await invalid(block(drop(READY, "handoff")), /handoff/i);
});
test("CHKSPEC-35 rule handoff: an unknown agent is an error", async () => {
  await invalid(block(swap(READY, "handoff: engineer", "handoff: designer | build M1.1 | PACE-1 green 3x")), /designer|agent/i);
});
test("CHKSPEC-36 rule handoff: a handoff with an empty done-when is an error", async () => {
  await invalid(block(swap(READY, "handoff: engineer", "handoff: engineer | build M1.1 | ")), /handoff|empty|done/i);
});
test("CHKSPEC-37 rule handoff: verdict ready with no handoff to qa-tdd is an error (failing tests first)", async () => {
  await invalid(block(drop(READY, "handoff: qa-tdd")), /qa-tdd/);
});

// ---- blocked ----
test("CHKSPEC-38 rule blocked: verdict blocked with no blocked: line is an error", async () => {
  await invalid(block(swap(READY, "verdict", "verdict: blocked")), /blocked/i);
});
test("CHKSPEC-39 rule blocked: an empty blocked: line is an error", async () => {
  await invalid(block(add(swap(READY, "verdict", "verdict: blocked"), "blocked: ")), /blocked/i);
});
test("CHKSPEC-40 rule blocked: a blocked: line on a ready spec is an error", async () => {
  await invalid(block(add(READY, "blocked: waiting on nothing really, 1 day")), /blocked/i);
});

// ---- block shape ----
test("CHKSPEC-41 rule unknown keys: a key outside the contract is an error", async () => {
  await invalid(block(add(READY, "colour: blue")), /colour|unknown/i);
});
test("CHKSPEC-42 rule last block wins: an invalid earlier block is ignored when the last block is valid", async () => {
  const text = block(["verdict: maybe"], "# Spec\n\nExample of a bad block:\n\n") + "\nThe real one:\n\n" + block(READY, "");
  await valid(text);
});
test("CHKSPEC-43 rule last block wins: a valid earlier block does not rescue an invalid last block", async () => {
  const text = block(READY) + "\n" + block(swap(READY, "verdict", "verdict: maybe"), "");
  await invalid(text, /verdict|maybe/i);
});
test("CHKSPEC-44 rule unclosed block: an unclosed last ```spec block is an error", async () => {
  const text = block(READY) + "\n```spec\nverdict: ready\nbet: never closed\n";
  await invalid(text, /clos/i);
});
test("CHKSPEC-45 rule no block: a spec with no ```spec block at all is an error", async () => {
  await invalid("# Spec\n\nJust prose, no block.\n", /spec/i);
  assert.equal((await check("# Spec\n\nJust prose.\n")).spec, null);
});
test("CHKSPEC-46 rule CRLF: a valid spec with CRLF line endings passes", async () => {
  const spec = await valid(block(READY).replace(/\n/g, "\r\n"));
  assert.equal(spec.verdict, "ready");
});

// ---- leak scan: anywhere in the file, one test per shape ----
const LEAK_CASES = [
  ["an email address", "Ping someone" + "@" + "example.com for the export"],
  ["a phone number", "Call 704-555-0134 if stuck"],
  ["a claude.ai link", "Tracker at https://" + "claude.ai/" + "artifact/abc123"],
  ["a trig_ id", "Scheduled by trig_" + "01AbCdEfGhIjKl"],
  ["an env_ id", "Runs in env_" + "01AbCdEfGhIjKl"],
  ["a cmsg_ id", "From thread cmsg_" + "01AbCdEfGhIjKl"],
  ["a session_ id", "See session_" + "01AbCdEfGhIjKl"],
  ["an API key", "Key sk-" + "ant01AbCdEfGhIjKl"],
];
LEAK_CASES.forEach(([what, line], i) => {
  test(`CHKSPEC-${47 + i} rule leak scan: ${what} anywhere in the file is an error`, async () => {
    await invalid(block(READY, `# Spec\n\n${line}\n\n`), /email|phone|claude\.ai|trig_|env_|cmsg_|session_|key|personal|secret|leak/i);
  });
});
test("CHKSPEC-55 rule leak scan: a leak inside the block is an error too", async () => {
  await invalid(block(swap(READY, "cut", "cut: Charts | Chase said so on 704-555-0134"), "# Spec\n\n"), /phone|personal|secret|leak/i);
});

// ---- CLI ----
function cli(...args) {
  assert.ok(fs.existsSync(TOOL), "tools/check-spec.mjs does not exist yet");
  return spawnSync(process.execPath, [TOOL, ...args], { encoding: "utf8" });
}
function tmpFile(text) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "chkspec-"));
  const f = path.join(d, "spec.md");
  fs.writeFileSync(f, text);
  return f;
}
test("CHKSPEC-56 CLI exit 0 on a valid spec with nothing on stderr", () => {
  const r = cli(tmpFile(block(READY)));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stderr.trim(), "");
});
test("CHKSPEC-57 CLI exit 1 with one reason per line on stderr (two broken rules, two lines)", () => {
  const r = cli(tmpFile(block(drop(drop(READY, "bet"), "risk"))));
  assert.equal(r.status, 1, r.stderr);
  const lines = r.stderr.split("\n").filter((l) => l.trim());
  assert.ok(lines.length >= 2, `want >= 2 reasons, got:\n${r.stderr}`);
  assert.ok(lines.some((l) => /bet/i.test(l)) && lines.some((l) => /risk/i.test(l)), r.stderr);
});
test("CHKSPEC-58 CLI exit 2 on a usage error: no file, two files, an unreadable file", () => {
  const f = tmpFile(block(READY));
  assert.equal(cli().status, 2, "no file");
  assert.equal(cli(f, f).status, 2, "two files");
  assert.equal(cli(path.join(os.tmpdir(), "chkspec-no-such-file.md")).status, 2, "missing file");
});
test("CHKSPEC-59 CLI --json prints the parsed spec on stdout", () => {
  const r = cli("--json", tmpFile(block(READY)));
  assert.equal(r.status, 0, r.stderr);
  const spec = JSON.parse(r.stdout);
  assert.equal(spec.verdict, "ready");
  assert.ok(JSON.stringify(spec).includes("PACE-1"));
});
