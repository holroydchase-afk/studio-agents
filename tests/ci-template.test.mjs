// CIT-1..10: the shared CI template (docs/product/SPEC-CI-TEMPLATE.md).
// Written first (red): tools/check-actions-pinned.mjs, templates/ci/*, scripts/install-ci.sh do not exist yet.
// Checker fixtures live in temp dirs. YAML is parsed with python3 + PyYAML when present, else a line check.
// Run: node --test tests/ci-template.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, existsSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECKER = join(root, "tools/check-actions-pinned.mjs");
const CI_DIR = join(root, "templates/ci");
const SHA = "a".repeat(40);
const SHA2 = "0123456789abcdef0123456789abcdef01234567";

function checker(...args) {
  assert.ok(existsSync(CHECKER), "tools/check-actions-pinned.mjs does not exist yet");
  return spawnSync("node", [CHECKER, ...args], { encoding: "utf8" });
}
function tmp(prefix = "cit-") {
  return mkdtempSync(join(tmpdir(), prefix));
}
function wf(dir, name, body) {
  mkdirSync(dir, { recursive: true });
  const f = join(dir, name);
  writeFileSync(f, body);
  return f;
}
const read = (p) => {
  assert.ok(existsSync(p), `${relative(root, p)} does not exist yet`);
  return readFileSync(p, "utf8");
};
function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (e === "node_modules") continue;
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.ya?ml$/.test(e)) out.push(p);
  }
  return out;
}

