// Failing-first tests for tools/check-triage.mjs (docs/product/SPEC-FEEDBACK-LOOP.md, FBK-13..15). Tool does not exist yet.
//
// INTERFACE
//   CLI: node tools/check-triage.mjs <file>   exit 0 valid, 1 invalid (one error per line on stderr), 2 usage error
//        (no file, two files, unreadable file). Nothing on stderr when valid.
//   Named export: checkTriage(text) -> {ok: boolean, errors: string[]}
//   The input is a Staff PM reply; the LAST ```triage fenced block wins; text around it is ignored; no block, or an
//   unclosed block, is an error. Inside: `key: value` lines, keys exactly once each:
//     verdict: fix|idea|reject|needs-chase   lane: ux|qa-tdd   severity: P0|P1|P2   risk: lowrisk|not
//     done-when: one non-empty line          eval-candidate: yes|no
//   Rules: unknown key, duplicate key, missing key, or a value outside the list is an error; `fix` needs done-when;
//   risk lowrisk is valid only with verdict fix; severity P0 requires verdict needs-chase; reject and idea need a
//   done-when (the one-line reason); an email, phone, URL or secret-looking token anywhere in the block is an error.
//   Each broken rule gives exactly ONE error line. Errors never echo the offending email, phone, URL or token.
// Fake PII is built in pieces so scanners do not flag this file.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = path.join(ROOT, "tools", "check-triage.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "check-triage-test-"));
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));

const EMAIL = "test@" + "example.com";
const PHONE = "555-" + "010-0199";
const URL1 = "https://" + "example.com/x?q=1";
const KEY = "sk-" + "FAKE0123456789ABCDEFGHIJ";

const FENCE = "`".repeat(3);
const base = { verdict: "fix", lane: "qa-tdd", severity: "P2", risk: "lowrisk", "done-when": "The Next button no longer overlaps the photo at 360px", "eval-candidate": "yes" };
const block = (o) => `Triage for the item.\n\n${FENCE}triage\n${Object.entries(o).map(([k, v]) => `${k}: ${v}`).join("\n")}\n${FENCE}\n`;
const mk = (over, drop = []) => { const o = { ...base, ...over }; for (const k of drop) delete o[k]; return block(o); };

async function lib() {
  assert.ok(fs.existsSync(TOOL), "tools/check-triage.mjs is missing");
  return import(pathToFileURL(TOOL).href);
}
let n = 0;
function cli(text) {
  assert.ok(fs.existsSync(TOOL), "tools/check-triage.mjs is missing");
  const f = path.join(tmp, `r${n++}.md`); fs.writeFileSync(f, text);
  const r = spawnSync(process.execPath, [TOOL, f], { encoding: "utf8", timeout: 30000 });
  return { code: r.status, out: r.stdout || "", err: r.stderr || "" };
}
const lines = (s) => s.split("\n").filter((l) => l.trim());

test("FBK-13 checkTriage is exported and a valid fix/lowrisk block is ok with no errors", async () => {
  const { checkTriage } = await lib();
  assert.equal(typeof checkTriage, "function");
  const r = checkTriage(mk({}));
  assert.deepEqual(r, { ok: true, errors: [] });
});

test("FBK-13 CLI: a valid block exits 0 with a quiet stderr", () => {
  const r = cli(mk({}));
  assert.equal(r.code, 0, r.err);
  assert.equal(r.err, "");
});

test("FBK-13 every allowed value is accepted in a valid combination", async () => {
  const { checkTriage } = await lib();
  for (const v of [
    { verdict: "fix", lane: "ux", severity: "P1", risk: "not", "eval-candidate": "no" },
    { verdict: "idea", risk: "not", "done-when": "Worth a spec later, not a defect" },
    { verdict: "reject", risk: "not", "done-when": "Works as designed, the button is below the fold on purpose" },
    { verdict: "needs-chase", severity: "P0", risk: "not", "done-when": "Chase decides whether to pull the demo" },
  ]) {
    const r = checkTriage(mk(v));
    assert.equal(r.ok, true, JSON.stringify([v, r]));
  }
});

test("FBK-13 the last triage block wins and text around the block is ignored", async () => {
  const { checkTriage } = await lib();
  const bad = block({ ...base, lane: "staff-pm" });
  assert.equal(checkTriage(bad + "\nRevised:\n" + mk({})).ok, true);
  assert.equal(checkTriage(mk({}) + "\nRevised:\n" + bad).ok, false);
});

test("FBK-14 verdict idea with risk lowrisk is invalid with exactly one error", async () => {
  const { checkTriage } = await lib();
  const r = checkTriage(mk({ verdict: "idea", "done-when": "Not a defect, park it in the ideas log" }));
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 1, JSON.stringify(r));
  assert.match(r.errors[0], /lowrisk/i);
  assert.equal(cli(mk({ verdict: "idea", "done-when": "Not a defect, park it in the ideas log" })).code, 1);
});

test("FBK-14 severity P0 with verdict fix is invalid with exactly one error naming needs-chase", async () => {
  const { checkTriage } = await lib();
  const r = checkTriage(mk({ severity: "P0", risk: "not" }));
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 1, JSON.stringify(r));
  assert.match(r.errors[0], /needs-chase/i);
  const c = cli(mk({ severity: "P0", risk: "not" }));
  assert.equal(c.code, 1);
  assert.equal(lines(c.err).length, 1, c.err);
});

