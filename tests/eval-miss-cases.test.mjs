// Regression tests for tools/eval-miss-cases.mjs (QA-R1..R6 from the qa-tdd review). Uses temp dirs only.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TOOL = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "tools", "eval-miss-cases.mjs");
const good = {
  id: "demo", miss: "XX-Q1", pattern: "p", priority: "P1", split: "dev", src: "cc", ask: "It adds numbers.",
  file: "add.mjs", code: "export const add = (a, b) => a - b;\n",
  testFile: "add.test.mjs", test: 'import {test} from "node:test";import assert from "node:assert/strict";import {add} from "./add.mjs";\ntest("A-1",()=>assert.equal(add(2,0),2));\n',
  gapName: "gapt.mjs", gap: 'import {test} from "node:test";import assert from "node:assert/strict";import {add} from "./add.mjs";\ntest("G",()=>assert.equal(add(2,3),5));\n',
  gapText: "add subtracts", gapTest: "add(2,3) is 5",
};
function run(spec, args = [], pre, pm = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "emc-"));
  const specPath = path.join(dir, "spec.mjs");
  fs.writeFileSync(specPath, `export const QA_CASES = ${JSON.stringify(spec)};`);
  const pmSpec = path.join(dir, "pm.mjs");
  fs.writeFileSync(pmSpec, `export const PM_CASES = ${JSON.stringify(pm)};`);
  const evals = path.join(dir, "evals"); fs.mkdirSync(evals);
  if (pre) pre(evals);
  const env = { ...process.env, EVAL_MISS_SPEC: specPath, EVAL_MISS_PM_SPEC: pmSpec, EVAL_MISS_EVALS_DIR: evals };
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, [TOOL, ...args], { encoding: "utf8", env });
  return { ...r, evals };
}
test("MISS-T1 (QA-R2) an unknown flag exits 2 and writes nothing", () => {
  const r = run([good], ["--chek"]);
  assert.equal(r.status, 2);
  assert.deepEqual(fs.readdirSync(r.evals), []);
});
test("MISS-T2 write mode creates the case folder", () => {
  const r = run([good], [], undefined);
  assert.equal(r.status, 0);
  assert.ok(fs.existsSync(path.join(r.evals, "qa-tdd-miss-demo", "prompt.md")));
});
test("MISS-T3 (QA-R3) --check flags an extra grader file", () => {
  const r = run([good], ["--check"], (e) => {
    const d = path.join(e, "qa-tdd-miss-demo", "graders"); fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, "extra.md"), "x");
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /extra .*extra\.md/);
});
test("MISS-T4 (QA-R1) --verify rejects a gap test that fails on an import error", () => {
  const bad = { ...good, gap: good.gap.replace("./add.mjs", "./nope.mjs") };
  const r = run([bad], ["--verify"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /wrong reason/);
});
test("MISS-T5 --verify passes a real gap and rejects a gap that passes", () => {
  assert.equal(run([good], ["--verify"]).status, 0);
  const noGap = { ...good, gap: good.gap.replace("add(2,3),5", "add(2,0),2") };
  assert.equal(run([noGap], ["--verify"]).status, 1);
});
test("MISS-T6 (QA-R6) validate rejects a path-like id, a missing field and a fence in the code", () => {
  for (const bad of [{ ...good, id: "../x" }, { ...good, gapTest: "" }, { ...good, code: "```\n" }, { ...good, gapName: "add.mjs" }]) {
    const r = run([bad], ["--check"]);
    assert.equal(r.status, 1, JSON.stringify(bad).slice(0, 60));
  }
});
const pmGood = {
  id: "demo-pm", miss: "XX-S1", pattern: "p", priority: "P1", split: "heldout", src: "cc",
  ask: "Spec the export button.", context: "Exports run on the server.", mustCover: "a size limit with a test",
};
test("MISS-T7 staff-pm cases are written, checked and pruned like qa-tdd ones", () => {
  const w = run([], [], undefined, [pmGood]);
  assert.equal(w.status, 0);
  const prompt = path.join(w.evals, "staff-pm-miss-demo-pm", "prompt.md");
  assert.ok(fs.existsSync(prompt));
  assert.match(fs.readFileSync(prompt, "utf8"), /tags: \[staff-pm, miss, p1, src-cc, p, split-heldout\]/);
  const orphan = run([], ["--check"], (e) => fs.mkdirSync(path.join(e, "staff-pm-miss-old"), { recursive: true }), []);
  assert.equal(orphan.status, 1);
  assert.match(orphan.stderr, /orphan staff-pm-miss-old/);
});
test("MISS-T8 validatePm rejects a context that hints at the miss and a missing mustCover", () => {
  for (const bad of [{ ...pmGood, context: "There is a bug in export." }, { ...pmGood, mustCover: "" }, { ...pmGood, id: "../x" }]) {
    assert.equal(run([], ["--check"], undefined, [bad]).status, 1, JSON.stringify(bad).slice(0, 50));
  }
});
test("MISS-T9 (QA-R12) hint words are caught in other forms, and a fence in mustCover is rejected", () => {
  for (const bad of [{ ...pmGood, context: "That was fixed last week." }, { ...pmGood, ask: "Cover the gaps." }, { ...pmGood, mustCover: "x ``` y" }])
    assert.equal(run([], ["--check"], undefined, [bad]).status, 1, JSON.stringify(bad).slice(0, 50));
});
test("MISS-T10 (QA-R13) a pattern that could break the front matter is rejected for both families", () => {
  const evil = 'a], b: "c';
  assert.equal(run([], ["--check"], undefined, [{ ...pmGood, pattern: evil }]).status, 1);
  assert.equal(run([{ ...good, pattern: evil }], ["--check"]).status, 1);
});
test("MISS-T11 (QA-R11) staff-pm stale, missing and extra files are caught; qa and pm cases with one id stay separate", () => {
  const both = () => run([{ ...good, id: "same" }], [], undefined, [{ ...pmGood, id: "same" }]);
  const w = both();
  assert.equal(w.status, 0);
  const qa = path.join(w.evals, "qa-tdd-miss-same"), pm = path.join(w.evals, "staff-pm-miss-same");
  assert.ok(fs.existsSync(qa) && fs.existsSync(pm));
  // second run on the same dirs: stale pm file, missing pm grader, extra file in the qa folder
  const r = run([{ ...good, id: "same" }], ["--check"], (e) => {
    for (const d of ["qa-tdd-miss-same", "staff-pm-miss-same"]) fs.cpSync(path.join(w.evals, d), path.join(e, d), { recursive: true });
    fs.appendFileSync(path.join(e, "staff-pm-miss-same", "prompt.md"), "edited");
    fs.rmSync(path.join(e, "staff-pm-miss-same", "graders", "criteria.md"));
    fs.writeFileSync(path.join(e, "qa-tdd-miss-same", "notes.md"), "x");
  }, [{ ...pmGood, id: "same" }]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /stale .*staff-pm-miss-same.*prompt\.md/);
  assert.match(r.stderr, /missing .*staff-pm-miss-same.*criteria\.md/);
  assert.match(r.stderr, /extra .*qa-tdd-miss-same.*notes\.md/);
  assert.doesNotMatch(r.stderr, /stale .*qa-tdd-miss-same/);
});
test("MISS-T12 (QA-R14) the --check message says how to clear an orphan", () => {
  const r = run([], ["--check"], (e) => fs.mkdirSync(path.join(e, "qa-tdd-miss-old"), { recursive: true }));
  assert.match(r.stderr, /delete an orphan folder by hand/);
});

// ---- extra fixture files (optional `extra: [{name, content}]` on a qa-tdd case) ----
const html = "<html><body><a class=\"btn\">Go</a></body></html>\n";
const css = "a.btn { color: blue; }\n";
const withExtra = { ...good, extra: [{ name: "site/index.html", content: html }, { name: ".gitignore", content: "node_modules\n" }] };
const readsExtra = (rel, needle) => `import fs from "node:fs";
test("R",()=>assert.ok(fs.readFileSync(new URL("${rel}", import.meta.url), "utf8").includes(${JSON.stringify(needle)})));\n`;

test("MISS-T13 validate accepts a good extra array and rejects malformed ones with the case id in stderr", () => {
  assert.equal(run([withExtra]).status, 0, "a good extra is accepted");
  const bads = [
    { ...good, extra: "site/index.html" },
    { ...good, extra: [null] },
    { ...good, extra: [{ name: 5, content: "x" }] },
    { ...good, extra: [{ name: "a.txt", content: 5 }] },
    { ...good, extra: [{ name: "a.txt" }] },
  ];
  for (const bad of bads) {
    const r = run([bad]);
    assert.equal(r.status, 1, JSON.stringify(bad.extra));
    assert.match(r.stderr, /demo/);
    assert.match(r.stderr, /extra/);
  }
});
test("MISS-T14 validate rejects unsafe, colliding and duplicate extra names", () => {
  const names = ["/etc/x", "../x.txt", "a/../b.txt", "a b.txt", "a;b", "", good.file, good.testFile, good.gapName];
  for (const name of names) {
    const r = run([{ ...good, extra: [{ name, content: "ok\n" }] }])
;    assert.equal(r.status, 1, `name ${JSON.stringify(name)}`);
    assert.match(r.stderr, /demo/);
    assert.deepEqual(fs.readdirSync(r.evals), [], "nothing written");
  }
  const dup = run([{ ...good, extra: [{ name: "a.txt", content: "1" }, { name: "a.txt", content: "2" }] }]);
  assert.equal(dup.status, 1);
  assert.match(dup.stderr, /demo/);
});
test("MISS-T15 validate rejects a code fence or a hint word in extra content", () => {
  for (const content of ["```\nx\n```", "this is a bug", "it was fixed", "wrong value", "a gap here", "broken link"]) {
    const r = run([{ ...good, extra: [{ name: "a.txt", content }] }]);
    assert.equal(r.status, 1, content);
    assert.match(r.stderr, /demo/);
  }
});
test("MISS-T16 prompt.md lists each extra file after the source and test files, with a fenced block of its content", () => {
  const w = run([withExtra]);
  assert.equal(w.status, 0);
  const p = fs.readFileSync(path.join(w.evals, "qa-tdd-miss-demo", "prompt.md"), "utf8");
  const at = (s) => { const i = p.indexOf(s); assert.ok(i >= 0, `missing ${s}`); return i; };
  assert.match(p, /Create these \w+ files in the working directory exactly as written/);
  const iSrc = at("`add.mjs`:"), iTest = at("`add.test.mjs`:"), iHtml = at("`site/index.html`:"), iGit = at("`.gitignore`:");
  assert.ok(iSrc < iTest && iTest < iHtml && iHtml < iGit, "order: source, test, then extras in spec order");
  assert.match(p, /`site\/index\.html`:\n```[a-z]*\n<html><body><a class="btn">Go<\/a><\/body><\/html>\n```\n/);
  assert.match(p, /`\.gitignore`:\n```[a-z]*\nnode_modules\n```\n/);
});
test("MISS-T17 a case with no extra (or an empty one) writes the exact prompt.md it always did", () => {
  const c = good;
  const expected = `---
description: "miss XX-Q1 (p), demo"
tags: [qa-tdd, miss, p1, src-cc, p, split-dev]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. It adds numbers. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with \`node --test\`. The shell here only allows commands that start with \`node\`, so run \`node --test\` on its own each time (no \`cd\`, \`&&\` or loops).

\`add.mjs\`:
\`\`\`js
${c.code.trimEnd()}
\`\`\`

\`add.test.mjs\`:
\`\`\`js
${c.test.trimEnd()}
\`\`\`
`;
  for (const spec of [good, { ...good, extra: [] }]) {
    const w = run([spec]);
    assert.equal(w.status, 0);
    assert.equal(fs.readFileSync(path.join(w.evals, "qa-tdd-miss-demo", "prompt.md"), "utf8"), expected);
  }
});
test("MISS-T18 --check passes on freshly written extras and reports stale extra content in prompt.md", () => {
  const w = run([withExtra]);
  assert.equal(w.status, 0);
  const copy = (e) => fs.cpSync(path.join(w.evals, "qa-tdd-miss-demo"), path.join(e, "qa-tdd-miss-demo"), { recursive: true });
  assert.equal(run([withExtra], ["--check"], copy).status, 0, "fresh output is up to date");
  const edited = { ...withExtra, extra: [{ name: "site/index.html", content: html.replace("Go", "Stop") }, withExtra.extra[1]] };
  const r = run([edited], ["--check"], copy);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /stale .*qa-tdd-miss-demo.*prompt\.md/);
});
test("MISS-T19 --verify writes extra files (with parent dirs) before the shipped test runs", () => {
  const c = { ...good, extra: [{ name: "site/index.html", content: html }], test: good.test + readsExtra("./site/index.html", "btn") };
  const r = run([c], ["--verify"]);
  assert.equal(r.status, 0, r.stderr);
});
test("MISS-T20 --verify gives the gap test the extra files, so a gap that reads site/site.css goes red only for the real reason", () => {
  const gapReadsCss = good.gap + readsExtra("./site/site.css", "color: red");
  const c = { ...good, extra: [{ name: "site/site.css", content: css }], gap: gapReadsCss, gapTest: "site.css has color red" };
  // add() has the real gap and the css file exists but lacks "color: red": red, and the file was readable (no ENOENT)
  const r = run([c], ["--verify"]);
  assert.equal(r.status, 0, r.stderr);
  // if only the css check could fail (add is fine), the gap test must still be red because the extra was written and lacks "color: red"
  const onlyCss = { ...c, gap: good.gap.replace("add(2,3),5", "add(2,0),2") + readsExtra("./site/site.css", "color: red") };
  const r2 = run([onlyCss], ["--verify"]);
  assert.equal(r2.status, 0, "red on the css assertion, not on a missing file: " + r2.stderr);
  assert.doesNotMatch(r2.stderr, /wrong reason|no gap/);
  // and when the extra already satisfies the gap test, verify must say there is no gap (impossible if the file was never written)
  const satisfied = { ...onlyCss, extra: [{ name: "site/site.css", content: "a.btn { color: red; }\n" }] };
  const r3 = run([satisfied], ["--verify"]);
  assert.equal(r3.status, 1);
  assert.match(r3.stderr, /no gap/);
});
// Fixture repos for staff-pm cases (batch 5): the ask is a bare line and the traps live in files the agent has to read.
const pmRepo = { ...pmGood, id: "demo-repo", repo: { "CLAUDE.md": "Hard rule: no dates in plans.\n", "docs/plan.md": "M1 in progress.\n" } };
test("MISS-T21 a staff-pm case with a repo writes fixture files, setup.sh and case.yaml; --check catches a stale fixture", () => {
  const w = run([], [], undefined, [pmRepo]);
  assert.equal(w.status, 0, w.stderr);
  const dir = path.join(w.evals, "staff-pm-miss-demo-repo");
  assert.equal(fs.readFileSync(path.join(dir, "fixture", "CLAUDE.md"), "utf8"), "Hard rule: no dates in plans.\n");
  assert.ok(fs.existsSync(path.join(dir, "fixture", "docs", "plan.md")));
  assert.match(fs.readFileSync(path.join(dir, "setup.sh"), "utf8"), /cp -R/);
  assert.match(fs.readFileSync(path.join(dir, "case.yaml"), "utf8"), /scaffold_script: setup\.sh/);
  assert.match(fs.readFileSync(path.join(dir, "prompt.md"), "utf8"), /working directory/);
  const ok = run([], ["--check"], (e) => run([], [], undefined, [pmRepo]) && fs.cpSync(dir, path.join(e, "staff-pm-miss-demo-repo"), { recursive: true }), [pmRepo]);
  assert.equal(ok.status, 0, ok.stderr);
  const stale = run([], ["--check"], (e) => {
    fs.cpSync(dir, path.join(e, "staff-pm-miss-demo-repo"), { recursive: true });
    fs.writeFileSync(path.join(e, "staff-pm-miss-demo-repo", "fixture", "CLAUDE.md"), "changed\n");
  }, [pmRepo]);
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /fixture\/CLAUDE\.md/);
});
test("MISS-T22 a repo map with a path that escapes, an absolute path or a non-string body is rejected", () => {
  for (const repo of [{ "../x.md": "a" }, { "/etc/x.md": "a" }, { "a.md": 5 }, [], { "": "a" }, { "a/../../b.md": "a" }])
    assert.equal(run([], [], undefined, [{ ...pmGood, repo }]).status, 1, JSON.stringify(repo));
});
test("MISS-T23 a fixture file may mention the trap in plain words; only ask and context are screened for hint words", () => {
  const r = { ...pmRepo, repo: { "HANDOFF.md": "A bug was fixed in the last PR.\n" } };
  assert.equal(run([], [], undefined, [r]).status, 0);
});

