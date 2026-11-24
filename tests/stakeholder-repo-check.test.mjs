// Failing-first tests for repo-check (SKT-1..8 and the SKT-28..30 parts that apply to it), PR 1 of 3 in
// docs/product/SPEC-STAKEHOLDER-TOOLS.md. Written by qa-tdd before any production code.
// Every test builds its own small fixture repo in a temp dir. No network, no clock, no real personal data.
// Secret-looking values are assembled at run time and never written into this file.
//
// Contracts these tests pin where the spec is silent (engineer: follow them, or change them with qa-tdd):
//   - CLI: node plugins/stakeholder/tools/repo-check.mjs <clone-dir> [--standards f] [--index-out f] [--out f] [--allow-email a]
//     JSON goes to stdout, or to --out; with --out stdout carries no JSON. Imports tools/lib/guard.mjs.
//   - Item ids are S<section>.<n> by bullet position in the frozen standards: S1.2 LICENSE, S1.3 CONTRIBUTING,
//     S1.4 CODE_OF_CONDUCT, S1.5 SECURITY, S1.6 issue/PR templates, S1.7 description+topics, S1.8 social preview,
//     S2.2 branch protection, S2.3 lockfile + pinned actions, S2.4 Dependabot/Renovate, S2.5 workflow permissions,
//     S2.7 releases, S3.1 root clutter, S3.5 CI badge, S3.4 default branch, S3.6 readable history.
//   - Output buckets: findings, passed (ids), needs_github_data, needs_human, unmapped, skipped, omitted (count).
//     An id may be a string or an object with an `id` field. Every item lands in exactly one bucket (findings
//     past the cap of 10 are the only items allowed to be missing, counted in `omitted`).
//   - skipped entries are strings or objects that name the file and give a reason.
//   - allowed_emails (SKT-24 shape) lists an address passed with --allow-email.
//   - FIXTURE NOTE: the spec's hash pin (SKT-2) needs the real wording of each standards line, so the mapped-item
//     tests use tests/fixtures/stakeholder/repo-standards.frozen.md, a frozen copy of docs/repo-standards.md.
//     The tool must not store or print that wording (tested below).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLUG = path.join(ROOT, "plugins", "stakeholder");
const TOOLS = path.join(PLUG, "tools");
const TOOL = path.join(TOOLS, "repo-check.mjs");
const GUARD = path.join(TOOLS, "lib", "guard.mjs");
const CHECKER = path.join(TOOLS, "check-stakeholder.mjs");
const STD = path.join(ROOT, "tests", "fixtures", "stakeholder", "repo-standards.frozen.md");
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const ITEM_RE = /^S\d\.\d+$/;
const ALL_ITEMS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `S1.${n}`).concat([1, 2, 3, 4, 5, 6, 7].map((n) => `S2.${n}`), [1, 2, 3, 4, 5, 6, 7].map((n) => `S3.${n}`));

let n = 0;
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), `skt1-${process.pid}-${n++}-`));
const read = (p) => fs.readFileSync(p, "utf8");
const put = (root, rel, text = "x\n") => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); return p; };
const SHA = "a".repeat(40);
const CI_OK = `name: ci\non: [push]\npermissions:\n  contents: read\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@${SHA}\n      - uses: actions/setup-node@v4.1.0\n`;

// A clean fixture clone: every locally checkable item passes.
function cleanRepo(opts = {}) {
  const r = tmp();
  put(r, "README.md", "# Demo\n\nWhat it is and why.\n\n[![ci](https://github.com/o/r/actions/workflows/ci.yml/badge.svg)](https://github.com/o/r/actions/workflows/ci.yml)\n");
  put(r, "LICENSE", "MIT License\n");
  put(r, "CONTRIBUTING.md", "How to report a bug and open a PR.\n");
  put(r, "CODE_OF_CONDUCT.md", "Be kind.\n");
  put(r, "SECURITY.md", "Report privately.\n");
  put(r, ".github/ISSUE_TEMPLATE/bug.md", "bug\n");
  put(r, ".github/ISSUE_TEMPLATE/feature.md", "feature\n");
  put(r, ".github/pull_request_template.md", "pr\n");
  put(r, ".github/workflows/ci.yml", CI_OK);
  put(r, ".github/dependabot.yml", "version: 2\nupdates: []\n");
  put(r, "package-lock.json", "{}\n");
  put(r, "src/index.js", "export {};\n");
  for (const f of opts.without || []) fs.rmSync(path.join(r, f), { recursive: true, force: true });
  return r;
}

