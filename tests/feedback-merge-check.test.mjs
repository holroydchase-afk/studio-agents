// Failing-first tests for tools/feedback-merge-check.mjs (docs/product/SPEC-FEEDBACK-LOOP.md, FBK-25). Does not exist yet.
//
// INTERFACE
//   Named export: checkMerge({repo, files, lines?, livePaths?, maxLines?}) -> {ok: boolean, reasons: string[]}
//     repo      product repo name (case-insensitive)      files  changed file paths, repo-relative, forward slashes
//     lines     total changed lines (default 0)           maxLines  default 80; lines > maxLines refuses
//     livePaths list of live-site paths; default ["index.html", "CNAME", "demo/"]. An entry ending "/" matches any
//               file under it; otherwise it matches the file name or path exactly (at any depth for a bare name).
//   Refuses (ok false, one reason per cause, each naming the path or rule) for: any file under .github/; CLAUDE.md
//   (any depth); package.json, package-lock.json, yarn.lock, pnpm-lock.yaml (any depth); a path containing auth,
//   privacy, data or secret (case-insensitive); repo "hearth" for any file; any live path; too many lines.
//   CLI: node tools/feedback-merge-check.mjs --repo NAME [--lines N] [--max-lines N] [--live-paths a,b,c] <file...>
//     exit 0 allow (quiet), 1 refuse (reasons on stderr, one per line), 2 usage error (no --repo, no files, bad number).
//   An empty files list is a usage error, never an allow.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = path.join(ROOT, "tools", "feedback-merge-check.mjs");
async function lib() { assert.ok(fs.existsSync(TOOL), "tools/feedback-merge-check.mjs is missing"); return import(pathToFileURL(TOOL).href); }
function cli(args) {
  assert.ok(fs.existsSync(TOOL), "tools/feedback-merge-check.mjs is missing");
  const r = spawnSync(process.execPath, [TOOL, ...args], { encoding: "utf8", timeout: 30000 });
  return { code: r.status, out: r.stdout || "", err: r.stderr || "" };
}

test("FBK-25 a one-line CSS change in a non-live repo is allowed (export and CLI exit 0, quiet)", async () => {
  const { checkMerge } = await lib();
  assert.deepEqual(checkMerge({ repo: "energy-scanner", files: ["web/styles.css"], lines: 1 }), { ok: true, reasons: [] });
  const r = cli(["--repo", "energy-scanner", "--lines", "1", "web/styles.css"]);
  assert.equal(r.code, 0, r.err);
  assert.equal(r.err, "");
});

test("FBK-25 .github/ and CLAUDE.md refuse, naming the path, at any depth", async () => {
  const { checkMerge } = await lib();
  for (const f of [".github/workflows/pages.yml", ".github/ISSUE_TEMPLATE/feedback.yml", "CLAUDE.md", "docs/CLAUDE.md"]) {
    const r = checkMerge({ repo: "energy-scanner", files: [f], lines: 1 });
    assert.equal(r.ok, false, f);
    assert.ok(r.reasons.some((s) => s.includes(f)), JSON.stringify([f, r]));
    const c = cli(["--repo", "energy-scanner", "--lines", "1", f]);
    assert.equal(c.code, 1, f);
    assert.ok(c.err.includes(f), c.err);
  }
});

test("FBK-25 package manifests and lockfiles refuse at any depth", async () => {
  const { checkMerge } = await lib();
  for (const f of ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "web/package.json"]) {
    assert.equal(checkMerge({ repo: "energy-scanner", files: [f], lines: 1 }).ok, false, f);
  }
});

test("FBK-25 paths containing auth, privacy, data or secret refuse (any case)", async () => {
  const { checkMerge } = await lib();
  for (const f of ["src/auth/login.ts", "docs/PRIVACY.md", "src/userdata.js", "lib/Secret_store.js", "supabase/data/seed.sql"]) {
    const r = checkMerge({ repo: "energy-scanner", files: [f], lines: 1 });
    assert.equal(r.ok, false, f);
    assert.ok(r.reasons.some((s) => s.includes(f)), JSON.stringify([f, r]));
  }
  assert.equal(cli(["--repo", "energy-scanner", "--lines", "1", "src/auth/login.ts"]).code, 1);
});

