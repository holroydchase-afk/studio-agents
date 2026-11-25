// Failing-first tests for privacy-security findings R50, R51, R52 on the R40..R43 fix. Written by qa-tdd before any production
// code. Separate from the other stakeholder tests (not edited). Every test builds its own fixtures in a temp dir. No network, no
// clock. Email, phone and key values are made up and assembled at run time.
//
// R50 (P1) The R40 fix made the tag-stripped scan variant treat a block tag as a space. That also hides an address or phone that a
//   block tag splits (john<p>@realco.com</p>, john@realco<br>.com, john@realco<div>.com</div>, 304<br>-555-<br>1234), which a
//   text extractor or copy-paste joins. Design pinned here (engineer: follow it, or change it with qa-tdd): the scan runs BOTH a
//   glued variant (every tag removed, block tags too, no space) and a spaced variant (block tags as a space). Any hit in either
//   variant refuses, EXCEPT a glued-variant email hit whose address, once the glued text is cut at the block boundaries, is not
//   a whole token on its own: when an --allow-email address appears in the page as a whole token that starts and ends at a block
//   boundary (or text start/end), the glued run "roles." + address is not a hit for that address. Nothing else is excused: a
//   different address glued across a block boundary still refuses, with or without an allowed address on the page, and an
//   allowed address that is itself split by a block tag (fixture-user@notreserved<br>.net) is not a whole token and refuses.
//   The R30 inline cases and the m24 real-page shape keep their results. Both .md (tags written in markdown) and .html.
// R51 (P2) Wrapped-line and table-cell joins happen before the quotes are scanned, and the scan of quotes uses a
//   whitespace-collapsed form, so "john@" + newline + "realco.com", a table row "john | @realco.com" and a key split over two
//   joined lines refuse (exit 1, no output, value never echoed).
// R52 (P2) repo-check chooses the S2.3 fix text from a boolean on the fact (lockfile present or not), never by a regex on the fact
//   text, which embeds untrusted action names. A repo that has a lockfile and an unpinned action named "no lockfile" is not told
//   to commit a lockfile.
// Boundaries covered: block tag at start and end of the address; phone split at two points. Not covered: other block tags than
// p, div, br, li, h2 for the refusals (the R40 tests cover the full list for the allowed case).
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
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), `skt5-${process.pid}-${n++}-`));
const put = (dir, rel, text = "x\n") => { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); return p; };
const TRACE = /\n\s+at |RangeError|TypeError|ReferenceError|node:internal|EPIPE|Unhandled|ENOENT|Error: /;
const page = (body) => `<!doctype html>\n<html><head><meta charset="utf-8"></head><body>\n${body}\n</body></html>\n`;
const ALLOWED = "fixture-user@notreserved.net";
const VICTIM = ["john", "realco-test.net"]; // john@realco-test.net, assembled
const VICTIM_ADDR = `${VICTIM[0]}@${VICTIM[1]}`;
const PHONE_DIGITS = ["304", "555", "0142"];

function run(args) {
  const r = spawnSync(process.execPath, [TOOL, ...args], { encoding: "utf8", timeout: 30000, cwd: ROOT, maxBuffer: 64 * 1024 * 1024, killSignal: "SIGKILL" });
  assert.equal(r.signal, null, "killed (hang)");
  let json = null; try { json = JSON.parse(r.stdout); } catch {}
  return { code: r.status, out: r.stdout || "", err: r.stderr || "", json };
}
const intake = (name, content, extra = []) => { const d = tmp(); return run([put(d, name, content), ...extra]); };
const refused = (r, re, why, vals = []) => {
  assert.equal(r.code, 1, `${why}: expected exit 1, got ${r.code}; stderr ${r.err.slice(0, 300)}; stdout ${r.out.slice(0, 200)}`);
  assert.equal(r.out, "", `${why}: a refused run writes no JSON`);
  if (re) assert.match(r.err, re, `${why}: stderr ${r.err.slice(0, 300)}`);
  assert.doesNotMatch(r.err, TRACE, `${why}: no stack trace`);
  for (const v of vals) assert.ok(!(r.out + r.err).includes(v), `${why}: value echoed ${v}`);
};
const ok = (r, why) => { assert.equal(r.code, 0, `${why}: exit ${r.code}\n${r.err.slice(0, 400)}`); assert.ok(r.json); return r; };