function run(clone, extra = [], { standards = STD, index = true, cwd = ROOT, tool = TOOL, env = {} } = {}) {
  assert.ok(fs.existsSync(tool), "plugins/stakeholder/tools/repo-check.mjs does not exist");
  const dir = tmp();
  const idx = path.join(dir, "index.json");
  const args = [tool, clone, ...(standards ? ["--standards", standards] : []), ...(index ? ["--index-out", idx] : []), ...extra];
  const r = spawnSync("node", args, { encoding: "utf8", cwd, timeout: 30000, env: { ...process.env, ...env } });
  let json = null; try { json = JSON.parse(r.stdout); } catch {}
  return { code: r.status, out: r.stdout || "", err: r.stderr || "", json, idx, idxJson: index && fs.existsSync(idx) ? JSON.parse(read(idx)) : null };
}
const ok = (clone, extra, o) => { const r = run(clone, extra, o); assert.equal(r.code, 0, `exit ${r.code}\n${r.err}${r.out.slice(0, 400)}`); assert.ok(r.json, "stdout is not JSON"); return r; };
// findings carry `item` (exact key set pinned in SKT-1); the other buckets carry `id`. QA-R3: test defect fixed by the caller.
const idOf = (x) => (typeof x === "string" ? x : x && (x.item || x.id));
const ids = (arr) => (arr || []).map(idOf);
const findingFor = (r, id) => r.json.findings.find((f) => f.item === id);
const quoteText = (r, qid) => (r.idxJson.quotes.find((q) => q.id === qid) || {}).text;
const buckets = (j) => ({ findings: ids(j.findings), passed: ids(j.passed), needs_github_data: ids(j.needs_github_data), needs_human: ids(j.needs_human), unmapped: ids(j.unmapped) });
const where = (j, id) => Object.entries(buckets(j)).filter(([, v]) => v.includes(id)).map(([k]) => k);
// Only bullets before the "Studio notes" section are standards items (QA-R4: test defect fixed by the caller).
const bullets = () => read(STD).split("\n## Studio notes")[0].split("\n").filter((l) => l.startsWith("- "));

// ================================================================ SKT-1
test("SKT-1 repo with README and LICENSE but no CONTRIBUTING: fail finding with a quote in the index, LICENSE passed", () => {
  const clone = cleanRepo({ without: ["CONTRIBUTING.md"] });
  const r = ok(clone);
  const f = findingFor(r, "S1.3");
  assert.ok(f, `no finding for S1.3 (CONTRIBUTING); findings: ${JSON.stringify(r.json.findings)}`);
  assert.ok(["fail", "partial"].includes(f.status));
  assert.ok(r.idxJson && Array.isArray(r.idxJson.quotes), "--index-out must hold {quotes:[...]}");
  assert.ok(r.idxJson.quotes.some((q) => q.id === f.quote_id), `quote_id ${f.quote_id} is not in the index`);
  assert.match(quoteText(r, f.quote_id), /CONTRIBUTING/, "the quoted fact names the missing file");
  assert.ok(ids(r.json.passed).includes("S1.2"), "LICENSE item S1.2 is in passed");
  assert.deepEqual(where(r.json, "S1.2"), ["passed"]);
});

test("SKT-1 output header: tool, schema, basename-only input, standards_sha, and no full path anywhere", () => {
  const clone = cleanRepo();
  const r = ok(clone);
  assert.equal(r.json.tool, "repo-check");
  assert.equal(r.json.schema, 1);
  assert.equal(r.json.input, path.basename(clone));
  assert.match(r.json.standards_sha, /^[0-9a-f]{8,64}$/);
  for (const text of [r.out, JSON.stringify(r.idxJson), r.err]) assert.ok(!text.includes(clone) && !text.includes(os.tmpdir()), "a full path leaked into the output");
});

test("SKT-1 a clean repo has no findings and every locally checkable item passes", () => {
  const r = ok(cleanRepo());
  assert.deepEqual(r.json.findings, [], JSON.stringify(r.json.findings));
  for (const id of ["S1.2", "S1.3", "S1.4", "S1.5", "S1.6", "S2.3", "S2.4", "S2.5", "S3.1", "S3.5"]) assert.ok(ids(r.json.passed).includes(id), `${id} should pass on a clean repo; buckets: ${JSON.stringify(buckets(r.json))}`);
  assert.equal(r.json.omitted, 0);
});

test("SKT-1 empty dir and a dir with no README both exit 0, with a README finding quoting a fact", () => {
  for (const clone of [tmp(), cleanRepo({ without: ["README.md"] })]) {
    const r = ok(clone);
    const f = findingFor(r, "S1.1");
    assert.ok(f, "no README finding");
    assert.match(quoteText(r, f.quote_id), /README/);
  }
});

test("SKT-1 missing LICENSE, SECURITY and CONTRIBUTING each give one finding; the other files do not", () => {
  const r = ok(cleanRepo({ without: ["LICENSE", "SECURITY.md", "CONTRIBUTING.md"] }));
  assert.deepEqual(ids(r.json.findings).sort(), ["S1.2", "S1.3", "S1.5"]);
  for (const f of r.json.findings) assert.ok(["P0", "P1", "P2"].includes(f.severity));
});

