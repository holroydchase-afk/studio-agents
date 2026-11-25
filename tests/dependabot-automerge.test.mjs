// DEPAUTO: tests for templates/security/dependabot-automerge.yml (PR #162).
// Dependabot patch/minor auto-merge; majors and unknown update types stay manual.
// YAML is checked with plain text/regex, no dependencies.
// Run: node --test tests/dependabot-automerge.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = "templates/security/dependabot-automerge.yml";
const DEST = ".github/workflows/dependabot-automerge.yml";
const yml = readFileSync(join(root, SRC), "utf8");
const code = yml.split("\n").filter((l) => !l.trim().startsWith("#")).join("\n");
const header = yml.split("\n").filter((l) => l.startsWith("#")).join("\n");

// The `if:` of the step that runs `gh pr merge`.
function mergeCondition() {
  const steps = code.split(/\n\s*- (?=id:|if:|name:|uses:|run:)/);
  const step = steps.find((s) => /gh pr merge/.test(s));
  assert.ok(step, "a step runs `gh pr merge`");
  const m = step.match(/(?:^|\n)\s*(?:- )?if:\s*(.+)/);
  assert.ok(m, "the merge step has its own `if:` guard");
  return m[1].trim().replace(/^\$\{\{\s*|\s*\}\}$/g, "");
}
// Tiny evaluator for == / != / || / && over the update-type output.
function wouldMerge(updateType) {
  const expr = mergeCondition()
    .replace(/steps\.meta\.outputs\.update-type/g, "UT")
    .replace(/\bUT\b/g, JSON.stringify(updateType))
    .replace(/'([^']*)'/g, (_, s) => JSON.stringify(s));
  assert.match(expr, /^[\w"\-:.\s=!|&()]+$/, "guard uses only simple comparisons");
  return Boolean(new Function(`return (${expr});`)());
}

test("DEPAUTO-1 job runs only for dependabot[bot]", () => {
  assert.match(code, /jobs:[\s\S]*?automerge:[\s\S]*?\n\s+if:\s*github\.actor == 'dependabot\[bot\]'/);
});

test("DEPAUTO-2 permissions are explicit and least privilege", () => {
  const m = code.match(/\npermissions:\n((?:[ \t]+\S.*\n?)+)/);
  assert.ok(m, "top-level permissions block");
  const perms = Object.fromEntries(m[1].trim().split("\n").map((l) => l.trim().split(/:\s*/)));
  assert.deepEqual(perms, { contents: "write", "pull-requests": "write" });
  assert.doesNotMatch(code, /permissions:\s*write-all/);
});

test("DEPAUTO-3 never uses pull_request_target", () => {
  assert.doesNotMatch(code, /pull_request_target/);
  assert.match(code, /^on:\s*pull_request\s*$/m);
});

test("DEPAUTO-4 merge guard is an allow-list: only patch and minor merge", () => {
  const table = [
    ["version-update:semver-patch", true],
    ["version-update:semver-minor", true],
    ["version-update:semver-major", false],
    ["", false],
    ["unknown", false],
    ["version-update:semver-prerelease", false],
  ];
  for (const [type, want] of table) assert.equal(wouldMerge(type), want, `update-type "${type}" merge=${want}`);
});

test("DEPAUTO-5 merge guard does not rely on negation (!=)", () => {
  assert.doesNotMatch(mergeCondition(), /!=/);
});

test("DEPAUTO-6 fetch-metadata is pinned to a version tag at least", () => {
  const uses = [...code.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
  assert.ok(uses.some((u) => u.startsWith("dependabot/fetch-metadata@")));
  for (const u of uses) assert.match(u, /@(v\d+(\.\d+)*|[0-9a-f]{40})$/, `${u} pinned`);
  assert.doesNotMatch(code, /@(main|master|latest)\b/);
});

test("DEPAUTO-7 header names both per-repo prerequisites", () => {
  assert.match(header, /Allow auto-merge/i);
  assert.match(header, /required (status )?checks/i);
});

test("DEPAUTO-8 install-security.sh installs it, keeps an existing one", () => {
  const repo = mkdtempSync(join(tmpdir(), "depauto-"));
  const run = () => spawnSync("bash", [join(root, "scripts/install-security.sh"), repo], { encoding: "utf8" });
  let r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(repo, DEST)), `${DEST} installed`);
  assert.equal(readFileSync(join(repo, DEST), "utf8"), yml);
  assert.match(r.stdout, /installed \.github\/workflows\/dependabot-automerge\.yml/);
  writeFileSync(join(repo, DEST), "# mine\n");
  r = run();
  assert.equal(readFileSync(join(repo, DEST), "utf8"), "# mine\n", "existing file kept");
  assert.match(r.stdout, /kept existing \.github\/workflows\/dependabot-automerge\.yml/);
});

test("DEPAUTO-9 manifest lists it as a seed entry to the workflow path", () => {
  const m = JSON.parse(readFileSync(join(root, "templates/manifest.json"), "utf8"));
  const e = m.entries.find((x) => x.src === SRC);
  assert.ok(e, `manifest covers ${SRC}`);
  assert.equal(e.dest, DEST);
  assert.equal(e.policy, "seed");
});

test("DEPAUTO-10 README or session rules mention it", () => {
  const docs = ["README.md", "docs/session-rules.md"].map((f) => readFileSync(join(root, f), "utf8")).join("\n");
  assert.match(docs, /dependabot-automerge/);
});
