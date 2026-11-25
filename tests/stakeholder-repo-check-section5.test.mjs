// Failing-first tests (qa-tdd) for repo-check M2.1 follow-up: section 5 of docs/repo-standards.md (settings, the
// 2026-11-25 audit, Linux Foundation and Syracuse OSPO additions) must map to local checks, needs_github_data
// or needs_human, never to `unmapped`. Reference: the 34-item audit script (SUPPORT, CODEOWN, CHANGELOG, AIDISC,
// CODEQL, LICLINE are file/content checks; DESC, TOPICS, BRANCHPROT, DELBR, SECSCAN, PUSHPROT, DEPSEC, RELEASES are settings).
// Ids are derived the way the tool derives them (S<section>.<bullet position>) by finding the bullet in the REAL
// docs/repo-standards.md by its opening words, so a later doc edit that shifts numbers does not break these tests.
// Fixtures are built in temp dirs: no network, no real repos, no personal data.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS = path.join(ROOT, "plugins", "stakeholder", "tools");
const TOOL = path.join(TOOLS, "repo-check.mjs");
const CHECKER = path.join(TOOLS, "check-stakeholder.mjs");
const STD = path.join(ROOT, "docs", "repo-standards.md");

let n = 0;
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), `s5-${process.pid}-${n++}-`));
const put = (root, rel, text = "x\n") => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); return p; };