test("SKT-1 findings carry exactly item, status, severity, quote_id, persona staff-engineer, fix; one fix of one sentence; one finding per item", () => {
  const r = ok(tmp());
  assert.ok(r.json.findings.length > 0);
  const seen = new Set();
  for (const f of r.json.findings) {
    assert.deepEqual(Object.keys(f).sort(), ["fix", "item", "persona", "quote_id", "severity", "status"]);
    assert.equal(f.persona, "staff-engineer");
    assert.match(f.item, ITEM_RE);
    assert.ok(!seen.has(f.item), `two findings for ${f.item}`); seen.add(f.item);
    assert.equal(typeof f.fix, "string"); assert.ok(f.fix.trim().length > 0);
    assert.doesNotMatch(f.fix, /\n/);
    assert.ok((f.fix.match(/[.!?](\s|$)/g) || []).length <= 1, `fix is more than one sentence: ${f.fix}`);
  }
});

test("SKT-1 repo index: ids r1..rn, unique, valid for check-stakeholder, every finding quote_id is in it", () => {
  const r = ok(tmp());
  const q = r.idxJson.quotes;
  assert.ok(q.length > 0);
  q.forEach((x, i) => { assert.equal(x.id, `r${i + 1}`); assert.match(x.id, ID_RE); assert.equal(typeof x.text, "string"); assert.ok(!/[\u0000-\u001f]/.test(x.text)); });
  for (const f of r.json.findings) assert.ok(q.some((x) => x.id === f.quote_id), `${f.quote_id} not in the index`);
});

test("SKT-1 determinism: two runs on the same input are byte-identical (stdout and index)", () => {
  const clone = cleanRepo({ without: ["SECURITY.md"] });
  const a = run(clone), b = run(clone);
  assert.equal(a.out, b.out);
  assert.equal(JSON.stringify(a.idxJson), JSON.stringify(b.idxJson));
});

test("SKT-1 --out writes the JSON to the file; a refused run leaves an existing --out file untouched", () => {
  const clone = cleanRepo();
  const dir = tmp(); const out = path.join(dir, "o.json");
  const r = run(clone, ["--out", out]); assert.equal(r.code, 0, r.err);
  assert.equal(JSON.parse(read(out)).tool, "repo-check");
  const bad = cleanRepo(); put(bad, "notes.txt", "token=" + "z".repeat(40) + "\n");
  fs.writeFileSync(out, "KEEP");
  const r2 = run(bad, ["--out", out]); assert.equal(r2.code, 1);
  assert.equal(read(out), "KEEP");
  assert.equal(fs.readdirSync(dir).length, 1, "no temp file left behind");
});

// ================================================================ SKT-2
test("SKT-2 frozen standards: all 22 items land in exactly one bucket on a clean repo", () => {
  const r = ok(cleanRepo());
  assert.equal(bullets().length, 22, "fixture shape changed");
  for (const id of ALL_ITEMS) assert.equal(where(r.json, id).length, 1, `${id}: ${where(r.json, id)}`);
  const extra = Object.values(buckets(r.json)).flat().filter((x) => ITEM_RE.test(x) && !ALL_ITEMS.includes(x));
  assert.deepEqual(extra, [], "ids that are not in the standards");
  assert.ok(!ids(r.json.findings).includes("S4.1"), "section 4 has no bullets so it yields no items");
});

test("SKT-2 one reworded bullet goes to unmapped, never passed; the other 21 items are unchanged", () => {
  const clone = cleanRepo();
  const base = ok(clone);
  const lines = read(STD).split("\n");
  const i = lines.findIndex((l) => /^- CONTRIBUTING/.test(l)); assert.ok(i > 0);
  lines[i] = "- A different sentence about how to contribute, written in other words.";
  const std2 = path.join(tmp(), "std.md"); fs.writeFileSync(std2, lines.join("\n"));
  const r = ok(clone, [], { standards: std2 });
  assert.deepEqual(where(r.json, "S1.3"), ["unmapped"]);
  for (const id of ALL_ITEMS.filter((x) => x !== "S1.3")) assert.deepEqual(where(r.json, id), where(base.json, id), `${id} changed`);
  assert.notEqual(r.json.standards_sha, base.json.standards_sha, "standards_sha must name the version judged");
});

test("SKT-2 a reworded line is never judged by the old check, even when the repo would fail it", () => {
  const clone = cleanRepo({ without: ["CONTRIBUTING.md"] });
  const lines = read(STD).split("\n");
  const i = lines.findIndex((l) => /^- CONTRIBUTING/.test(l));
  lines[i] = "- Some other wording that no check knows.";
  const std2 = path.join(tmp(), "std.md"); fs.writeFileSync(std2, lines.join("\n"));
  const r = ok(clone, [], { standards: std2 });
  assert.ok(!findingFor(r, "S1.3"), "an unmapped item must not produce a finding");
  assert.deepEqual(where(r.json, "S1.3"), ["unmapped"]);
});

