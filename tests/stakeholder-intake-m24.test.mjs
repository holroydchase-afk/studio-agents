// Failing-first tests for M2.4 findings R40, R41, R42, R43 (docs/product/M2.4-first-real-runs.md). Written by qa-tdd before
// any production code. Separate from the SKT-18..26 and STK-PS-R30..R38 files (not edited). Every test builds its own fixtures in a
// temp dir. No network, no clock. Email values are made up.
//
// Contracts these tests pin (engineer: follow them, or change them with qa-tdd):
//   R40 (P1) In the tag-stripped scan variant a block tag (p div section li h1-h6 br button, open or close) counts as a space,
//            so an address allowed with --allow-email that sits right after a block boundary matches and the run exits 0 with the
//            address under allowed_emails. Inline tags (b i em span a strong code) stay glued: the R30 cases still refuse, and
//            a block boundary never lets an address that was NOT allowed through.
//   R41 (P2) Named entities such as &darr; &rarr; &amp; &mdash; &rsquo; &hellip; decode to their characters in html quotes,
//            as do numeric ones; an unknown name (&notanentity;) is left as written text.
//   R42 (P1) In markdown input (a .md file and a repo README) a sentence wrapped over two or more source lines in one paragraph
//            is ONE quote, lines joined by a single space; a markdown table row is ONE quote (cells joined with " | ", the
//            separator row makes no quote); a long row is cut at 500 chars with truncated true; ids still run q1..qn.
//            A heading, a list item, a fence line and a line that ends a sentence (. ! ? or :) still end a quote.
//   R43 (P2) repo-check: when a lockfile exists in the clone, the S2.3 fix text does not tell the owner to commit one; when none
//            exists it still does.
// Boundaries covered: a row of exactly over 500 chars; a wrap of three lines; entity at the very end of text. Not covered: other
// entity names beyond those listed; wrapped lines in .txt (see QA-R1 in the report: the existing SKT-21 test pins one quote per line there).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS = path.join(ROOT, "plugins", "stakeholder", "tools");
const TOOL = path.join(TOOLS, "stakeholder-intake.mjs");
const REPO_CHECK = path.join(TOOLS, "repo-check.mjs");
const STD = path.join(ROOT, "tests", "fixtures", "stakeholder", "repo-standards.frozen.md");

let n = 0;
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), `skt4-${process.pid}-${n++}-`));
const put = (dir, rel, text = "x\n") => { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); return p; };
const TRACE = /\n\s+at |RangeError|TypeError|ReferenceError|node:internal|EPIPE|Unhandled|ENOENT|Error: /;
const EMAIL = "fixture-user@notreserved.net"; const OTHER = "someone-else@notreserved.net";
const [E1, E2] = ["fixture-user", "notreserved.net"];
const page = (body) => `<!doctype html>\n<html><head><meta charset="utf-8"></head><body>\n${body}\n</body></html>\n`;

function run(args, { timeout = 30000 } = {}) {
  assert.ok(fs.existsSync(TOOL), "plugins/stakeholder/tools/stakeholder-intake.mjs does not exist");
  const r = spawnSync(process.execPath, [TOOL, ...args], { encoding: "utf8", timeout, cwd: ROOT, maxBuffer: 64 * 1024 * 1024, killSignal: "SIGKILL" });
  assert.equal(r.signal, null, "the tool was killed (hang)");
  let json = null; try { json = JSON.parse(r.stdout); } catch {}
  return { code: r.status, out: r.stdout || "", err: r.stderr || "", json };
}
const intake = (name, content, extra = []) => { const d = tmp(); const p = put(d, name, content); return { ...run([p, ...extra]), p, d }; };
const ok = (r) => { assert.equal(r.code, 0, `exit ${r.code}\n${r.err.slice(0, 500)}`); assert.ok(r.json, "stdout is not JSON"); return r; };
const refused = (r, re, why) => {
  assert.equal(r.code, 1, `${why}: expected exit 1, got ${r.code}; stderr ${r.err.slice(0, 300)}`);
  assert.equal(r.out, "", `${why}: a refused run writes no JSON`);
  if (re) assert.match(r.err, re, `${why}: stderr was: ${r.err.slice(0, 300)}`);
  assert.doesNotMatch(r.err, TRACE, `${why}: no stack trace`);
};
const texts = (r) => r.json.quotes.map((q) => q.text);
const idsRun = (r) => r.json.quotes.forEach((q, i) => assert.equal(q.id, `q${i + 1}`, "ids run q1..qn"));
const readmeRepo = (body) => { const d = tmp(); put(d, "README.md", body); return d; };

