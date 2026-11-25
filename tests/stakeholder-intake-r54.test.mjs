// Failing-first tests for privacy-security findings R54 (P1), R55 (P2), R56 (P2) on the R50..R52 fix. Written by qa-tdd before
// any production code. Separate from the other stakeholder tests (not edited). Every test builds its own fixtures in a temp dir.
// No network, no clock. Addresses are made up.
//
// R54 (P1) The allowed-address exception must not let a DIFFERENT address through. Rule pinned (engineer: follow it, or change
//   it with qa-tdd): an allowed address found in a glued variant is excused only when it is a whole token between boundaries,
//   meaning the last character of the segment before it (the text or tag boundary on the left) and the first character of the
//   segment after it are NOT address characters (letters, digits . - _ + @). Matching is case-insensitive. The same rule decides
//   the join-point scan: when wrapped lines or table cells are joined, the join point is boundary-aware, so
//   "hello@allowed.com" + newline + ".evil.net" is the address hello@allowed.com.evil.net (refuse) and "evil." + newline +
//   "hello@allowed.com" is evil.hello@allowed.com (refuse). With --allow-email hello@allowed.com each of these exits 1, no stdout,
//   the value never echoed, in .md and .html. Still passing: the real-page shape and the m24/r50 guards.
// R55 (P2) A 500,000-line file of "a" with 30 allowed addresses finishes in under 3 s: regexes built once, joins with no @,
//   digit or secret-prefix character skipped.
// R56 (P2) README "Known limits of stakeholder-intake" names that a three-way split (john@ / real / co.com over three lines) is not
//   seen.
// Boundaries covered: left and right neighbours of each address character class (letter, dot, hyphen, @), upper case, 500k lines.
// Not covered: other block tags than p, br, li; the phone side of the exception.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLUG = path.join(ROOT, "plugins", "stakeholder");
const TOOL = path.join(PLUG, "tools", "stakeholder-intake.mjs");
let n = 0;
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), `skt6-${process.pid}-${n++}-`));
const put = (dir, rel, text) => { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); return p; };
const TRACE = /\n\s+at |RangeError|TypeError|ReferenceError|node:internal|EPIPE|Unhandled|ENOENT|Error: /;
const page = (body) => `<!doctype html>\n<html><head><meta charset="utf-8"></head><body>\n${body}\n</body></html>\n`;
const A = "hello@allowed.com";

function run(args, timeout = 60000) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [TOOL, ...args], { encoding: "utf8", timeout, cwd: ROOT, maxBuffer: 256 * 1024 * 1024, killSignal: "SIGKILL" });
  assert.equal(r.signal, null, "killed (hang)");
  let json = null; try { json = JSON.parse(r.stdout); } catch {}
  return { code: r.status, out: r.stdout || "", err: r.stderr || "", json, ms: Date.now() - t0 };
}
const intake = (name, content, extra = [`--allow-email`, A]) => { const d = tmp(); return run([put(d, name, content), ...extra]); };
const refused = (r, why) => {
  assert.equal(r.code, 1, `${why}: expected exit 1, got ${r.code}; stderr ${r.err.slice(0, 200)}; stdout ${r.out.slice(0, 200)}`);
  assert.equal(r.out, "", `${why}: no JSON`); assert.match(r.err, /email/i, why); assert.doesNotMatch(r.err, TRACE, why);
  for (const v of [A, "evil.net", "hello@", "allowed.com"]) assert.ok(!(r.out + r.err).toLowerCase().includes(v), `${why}: echoed ${v}`);
};
const passes = (r, why) => { assert.equal(r.code, 0, `${why}: exit ${r.code}\n${r.err.slice(0, 300)}`); return r; };