test("FBK-14 lowrisk with reject or needs-chase is invalid; P0 with reject is invalid", async () => {
  const { checkTriage } = await lib();
  for (const o of [{ verdict: "reject", "done-when": "Works as designed" }, { verdict: "needs-chase", "done-when": "Chase decides" }]) {
    const r = checkTriage(mk(o));
    assert.equal(r.ok, false, JSON.stringify(o));
    assert.equal(r.errors.length, 1, JSON.stringify(r));
  }
  assert.equal(checkTriage(mk({ verdict: "reject", severity: "P0", risk: "not", "done-when": "Works as designed" })).ok, false);
});

test("FBK-14 fix, idea and reject without a done-when are each invalid with one error", async () => {
  const { checkTriage } = await lib();
  for (const v of ["fix", "idea", "reject"]) {
    const r = checkTriage(mk({ verdict: v, risk: "not", "done-when": "" }));
    assert.equal(r.ok, false, v);
    assert.equal(r.errors.length, 1, `${v}: ${JSON.stringify(r)}`);
    assert.match(r.errors[0], /done-when/);
  }
});

test("FBK-15 an unknown key is invalid and the error names the key", async () => {
  const { checkTriage } = await lib();
  const r = checkTriage(mk({ owner: "someone" }));
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 1, JSON.stringify(r));
  assert.match(r.errors[0], /owner/);
  const c = cli(mk({ owner: "someone" }));
  assert.equal(c.code, 1);
  assert.match(c.err, /owner/);
});

test("FBK-15 a missing lane is invalid and names lane", async () => {
  const { checkTriage } = await lib();
  const r = checkTriage(mk({}, ["lane"]));
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 1, JSON.stringify(r));
  assert.match(r.errors[0], /lane/);
  assert.equal(cli(mk({}, ["lane"])).code, 1);
});

test("FBK-15 any other missing key, and a duplicated key, is invalid naming the key", async () => {
  const { checkTriage } = await lib();
  for (const k of ["verdict", "severity", "risk", "done-when", "eval-candidate"]) {
    const r = checkTriage(mk({}, [k]));
    assert.equal(r.ok, false, `missing ${k}`);
    assert.ok(r.errors.some((e) => e.includes(k)), `${k}: ${JSON.stringify(r)}`);
  }
  const dup = mk({}).replace("lane: qa-tdd\n", "lane: qa-tdd\nlane: ux\n");
  const r = checkTriage(dup);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /lane/.test(e)), JSON.stringify(r));
});

test("FBK-15 lane staff-pm is invalid (the lanes are ux and qa-tdd only), and so are other out-of-list values", async () => {
  const { checkTriage } = await lib();
  for (const o of [{ lane: "staff-pm" }, { lane: "engineer" }, { severity: "P3" }, { verdict: "maybe" }, { risk: "medium" }, { "eval-candidate": "sometimes" }]) {
    const r = checkTriage(mk(o));
    assert.equal(r.ok, false, JSON.stringify(o));
    assert.ok(r.errors.length >= 1);
    assert.ok(r.errors.some((e) => e.includes(Object.keys(o)[0])), JSON.stringify([o, r]));
  }
});

test("FBK-15 a done-when holding an email is invalid and the error never repeats the email", async () => {
  const { checkTriage } = await lib();
  const text = mk({ "done-when": `Reply to ${EMAIL} once the button is fixed` });
  const r = checkTriage(text);
  assert.equal(r.ok, false);
  assert.ok(r.errors.length >= 1);
  for (const e of r.errors) assert.ok(!e.includes(EMAIL) && !e.includes("example.com") && !e.includes("test@"), e);
  const c = cli(text);
  assert.equal(c.code, 1);
  assert.ok(!(c.out + c.err).includes(EMAIL) && !(c.out + c.err).includes("example.com"), c.err);
  assert.match(c.err, /email/i);
});

test("FBK-15 a phone, URL or secret in the block is invalid and never echoed", async () => {
  const { checkTriage } = await lib();
  for (const [v, frag] of [[PHONE, "0199"], [URL1, "example.com"], [KEY, "FAKE0123"]]) {
    const text = mk({ "done-when": `See ${v} for the repro` });
    const r = checkTriage(text);
    assert.equal(r.ok, false, v);
    for (const e of r.errors) assert.ok(!e.includes(frag), `echoed ${frag}: ${e}`);
    const c = cli(text);
    assert.equal(c.code, 1);
    assert.ok(!(c.out + c.err).includes(frag), c.err);
  }
});

test("FBK-15 an email in an unknown key's value is not echoed either", async () => {
  const { checkTriage } = await lib();
  const r = checkTriage(mk({ [EMAIL]: "x" }));
  assert.equal(r.ok, false);
  for (const e of r.errors) assert.ok(!e.includes("example.com"), e);
});

test("FBK-13 no block, and an unclosed block, are invalid; CLI usage errors exit 2", async () => {
  const { checkTriage } = await lib();
  assert.equal(checkTriage("No block here").ok, false);
  assert.equal(checkTriage(mk({}).replace(new RegExp(FENCE + "\\n$"), "")).ok, false);
  assert.equal(spawnSync(process.execPath, [TOOL], { encoding: "utf8" }).status, 2);
  const f = path.join(tmp, "a.md"); fs.writeFileSync(f, mk({}));
  assert.equal(spawnSync(process.execPath, [TOOL, f, f], { encoding: "utf8" }).status, 2);
  assert.equal(spawnSync(process.execPath, [TOOL, path.join(tmp, "nope.md")], { encoding: "utf8" }).status, 2);
});