test("SKT-2 one bullet removed: later ids are matched by line hash or unmapped, none judged against the wrong check", () => {
  const clone = cleanRepo({ without: ["LICENSE"] });
  const base = ok(clone);
  assert.ok(findingFor(base, "S1.2"), "baseline: LICENSE finding on S1.2");
  const lines = read(STD).split("\n");
  const i = lines.findIndex((l) => /^- LICENSE/.test(l)); assert.ok(i > 0);
  lines.splice(i, 1);
  const std2 = path.join(tmp(), "std.md"); fs.writeFileSync(std2, lines.join("\n"));
  const r = ok(clone, [], { standards: std2 });
  // New S1.2 is the CONTRIBUTING line, which this repo has. A position-based table would fail it for the missing LICENSE.
  assert.deepEqual(r.json.findings, [], `wrong-check finding: ${JSON.stringify(r.json.findings)}`);
  for (const id of ["S1.2", "S1.3", "S1.4"]) assert.ok(["passed", "unmapped"].includes(where(r.json, id)[0]), `${id}: ${where(r.json, id)}`);
});

test("SKT-2 the tool neither stores nor prints the standards wording", () => {
  const r = ok(cleanRepo({ without: ["SECURITY.md"] }));
  const hay = r.out + JSON.stringify(r.idxJson) + r.err;
  const src = [TOOL, GUARD].filter((p) => fs.existsSync(p)).map(read).join("\n");
  for (const line of bullets()) {
    const text = line.slice(2).trim();
    assert.ok(!hay.includes(text), `output holds standards wording: ${text}`);
    if (text.length >= 25) assert.ok(!src.includes(text), `tool source holds standards wording: ${text}`);
  }
});

// ================================================================ SKT-3
test("SKT-3 GitHub-only items are listed with what is missing, never passed or failed; history is not scanned", () => {
  const r = ok(cleanRepo());
  const need = (id) => (r.json.needs_github_data || []).find((x) => idOf(x) === id);
  const textOf = (x) => (typeof x === "string" ? x : JSON.stringify(x));
  const must = { "S1.7": [/description/i, /topics/i], "S1.8": [/social preview/i], "S2.2": [/branch protection/i], "S2.7": [/release/i], "S3.4": [/default branch/i] };
  for (const [id, pats] of Object.entries(must)) {
    const x = need(id); assert.ok(x, `${id} missing from needs_github_data`);
    if (typeof x === "object") assert.ok(Object.keys(x).some((k) => k !== "id" && typeof x[k] === "string" && x[k].length > 0), `${id}: say what is missing`);
    for (const p of pats) assert.match(textOf(x), p, id);
    assert.deepEqual(where(r.json, id), ["needs_github_data"], id);
  }
  assert.match(JSON.stringify(r.json.needs_human), /history not scanned/);
});

test("SKT-3 even a repo that looks perfect locally never gets a GitHub-only item marked passed", () => {
  const r = ok(cleanRepo());
  for (const id of ["S1.7", "S1.8", "S2.2", "S2.7", "S3.4"]) assert.ok(!ids(r.json.passed).includes(id) && !ids(r.json.findings).includes(id), id);
});

test("SKT-3 judgment items are under needs_human, not guessed", () => {
  const r = ok(cleanRepo());
  for (const id of ["S3.3", "S3.6", "S3.7"]) assert.ok(ids(r.json.needs_human).includes(id) || ids(r.json.unmapped).includes(id), `${id}: ${where(r.json, id)}`);
  assert.ok(ids(r.json.needs_human).length > 0);
});

// ================================================================ SKT-4 secrets and personal data stop
const SECRET_VALUES = () => ({ email: "fixture-user@notreserved.net", key: "ghp_" + "Q".repeat(36), pem: "-----BEGIN " + "RSA PRIVATE KEY-----" });
test("SKT-4 an email, a ghp_ key and a private key block in three files: exit 1, no stdout, no --out, stderr names file, line and category, never the value", () => {
  const clone = cleanRepo(); const v = SECRET_VALUES();
  put(clone, "docs/contact.md", `line one\nline two\nreach me at ${v.email} please\n`);
  put(clone, "src/config.js", `// a\n// b\n// c\nexport const t = "${v.key}";\n`);
  put(clone, "deploy/id.pem", `x\n${v.pem}\nMIIBOgIBAAJBAKj34GkxFhD90vcNLYLInFEX6Ppy1tPf9Cnzj4p4WGeKLs1Pt8Qu\n`);
  const out = path.join(tmp(), "o.json");
  const r = run(clone, ["--out", out]);
  assert.equal(r.code, 1, r.err);
  assert.equal(r.out, "", "stdout must be empty");
  assert.ok(!fs.existsSync(out), "--out must not be written");
  assert.ok(!r.idxJson, "the index must not be written either");
  const line = (name) => r.err.split("\n").find((l) => l.includes(name)) || "";
  assert.match(line("contact.md"), /\b3\b/); assert.match(line("contact.md"), /e-?mail/i);
  assert.match(line("config.js"), /\b4\b/); assert.match(line("config.js"), /key|token/i);
  assert.match(line("id.pem"), /\b2\b/); assert.match(line("id.pem"), /private key/i);
  for (const val of [v.email, v.key, v.pem, "MIIBOgIBAAJB", "fixture-user"]) assert.ok(!r.err.includes(val), `stderr echoes a matched value: ${val}`);
});

