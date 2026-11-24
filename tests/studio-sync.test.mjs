// SYNC: tests for tools/studio-sync.mjs and templates/manifest.json (building-blocks PR 1, "Sync weaknesses").
// Usage: node tools/studio-sync.mjs <targetRepo> [--check] [--force] [--json]
// Exit 0 clean/synced; 1 --check found changes; 2 conflicts (local edits or unrecorded-differs).
// Library: syncRepo({source, target, sha, force}) -> {sha, updated[], unchanged[], conflicts[], seeded[]}
// Formats these tests fix (spec was silent): result lists hold dest strings, except conflicts which hold
// {dest, reason: "local-edit"|"unrecorded-differs", stat}; a tool in tools/ syncs to scripts/<name>.mjs;
// CLI tests copy tools/studio-sync.mjs into a fake source repo, so the tool locates its source from its own path.
// Run: node --test tests/studio-sync.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, statSync, readdirSync, utimesSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const realTool = join(root, "tools", "studio-sync.mjs");
const work = () => mkdtempSync(join(tmpdir(), "ssync-"));
const put = (base, rel, text) => { mkdirSync(dirname(join(base, rel)), { recursive: true }); writeFileSync(join(base, rel), text); };
const get = (base, rel) => readFileSync(join(base, rel), "utf8");
const git = (cwd, ...a) => spawnSync("git", a, { cwd, encoding: "utf8", env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.com" } });

// A tiny source repo: one tool importing another, a managed template, a seed template, its own manifest.
function fakeSource() {
  const d = work();
  put(d, "tools/a.mjs", 'import { b } from "./b.mjs";\nexport const a = b;\n');
  put(d, "tools/b.mjs", "export const b = 1;\n");
  put(d, "templates/handoff-check.yml", "name: handoff v1\n");
  put(d, "templates/studio-checks.json", '{"bannedWords":[]}\n');
  put(d, "templates/manifest.json", JSON.stringify({
    entries: [
      { src: "tools/a.mjs", dest: "scripts/a.mjs", policy: "managed" },
      { src: "templates/handoff-check.yml", dest: ".github/workflows/handoff-check.yml", policy: "managed" },
      { src: "templates/studio-checks.json", dest: "studio-checks.json", policy: "seed" },
    ],
    ignore: [],
  }, null, 2));
  if (existsSync(realTool)) copyFileSync(realTool, join(d, "tools", "studio-sync.mjs"));
  git(d, "init", "-q"); git(d, "add", "."); git(d, "commit", "-q", "-m", "one");
  return d;
}
const sha = (d) => git(d, "rev-parse", "HEAD").stdout.trim();
const bump = (d, rel, text) => { put(d, rel, text); git(d, "add", "."); git(d, "commit", "-q", "-m", "bump"); };
const cli = (source, ...args) => spawnSync("node", [join(source, "tools", "studio-sync.mjs"), ...args], { encoding: "utf8" });
const lib = async () => (await import("../tools/studio-sync.mjs")).syncRepo;
const mtimes = (t) => ["scripts/a.mjs", "scripts/b.mjs", ".github/workflows/handoff-check.yml", "studio-checks.json"].map((f) => statSync(join(t, f)).mtimeMs);

test("SYNC-1 manifest: entries have src, dest, policy; every src exists; no duplicate dest", () => {
  const p = join(root, "templates", "manifest.json");
  assert.ok(existsSync(p), "templates/manifest.json missing");
  const m = JSON.parse(readFileSync(p, "utf8"));
  assert.ok(Array.isArray(m.entries) && m.entries.length > 0);
  const dests = new Set();
  for (const e of m.entries) {
    assert.ok(["managed", "seed"].includes(e.policy), `bad policy for ${e.src}`);
    assert.ok(existsSync(join(root, e.src)), `src missing: ${e.src}`);
    assert.ok(!dests.has(e.dest), `duplicate dest ${e.dest}`);
    dests.add(e.dest);
  }
  assert.ok(m.entries.some((e) => e.dest === "studio-checks.json" && e.policy === "seed"), "studio-checks.json must be a seed");
});

test("SYNC-1 manifest: every tools/*.mjs and templates/scripts/* file is covered or ignored", () => {
  const m = JSON.parse(readFileSync(join(root, "templates", "manifest.json"), "utf8"));
  const covered = new Set([...m.entries.map((e) => e.src), ...(m.ignore || [])]);
  const all = [
    ...readdirSync(join(root, "tools")).filter((f) => f.endsWith(".mjs")).map((f) => `tools/${f}`),
    ...readdirSync(join(root, "templates", "scripts")).map((f) => `templates/scripts/${f}`),
  ];
  const missing = all.filter((f) => !covered.has(f));
  assert.deepEqual(missing, [], `not in manifest or ignore: ${missing.join(", ")}`);
});

test("SYNC-2 syncRepo copies managed and seed files and writes .studio-sync.json with hashes", async () => {
  const syncRepo = await lib();
  const s = fakeSource(), t = work();
  const r = await syncRepo({ source: s, target: t, sha: "abc123" });
  assert.equal(get(t, "scripts/a.mjs"), get(s, "tools/a.mjs"));
  assert.equal(get(t, ".github/workflows/handoff-check.yml"), "name: handoff v1\n");
  assert.equal(get(t, "studio-checks.json"), '{"bannedWords":[]}\n');
  const rec = JSON.parse(get(t, ".studio-sync.json"));
  assert.equal(rec.sha, "abc123");
  for (const d of ["scripts/a.mjs", "scripts/b.mjs", ".github/workflows/handoff-check.yml", "studio-checks.json"]) assert.match(rec.files[d].hash, /^[0-9a-f]{16,}$/, d);
  assert.deepEqual(r.seeded, ["studio-checks.json"]);
});

test("SYNC-2 sha defaults to git rev-parse HEAD of the source", async () => {
  const syncRepo = await lib();
  const s = fakeSource(), t = work();
  await syncRepo({ source: s, target: t });
  assert.equal(JSON.parse(get(t, ".studio-sync.json")).sha, sha(s));
});

test("SYNC-3 re-run with no change reports unchanged, exit 0, mtimes untouched", () => {
  const s = fakeSource(), t = work();
  assert.equal(cli(s, t).status, 0);
  const old = new Date(2020, 0, 1);
  for (const f of ["scripts/a.mjs", "scripts/b.mjs", ".github/workflows/handoff-check.yml", "studio-checks.json"]) utimesSync(join(t, f), old, old);
  const before = mtimes(t);
  const r = cli(s, t, "--json");
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out.updated, []);
  assert.deepEqual(out.conflicts, []);
  assert.equal(out.unchanged.length, 4);
  assert.deepEqual(mtimes(t), before);
});

test("SYNC-4 source update reaches a managed file; seed file is never overwritten", () => {
  const s = fakeSource(), t = work();
  cli(s, t);
  bump(s, "templates/handoff-check.yml", "name: handoff v2\n");
  bump(s, "templates/studio-checks.json", '{"bannedWords":["x"]}\n');
  const r = cli(s, t, "--json");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(get(t, ".github/workflows/handoff-check.yml"), "name: handoff v2\n");
  assert.equal(get(t, "studio-checks.json"), '{"bannedWords":[]}\n');
  assert.deepEqual(JSON.parse(r.stdout).updated, [".github/workflows/handoff-check.yml"]);
  assert.equal(JSON.parse(get(t, ".studio-sync.json")).sha, sha(s));
});

test("SYNC-4 a locally edited seed file is left alone and is not a conflict", () => {
  const s = fakeSource(), t = work();
  cli(s, t);
  put(t, "studio-checks.json", '{"bannedWords":["crew"]}\n');
  const r = cli(s, t, "--json");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(get(t, "studio-checks.json"), '{"bannedWords":["crew"]}\n');
  assert.deepEqual(JSON.parse(r.stdout).conflicts, []);
});

test("SYNC-5 locally edited managed file is not overwritten: conflict with diff stat, exit 2", () => {
  const s = fakeSource(), t = work();
  cli(s, t);
  put(t, ".github/workflows/handoff-check.yml", "name: handoff LOCAL\n");
  bump(s, "templates/handoff-check.yml", "name: handoff v2\n");
  const r = cli(s, t, "--json");
  assert.equal(r.status, 2, r.stderr);
  assert.equal(get(t, ".github/workflows/handoff-check.yml"), "name: handoff LOCAL\n");
  const c = JSON.parse(r.stdout).conflicts;
  assert.equal(c.length, 1);
  assert.equal(c[0].dest, ".github/workflows/handoff-check.yml");
  assert.equal(c[0].reason, "local-edit");
  assert.ok(typeof c[0].stat === "string" && c[0].stat.length > 0, "short diff stat expected");
});

test("SYNC-5 --force overwrites the conflicting file and prints its dest name", () => {
  const s = fakeSource(), t = work();
  cli(s, t);
  put(t, ".github/workflows/handoff-check.yml", "name: handoff LOCAL\n");
  bump(s, "templates/handoff-check.yml", "name: handoff v2\n");
  const r = cli(s, t, "--force");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(get(t, ".github/workflows/handoff-check.yml"), "name: handoff v2\n");
  assert.match(r.stdout, /\.github\/workflows\/handoff-check\.yml/);
  assert.ok(!existsSync(join(t, ".github/workflows/handoff-check.yml.local-backup")), "no backup file: force just overwrites");
});

test("SYNC-6 unrecorded managed file identical to source is adopted and recorded", () => {
  const s = fakeSource(), t = work();
  put(t, ".github/workflows/handoff-check.yml", "name: handoff v1\n");
  const r = cli(s, t, "--json");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout).conflicts, []);
  assert.ok(JSON.parse(get(t, ".studio-sync.json")).files[".github/workflows/handoff-check.yml"].hash);
});