test("CIT-1 checker passes SHA pins (with or without comment) and ./local actions", () => {
  const d = tmp();
  const f = wf(d, "ok.yml", [
    "name: ok",
    "on: push",
    "jobs:",
    "  a:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    `      - uses: actions/checkout@${SHA} # v4`,
    `      - uses: actions/setup-node@${SHA2}`,
    "      - uses: ./.github/actions/mine",
    "      - uses: ./local-action",
    "",
  ].join("\n"));
  const r = checker(f);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("CIT-2 checker fails on @v4, @main, a short SHA and a branch name, naming file and line", () => {
  const d = tmp();
  const f = wf(d, "bad.yml", [
    "name: bad", //                                  1
    "on: push", //                                   2
    "jobs:", //                                      3
    "  a:", //                                       4
    "    runs-on: ubuntu-latest", //                  5
    "    steps:", //                                  6
    "      - uses: actions/checkout@v4", //           7
    "      - uses: actions/setup-node@main", //       8
    "      - uses: actions/cache@abc1234", //         9
    "      - uses: some/action@feature/branch-x", // 10
    `      - uses: actions/ok@${SHA}`, //            11
    "",
  ].join("\n"));
  const r = checker(f);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  const out = r.stdout + r.stderr;
  for (const [line, uses] of [[7, "actions/checkout@v4"], [8, "actions/setup-node@main"], [9, "actions/cache@abc1234"], [10, "some/action@feature/branch-x"]]) {
    const hit = out.split("\n").find((l) => l.includes(uses));
    assert.ok(hit, `offender ${uses} is listed`);
    assert.match(hit, /bad\.yml/, `${uses}: names the file`);
    assert.match(hit, new RegExp(`:${line}\\b`), `${uses}: names line ${line}`);
  }
  assert.ok(!out.includes(`actions/ok@${SHA}`), "a pinned action is not listed");
});

test("CIT-2 a 39-char and a 41-char hex ref are not full SHAs", () => {
  const d = tmp();
  const f = wf(d, "len.yml", [
    "jobs:",
    "  a:",
    "    steps:",
    `      - uses: x/short@${"b".repeat(39)}`,
    `      - uses: x/long@${"b".repeat(41)}`,
    "",
  ].join("\n"));
  const r = checker(f);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  const out = r.stdout + r.stderr;
  assert.match(out, /x\/short@/);
  assert.match(out, /x\/long@/);
});

test("CIT-2 a uses: with no @ ref at all is an offender", () => {
  const d = tmp();
  const f = wf(d, "noref.yml", "jobs:\n  a:\n    steps:\n      - uses: actions/checkout\n");
  const r = checker(f);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /actions\/checkout/);
});

test("CIT-3 checker ignores uses: inside comments and block scalars", () => {
  const d = tmp();
  const f = wf(d, "skip.yml", [
    "name: skip",
    "on: push",
    "# - uses: actions/checkout@v4",
    "jobs:",
    "  a:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    `      - uses: actions/checkout@${SHA}`,
    "        # uses: actions/setup-node@main",
    "      - run: |",
    "          echo hello",
    "          uses: actions/cache@v3",
    "          - uses: foo/bar@main",
    "      - name: folded",
    "        run: >",
    "          uses: baz/qux@v1",
    "      - run: echo done",
    "",
  ].join("\n"));
  const r = checker(f);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("CIT-3 an offender after a block scalar ends is still caught, with the right line", () => {
  const d = tmp();
  const f = wf(d, "after.yml", [
    "jobs:", //                         1
    "  a:", //                          2
    "    steps:", //                    3
    "      - run: |", //                4
    "          echo hi", //             5
    "      - uses: actions/cache@v3", // 6
    "",
  ].join("\n"));
  const r = checker(f);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /after\.yml:6\b/);
});

test("CIT-4 checker walks a folder for *.yml and *.yaml, and ignores other files", () => {
  const d = tmp();
  wf(d, "a.yml", `jobs:\n  a:\n    steps:\n      - uses: actions/checkout@${SHA}\n`);
  wf(join(d, "sub"), "b.yaml", "jobs:\n  a:\n    steps:\n      - uses: actions/checkout@v4\n");
  wf(d, "notes.txt", "uses: actions/checkout@v4\n");
  const r = checker(d);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  const out = r.stdout + r.stderr;
  assert.match(out, /b\.yaml:\d+/);
  assert.ok(!out.includes("notes.txt"), ".txt is not scanned");
  assert.ok(!/a\.yml:\d+/.test(out), "clean a.yml is not listed");
});

test("CIT-4 a clean folder exits 0; several arguments are all checked", () => {
  const clean = tmp();
  wf(clean, "a.yml", `jobs:\n  a:\n    steps:\n      - uses: actions/checkout@${SHA}\n`);
  assert.equal(checker(clean).status, 0);
  const dirty = wf(tmp(), "c.yml", "jobs:\n  a:\n    steps:\n      - uses: x/y@v1\n");
  const r = checker(clean, dirty);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /c\.yml:4\b/);
});

test("CIT-4 exit 2 without arguments, and on a path that does not exist", () => {
  const none = checker();
  assert.equal(none.status, 2, none.stdout + none.stderr);
  assert.match(none.stderr, /usage/i);
  const missing = checker(join(tmp(), "no-such-file.yml"));
  assert.equal(missing.status, 2, missing.stdout + missing.stderr);
});

// ---- the template itself ----
function parseYaml(file) {
  const py = "import sys,json,yaml; print(json.dumps(yaml.safe_load(open(sys.argv[1]))))";
  const havePyYaml = spawnSync("python3", ["-c", "import yaml"]).status === 0;
  if (!havePyYaml) return null;
  const r = spawnSync("python3", ["-c", py, file], { encoding: "utf8" });
  assert.equal(r.status, 0, `ci.yml does not parse as YAML: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

test("CIT-5 templates/ci/ci.yml parses, has the six jobs, contents: read, and passes the checker", () => {
  const file = join(CI_DIR, "ci.yml");
  const text = read(file);
  const jobs = ["format", "lint", "typecheck", "test", "audit", "pinned"];
  const doc = parseYaml(file);
  if (doc) {
    assert.deepEqual(Object.keys(doc.jobs).sort(), [...jobs].sort(), "exactly the six jobs");
    assert.deepEqual(doc.permissions, { contents: "read" }, "top-level permissions are contents: read only");
    for (const [name, job] of Object.entries(doc.jobs)) {
      if (job.permissions) {
        for (const v of Object.values(job.permissions)) assert.notEqual(v, "write", `${name}: no write permission`);
      }
    }
  } else {
    // Line check when PyYAML is absent.
    for (const j of jobs) assert.match(text, new RegExp(`^ {2}${j}:\\s*$`, "m"), `job ${j}`);
    assert.match(text, /^permissions:\s*\n\s+contents:\s*read\s*$/m);
    assert.doesNotMatch(text, /:\s*write\b/);
  }
  assert.match(text, /prettier/i, "format job runs Prettier");
  assert.match(text, /\.\/\.github\/workflows\/lint\.yml/, "lint job calls the local lint.yml reusable workflow");
  assert.match(text, /npm run typecheck --if-present/);
  assert.match(text, /npm audit --audit-level=high/);
  assert.match(text, /check-actions-pinned/);
  assert.match(text, /node-version:\s*['"]?22/, "Node 22");
  const testJob = doc ? JSON.stringify(doc.jobs.test) : text.slice(text.search(/^ {2}test:/m));
  assert.ok((testJob.match(/npm test/g) || []).length >= 3, "test job runs npm test three times in a row");
  const r = checker(file);
  assert.equal(r.status, 0, `ci.yml must pass the checker:\n${r.stdout}${r.stderr}`);
});

test("CIT-6 every workflow in templates/ and .github/workflows/ passes the checker", () => {
  const files = [...walk(join(root, "templates")), ...walk(join(root, ".github/workflows"))];
  assert.ok(files.length > 5, "found the workflows");
  const r = checker(join(root, "templates"), join(root, ".github/workflows"));
  assert.equal(r.status, 0, `unpinned Actions:\n${r.stdout}${r.stderr}`);
});

test("CIT-6 pinned Actions carry a # vN comment", () => {
  const files = [...walk(join(root, "templates")), ...walk(join(root, ".github/workflows"))];
  const missing = [];
  for (const f of files) {
    readFileSync(f, "utf8").split("\n").forEach((l, i) => {
      const m = l.match(/^\s*(?:-\s*)?uses:\s*([^\s#]+)(.*)$/);
      if (m && !m[1].startsWith("./") && !/#\s*v\d/.test(m[2])) missing.push(`${relative(root, f)}:${i + 1} ${m[1]}`);
    });
  }
  assert.deepEqual(missing, [], "every pinned Action needs a trailing # vN comment");
});

test("CIT-7 prettierrc.json parses; prettierignore covers node_modules, dist, coverage and lockfiles", () => {
  JSON.parse(read(join(CI_DIR, "prettierrc.json")));
  const lines = read(join(CI_DIR, "prettierignore")).split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const has = (re) => lines.some((l) => re.test(l));
  assert.ok(has(/^\/?node_modules\/?$/), "node_modules");
  assert.ok(has(/^\/?dist\/?$/), "dist");
  assert.ok(has(/^\/?coverage\/?$/), "coverage");
  assert.ok(has(/package-lock\.json$/), "package-lock.json");
  assert.ok(has(/yarn\.lock$/), "yarn.lock");
  assert.ok(has(/pnpm-lock\.yaml$/), "pnpm-lock.yaml");
});

test("CIT-8 install-ci.sh creates the files, keeps existing ones on a second run, prints devDependencies", () => {
  const script = join(root, "scripts/install-ci.sh");
  assert.ok(existsSync(script), "scripts/install-ci.sh does not exist yet");
  const repo = tmp("cit8-");
  assert.equal(spawnSync("git", ["init", "-q", repo]).status, 0);
  const run = () => spawnSync("bash", [script, repo], { encoding: "utf8" });
  let r = run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  for (const f of [".github/workflows/ci.yml", ".prettierrc.json", ".prettierignore"]) {
    assert.ok(existsSync(join(repo, f)), `${f} installed`);
  }
  assert.equal(readFileSync(join(repo, ".github/workflows/ci.yml"), "utf8"), read(join(CI_DIR, "ci.yml")));
  assert.match(r.stdout, /prettier/i, "lists prettier as a devDependency to add");
  assert.match(r.stdout, /eslint/i, "lists the lint devDependencies");
  writeFileSync(join(repo, ".prettierrc.json"), '{"mine":true}\n');
  r = run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(readFileSync(join(repo, ".prettierrc.json"), "utf8"), '{"mine":true}\n', "existing file kept");
  assert.match(r.stdout, /kept existing/i);
  assert.match(r.stdout, /prettier/i, "devDependencies printed on the second run too");
});

test("CIT-8 install-ci.sh exits non-zero on a missing target", () => {
  const script = join(root, "scripts/install-ci.sh");
  assert.ok(existsSync(script), "scripts/install-ci.sh does not exist yet");
  const r = spawnSync("bash", [script, join(tmp(), "nope")], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
});

test("CIT-9 manifest: checker is managed, CI files are seed, and studio-sync accepts it", () => {
  const m = JSON.parse(read(join(root, "templates/manifest.json")));
  const by = (src) => m.entries.find((e) => e.src === src);
  const c = by("tools/check-actions-pinned.mjs");
  assert.ok(c, "manifest lists tools/check-actions-pinned.mjs");
  assert.equal(c.policy, "managed");
  assert.equal(c.dest, "scripts/check-actions-pinned.mjs");
  const seeds = { "templates/ci/ci.yml": ".github/workflows/ci.yml", "templates/ci/prettierrc.json": ".prettierrc.json", "templates/ci/prettierignore": ".prettierignore" };
  for (const [src, dest] of Object.entries(seeds)) {
    const e = by(src);
    assert.ok(e, `manifest lists ${src}`);
    assert.equal(e.policy, "seed", `${src} is a seed`);
    assert.equal(e.dest, dest);
    assert.ok(existsSync(join(root, src)), `source ${src} exists`);
  }
  const repo = tmp("cit9-");
  assert.equal(spawnSync("git", ["init", "-q", repo]).status, 0);
  const r = spawnSync("node", [join(root, "tools/studio-sync.mjs"), repo], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(existsSync(join(repo, "scripts/check-actions-pinned.mjs")), "checker synced to scripts/");
  assert.ok(existsSync(join(repo, ".github/workflows/ci.yml")), "ci.yml seeded");
});

test("CIT-10 README states the Gate list and maps each check to a file", () => {
  const t = read(join(CI_DIR, "README.md"));
  assert.match(t, /\bGate\b/);
  const gate = [
    [/ESLint/i, /lint\.yml|eslint\.config/],
    [/Prettier/i, /prettierrc|prettierignore/],
    [/typecheck/i, /ci\.yml/],
    [/tests? 3x|three times|3x/i, /ci\.yml/],
    [/npm audit|\baudit\b/i, /ci\.yml/],
    [/gitleaks/i, /security\.yml/],
    [/CodeQL/i, /codeql\.yml/],
    [/pinned Actions|SHA-pinned|check-actions-pinned/i, /check-actions-pinned/],
  ];
  for (const [name, file] of gate) {
    const line = t.split("\n").find((l) => name.test(l) && file.test(l));
    assert.ok(line, `README has a line naming ${name} and its file ${file}`);
  }
  assert.match(t, /install-ci\.sh/, "adopt steps name the installer");
  assert.match(t, /pin/i, "explains how to pin");
});