// ================================================================ R54 a different address must not ride on the allowed one
const CASES = [
  [`${A}<p>.evil.net</p>`, "right neighbour .evil.net after a block"],
  [`${A}<br>.net`, "right neighbour .net after br"],
  [`<ul><li>${A}</li><li>.evil.net</li></ul>`, "right neighbour in the next li"],
  [`<p>${A.toUpperCase()}</p><p>.evil.net</p>`, "upper-case allowed address, right neighbour"],
  [`evil.<p>${A}</p>`, "left neighbour evil."],
  [`evil-<p>${A}</p>`, "left neighbour evil-"],
  [`john<p>${A}</p>`, "left neighbour john"],
  [`a@<p>${A}</p>`, "left neighbour a@"],
];
for (const [body, label] of CASES) {
  test(`R54 with ${A} allowed, '${label}' refuses in html`, () => { refused(intake("a.html", page(`<p>Open to roles.</p>${body}`)), label); });
  test(`R54 with ${A} allowed, '${label}' refuses in md`, () => { refused(intake("a.md", `Open to roles.\n\n${body}\n`), label); });
}
// join-point scan: wrapped lines and table cells
test("R54 wrapped lines: the allowed address on one line and .evil.net on the next refuses (md and README)", () => {
  refused(intake("a.md", `Mail ${A}\n.evil.net for help\n`), "address then .evil.net");
  const d = tmp(); put(d, "README.md", `Mail ${A}\n.evil.net for help\n`); refused(run([d, "--allow-email", A]), "README address then .evil.net");
});
test("R54 wrapped lines: 'evil.' on one line and the allowed address on the next refuses (md and README)", () => {
  refused(intake("a.md", `Write to evil.\n${A} for help\n`), "evil. then address");
  const d = tmp(); put(d, "README.md", `Write to evil.\n${A} for help\n`); refused(run([d, "--allow-email", A]), "README evil. then address");
});
test("R54 table cells: '| hello@allowed.com | .evil.net |' and '| evil. | hello@allowed.com |' refuse", () => {
  refused(intake("a.md", `| a | b |\n| --- | --- |\n| ${A} | .evil.net |\n`), "cells right");
  refused(intake("b.md", `| a | b |\n| --- | --- |\n| evil. | ${A} |\n`), "cells left");
});
// still passing
test("R54 the real-page shape still passes: the allowed address is a whole token between block boundaries (html and md)", () => {
  const h = passes(intake("a.html", page(`<p>Open to roles.</p><div><button aria-label="Copy email x, ${A}"></button></div><p>${A}</p><p>Next.</p>`)), "html");
  assert.ok(h.json.allowed_emails.find((a) => a.address === A && a.count >= 1));
  const m = passes(intake("a.md", `Open to roles.<p>${A}</p><p>Next.</p>\n`), "md");
  assert.ok(m.json.allowed_emails.find((a) => a.address === A && a.count >= 1));
});
test("R54 neighbours that are not address characters still pass: a space, a comma, a full stop with a space after, a block tag, text start and end", () => {
  for (const body of [`<p>Mail ${A}, thanks</p>`, `<p>${A}. Then more.</p>`, `<p>(${A})</p>`, `<p>x</p><p>${A}</p>`]) passes(intake("a.html", page(body)), body);
  passes(intake("a.md", `Mail ${A}\nthanks for reading.\n`), "newline then a word");
  passes(intake("b.md", `Mail me\n${A}\n`), "word then newline then address");
});
test("R54 an ordinary wrapped paragraph and a plain allowed address in a table still pass", () => {
  passes(intake("a.md", `A normal paragraph that wraps\nacross two lines.\n\n| a | b |\n| --- | --- |\n| Mail | ${A} |\n`), "table");
});

// ================================================================ R55 speed
test("R55 a 500,000-line file of 'a' with 30 allowed addresses finishes in under 3 seconds (md)", () => {
  const args = []; for (let i = 0; i < 30; i++) args.push("--allow-email", `person${i}@allowed${i}.com`);
  const d = tmp(); const p = put(d, "big.md", "a\n".repeat(500000));
  const r = run([p, ...args], 60000);
  assert.equal(r.code, 0, `exit ${r.code}; ${r.err.slice(0, 200)}`); assert.ok(r.ms < 3000, `took ${r.ms} ms (limit 3000)`);
});
test("R55 the same file as html (500,000 short block lines) with 30 allowed addresses finishes in under 3 seconds", () => {
  const args = []; for (let i = 0; i < 30; i++) args.push("--allow-email", `person${i}@allowed${i}.com`);
  const d = tmp(); const p = put(d, "big.html", page("<p>a</p>\n".repeat(120000)));
  const r = run([p, ...args], 60000);
  assert.ok(r.code === 0 || r.code === 1, `exit ${r.code}`); assert.ok(r.ms < 3000, `took ${r.ms} ms (limit 3000)`);
});

// ================================================================ R56 docs
test("R56 README Known limits of stakeholder-intake names that a three-way split (john@ / real / co.com) is not seen", () => {
  const lines = fs.readFileSync(path.join(PLUG, "README.md"), "utf8").split("\n"); const i = lines.findIndex((l) => /^#{2,4}\s+Known limits of stakeholder-intake/i.test(l)); assert.ok(i >= 0, "no heading");
  const lvl = lines[i].match(/^#+/)[0].length; let j = i + 1; while (j < lines.length && !(/^(#+)\s/.test(lines[j]) && lines[j].match(/^#+/)[0].length <= lvl)) j++;
  const s = lines.slice(i + 1, j).join("\n");
  assert.match(s, /three[- ](way|line|part|piece)|three lines|split over three|more than two (lines|cells|parts)|3-way/i, "names a three-way split");
  assert.match(s, /john@|not seen|not caught|misses|not detected|is not (scanned|refused|found)/i, "says it is not seen");
});
