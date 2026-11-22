// Batch 4 of the qa-tdd miss cases (Nov 22): six harder, tool-dependent reproductions, all `heldout`.
// Unread held-out set: never read while tuning, scored once per change. Same format as qa-tdd-cases.mjs, plus
// optional `extra` fixture files (a site folder, a .gitignore, a workflow file). In each case the shipped test
// passes on made-up input, and the miss shows only when the agent runs something: git on a moved file, or the
// check against the real folder or file. Real misses: CC-Q6 (QA-R1, ccwatts 105), PS-Q1, CH-Q4, CH-Q5, RR-Q7, RR-Q9.
const T = `import { test } from "node:test";\nimport assert from "node:assert/strict";\n`;

export const QA_BATCH4 = [
  {
    id: "docs-only-skip-rename", miss: "CC-Q6", pattern: "tool-tests-missed-edge-cases", priority: "P1", split: "heldout", src: "cc",
    ask: "The PR gate lets a PR say \"qa-tdd skipped: docs only\" when every changed file is a doc (a .md file, anything under docs/, or LICENSE).",
    file: "skipcheck.mjs",
    code: `// PR gate: "qa-tdd skipped: docs only" is allowed only if every changed file is a doc.
import { spawnSync } from "node:child_process";
const isDoc = (f) => /\\.md$/.test(f) || f.startsWith("docs/") || f === "LICENSE";
export function changedFiles(base, head, cwd) {
  const r = spawnSync("git", ["diff", "--name-only", base + "..." + head], { cwd, encoding: "utf8" });
  return r.stdout.split("\\n").filter(Boolean);
}
export function skipAllowed(agentsLine, files) {
  if (!/qa-tdd skipped: *docs only/i.test(agentsLine)) return true;
  return files.every(isDoc);
}
`,
    testFile: "skipcheck.test.mjs",
    test: `${T}import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { changedFiles, skipAllowed } from "./skipcheck.mjs";
const git = (cwd, ...a) => spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "-c", "commit.gpgsign=false", ...a], { cwd, encoding: "utf8" }).stdout.trim();
function repo(steps) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skip-"));
  git(dir, "init", "-q");
  fs.mkdirSync(path.join(dir, "src")); fs.mkdirSync(path.join(dir, "docs"));
  fs.writeFileSync(path.join(dir, "README.md"), "hello\\n");
  git(dir, "add", "-A"); git(dir, "commit", "-q", "-m", "base");
  const base = git(dir, "rev-parse", "HEAD");
  steps(dir);
  git(dir, "add", "-A"); git(dir, "commit", "-q", "-m", "change");
  return { dir, base, head: git(dir, "rev-parse", "HEAD") };
}
const LINE = "Agents: qa-tdd skipped: docs only";
test("SKIP-1 a docs-only change may skip", () => {
  const r = repo((d) => fs.writeFileSync(path.join(d, "docs", "a.md"), "notes\\n"));
  assert.equal(skipAllowed(LINE, changedFiles(r.base, r.head, r.dir)), true);
});
test("SKIP-2 a new code file may not skip", () => {
  const r = repo((d) => fs.writeFileSync(path.join(d, "src", "b.py"), "print(1)\\n"));
  assert.equal(skipAllowed(LINE, changedFiles(r.base, r.head, r.dir)), false);
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { changedFiles, skipAllowed } from "./skipcheck.mjs";
const git = (cwd, ...a) => spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "-c", "commit.gpgsign=false", ...a], { cwd, encoding: "utf8" }).stdout.trim();
test("GAP code moved into docs/ does not pass as docs only", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skip-"));
  git(dir, "init", "-q");
  fs.mkdirSync(path.join(dir, "src")); fs.mkdirSync(path.join(dir, "docs"));
  fs.writeFileSync(path.join(dir, "src", "a.py"), Array.from({ length: 40 }, (_, i) => "x" + i + " = " + i).join("\\n") + "\\n");
  git(dir, "add", "-A"); git(dir, "commit", "-q", "-m", "base");
  const base = git(dir, "rev-parse", "HEAD");
  git(dir, "mv", "src/a.py", "docs/a.py"); git(dir, "commit", "-q", "-m", "move");
  const head = git(dir, "rev-parse", "HEAD");
  assert.equal(skipAllowed("Agents: qa-tdd skipped: docs only", changedFiles(base, head, dir)), false);
});
`,
    gapText: "`changedFiles` runs `git diff --name-only`, which has rename detection on and lists only the new path. A Python file moved from `src/` into `docs/` shows up as just `docs/a.py`, so the gate sees a docs-only change and lets \"qa-tdd skipped: docs only\" through for a PR that really changes code. Both shipped tests add a file; neither renames one, and nobody ran git on a moved file",
    gapTest: "in a real git repo, `git mv src/a.py docs/a.py` then commit: `skipAllowed(\"Agents: qa-tdd skipped: docs only\", changedFiles(base, head, repo))` must be false",
  },
  {
    id: "greeting-check-external-css", miss: "PS-Q1", pattern: "guard-written-after-the-bug", priority: "P1", split: "heldout", src: "ps",
    ask: "The home page check HOME-7 flags a greeting that animates or drifts. It runs against the `site` folder and passes.",
    file: "check-home.mjs",
    code: `// HOME-7: the home greeting must not animate or drift.
import fs from "node:fs";
export function greetingAnimates(html) {
  const css = [...html.matchAll(/<style[^>]*>([\\s\\S]*?)<\\/style>/gi)].map((m) => m[1]).join("\\n");
  return /\\.greeting[^{]*\\{[^}]*(animation|transition)/i.test(css) || /class="greeting"[^>]*style="[^"]*(animation|transition)/i.test(html);
}
export function checkHome(dir) {
  const html = fs.readFileSync(dir + "/index.html", "utf8");
  return greetingAnimates(html) ? ["HOME-7 greeting animates"] : [];
}
`,
    testFile: "check-home.test.mjs",
    test: `${T}import { greetingAnimates, checkHome } from "./check-home.mjs";
test("HOME-7a an inline style block with an animation is flagged", () => {
  assert.equal(greetingAnimates('<style>.greeting { animation: drift 2s infinite; }</style><h1 class="greeting">Hi</h1>'), true);
});
test("HOME-7b a plain greeting passes", () => {
  assert.equal(greetingAnimates('<h1 class="greeting">Hi</h1>'), false);
});
test("HOME-7c the site folder passes", () => {
  assert.deepEqual(checkHome(new URL("./site", import.meta.url).pathname), []);
});
`,
    extra: [
      { name: "site/index.html", content: `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Chase</title>\n<link rel="stylesheet" href="site.css">\n</head>\n<body>\n<h1 class="greeting">Hey there, I'm Chase.</h1>\n</body>\n</html>\n` },
      { name: "site/site.css", content: `body { font-family: system-ui, sans-serif; }\n.greeting { font-size: 2rem; animation: drift 3s ease-in-out infinite; }\n@keyframes drift { from { transform: translateX(0); } to { transform: translateX(12px); } }\n` },
    ],
    gapName: "gap.test.mjs",
    gap: `${T}import { checkHome } from "./check-home.mjs";
test("GAP the site's own stylesheet makes the greeting drift, and the check says so", () => {
  assert.ok(checkHome(new URL("./site", import.meta.url).pathname).length > 0);
});
`,
    gapText: "`checkHome` reads only `index.html` and only its inline `<style>` blocks. The real animation sits in `site/site.css`, linked from the page, so the check passes on a greeting that drifts, which is exactly the defect HOME-7 exists to stop. The unit tests use inline snippets only; running the check against the real folder and then reading `site.css` shows the miss",
    gapTest: "`checkHome` on the shipped `site` folder (whose linked `site.css` animates `.greeting`) must return a finding",
  },
  {
    id: "loose-pin-no-upper-bound", miss: "CH-Q4", pattern: "self-referential-or-skipped-tests", priority: "P1", split: "heldout", src: "ch",
    ask: "A dependency check lists requirements in `requirements.txt` whose version rule is loose, so a new release can't arrive unseen. It reports none on our file.",
    file: "pins.mjs",
    code: `// Dependency check: report requirements whose version rule is loose.
export function names(text) {
  return text.split("\\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
}
export function loose(text) {
  return names(text).filter((l) => !/[<>=~!]/.test(l)).map((l) => l.split(/\\s/)[0]);
}
`,
    testFile: "pins.test.mjs",
    test: `${T}import fs from "node:fs";
import { loose } from "./pins.mjs";
test("PINS-1 a name with no version rule is loose", () => {
  assert.deepEqual(loose("requests\\nfastapi>=0.110,<1\\n"), ["requests"]);
});
test("PINS-2 comments and blank lines are skipped", () => {
  assert.deepEqual(loose("# web\\n\\nfastapi==0.110.0\\n"), []);
});
test("PINS-3 our requirements file has no loose rule", () => {
  assert.deepEqual(loose(fs.readFileSync(new URL("./requirements.txt", import.meta.url), "utf8")), []);
});
`,
    extra: [
      { name: "requirements.txt", content: `# PDF upload service\nfastapi>=0.110,<1\npypdf>=4.0\npytest>=8,<9\nuvicorn==0.29.0\n` },
    ],
    gapName: "gap.test.mjs",
    gap: `${T}import fs from "node:fs";
import { loose } from "./pins.mjs";
test("GAP pypdf>=4.0 lets a new major version in unseen, and the check says so", () => {
  const found = loose(fs.readFileSync(new URL("./requirements.txt", import.meta.url), "utf8"));
  assert.ok(found.some((n) => n.startsWith("pypdf")), "reported: " + JSON.stringify(found));
});
`,
    gapText: "`loose` only flags lines with no operator at all, so `pypdf>=4.0` (a floor, no upper bound) counts as pinned. That is how pypdf 7 arrived and broke the PDF-bomb guard unnoticed. The tests use made-up lists plus the real file; running the check on the real file shows it reports nothing, and reading it shows the open `>=` rule",
    gapTest: "`loose` on the shipped `requirements.txt` must include `pypdf` (a `>=` rule with no upper bound is loose)",
  },
  {
    id: "ignored-dir-imported", miss: "CH-Q5", pattern: "self-referential-or-skipped-tests", priority: "P1", split: "heldout", src: "ch",
    ask: "A fresh-copy check lists source files that import something our `.gitignore` excludes, so a fresh clone still runs. It reports none on this repo.",
    file: "fresh.mjs",
    code: `// Fresh-copy check: a file that imports an ignored path will not exist in a clone.
import path from "node:path";
const rules = (g) => g.split("\\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
export function isIgnored(file, gitignore) {
  return rules(gitignore).some((r) => r === file || (r.startsWith("*.") && file.endsWith(r.slice(1))));
}
export function importsIgnored(source, from, gitignore) {
  const specs = [...source.matchAll(/from\\s+["'](\\.{1,2}\\/[^"']+)["']/g)].map((m) => m[1]);
  return specs.map((s) => path.posix.join(path.posix.dirname(from), s)).filter((f) => isIgnored(f, gitignore));
}
`,
    testFile: "fresh.test.mjs",
    test: `${T}import fs from "node:fs";
import { isIgnored, importsIgnored } from "./fresh.mjs";
const read = (p) => fs.readFileSync(new URL("./" + p, import.meta.url), "utf8");
test("FRESH-1 an exact file rule and an extension rule match", () => {
  assert.equal(isIgnored("notes.txt", "notes.txt\\n"), true);
  assert.equal(isIgnored("run.log", "*.log\\n"), true);
  assert.equal(isIgnored("src/a.mjs", "*.log\\n"), false);
});
test("FRESH-2 an import of an ignored file is reported", () => {
  assert.deepEqual(importsIgnored('import x from "./local.mjs";', "src/a.mjs", "src/local.mjs\\n"), ["src/local.mjs"]);
});
test("FRESH-3 the screener imports nothing ignored", () => {
  assert.deepEqual(importsIgnored(read("src/screener.mjs"), "src/screener.mjs", read(".gitignore")), []);
});
`,
    extra: [
      { name: ".gitignore", content: `node_modules\ndata/\n*.log\n` },
      { name: "src/screener.mjs", content: `import { PRICES } from "../data/prices.mjs";\nexport const top = (n) => Object.entries(PRICES).sort((a, b) => b[1] - a[1]).slice(0, n);\n` },
      { name: "data/prices.mjs", content: `export const PRICES = { AAA: 12.5, BBB: 48.1, CCC: 7.9 };\n` },
    ],
    gapName: "gap.test.mjs",
    gap: `${T}import fs from "node:fs";
import { importsIgnored } from "./fresh.mjs";
const read = (p) => fs.readFileSync(new URL("./" + p, import.meta.url), "utf8");
test("GAP the screener imports from data/, which .gitignore excludes, and the check says so", () => {
  assert.deepEqual(importsIgnored(read("src/screener.mjs"), "src/screener.mjs", read(".gitignore")), ["data/prices.mjs"]);
});
`,
    gapText: "`isIgnored` knows only exact paths and `*.ext` rules, not a directory rule like `data/`. `src/screener.mjs` imports `../data/prices.mjs`, which `.gitignore` excludes, so a fresh clone has no market data and every import fails, while this check reports nothing and the tests pass locally. The shipped tests use exact-file rules; running the check on the real files and reading `.gitignore` shows it",
    gapTest: "`importsIgnored` on the shipped screener, from `src/screener.mjs`, with the shipped `.gitignore` must report `data/prices.mjs`",
  },
  {
    id: "runner-list-form", miss: "RR-Q7", pattern: "ci-environment-drift", priority: "P1", split: "heldout", src: "rr",
    ask: "A CI lint flags jobs that run on a moving runner image such as ubuntu-latest, so a runner change can't break the browser install overnight. It passes on our workflow.",
    file: "ci-lint.mjs",
    code: `// CI lint: jobs must run on a pinned runner image.
export function floating(yaml) {
  return yaml.split("\\n").filter((l) => /^\\s*runs-on:\\s*(ubuntu|macos|windows)-latest\\s*$/.test(l)).map((l) => l.trim());
}
`,
    testFile: "ci-lint.test.mjs",
    test: `${T}import fs from "node:fs";
import { floating } from "./ci-lint.mjs";
test("CILINT-1 a plain latest runner is flagged", () => {
  assert.deepEqual(floating("jobs:\\n  t:\\n    runs-on: ubuntu-latest\\n"), ["runs-on: ubuntu-latest"]);
});
test("CILINT-2 a pinned runner passes", () => {
  assert.deepEqual(floating("jobs:\\n  t:\\n    runs-on: ubuntu-22.04\\n"), []);
});
test("CILINT-3 our workflow passes", () => {
  assert.deepEqual(floating(fs.readFileSync(new URL("./.github/workflows/ci.yml", import.meta.url), "utf8")), []);
});
`,
    extra: [
      { name: ".github/workflows/ci.yml", content: `name: ci\non: [push]\njobs:\n  test:\n    runs-on: [ubuntu-latest]\n    steps:\n      - uses: actions/checkout@v4\n      - run: npx playwright install --with-deps chromium\n      - run: node --test\n` },
    ],
    gapName: "gap.test.mjs",
    gap: `${T}import fs from "node:fs";
import { floating } from "./ci-lint.mjs";
test("GAP the workflow's runs-on: [ubuntu-latest] is a moving image, and the lint says so", () => {
  assert.ok(floating(fs.readFileSync(new URL("./.github/workflows/ci.yml", import.meta.url), "utf8")).length > 0);
});
`,
    gapText: "The lint matches only the plain form `runs-on: ubuntu-latest`. Our workflow writes `runs-on: [ubuntu-latest]` (a list form), so the lint passes on a job that still floats with the runner image, the same drift that broke the Chromium install when the image moved. The tests use the plain form only; running the lint on the real workflow shows it reports nothing while the file says latest",
    gapTest: "`floating` on the shipped `.github/workflows/ci.yml` (`runs-on: [ubuntu-latest]`) must report a finding",
  },
  {
    id: "merge-gate-red-main", miss: "RR-Q9", pattern: "ci-environment-drift", priority: "P1", split: "heldout", src: "rr",
    ask: "The merge gate says whether a PR may merge: yes when it has checks and every one succeeded. Check the gate before we merge a batch.",
    file: "gate.mjs",
    code: `// Merge gate: a PR may merge when it has checks and all of them succeeded.
// \`main\` is the latest check result on the default branch, when known.
export function canMerge({ checks, main }) {
  void main;
  return checks.length > 0 && checks.every((c) => c.conclusion === "success");
}
`,
    testFile: "gate.test.mjs",
    test: `${T}import { canMerge } from "./gate.mjs";
const ok = { name: "unit", conclusion: "success" };
const bad = { name: "unit", conclusion: "failure" };
test("GATE-1 all checks green may merge", () => assert.equal(canMerge({ checks: [ok, ok], main: { conclusion: "success" } }), true));
test("GATE-2 a failed check may not merge", () => assert.equal(canMerge({ checks: [ok, bad], main: { conclusion: "success" } }), false));
test("GATE-3 no checks may not merge", () => assert.equal(canMerge({ checks: [], main: { conclusion: "success" } }), false));
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { canMerge } from "./gate.mjs";
test("GAP a green PR on a red default branch does not merge", () => {
  assert.equal(canMerge({ checks: [{ name: "unit", conclusion: "success" }], main: { conclusion: "failure" } }), false);
});
`,
    gapText: "`canMerge` accepts `main` but discards it (`void main`), so a PR with green checks merges onto a default branch that is already red. That is how a PR merged with 26 failures already on main, still unfixed. Every shipped test passes `main: success`, so the unused argument never mattered",
    gapTest: "`canMerge({checks: [one success], main: {conclusion: \"failure\"}})` must be false",
  },
];