test("SYNC-6 unrecorded managed file that differs is reported unrecorded-differs, kept, exit 2", () => {
  const s = fakeSource(), t = work();
  put(t, ".github/workflows/handoff-check.yml", "name: old pre-manifest copy\n");
  const r = cli(s, t, "--json");
  assert.equal(r.status, 2, r.stderr);
  assert.equal(get(t, ".github/workflows/handoff-check.yml"), "name: old pre-manifest copy\n");
  const c = JSON.parse(r.stdout).conflicts;
  assert.equal(c.length, 1);
  assert.equal(c[0].reason, "unrecorded-differs");
});

test("SYNC-7 --check makes no writes, exits 1 when something would change, prints a line per file", () => {
  const s = fakeSource(), t = work();
  const r = cli(s, t, "--check");
  assert.equal(r.status, 1);
  assert.ok(!existsSync(join(t, ".studio-sync.json")) && !existsSync(join(t, "scripts")), "--check wrote files");
  for (const d of ["scripts/a.mjs", "studio-checks.json"]) assert.match(r.stdout, new RegExp(d.replace(".", "\\.")));
  assert.ok(r.stdout.trim().split("\n").length >= 4, "one line per file");
});

test("SYNC-7 --check exits 0 and writes nothing when clean", () => {
  const s = fakeSource(), t = work();
  cli(s, t);
  const rec = get(t, ".studio-sync.json");
  const r = cli(s, t, "--check");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(get(t, ".studio-sync.json"), rec);
});

