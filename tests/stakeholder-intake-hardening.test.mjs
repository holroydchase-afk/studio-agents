// Failing-first tests for the privacy-security review of plugins/stakeholder/tools/stakeholder-intake.mjs
// (STK-PS-R30..R38). Written by qa-tdd before any production code. Separate from tests/stakeholder-intake.test.mjs (not edited).
// Every test builds its own fixtures in a temp dir. No network, no clock. Email and phone values are made up and assembled at run time.
//
// Contracts these tests pin (engineer: follow them, or change them with qa-tdd):
//   R30 (P1) For md, txt, README and html inputs alike, the scan also runs on a tag-stripped variant (inline tags and empty
//            comments removed) and a markdown-unescaped variant (backslash escapes and ** __ * _ ` emphasis marks removed).
//            john<b></b>@host, john<!---->@host, john\@host, **john**@host and 555-<b>123</b>-4567 refuse: exit 1, no stdout,
//            category named, value never echoed.
//   R31 (P1) Named entities for space-like and dash-like characters (&ensp; &emsp; &thinsp; &nbsp; &Tab; &NewLine; &minus;
//            &hyphen; &dash; &ndash; &mdash;), padded numeric entities (&#0000000064; &#x0000000040;, any number of leading
//            zeros) decode and are scanned. An unknown &name; or a numeric entity over 10 digits sitting inside an
//            email-shaped or phone-shaped run refuses (fail closed), exit 1.
//   R32 (P1) --out whose real path is under the scanned folder (including through a symlinked spelling) or is a file the walk
//            would read is a usage error: exit 2, no stdout, nothing written, the README byte-identical.
//   R35 (P2) <!--> and <!---> are empty comments that close at once; later text stays in the quotes.
//   R36 (P2) the output has "untrusted": true at top level (all kinds).
//   R37 (P2) a repo run reads at most 50 MB in total (52,428,800 bytes); over that: exit 1, "too large", no output.
//   R33/R34/R38 (P2) README "Known limits of stakeholder-intake" names: (555)123-4567 and 5551234567 style numbers, non-NANP
//            numbers, non-ASCII email domains, the lstat-then-read race, and --out replacing a symlink rather than its target.
// Boundaries covered: 49 MB vs 60 MB total. Not covered: other languages' entity names beyond those listed.
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
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), `skt3h-${process.pid}-${n++}-`));
const put = (dir, rel, text = "x\n") => { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); return p; };
const read = (p) => fs.readFileSync(p, "utf8");
const TRACE = /\n\s+at |RangeError|TypeError|ReferenceError|node:internal|EPIPE|Unhandled|ENOENT|Error: /;
const EMAIL = "john@notreserved.net"; const [E1, E2] = ["john", "notreserved.net"];
const page = (body) => `<!doctype html>\n<html><head><meta charset="utf-8"></head><body>\n${body}\n</body></html>\n`;

function run(args, { timeout = 30000 } = {}) {
  assert.ok(fs.existsSync(TOOL), "plugins/stakeholder/tools/stakeholder-intake.mjs does not exist");
  const r = spawnSync(process.execPath, [TOOL, ...args], { encoding: "utf8", timeout, cwd: ROOT, maxBuffer: 64 * 1024 * 1024, killSignal: "SIGKILL" });
  assert.equal(r.signal, null, "the tool was killed (hang)");
  let json = null; try { json = JSON.parse(r.stdout); } catch {}
  return { code: r.status, out: r.stdout || "", err: r.stderr || "", json };
}
const ok = (r) => { assert.equal(r.code, 0, `exit ${r.code}\n${r.err.slice(0, 500)}`); assert.ok(r.json, "stdout is not JSON"); return r; };
const refused = (r, re, why, code = 1) => {
  assert.equal(r.code, code, `${why}: expected exit ${code}, got ${r.code}; stderr ${r.err.slice(0, 300)}; stdout ${r.out.slice(0, 200)}`);
  assert.equal(r.out, "", `${why}: a refused run writes no JSON`);
  if (re) assert.match(r.err, re, `${why}: stderr was: ${r.err.slice(0, 300)}`);
  assert.doesNotMatch(r.err, TRACE, `${why}: no stack trace`);
};
// the same content through each kind: a .md file, a .txt file, a repo README, and (when html) an .html file
function kinds(content, { html = false } = {}) {
  const out = [];
  const a = tmp(); out.push(["md", put(a, "n.md", content)]);
  const b = tmp(); out.push(["txt", put(b, "n.txt", content)]);
  const c = tmp(); put(c, "README.md", content); out.push(["README", c]);
  if (html) { const d = tmp(); out.push(["html", put(d, "n.html", page(content))]); }
  return out;
}
const echo = (r, ...vals) => { for (const v of vals) assert.ok(!(r.out + r.err).includes(v), `value echoed: ${v}`); };