// ---- optional `flaky: true` on a qa-tdd case: --verify retries the shipped test up to 5 times (batch 6) ----
// Fixture sources keep state outside the temp dir verify makes, so a fresh process can behave differently from the last one.
const uniq = (tag) => path.join(os.tmpdir(), `emc-flaky-${tag}-${process.pid}-${Math.random().toString(36).slice(2)}`);
const markerSrc = (marker) => `import fs from "node:fs";
const M = ${JSON.stringify(marker)};
export const add = (a, b) => {
  if (!fs.existsSync(M)) { fs.writeFileSync(M, "seen"); throw new Error("first call in a fresh machine fails"); }
  return a - b;
};\n`;
// Every call appends a line to a counter file; the first (k - 1) calls throw, later ones return the buggy a - b.
const counterSrc = (cnt, k) => `import fs from "node:fs";
const C = ${JSON.stringify(cnt)};
export const add = (a, b) => {
  fs.appendFileSync(C, "x\\n");
  if (fs.readFileSync(C, "utf8").split("\\n").length - 1 < ${k}) throw new Error("flake");
  return a - b;
};\n`;
const calls = (cnt) => (fs.existsSync(cnt) ? fs.readFileSync(cnt, "utf8").split("\n").length - 1 : 0);
const cleanup = (...fs_) => fs_.forEach((f) => fs.rmSync(f, { force: true }));