// id of the bullet in section 5 whose text starts with `start`
function idFor(start) {
  let section = null, k = 0, found = null;
  for (const line of fs.readFileSync(STD, "utf8").split("\n")) {
    if (/^## /.test(line)) { const m = /^## (\d+)\./.exec(line); section = m ? m[1] : null; k = 0; continue; }
    if (section && line.startsWith("- ")) { k++; if (section === "5" && line.slice(2).startsWith(start)) found = `S5.${k}`; }
  }
  assert.ok(found, `no section 5 bullet starts with "${start}"`);
  return found;
}
const ITEM = {
  support: () => idFor("SUPPORT.md saying where to get help"),
  codeowners: () => idFor("CODEOWNERS plus branch protection"),
  licenseLine: () => idFor("A license line and badge in the README"),
  codeql: () => idFor("Code scanning (CodeQL)"),
  aiDisclosure: () => idFor("AI disclosure"),
  changelog: () => idFor("CHANGELOG.md (Added"),
  descTopics: () => idFor("Description and 3 to 6 topics"),
  branchProt: () => idFor("Branch protection or a ruleset"),
  deleteBranch: () => idFor("Automatically delete head branches"),
  secrets: () => idFor("Secret scanning and push protection"),
};

const SHA = "a".repeat(40);
const CI_OK = `name: ci\non: [push, pull_request]\npermissions:\n  contents: read\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@${SHA}\n`;
const CODEQL = `name: codeql\non: [push]\npermissions:\n  contents: read\njobs:\n  analyze:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: github/codeql-action/init@${SHA}\n`;
const README_FULL = "# Demo\n\nWhat it is and why.\n\n[![ci](https://github.com/o/r/actions/workflows/ci.yml/badge.svg)](https://github.com/o/r/actions/workflows/ci.yml)\n\n## AI use\nBuilt with Claude Code; AI-assisted, and a human reviewed every change.\n\n## License\nReleased under the MIT License.\n";
const README_PLAIN = "# Demo\n\nWhat it is and why.\n\n[![ci](https://github.com/o/r/actions/workflows/ci.yml/badge.svg)](https://github.com/o/r/actions/workflows/ci.yml)\n";

// Every section 5 file-checkable item passes in this repo; `without` removes files, `readme` swaps the README.
function repo({ without = [], readme = README_FULL } = {}) {
  const r = tmp();
  put(r, "README.md", readme);
  put(r, "LICENSE", "MIT License\n");
  put(r, "CONTRIBUTING.md"); put(r, "CODE_OF_CONDUCT.md"); put(r, "SECURITY.md");
  put(r, "SUPPORT.md", "Ask in Discussions.\n");
  put(r, "CHANGELOG.md", "# Changelog\n\n## 0.1.0\n### Added\n- First release\n");
  put(r, ".github/CODEOWNERS", "* @example-owner\n");
  put(r, ".github/ISSUE_TEMPLATE/bug.md"); put(r, ".github/pull_request_template.md");
  put(r, ".github/workflows/ci.yml", CI_OK);
  put(r, ".github/workflows/codeql.yml", CODEQL);
  put(r, ".github/dependabot.yml", "version: 2\nupdates: []\n");
  put(r, "package-lock.json", "{}\n");
  for (const f of without) fs.rmSync(path.join(r, f), { recursive: true, force: true });
  return r;
}

function run(clone) {
  assert.ok(fs.existsSync(TOOL), "repo-check.mjs does not exist");
  const idx = path.join(tmp(), "index.json");
  const r = spawnSync("node", [TOOL, clone, "--standards", STD, "--index-out", idx], { encoding: "utf8", cwd: ROOT, timeout: 30000 });
  assert.equal(r.status, 0, r.stderr);
  return { json: JSON.parse(r.stdout), idx };
}
const idOf = (x) => (typeof x === "string" ? x : x.item || x.id);
const bucket = (j, id) => ["findings", "passed", "needs_github_data", "needs_human", "unmapped"].filter((b) => (j[b] || []).some((x) => idOf(x) === id));

test("S5-1 the real standards file has no unmapped section 5 item left", () => {
  const { json } = run(repo());
  const un = json.unmapped.filter((i) => i.startsWith("S5."));
  assert.deepEqual(un, [], `unmapped: ${un.join(", ")}`);
});

test("S5-2 every item of the real standards file lands in exactly one bucket", () => {
  const { json } = run(repo({ without: ["SUPPORT.md"] }));
  const seen = new Map();
  for (const b of ["findings", "passed", "needs_github_data", "needs_human", "unmapped"]) for (const x of json[b]) seen.set(idOf(x), (seen.get(idOf(x)) || 0) + 1);
  for (const [id, c] of seen) assert.equal(c, 1, `${id} in ${c} buckets`);
  assert.equal(json.unmapped.length, 0, `unmapped: ${json.unmapped.join(", ")}`);
});

// ---- file and content checks: allowed person (present passes) and the excluded case (absent fails)
const FILE_CASES = [
  ["SUPPORT.md present", "support", ["SUPPORT.md"]],
  ["CODEOWNERS present", "codeowners", [".github/CODEOWNERS"]],
  ["CHANGELOG.md present", "changelog", ["CHANGELOG.md"]],
  ["CodeQL workflow present", "codeql", [".github/workflows/codeql.yml"]],
];
for (const [title, key, rm] of FILE_CASES) {
  test(`S5-3 ${title}: item passes when present, is a finding naming the file when absent`, () => {
    const id = ITEM[key]();
    const good = run(repo()).json;
    assert.deepEqual(bucket(good, id), ["passed"], `${id} with the file present`);
    const bad = run(repo({ without: rm })).json;
    assert.deepEqual(bucket(bad, id), ["findings"], `${id} with the file absent`);
    const f = bad.findings.find((x) => x.item === id);
    assert.ok(f.fix && f.fix.length > 10 && f.severity && f.quote_id);
  });
}

test("S5-4 README AI-use disclosure: phrases like 'built with Claude Code' or 'AI-assisted' pass; a README without them fails", () => {
  const id = ITEM.aiDisclosure();
  for (const phrase of ["Built with Claude Code.", "This project is AI-assisted.", "AI-built, human reviewed."]) {
    assert.deepEqual(bucket(run(repo({ readme: README_PLAIN + `\n${phrase}\n` })).json, id), ["passed"], phrase);
  }
  const bad = run(repo({ readme: README_PLAIN })).json;
  assert.deepEqual(bucket(bad, id), ["findings"]);
});

test("S5-5 README license line: a line naming the license passes; none fails", () => {
  const id = ITEM.licenseLine();
  assert.deepEqual(bucket(run(repo({ readme: README_PLAIN + "\nLicensed under the MIT License.\n" })).json, id), ["passed"]);
  assert.deepEqual(bucket(run(repo({ readme: README_PLAIN })).json, id), ["findings"]);
});

test("S5-6 a fully equipped clone passes every file-checkable section 5 item", () => {
  const j = run(repo()).json;
  for (const k of ["support", "codeowners", "changelog", "codeql", "aiDisclosure", "licenseLine"]) assert.deepEqual(bucket(j, ITEM[k]()), ["passed"], k);
});

// ---- settings: never judged from the clone
test("S5-7 settings-only items are needs_github_data, with a stated reason, in a clean and in a bare clone", () => {
  for (const clone of [repo(), tmp()]) {
    const j = run(clone).json;
    for (const k of ["descTopics", "branchProt", "deleteBranch", "secrets"]) {
      const id = ITEM[k]();
      assert.deepEqual(bucket(j, id), ["needs_github_data"], `${k} ${id}`);
      const e = j.needs_github_data.find((x) => x.id === id);
      assert.ok(e.missing && e.missing.length > 5, `${id} has no reason`);
    }
    assert.ok(bucket(j, "S2.7").includes("needs_github_data"), "releases (S2.7) stays under needs_github_data");
  }
});

test("S5-8 the secret scanning item names secret scanning, push protection and Dependabot security updates", () => {
  const j = run(repo()).json;
  const e = j.needs_github_data.find((x) => x.id === ITEM.secrets());
  assert.ok(/secret scanning/i.test(e.missing) && /push protection/i.test(e.missing) && /dependabot/i.test(e.missing), e.missing);
});

// ---- the tool must not store the new wording, and the findings must still pass check-stakeholder
test("S5-9 repo-check source holds no wording of the new section 5 lines (ids are hashes)", () => {
  const src = fs.readFileSync(TOOL, "utf8");
  for (const s of ["SUPPORT.md saying where", "AI disclosure: say in the README", "CHANGELOG.md (Added", "Code scanning (CodeQL)"]) assert.ok(!src.includes(s), s);
});

test("S5-10 findings for the new items pass check-stakeholder with the --index-out file", () => {
  const clone = repo({ without: ["SUPPORT.md", ".github/CODEOWNERS", "CHANGELOG.md", ".github/workflows/codeql.yml"], readme: README_PLAIN });
  const { json, idx } = run(clone);
  const want = [ITEM.support(), ITEM.codeowners(), ITEM.changelog(), ITEM.codeql(), ITEM.aiDisclosure(), ITEM.licenseLine()];
  for (const id of want) assert.ok(json.findings.some((f) => f.item === id), `no finding for ${id}`);
  const lines = json.findings.map((f) => JSON.stringify({ persona: f.persona, quote_id: f.quote_id, severity: f.severity, fix: f.fix }));
  const review = path.join(tmp(), "review.md");
  fs.writeFileSync(review, `\`\`\`stakeholder\nverdict: fix-first\nround: 1\nsubagents: 1\n${lines.join("\n")}\n\`\`\`\n`);
  const r = spawnSync("node", [CHECKER, review, "--index", idx], { encoding: "utf8", cwd: ROOT, timeout: 30000 });
  assert.equal(r.status, 0, (r.stderr || "") + (r.stdout || ""));
});