// ================================================================ R40 block tags are a space in the tag-stripped scan variant
const BLOCK_PAIRS = ["p", "div", "section", "li", "h1", "h2", "h3", "h4", "h5", "h6", "button"];
for (const t of BLOCK_PAIRS) {
  test(`R40 an allowed address right after a closing <${t}> exits 0 and is listed under allowed_emails`, () => {
    const body = t === "li" ? `<ul><li>Open to roles.</li><li>${EMAIL}</li></ul>` : `<${t}>Open to roles.</${t}><${t}>${EMAIL}</${t}>`;
    const r = ok(intake("a.html", page(body), ["--allow-email", EMAIL]));
    const row = r.json.allowed_emails.find((a) => a.address === EMAIL); assert.ok(row, JSON.stringify(r.json.allowed_emails)); assert.ok(row.count >= 1);
  });
}
test("R40 an allowed address after <br> (a void block tag) exits 0 and is listed under allowed_emails", () => {
  const r = ok(intake("a.html", page(`<p>Open to roles.<br>${EMAIL}</p>`), ["--allow-email", EMAIL]));
  assert.ok(r.json.allowed_emails.find((a) => a.address === EMAIL && a.count >= 1), JSON.stringify(r.json.allowed_emails));
});
test("R40 the real-page shape (copy button with an aria-label, then the address after a block) exits 0", () => {
  const body = `<p>Open to roles.</p><div><button aria-label="Copy email x, ${EMAIL}"></button></div><p>${EMAIL}</p>`;
  const r = ok(intake("home.html", page(body), ["--allow-email", EMAIL]));
  assert.ok(r.json.allowed_emails.find((a) => a.address === EMAIL && a.count >= 1), JSON.stringify(r.json.allowed_emails));
  assert.ok(r.json.quotes.length >= 1);
});
for (const t of ["b", "i", "em", "span", "a", "strong", "code"]) {
  test(`R40 inline <${t}> still glues: ${E1}<${t}></${t}>@${E2} refuses (R30 stays), value not echoed`, () => {
    const r = intake("a.html", page(`<p>Contact: ${E1}<${t}></${t}>@${E2}</p>`));
    refused(r, /email/i, `inline ${t}`); assert.ok(!(r.out + r.err).includes(EMAIL), "value echoed");
  });
}
test("R40 a block boundary never lets through an address that was not allowed: a different address after <p> still refuses", () => {
  const r = intake("a.html", page(`<p>Open to roles.</p><p>${EMAIL}</p><p>Open to roles.</p><p>${OTHER}</p>`), ["--allow-email", EMAIL]);
  refused(r, /email/i, "other address"); assert.ok(!(r.out + r.err).includes(OTHER), "value echoed");
});
test("R40 inline glue with an allowed address elsewhere on the page: the glued address still refuses", () => {
  const r = intake("a.html", page(`<p>${EMAIL}</p><p>Mail ${OTHER.split("@")[0]}<b></b>@${E2}</p>`), ["--allow-email", EMAIL]);
  refused(r, /email/i, "glued other address");
});