test("SYNC-8 a tool importing ./b.mjs brings b.mjs too", () => {
  const s = fakeSource(), t = work();
  assert.equal(cli(s, t).status, 0);
  assert.equal(get(t, "scripts/b.mjs"), "export const b = 1;\n");
  assert.ok(JSON.parse(get(t, ".studio-sync.json")).files["scripts/b.mjs"], "dependency recorded");
});

test("SYNC-9 --json prints {sha, updated, unchanged, conflicts, seeded}", () => {
  const s = fakeSource(), t = work();
  const r = cli(s, t, "--json");
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.sha, sha(s));
  for (const k of ["updated", "unchanged", "conflicts", "seeded"]) assert.ok(Array.isArray(out[k]), k);
  assert.ok(out.updated.includes("scripts/a.mjs"));
  assert.deepEqual(out.seeded, ["studio-checks.json"]);
});

test("SYNC-2 syncedAt is ignored when comparing: a no-change re-run leaves .studio-sync.json content identical", () => {
  const s = fakeSource(), t = work();
  cli(s, t);
  const a = JSON.parse(get(t, ".studio-sync.json"));
  cli(s, t);
  const b = JSON.parse(get(t, ".studio-sync.json"));
  delete a.syncedAt; delete b.syncedAt;
  assert.deepEqual(a, b);
});