// ================================================================ R50 block-tag splits still refuse
const [U, H] = VICTIM;
const SPLIT_EMAILS = [
  [`Mail ${U}<p>@${H}</p> x`, "block tag before the @"],
  [`${U}@${H.split(".")[0]}<br>.${H.split(".")[1]}`, "br inside the domain"],
  [`${U}@${H.split(".")[0]}<div>.${H.split(".")[1]}</div>`, "div inside the domain"],
  [`<ul><li>${U}</li><li>@${H}</li></ul>`, "li around the @"],
  [`<h2>${U}</h2><h2>@${H}</h2>`, "h2 around the @"],
];
for (const [body, label] of SPLIT_EMAILS) {
  for (const [kind, name, content] of [["html", "a.html", page(body)], ["md", "a.md", `Contact:\n\n${body}\n`]]) {
    test(`R50 an address split by a block tag (${label}) refuses in ${kind}, never echoed`, () => {
      refused(intake(name, content), /email/i, label, [VICTIM_ADDR, U + "@"]);
    });
    test(`R50 the same split refuses in ${kind} when another address is allowed on the page`, () => {
      const extra = kind === "html" ? `<p>Open to roles.</p><p>${ALLOWED}</p>` : `Open to roles.\n\n${ALLOWED}\n`;
      refused(intake(name, kind === "html" ? page(body + extra) : `${content}\n${extra}`, ["--allow-email", ALLOWED]), /email/i, label, [VICTIM_ADDR]);
    });
  }
}
const [A, B, C] = PHONE_DIGITS;
for (const [kind, name, wrap] of [["html", "a.html", page], ["md", "a.md", (b) => `Call:\n\n${b}\n`]]) {
  test(`R50 a phone number split by block tags (${A}<br>-${B}-<br>${C}) refuses in ${kind}, never echoed`, () => {
    refused(intake(name, wrap(`<p>Call ${A}<br>-${B}-<br>${C}</p>`)), /phone/i, "phone", [`${A}-${B}-${C}`]);
  });
  test(`R50 a phone split by <p> and <div> refuses in ${kind}`, () => {
    refused(intake(name, wrap(`<p>${A}-${B}</p><div>-${C}</div>`)), /phone/i, "phone p/div");
  });
}
test("R50 an allowed address that is itself split by a block tag is not a whole token and refuses", () => {
  const [a, b] = ALLOWED.split(".");
  refused(intake("a.html", page(`<p>Open to roles.</p><p>${a}<br>.${b}</p>`), ["--allow-email", ALLOWED]), /email/i, "allowed address split", [ALLOWED]);
});
test("R50 the allowed address right after a block closing tag still passes (the R40 real-page shape), in html and md", () => {
  const h = intake("a.html", page(`<p>Open to roles.</p><div><button aria-label="Copy email x, ${ALLOWED}"></button></div><p>${ALLOWED}</p>`), ["--allow-email", ALLOWED]);
  assert.ok(ok(h, "html").json.allowed_emails.find((a) => a.address === ALLOWED && a.count >= 1));
  const m = intake("a.md", `Open to roles.<p>${ALLOWED}</p>\n`, ["--allow-email", ALLOWED]);
  assert.ok(ok(m, "md").json.allowed_emails.find((a) => a.address === ALLOWED && a.count >= 1));
});
test("R50 the allowed address between two block boundaries with text glued before it ('roles.' + address) passes; a victim address on the same page does not", () => {
  const h = intake("a.html", page(`<p>Open to roles.</p><p>${ALLOWED}</p>`), ["--allow-email", ALLOWED]); ok(h, "allowed only");
  refused(intake("b.html", page(`<p>Open to roles.</p><p>${ALLOWED}</p><p>Mail ${U}<p>@${H}</p>`), ["--allow-email", ALLOWED]), /email/i, "victim beside allowed", [VICTIM_ADDR]);
});
test("R50 inline tags still glue (R30): john<b></b>@host refuses", () => {
  refused(intake("a.html", page(`<p>${U}<b></b>@${H}</p>`)), /email/i, "inline");
});