test("MISS-T24 flaky:true accepts a shipped test that fails once and then passes on a retry (exit 0)", () => {
  const marker = uniq("marker");
  try {
    const r = run([{ ...good, flaky: true, code: markerSrc(marker) }], ["--verify"]);
    assert.equal(r.status, 0, r.stderr);
  } finally { cleanup(marker); }
});
test("MISS-T25 without flaky the same fail-once shipped test fails verify after exactly one try", () => {
  const marker = uniq("marker"), cnt = uniq("cnt");
  try {
    const r = run([{ ...good, code: markerSrc(marker) }], ["--verify"]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /demo: the shipped test does not pass/);
    const once = run([{ ...good, flaky: false, code: counterSrc(cnt, 999) }], ["--verify"]);
    assert.equal(once.status, 1);
    assert.match(once.stderr, /shipped test does not pass/);
    assert.equal(calls(cnt), 2, "flaky:false: one shipped try plus one gap run");
  } finally { cleanup(marker, cnt); }
});
test("MISS-T26 flaky:true stops at the first pass: fails twice then passes means 3 shipped tries, then 1 gap run", () => {
  const cnt = uniq("cnt");
  try {
    const r = run([{ ...good, flaky: true, code: counterSrc(cnt, 3) }], ["--verify"]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(calls(cnt), 4, "3 shipped tries (2 fail, 1 pass) + 1 gap run");
  } finally { cleanup(cnt); }
});
test("MISS-T27 flaky:true still fails verify when all 5 tries fail, and does not try a 6th time", () => {
  const cnt = uniq("cnt");
  try {
    const r = run([{ ...good, flaky: true, code: counterSrc(cnt, 999) }], ["--verify"]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /demo: the shipped test does not pass/);
    assert.equal(calls(cnt), 6, "5 shipped tries + 1 gap run");
  } finally { cleanup(cnt); }
});
test("MISS-T28 flaky:true leaves the gap test strict: run once, and a gap that passes or fails on an import is still rejected", () => {
  const cnt = uniq("cnt");
  try {
    const noGap = { ...good, flaky: true, code: markerSrc(uniq("m1")), gap: good.gap.replace("add(2,3),5", "add(2,0),2") };
    // the marker file is created by the first shipped try, so the gap run finds a working add that returns 2
    const r = run([noGap], ["--verify"]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /no gap/);
    assert.doesNotMatch(r.stderr, /shipped test does not pass/, "the flaky shipped test passed on a retry");
    const wrong = run([{ ...good, flaky: true, code: markerSrc(uniq("m2")), gap: good.gap.replace("./add.mjs", "./nope.mjs") }], ["--verify"]);
    assert.equal(wrong.status, 1);
    assert.match(wrong.stderr, /wrong reason/);
    assert.doesNotMatch(wrong.stderr, /shipped test does not pass/);
  } finally { cleanup(cnt); }
});
test("MISS-T29 validate: flaky must be a boolean; true and false are accepted, anything else exits 1 naming the case", () => {
  assert.equal(run([{ ...good, flaky: true }]).status, 0);
  assert.equal(run([{ ...good, flaky: false }]).status, 0);
  for (const flaky of ["true", 1, 0, null, [], {}]) {
    const r = run([{ ...good, flaky }], ["--check"]);
    assert.equal(r.status, 1, JSON.stringify(flaky));
    assert.match(r.stderr, /demo/);
    assert.match(r.stderr, /flaky/);
  }
});