test("FBK-25 every file in repo hearth refuses, even a one-line CSS change, in any case", async () => {
  const { checkMerge } = await lib();
  for (const repo of ["hearth", "Hearth"]) {
    const r = checkMerge({ repo, files: ["app/styles.css"], lines: 1 });
    assert.equal(r.ok, false, repo);
    assert.ok(r.reasons.some((s) => /hearth/i.test(s)), JSON.stringify(r));
  }
  assert.equal(cli(["--repo", "hearth", "--lines", "1", "app/styles.css"]).code, 1);
});

test("FBK-25 live-site paths refuse by default: index.html, CNAME, demo/ (any depth below)", async () => {
  const { checkMerge } = await lib();
  for (const f of ["index.html", "CNAME", "demo/app.js", "demo/energy-scanner/styles.css"]) {
    const r = checkMerge({ repo: "portfolio", files: [f], lines: 1 });
    assert.equal(r.ok, false, f);
    assert.ok(r.reasons.some((s) => s.includes(f)), JSON.stringify([f, r]));
  }
  assert.equal(cli(["--repo", "portfolio", "--lines", "1", "demo/app.js"]).code, 1);
});

test("FBK-25 the live-paths list is configurable: custom paths refuse, and defaults no longer apply", async () => {
  const { checkMerge } = await lib();
  assert.equal(checkMerge({ repo: "r", files: ["site/home.html"], lines: 1, livePaths: ["site/"] }).ok, false);
  assert.equal(checkMerge({ repo: "r", files: ["demo/app.css"], lines: 1, livePaths: ["site/"] }).ok, true);
  assert.equal(cli(["--repo", "r", "--lines", "1", "--live-paths", "site/,CNAME", "site/home.html"]).code, 1);
  assert.equal(cli(["--repo", "r", "--lines", "1", "--live-paths", "site/", "demo/app.css"]).code, 0);
});

test("FBK-25 the line cap is 80: 80 allowed, 81 refused, --max-lines overrides", async () => {
  const { checkMerge } = await lib();
  assert.equal(checkMerge({ repo: "r", files: ["web/styles.css"], lines: 80 }).ok, true);
  const r = checkMerge({ repo: "r", files: ["web/styles.css"], lines: 81 });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((s) => /80|lines/i.test(s)), JSON.stringify(r));
  assert.equal(checkMerge({ repo: "r", files: ["web/styles.css"], lines: 30, maxLines: 20 }).ok, false);
  assert.equal(cli(["--repo", "r", "--lines", "81", "web/styles.css"]).code, 1);
  assert.equal(cli(["--repo", "r", "--lines", "81", "--max-lines", "100", "web/styles.css"]).code, 0);
});

test("FBK-25 one bad file among good ones refuses; each cause gets its own reason line on the CLI", async () => {
  const { checkMerge } = await lib();
  assert.equal(checkMerge({ repo: "r", files: ["web/a.css", "web/b.css", ".github/dependabot.yml"], lines: 3 }).ok, false);
  const c = cli(["--repo", "r", "--lines", "3", "web/a.css", "CLAUDE.md", "package.json"]);
  assert.equal(c.code, 1);
  assert.ok(c.err.split("\n").filter((l) => l.trim()).length >= 2, c.err);
});

test("FBK-25 usage errors exit 2: no --repo, no files, a bad --lines, and an empty files list never allows", async () => {
  const { checkMerge } = await lib();
  assert.equal(cli(["web/styles.css"]).code, 2);
  assert.equal(cli(["--repo", "r"]).code, 2);
  assert.equal(cli(["--repo", "r", "--lines", "x", "web/styles.css"]).code, 2);
  assert.equal(checkMerge({ repo: "r", files: [], lines: 0 }).ok, false);
});