test("SKT-4 phone numbers and token/secret assignments stop the run; a 40-hex action SHA does not", () => {
  const a = cleanRepo(); put(a, "docs/call.md", "call 304-555-0142 today\n");
  const ra = run(a); assert.equal(ra.code, 1); assert.match(ra.err, /phone/i); assert.ok(!ra.err.includes("555-0142"));
  const b = cleanRepo(); put(b, "cfg.env", "api_key=" + "k9".repeat(20) + "\n");
  const rb = run(b); assert.equal(rb.code, 1); assert.match(rb.err, /key|token|secret/i); assert.ok(!rb.err.includes("k9k9k9"));
  const rc = ok(cleanRepo()); assert.equal(rc.code, 0);
});

test("SKT-4 reserved example addresses pass; --allow-email passes that one exact address and echoes it; another address does not", () => {
  const a = cleanRepo(); put(a, "docs/c.md", "write to someone@example.com or a@b.example.org\n");
  ok(a);
  const b = cleanRepo(); put(b, "docs/c.md", "write to fixture-user@notreserved.net\n");
  const r = ok(b, ["--allow-email", "fixture-user@notreserved.net"]);
  assert.ok(JSON.stringify(r.json.allowed_emails).includes("fixture-user@notreserved.net"));
  const r2 = run(b, ["--allow-email", "other@notreserved.net"]); assert.equal(r2.code, 1);
  assert.equal(r2.out, "");
});

// STK-PS-R10 reversed the old fail-open: a file the tool cannot read (binary, over 1 MB) refuses the run unless --allow-unscanned.
test("SKT-4 a binary file and a file over 1 MB the tool cannot scan refuse the run by name; --allow-unscanned lists them and never prints their values", () => {
  const clone = cleanRepo(); const v = SECRET_VALUES();
  put(clone, "blob.bin", `\u0000${v.key}\u0000${v.email}`);
  put(clone, "big.txt", "a".repeat(1048577) + v.email);
  const r = run(clone); assert.equal(r.code, 1); assert.equal(r.out, ""); assert.match(r.err, /blob\.bin/); assert.match(r.err, /big\.txt/);
  const a = ok(clone, ["--allow-unscanned"]);
  assert.equal(a.json.unscanned.length, 2);
  assert.ok(!(a.out + r.err).includes(v.key) && !(a.out + r.err).includes(v.email));
});

// ================================================================ SKT-5 cap of 10
const BARE_FAILS = (r) => r.json.findings.length + r.json.omitted;
test("SKT-5 a repo failing more than 10 items: findings holds exactly 10 ranked by severity then id, the rest counted in omitted", () => {
  const r = ok(tmp());
  assert.equal(r.json.findings.length, 10, `bare repo should fail at least 11 local items; got ${BARE_FAILS(r)}`);
  assert.ok(Number.isInteger(r.json.omitted) && r.json.omitted >= 1);
  const rank = (f) => ({ P0: 0, P1: 1, P2: 2 })[f.severity];
  const key = (id) => id.slice(1).split(".").map(Number);
  for (let i = 1; i < r.json.findings.length; i++) {
    const a = r.json.findings[i - 1], b = r.json.findings[i];
    const [ka, kb] = [key(a.item), key(b.item)];
    assert.ok(rank(a) < rank(b) || (rank(a) === rank(b) && (ka[0] < kb[0] || (ka[0] === kb[0] && ka[1] < kb[1]))), `not ranked: ${a.severity} ${a.item} before ${b.severity} ${b.item}`);
  }
  assert.deepEqual(ids(ok(tmp()).json.findings), ids(r.json.findings), "same input, same top 10");
});