// ================================================================ R30 tag-stripped and markdown-unescaped variants, every kind
const EMAIL_FORMS = [
  [`${E1}<b></b>@${E2}`, "empty inline tag"], [`${E1}<!---->@${E2}`, "empty comment"], [`${E1}\\@${E2}`, "backslash-escaped @"],
  [`**${E1}**@${E2}`, "bold marks"], [`__${E1}__@${E2}`, "underscore marks"], [`${E1}<i>@</i>${E2}`, "tag around the @"], [`_${E1}_@${E2}`, "single underscore"],
];
for (const [form, label] of EMAIL_FORMS) {
  test(`STK-PS-R30 an email written as ${label} (${form.replace(/</g, "&lt;")}) refuses in md, txt, README and html, never echoed`, () => {
    for (const [kind, target] of kinds(`Contact: ${form}\n`, { html: !/\\@|\*\*|__|^_/.test(form) })) {
      const r = run([target]); refused(r, /email/i, `${kind}: ${label}`); echo(r, EMAIL);
    }
  });
}
test("STK-PS-R30 a phone written with a tag inside (555-<b>123</b>-4567) or with markdown marks refuses in md, txt, README and html", () => {
  for (const form of ["555-<b>123</b>-4567", "555-<!---->123-4567", "**555**-123-4567", "555\\-123\\-4567"]) {
    for (const [kind, target] of kinds(`Call ${form} now\n`, { html: form.includes("<") })) { const r = run([target]); refused(r, /phone/i, `${kind}: ${form}`); echo(r, "555-123-4567"); }
  }
});
test("STK-PS-R30 clean text with markdown and tags (no personal data) still passes: bold, escapes and an inline tag around ordinary words", () => {
  for (const [kind, target] of kinds("This is **bold** and \\*escaped\\* and <b>tagged</b> text. Version 2.0 shipped.\n")) ok(run([target]));
});

// ================================================================ R31 entities
const PHONE_ENT = [["&ensp;", "en space"], ["&emsp;", "em space"], ["&thinsp;", "thin space"], ["&nbsp;", "nbsp"], ["&Tab;", "tab"], ["&NewLine;", "newline"], ["&minus;", "minus"], ["&hyphen;", "hyphen"], ["&dash;", "dash"], ["&ndash;", "en dash"], ["&mdash;", "em dash"], ["&#0000000045;", "padded numeric hyphen"], ["&#x000000002d;", "padded hex hyphen"]];
for (const [ent, label] of PHONE_ENT) {
  test(`STK-PS-R31 a phone separated by ${ent} (${label}) refuses in html and in markdown`, () => {
    const body = `Call 555${ent}123${ent}4567 now`;
    for (const [kind, target] of kinds(`${body}\n`, { html: true })) { const r = run([target]); refused(r, /phone/i, `${kind}: ${ent}`); echo(r, "555-123-4567"); }
  });
}
test("STK-PS-R31 an email whose @ is a padded numeric entity (&#0000000064; or &#x0000000040;, any number of leading zeros) refuses", () => {
  for (const at of ["&#0000000064;", "&#x0000000040;", "&#00000000000000000064;", "&#x00000000000000000040;"]) {
    for (const [kind, target] of kinds(`Mail ${E1}${at}${E2}\n`, { html: true })) { const r = run([target]); refused(r, /email/i, `${kind}: ${at}`); echo(r, EMAIL); }
  }
});
test("STK-PS-R31 an unknown &name; or an over-long numeric entity inside an email-shaped or phone-shaped run refuses (fail closed)", () => {
  for (const body of [`Mail ${E1}&zzzunknown;@${E2}`, `Mail ${E1}@&zzzunknown;${E2}`, `Mail ${E1}&#99999999999;@${E2}`, `Call 555&zzzunknown;123&zzzunknown;4567`, `Call 555&#99999999999;123&#99999999999;4567`, `Call 555-123&qqq;4567`]) {
    for (const [kind, target] of kinds(`${body}\n`, { html: true })) { const r = run([target]); refused(r, /email|phone|entity|unscann|decod/i, `${kind}: ${body}`); }
  }
});
test("STK-PS-R31 an unknown entity in ordinary prose (no email or phone shape) does not stop the run", () => {
  for (const [kind, target] of kinds("Fish &zzzunknown; chips and &#99999999999; more words here.\n", { html: true })) ok(run([target]));
});