// ================================================================ R51 joined wrapped lines and table cells
test("R51 an address broken by a wrapped line in markdown (john@ + newline + host) refuses", () => {
  refused(intake("a.md", `Write to ${U}@\n${H} any time.\n`), /email/i, "wrapped address", [VICTIM_ADDR]);
});
test("R51 an address split across a table row (john | @host) refuses", () => {
  refused(intake("a.md", `| Name | Mail |\n| --- | --- |\n| Ann | ${U} |  @${H} |\n`), /email/i, "table cells", [VICTIM_ADDR]);
});
test("R51 a table with the local part and the domain in adjacent cells refuses", () => {
  refused(intake("a.md", `| a | b |\n| --- | --- |\n| ${U} | @${H} |\n`), /email/i, "adjacent cells");
});
test("R51 an Anthropic-style key split over two wrapped lines refuses, value never echoed", () => {
  const tail = "A".repeat(40); const key = "sk-ant-api03-" + tail;
  refused(intake("a.md", `Use the key sk-ant-api03-\n${tail} for the demo\n`), /key|token|secret/i, "sk-ant split", [key, tail]);
});
test("R51 a GitHub token split over two wrapped lines (ghp_ then 36 characters) refuses", () => {
  const tail = "Q".repeat(36);
  refused(intake("a.md", `Token ghp_\n${tail} here\n`), /key|token|secret/i, "ghp split", [tail]);
});
test("R51 the same splits in a repo README refuse too", () => {
  const d = tmp(); put(d, "README.md", `Write to ${U}@\n${H} any time.\n`);
  refused(run([d]), /email/i, "README wrapped address", [VICTIM_ADDR]);
});
test("R51 an ordinary wrapped paragraph with an at-sign-free sentence is not refused", () => {
  const r = intake("a.md", "A normal paragraph that wraps\nacross two lines with no secrets.\n"); ok(r, "clean wrap");
});

// ================================================================ R52 fix text chosen from a boolean
function repoWith(actionName, { lock }) {
  const r = tmp(); const SHA = "a".repeat(40);
  put(r, "README.md", "# Demo\n\nWhat it is and why.\n\n[![ci](https://github.com/o/r/actions/workflows/ci.yml/badge.svg)](https://github.com/o/r/actions/workflows/ci.yml)\n");
  for (const f of ["LICENSE", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md", "SECURITY.md", ".github/ISSUE_TEMPLATE/bug.md", ".github/ISSUE_TEMPLATE/feature.md", ".github/pull_request_template.md", ".github/dependabot.yml"]) put(r, f, "x\n");
  put(r, ".github/workflows/ci.yml", `name: ci\non: [push]\npermissions:\n  contents: read\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: ${actionName}@main\n      - uses: actions/setup-node@${SHA}\n`);
  if (lock) put(r, "package-lock.json", "{}\n");
  return r;
}
function repoCheck(clone) {
  const r = spawnSync("node", [REPO_CHECK, clone, "--standards", STD, "--index-out", path.join(tmp(), "i.json")], { encoding: "utf8", cwd: ROOT, timeout: 30000 });
  assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout);
}
test("R52 (regression guard; a ref cannot hold a space, so only the source test below is red) a lockfile is present and the unpinned action is named 'no lockfile': the S2.3 fix does not tell the owner to commit a lockfile", () => {
  const f = repoCheck(repoWith("evil/no lockfile", { lock: true })).findings.find((x) => x.item === "S2.3");
  assert.ok(f, "S2.3 is still a finding (unpinned action)"); assert.doesNotMatch(f.fix, /lockfile|lock file/i, `fix was: ${f.fix}`); assert.match(f.fix, /pin/i);
});
test("R52 no lockfile and an ordinary action name: the fix still tells the owner to commit one", () => {
  const f = repoCheck(repoWith("actions/checkout", { lock: false })).findings.find((x) => x.item === "S2.3");
  assert.ok(f); assert.match(f.fix, /lockfile/i);
});
test("R52 repo-check source does not pick the fix with a regex on the fact text", () => {
  const src = fs.readFileSync(REPO_CHECK, "utf8");
  assert.doesNotMatch(src, /\/no lockfile\/\.test\(/, "the fix is chosen by a regex on text that embeds untrusted names");
});