test("SKT-5 a repo failing 10 or fewer items: omitted is 0 and every failing item has a finding", () => {
  const r = ok(cleanRepo({ without: ["LICENSE", "SECURITY.md", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md"] }));
  assert.equal(r.json.findings.length, 4);
  assert.equal(r.json.omitted, 0);
});

test("SKT-5 SPEC GAP (QA-R1): the spec's 14-failing-items case cannot be reached with the listed local checks; this pins the cap behaviour at the real maximum instead", () => {
  const r = ok(tmp());
  assert.equal(r.json.findings.length + r.json.omitted, BARE_FAILS(r));
  assert.ok(BARE_FAILS(r) >= 11, "the listed local checks must be able to fail 11 or more items on an empty repo");
});

// ================================================================ SKT-6 passes check-stakeholder
const personaBlock = (lines) => `\`\`\`stakeholder\nverdict: fix-first\nround: 1\nsubagents: 1\n${lines.join("\n")}\n\`\`\`\n`;
function toReview(r, personaMax = 10) {
  const lines = r.json.findings.slice(0, personaMax).map((f) => JSON.stringify({ persona: f.persona, quote_id: f.quote_id, severity: f.severity, fix: f.fix }));
  const p = path.join(tmp(), "review.md"); fs.writeFileSync(p, personaBlock(lines)); return p;
}
const checker = (review, index) => { const r = spawnSync("node", [CHECKER, review, "--index", index], { encoding: "utf8", cwd: ROOT, timeout: 30000 }); return { code: r.status, err: r.stderr || "", out: r.stdout || "" }; };

test("SKT-6 findings as four-field JSON lines pass check-stakeholder with the --index-out file; removing one fact from the index fails and names it", () => {
  const r = ok(cleanRepo({ without: ["CONTRIBUTING.md", "SECURITY.md"] }));
  assert.ok(r.json.findings.length >= 2);
  const review = toReview(r);
  const good = checker(review, r.idx); assert.equal(good.code, 0, good.err + good.out);
  const drop = r.json.findings[0].quote_id;
  const idx2 = path.join(tmp(), "i.json");
  fs.writeFileSync(idx2, JSON.stringify({ quotes: r.idxJson.quotes.filter((q) => q.id !== drop) }));
  const bad = checker(review, idx2); assert.equal(bad.code, 1);
  assert.ok(bad.err.includes(drop), bad.err);
});

test("SKT-6 a bare repo's 10 findings (the cap) pass check-stakeholder in one block", () => {
  const r = ok(tmp());
  const g = checker(toReview(r), r.idx); assert.equal(g.code, 0, g.err);
});

test("SKT-6 output ids are valid for check-stakeholder: quote ids match the id rule and are unique", () => {
  const r = ok(tmp());
  const seen = new Set();
  for (const q of r.idxJson.quotes) { assert.match(q.id, ID_RE); assert.ok(!seen.has(q.id)); seen.add(q.id); }
  for (const f of r.json.findings) assert.match(f.quote_id, ID_RE);
});

// ================================================================ SKT-7 pinning and permissions
const wf = (steps, perms = true) => `name: ci\non: [push]\n${perms ? "permissions:\n  contents: read\n" : ""}jobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n${steps.map((s) => `      - uses: ${s}`).join("\n")}\n`;
test("SKT-7 one unpinned step (@main) and one SHA-pinned: pinning item fails, the fact quotes the unpinned line only", () => {
  const clone = cleanRepo(); put(clone, ".github/workflows/ci.yml", wf(["actions/checkout@main", `actions/setup-node@${SHA}`]));
  const r = ok(clone);
  const f = findingFor(r, "S2.3"); assert.ok(f, JSON.stringify(r.json.findings));
  assert.equal(f.status === "fail" || f.status === "partial", true);
  const t = quoteText(r, f.quote_id);
  assert.match(t, /actions\/checkout@main/);
  assert.ok(!t.includes(SHA) && !t.includes("setup-node"), `the pinned step must not be quoted: ${t}`);
});

test("SKT-7 @master and a bare action with no ref also fail; a full version tag and a SHA pass", () => {
  for (const bad of ["actions/checkout@master", "actions/checkout"]) {
    const clone = cleanRepo(); put(clone, ".github/workflows/ci.yml", wf([bad]));
    assert.ok(findingFor(ok(clone), "S2.3"), bad);
  }
  const clone = cleanRepo(); put(clone, ".github/workflows/ci.yml", wf(["actions/checkout@v4.1.1", `actions/setup-node@${SHA}`]));
  const r = ok(clone); assert.ok(!findingFor(r, "S2.3")); assert.ok(ids(r.json.passed).includes("S2.3"));
});

test("SKT-7 a workflow with no permissions key fails the permissions item; with one it passes", () => {
  const clone = cleanRepo(); put(clone, ".github/workflows/ci.yml", wf([`actions/checkout@${SHA}`], false));
  const r = ok(clone); const f = findingFor(r, "S2.5"); assert.ok(f, JSON.stringify(r.json.findings));
  assert.match(quoteText(r, f.quote_id), /permissions/i);
  assert.ok(ids(ok(cleanRepo()).json.passed).includes("S2.5"));
});

test("SKT-7 a missing lockfile fails the dependency item; no workflow at all and no Dependabot are findings", () => {
  const r = ok(cleanRepo({ without: ["package-lock.json"] })); assert.ok(findingFor(r, "S2.3"));
  const r2 = ok(cleanRepo({ without: [".github/dependabot.yml"] })); assert.ok(findingFor(r2, "S2.4"));
  const r3 = ok(cleanRepo({ without: [".github/workflows"] })); assert.ok(findingFor(r3, "S2.1") || findingFor(r3, "S2.5") || findingFor(r3, "S3.5"), JSON.stringify(r3.json.findings));
});

test("SKT-7 a README badge for a workflow that does not exist is a finding; for one that exists it is not", () => {
  const clone = cleanRepo(); put(clone, "README.md", "# Demo\n\n[![ci](https://github.com/o/r/actions/workflows/missing.yml/badge.svg)](https://github.com/o/r/actions/workflows/missing.yml)\n");
  const r = ok(clone); const f = findingFor(r, "S3.5"); assert.ok(f, JSON.stringify(r.json.findings));
  assert.match(quoteText(r, f.quote_id), /missing\.yml/);
  assert.ok(ids(ok(cleanRepo()).json.passed).includes("S3.5"));
});

test("SKT-7 root clutter (.DS_Store, a HANDOFF file at the root, a file over 1 MB) is a finding on S3.1 or S3.2", () => {
  const a = cleanRepo(); put(a, ".DS_Store", "x");
  const b = cleanRepo(); put(b, "HANDOFF.md", "notes\n");
  for (const c of [a, b]) { const r = ok(c); assert.ok(findingFor(r, "S3.1") || findingFor(r, "S3.2"), JSON.stringify(r.json.findings)); }
  const c = cleanRepo(); put(c, "assets/huge.png.txt", "a".repeat(1048577));
  const r = ok(c, ["--allow-unscanned"]); assert.ok(findingFor(r, "S3.2") || findingFor(r, "S3.1"));
});

// ================================================================ SKT-8 safe walk, one bad item never takes the run down
const skippedText = (r) => JSON.stringify(r.json.skipped || []);
test("SKT-8 symlink out of the root, binary, unreadable workflow and 1 MB+1 file: none read or followed, each skipped with a reason, other checks still run", () => {
  const clone = cleanRepo(); const outside = tmp(); const v = SECRET_VALUES();
  const secretFile = put(outside, "secret.txt", `${v.key}\n`);
  fs.symlinkSync(secretFile, path.join(clone, "link-to-secret.txt"));
  put(clone, "data.bin", "\u0000\u0001binary");
  fs.mkdirSync(path.join(clone, ".github", "workflows", "broken.yml"));
  put(clone, "big.json", "a".repeat(1048577));
  const r = ok(clone, ["--allow-unscanned"]); // exit 0 proves the outside secret was never read
  const s = skippedText(r) + JSON.stringify(r.json.unscanned || []);
  for (const name of ["link-to-secret.txt", "data.bin", "broken.yml", "big.json"]) {
    const e = [...(r.json.skipped || []), ...(r.json.unscanned || [])].find((x) => JSON.stringify(x).includes(name));
    assert.ok(e, `${name} is not under skipped: ${s}`);
    if (typeof e === "object") assert.ok(Object.entries(e).some(([k, val]) => !/file|path|name/.test(k) && typeof val === "string" && val.length > 0), `${name}: no reason given`);
  }
  assert.ok(!s.includes(outside) && !s.includes(clone), "skipped must not hold full paths");
  assert.ok(ids(r.json.passed).includes("S1.2"), "the other checks still produce results");
  assert.ok(r.json.passed.length > 3);
});

test("SKT-8 a symlink named LICENSE that points outside the root is not counted as the license", () => {
  const clone = cleanRepo({ without: ["LICENSE"] });
  const outside = put(tmp(), "LICENSE", "MIT\n");
  fs.symlinkSync(outside, path.join(clone, "LICENSE"));
  const r = ok(clone);
  assert.ok(!ids(r.json.passed).includes("S1.2"), "a symlinked LICENSE must not pass");
  assert.ok(JSON.stringify(r.json.skipped).includes("LICENSE"));
});

test("SKT-8 a symlinked directory is not walked", () => {
  const clone = cleanRepo(); const outside = tmp(); const v = SECRET_VALUES();
  put(outside, "inner/leak.txt", `${v.key}\n`);
  fs.symlinkSync(outside, path.join(clone, "linkdir"));
  ok(clone);
});

// STK-PS-R10: only a top-level .git is skipped; node_modules (top-level or nested) is scanned.
test("SKT-8 a top-level .git is not read (and is reported); node_modules is scanned", () => {
  const clone = cleanRepo(); const v = SECRET_VALUES();
  put(clone, ".git/config", `[x]\n token = ${v.key}\n`);
  ok(clone);
  put(clone, "node_modules/p/index.js", `// ${v.email}\n`);
  const r = run(clone); assert.equal(r.code, 1); assert.match(r.err, /node_modules\/p\/index\.js:1:/);
});

test("SKT-8 more than 5000 files walked is refused, not silently truncated", () => {
  const clone = cleanRepo(); const d = path.join(clone, "many"); fs.mkdirSync(d);
  for (let i = 0; i < 5001; i++) fs.writeFileSync(path.join(d, `f${i}.txt`), "x");
  const r = run(clone); assert.equal(r.code, 1); assert.equal(r.out, "");
  assert.match(r.err, /too many|cap|5000/i);
});

test("SKT-8 outside this repo --standards is required: exit 2 with a reason; in this repo the default is docs/repo-standards.md", () => {
  assert.ok(fs.existsSync(TOOL), "repo-check.mjs does not exist");
  const alone = path.join(tmp(), "plugins", "stakeholder"); fs.cpSync(PLUG, alone, { recursive: true });
  const r = run(cleanRepo(), [], { standards: null, tool: path.join(alone, "tools", "repo-check.mjs") });
  assert.equal(r.code, 2, r.err); assert.match(r.err, /--standards/);
  assert.equal(r.out, "");
  const inRepo = run(cleanRepo(), [], { standards: null }); assert.equal(inRepo.code, 0, inRepo.err);
});

test("SKT-8 usage and bad input: no args exits 2; a missing dir, a file, a missing standards file exit 1 or 2 with no stack trace", () => {
  const cases = [[], [path.join(tmp(), "nope")], [put(tmp(), "f.txt")]];
  assert.ok(fs.existsSync(TOOL), "repo-check.mjs does not exist");
  for (const args of cases) {
    const r = spawnSync("node", [TOOL, ...args, "--standards", STD], { encoding: "utf8", cwd: ROOT });
    assert.ok([1, 2].includes(r.status), `${JSON.stringify(args)}: exit ${r.status}`);
    assert.doesNotMatch(r.stderr, /node:internal|\n\s+at .*:\d+:\d+/, r.stderr);
    assert.ok(r.stderr.trim().length > 0, "a reason on stderr");
  }
  const r = run(cleanRepo(), [], { standards: path.join(tmp(), "none.md") }); assert.ok([1, 2].includes(r.code)); assert.equal(r.out, "");
});

test("SKT-8 control characters in a file name are escaped in stderr and output", () => {
  const clone = cleanRepo(); const v = SECRET_VALUES();
  put(clone, "bad\u001b[31mname.md", `x\n${v.email}\n`);
  const r = run(clone); assert.equal(r.code, 1);
  assert.doesNotMatch(r.err, /[\u0000-\u0009\u000b-\u001f\u007f]/, "raw control character in stderr");
});

// ================================================================ SKT-28 shared guard, no network, no execution
test("SKT-28 repo-check imports lib/guard.mjs, and the secret patterns appear in no other file under plugins/stakeholder/tools", () => {
  assert.ok(fs.existsSync(GUARD), "plugins/stakeholder/tools/lib/guard.mjs does not exist");
  assert.match(read(TOOL), /lib\/guard\.mjs/);
  const files = []; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : files.push(p); } }; walk(TOOLS);
  for (const f of files.filter((x) => x !== GUARD)) {
    const t = read(f);
    for (const p of ["ghp_", "github_pat_", "AKIA", "PRIVATE KEY", "xox"]) assert.ok(!t.includes(p), `${path.relative(ROOT, f)} holds secret pattern ${p}`);
  }
  for (const p of ["ghp_", "github_pat_", "AKIA", "PRIVATE KEY"]) assert.ok(read(GUARD).includes(p), `guard.mjs should hold ${p}`);
});

test("SKT-28 no network and no execution: the tool and guard import no network or process module and call no fetch or eval", () => {
  const src = [TOOL, GUARD].map((p) => { assert.ok(fs.existsSync(p), `${p} missing`); return read(p); }).join("\n");
  for (const m of ["http", "https", "http2", "net", "tls", "dgram", "dns", "child_process", "worker_threads", "vm"]) assert.doesNotMatch(src, new RegExp(`(from|import\\(|require\\()\\s*["'](node:)?${m}["']`), `imports ${m}`);
  assert.doesNotMatch(src, /\bfetch\s*\(|XMLHttpRequest|WebSocket|\beval\s*\(|new Function\s*\(|Date\.now|new Date\(/);
});

test("SKT-28 a nonexistent input never throws a stack trace (covered above) and the Node permission model confirms no write outside --out/--index-out", () => {
  const clone = cleanRepo(); const dir = tmp();
  const r = spawnSync("node", ["--permission", `--allow-fs-read=*`, `--allow-fs-write=${dir}`, TOOL, clone, "--standards", STD, "--index-out", path.join(dir, "i.json"), "--out", path.join(dir, "o.json")], { encoding: "utf8", cwd: ROOT, timeout: 30000 });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(read(path.join(dir, "o.json"))).tool, "repo-check");
});

// ================================================================ SKT-29 existing checks untouched
test("SKT-29 (guard) sync-tools.sh copies nothing from plugins/stakeholder", () => {
  const dest = tmp();
  const r = spawnSync("bash", [path.join(ROOT, "scripts", "sync-tools.sh"), dest], { encoding: "utf8" }); assert.equal(r.status, 0, r.stderr);
  const all = fs.readdirSync(path.join(dest, "scripts"));
  for (const f of all) assert.ok(!/repo-check|^guard|check-stakeholder/.test(f), f);
});

// ================================================================ SKT-30 docs name the tool (repo-check part)
test("SKT-30 plugin README, skill and agent file each name tools/repo-check.mjs; the README example runs from the repo root", () => {
  for (const f of ["README.md", "skills/stakeholder/SKILL.md", "agents/stakeholder.md"]) assert.match(read(path.join(PLUG, f)), /plugins\/stakeholder\/tools\/repo-check\.mjs|tools\/repo-check\.mjs/, `${f} does not name repo-check`);
  const readme = read(path.join(PLUG, "README.md"));
  const cmd = readme.split("\n").map((l) => l.trim()).find((l) => /^node plugins\/stakeholder\/tools\/repo-check\.mjs\s/.test(l));
  assert.ok(cmd, "README has no example line starting `node plugins/stakeholder/tools/repo-check.mjs`");
  const args = cmd.split(/\s+/).slice(1);
  const r = spawnSync("node", args, { encoding: "utf8", cwd: ROOT, timeout: 30000 });
  assert.equal(r.status, 0, `README example exits ${r.status}\n${r.stderr}`);
  assert.doesNotMatch(readme, /no repo check/i, "README still says there is no repo check");
});