// ================================================================ R32 --out inside the scanned folder
test("STK-PS-R32 --out naming the README of the repo being scanned exits 2, writes nothing, and the README is byte-identical", () => {
  const d = tmp(); const readme = put(d, "README.md", "Alpha builds crew maps.\nBeta tracks time.\n"); const before = fs.readFileSync(readme);
  const r = run([d, "--out", readme]); refused(r, /out|inside|folder|scanned/i, "--out is the README", 2); assert.ok(fs.readFileSync(readme).equals(before), "the README was overwritten");
});
test("STK-PS-R32 --out as a new file anywhere under the scanned folder (top level, nested, or through a symlinked spelling of the folder) exits 2 and creates no file", () => {
  const d = tmp(); put(d, "README.md", "Hello there.\n"); fs.mkdirSync(path.join(d, "sub"));
  const link = path.join(tmp(), "alias"); fs.symlinkSync(d, link);
  for (const out of [path.join(d, "index.json"), path.join(d, "sub", "index.json"), path.join(link, "index2.json"), path.join(d, "sub", "..", "index3.json")]) {
    const r = run([d, "--out", out]); refused(r, /out|inside|folder|scanned/i, out, 2); assert.ok(!fs.existsSync(out), `${out} was created`);
  }
  assert.deepEqual(fs.readdirSync(d).sort(), ["README.md", "sub"], "nothing was left in the folder");
  const r2 = run([link, "--out", path.join(d, "viaLink.json")]); refused(r2, null, "input spelled through the symlink, --out real path", 2);
});
test("STK-PS-R32 --out outside the folder still works; a single-file input's own folder is not off limits for a different --out name", () => {
  const d = tmp(); put(d, "README.md", "Hello there.\n"); const o = path.join(tmp(), "o.json"); assert.equal(run([d, "--out", o]).code, 0); assert.equal(JSON.parse(read(o)).kind, "repo");
  const f = tmp(); const p = put(f, "a.txt", "One.\n"); const o2 = path.join(f, "result.json"); assert.equal(run([p, "--out", o2]).code, 0, "a file input may write beside itself");
});

// ================================================================ R35 empty comments
test("STK-PS-R35 <!--> and <!---> close an empty comment at once: later text stays in the quotes", () => {
  for (const open of ["<!-->", "<!--->", "<!---->"]) {
    const r = ok(run([(() => { const d = tmp(); return put(d, "c.html", page(`<p>Before.</p>${open}<p>After the comment.</p>`)); })()]));
    const t = r.json.quotes.map((q) => q.text); assert.ok(t.includes("Before.") && t.includes("After the comment."), `${open}: ${JSON.stringify(t)}`);
  }
});

// ================================================================ R36 untrusted flag
test("STK-PS-R36 the output has top-level \"untrusted\": true for html, text and repo", () => {
  const h = tmp(), t = tmp(), r = tmp(); put(r, "README.md", "Hi there.\n");
  for (const target of [put(h, "p.html", page("<p>Hi.</p>")), put(t, "p.md", "Hi.\n"), r]) { const j = ok(run([target])).json; assert.strictEqual(j.untrusted, true, `kind ${j.kind}`); }
});

// ================================================================ R37 total bytes
const bigFiles = (dir, k) => { const body = " ".repeat(1048575) + "\n"; for (let i = 0; i < k; i++) fs.writeFileSync(path.join(dir, `pad${String(i).padStart(2, "0")}.txt`), body); };
test("STK-PS-R37 a repo whose files total more than 50 MB is refused 'too large' with no output; 49 MB still runs", () => {
  const over = tmp(); put(over, "README.md", "Hello there.\n"); bigFiles(over, 60); refused(run([over]), /too large/i, "60 MB total");
  const under = tmp(); put(under, "README.md", "Hello there.\n"); bigFiles(under, 49); assert.equal(ok(run([under])).json.kind, "repo");
});

// ================================================================ R33, R34, R38 docs
function limits() {
  const lines = read(path.join(PLUG, "README.md")).split("\n"); const i = lines.findIndex((l) => /^#{2,4}\s+Known limits of stakeholder-intake/i.test(l)); assert.ok(i >= 0, "README has no 'Known limits of stakeholder-intake' heading");
  const lvl = lines[i].match(/^#+/)[0].length; let j = i + 1; while (j < lines.length && !(/^(#+)\s/.test(lines[j]) && lines[j].match(/^#+/)[0].length <= lvl)) j++; return lines.slice(i + 1, j).join("\n");
}
test("STK-PS-R33 README Known limits names the phone shapes the scan misses: (555)123-4567 and 5551234567 style numbers, and non-NANP numbers", () => {
  const s = limits(); assert.match(s, /\(555\)\s?123-4567|parenthes/i, "(555)123-4567 style"); assert.match(s, /5551234567|ten digits|no separator|unseparated/i, "5551234567 style"); assert.match(s, /non-NANP|outside (the )?(US|North America|NANP)|international|non-US/i, "non-NANP numbers");
});
test("STK-PS-R34 README Known limits names non-ASCII email domains (internationalized addresses)", () => {
  assert.match(limits(), /non-ASCII[^.\n]*(domain|address|email)|internationali[sz]ed|IDN|unicode[^.\n]*domain/i);
});
test("STK-PS-R38 README Known limits names the lstat-then-read race and that --out replaces a symlink rather than writing to its target", () => {
  const s = limits(); assert.match(s, /lstat|race|between (the )?check|time-of-check|TOCTOU/i, "race"); assert.match(s, /--out[^.\n]*(replace|symlink)|replac[^.\n]*symlink/i, "--out replacing a symlink");
});