// ================================================================ R41 entities in visible text
test("R41 &darr; &rarr; &amp; &mdash; &rsquo; decode to their characters in the quotes", () => {
  const r = ok(intake("e.html", page("<p>Down &darr; now</p><p>Go &rarr; there</p><p>Tom &amp; Ann</p><p>Wait &mdash; what</p><p>It&rsquo;s fine</p>")));
  assert.deepEqual(texts(r), ["Down \u2193 now", "Go \u2192 there", "Tom & Ann", "Wait \u2014 what", "It\u2019s fine"]);
});
test("R41 &hellip; decodes (no entity text is left) and numeric entities decode, even at the very end of the text", () => {
  const r = ok(intake("e.html", page("<p>Wait&hellip;</p><p>Arrow &#8594; and &#x2193;</p><p>End &darr;</p>")));
  const t = texts(r); assert.ok(t.every((x) => !/&\w+;|&#/.test(x)), JSON.stringify(t));
  assert.match(t[0], /^Wait(\u2026|\.\.\.)$/); assert.equal(t[1], "Arrow \u2192 and \u2193"); assert.equal(t[2], "End \u2193");
});
test("R41 an unknown entity name is left as text", () => {
  const r = ok(intake("e.html", page("<p>Keep &notanentity; as written</p>")));
  assert.deepEqual(texts(r), ["Keep &notanentity; as written"]);
});

// ================================================================ R42 wrapped lines and table rows (markdown)
const WRAP = "Chase builds small tools for a crew that has\nweak signal and cheap phones, and ships them\nwithout a build step.\n";
test("R42 a sentence wrapped over three lines in a .md file is ONE quote joined by single spaces", () => {
  const r = ok(intake("n.md", WRAP));
  assert.deepEqual(texts(r), ["Chase builds small tools for a crew that has weak signal and cheap phones, and ships them without a build step."]); idsRun(r);
});
test("R42 the same wrapped paragraph in a repo README is ONE quote, then the fact lines as before", () => {
  const r = ok(run([readmeRepo(WRAP)]));
  assert.equal(texts(r)[0], "Chase builds small tools for a crew that has weak signal and cheap phones, and ships them without a build step.");
  assert.match(texts(r)[1], /^root files: /); idsRun(r);
});
test("R42 two wrapped sentences in one paragraph give two quotes, split at the sentence end not at the line end", () => {
  const r = ok(intake("n.md", "It tracks time on\nsite. It works with no\nsignal at all.\n"));
  assert.deepEqual(texts(r), ["It tracks time on site.", "It works with no signal at all."]);
});
test("R42 a blank line still separates paragraphs; a line that ends a sentence still ends its quote", () => {
  const r = ok(intake("n.md", "First part of one\nparagraph here.\n\nSecond paragraph\nstays apart.\nThird line alone.\n"));
  assert.deepEqual(texts(r), ["First part of one paragraph here.", "Second paragraph stays apart.", "Third line alone."]);
});
test("R42 headings and list items are not glued to the lines around them", () => {
  const r = ok(intake("n.md", "# Title here\nIntro line wraps\nonto a second line.\n- item one\n- item two\n"));
  const t = texts(r); assert.equal(t.length, 4, JSON.stringify(t));
  assert.match(t[0], /^#?\s*Title here$/, "the heading is its own quote and does not absorb the next line");
  assert.deepEqual(t.slice(1), ["Intro line wraps onto a second line.", "- item one", "- item two"]);
});
const TABLE = "| Name | Role |\n| --- | --- |\n| Ann | Builds maps. Ships. |\n| Bo | Tests |\n";
test("R42 a markdown table gives ONE quote per row, cells joined with ' | ', no quote for the separator row, ids q1..qn", () => {
  const r = ok(intake("n.md", TABLE));
  assert.deepEqual(texts(r), ["Name | Role", "Ann | Builds maps. Ships.", "Bo | Tests"]); idsRun(r);
});
test("R42 a table row in a README is one quote and the cell with two sentences is not split", () => {
  const r = ok(run([readmeRepo(`Intro sentence.\n\n${TABLE}`)]));
  const t = texts(r); assert.equal(t[0], "Intro sentence."); assert.ok(t.includes("Ann | Builds maps. Ships."), JSON.stringify(t)); idsRun(r);
});
test("R42 a table row over 500 characters is cut at 500 with truncated true; the other rows are not truncated", () => {
  const long = Array.from({ length: 120 }, (_, i) => `w${String(i).padStart(3, "0")}`).join(" ");
  const r = ok(intake("n.md", `| A | B |\n| --- | --- |\n| short | ${long} |\n| x | y |\n`));
  const qs = r.json.quotes; assert.equal(qs.length, 3, JSON.stringify(texts(r).map((x) => x.slice(0, 20))));
  assert.equal(qs[1].truncated, true); assert.ok(qs[1].text.length <= 500 && qs[1].text.length > 400); assert.ok(qs[1].text.startsWith("short | w000"));
  assert.ok(!qs[0].truncated && !qs[2].truncated); idsRun(r);
});
test("R42 the wrapped and table quotes work unchanged as check-stakeholder --index input (ids valid, one per quote)", () => {
  const r = ok(intake("n.md", `${WRAP}\n${TABLE}`)); idsRun(r);
  for (const q of r.json.quotes) { assert.match(q.id, /^[A-Za-z0-9_-]{1,40}$/); assert.doesNotMatch(q.text, /[\n\r]/); }
});

// ================================================================ R43 repo-check fix text when a lockfile exists
function cleanRepo({ lock = true } = {}) {
  const r = tmp(); const SHA = "a".repeat(40);
  put(r, "README.md", "# Demo\n\nWhat it is and why.\n\n[![ci](https://github.com/o/r/actions/workflows/ci.yml/badge.svg)](https://github.com/o/r/actions/workflows/ci.yml)\n");
  for (const f of ["LICENSE", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md", "SECURITY.md", ".github/ISSUE_TEMPLATE/bug.md", ".github/ISSUE_TEMPLATE/feature.md", ".github/pull_request_template.md", ".github/dependabot.yml"]) put(r, f, "x\n");
  put(r, ".github/workflows/ci.yml", `name: ci\non: [push]\npermissions:\n  contents: read\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@main\n      - uses: actions/setup-node@${SHA}\n`);
  if (lock) put(r, "package-lock.json", "{}\n");
  put(r, "src/index.js", "export {};\n");
  return r;
}
function repoCheck(clone) {
  assert.ok(fs.existsSync(REPO_CHECK), "repo-check.mjs does not exist");
  const idx = path.join(tmp(), "i.json");
  const r = spawnSync("node", [REPO_CHECK, clone, "--standards", STD, "--index-out", idx], { encoding: "utf8", cwd: ROOT, timeout: 30000 });
  assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout);
}
test("R43 lockfile present and an action unpinned: the S2.3 finding stays but its fix text does not say to commit a lockfile", () => {
  const f = repoCheck(cleanRepo({ lock: true })).findings.find((x) => x.item === "S2.3");
  assert.ok(f, "S2.3 should still be a finding (actions/checkout@main is unpinned)");
  assert.match(f.fix, /pin/i, "the fix still says to pin the actions"); assert.doesNotMatch(f.fix, /lockfile|lock file/i, `fix was: ${f.fix}`);
});
test("R43 no lockfile: the S2.3 fix text still tells the owner to commit one", () => {
  const f = repoCheck(cleanRepo({ lock: false })).findings.find((x) => x.item === "S2.3");
  assert.ok(f); assert.match(f.fix, /lockfile/i);
});
