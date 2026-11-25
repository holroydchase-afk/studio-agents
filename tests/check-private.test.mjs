// PRIV: tests for tools/check-private.mjs (building-blocks PR 3): one shared privacy scanner replacing the
// forks in pm-tools (check-private.ts + private-patterns.ts), role-radar (check-private.mjs) and ccwatts (check-private.ts).
// Usage: node tools/check-private.mjs [--staged]     Run: node --test tests/check-private.test.mjs
// Contract these tests fix (the spec was silent on some of it):
//  - kinds (exact strings): "email", "phone number", "claude.ai artifact link", "scheduled task id", "Gmail link",
//    "home path", "GitHub token", "npm token", "API secret key", "AWS access key", "Slack token", "private key",
//    "env file", "denylisted term"; extraPatterns use their own `name` as the kind.
//  - scanText(text, config) -> [{kind, line, match}]; line is 1-based; `match` is ALREADY MASKED (never the raw value).
//    config = {allowUsers, allowEmails, skip, extraPatterns, denylist: [terms]} (all optional; denylist is the already-loaded terms).
//  - masking: email = first 3 chars of the local part + "***" + "@domain"; denylisted term = first 2 chars + "…";
//    every other value = first 3 chars + "***" (values of 4 chars or fewer: "***").
//  - CLI line: `file:line: kind: masked-match`; exit 1 on any finding, else prints "check-private: clean" and exits 0.
//  - CLI scans tracked plus untracked-not-ignored files; --staged scans the staged blobs only.
// Fixtures are built from string pieces so this file holds no real-looking token or email (the repo's privacy scan reads tests too).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const tool = join(root, "tools", "check-private.mjs");
const at = "@";
const slash = "/";

// Fixture values, assembled at runtime.
const PERSONAL_EMAIL = "jane.doe" + at + "gmail" + ".com";
const PHONE = "(304) " + "867" + "-5309";
const ARTIFACT = "claude" + ".ai" + slash + "artifact" + slash + "abc12345-def6";
const TRIG = "tri" + "g_" + "01ABCDEFGHJKMN";
const GMAIL = "mail.google" + ".com" + slash + "mail" + slash + "u" + slash + "0" + slash + "#inbox" + slash + "FMfcgzGxyzabc";
const HOMEPATH = (n) => slash + "home" + slash + n;
const MACPATH = (n) => slash + "Users" + slash + n;
const WINPATH = (n) => "C:" + "\\" + "Users" + "\\" + n;
const GH = "gh" + "p_" + "A1b2C3d4E5".repeat(4);
const NPM = "npm" + "_" + "a1B2c3D4e5".repeat(3) + "a1B2c3";
const SK = "sk" + "-" + "a1B2c3D4".repeat(4);
const AWS = "AK" + "IA" + "ABCDEFGHIJKLMNOP";
const SLACK = "xo" + "xb-" + "1234567890-abcdefghij";
const PEM = "-----BEGIN " + "RSA PRIVATE" + " KEY-----";

const kinds = (hits) => hits.map((h) => h.kind);
let lib;
const scan = async (text, cfg = {}) => {
  lib ??= await import(pathToFileURL(tool).href);
  return lib.scanText(text, cfg);
};

// ---- temp repos for CLI cases
const gitEnv = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.com" };
const git = (cwd, ...a) => spawnSync("git", a, { cwd, encoding: "utf8", env: gitEnv });
function repo(files = {}, { config, track = true } = {}) {
  const d = mkdtempSync(join(tmpdir(), "chkpriv-"));
  git(d, "init", "-q");
  const all = { ...files };
  if (config !== undefined) all["studio-checks.json"] = typeof config === "string" ? config : JSON.stringify(config);
  for (const [rel, text] of Object.entries(all)) put(d, rel, text);
  if (track) git(d, "add", "-A");
  return d;
}
function put(d, rel, text) { mkdirSync(dirname(join(d, rel)), { recursive: true }); writeFileSync(join(d, rel), text); }
const run = (cwd, args = [], env = {}) => {
  const r = spawnSync("node", [tool, ...args], { cwd, encoding: "utf8", env: { ...process.env, STUDIO_CHECKS: "", PRIVATE_DENYLIST: "", ...env } });
  return { code: r.status, out: (r.stdout ?? "") + (r.stderr ?? ""), stdout: r.stdout ?? "" };
};

// ---------------- rules: positive and allowed negative ----------------
test("PRIV-1 email: a personal address is flagged and masked; allowed domains pass", async () => {
  const hits = await scan("contact " + PERSONAL_EMAIL + "\n");
  assert.deepEqual(kinds(hits), ["email"]);
  assert.equal(hits[0].line, 1);
  assert.ok(hits[0].match.startsWith("jan***"), hits[0].match);
  assert.ok(!hits[0].match.includes("jane.doe"));
  const ok = ["noreply", "no-reply", "x"].slice(0, 2).map((n) => n + at + "foo.dev")
    .concat(["a" + at + "example.com", "a" + at + "example.org", "a" + at + "example.net", "a" + at + "team.example",
      "a" + at + "anthropic.com", "12345+jd" + at + "users.noreply.github.com"]);
  assert.deepEqual(await scan(ok.join("\n")), []);
});

test("PRIV-2 phone number: flagged; a plain digit run or version string is not", async () => {
  assert.deepEqual(kinds(await scan("call " + PHONE)), ["phone number"]);
  assert.deepEqual(kinds(await scan("call 304-" + "867-5309")), ["phone number"]);
  assert.deepEqual(await scan("build 20260101-1234 v1.2.3 id 1234567890123"), []);
});

test("PRIV-3 claude.ai artifact link flagged", async () => {
  assert.deepEqual(kinds(await scan("see https://" + ARTIFACT)), ["claude.ai artifact link"]);
  assert.deepEqual(await scan("see https://claude" + ".ai/docs"), []);
});

test("PRIV-4 trig_ scheduled-task id flagged", async () => {
  assert.deepEqual(kinds(await scan("id " + TRIG)), ["scheduled task id"]);
  assert.deepEqual(await scan("the trig_ prefix is documented"), []);
});

test("PRIV-5 Gmail thread/search link flagged", async () => {
  assert.deepEqual(kinds(await scan("https://" + GMAIL)), ["Gmail link"]);
  assert.deepEqual(await scan("https://mail.google" + ".com/"), []);
});

test("PRIV-6 home paths: all three shapes flagged, masked, lines counted", async () => {
  const hits = await scan(["ok", HOMEPATH("alice1"), MACPATH("bob22"), WINPATH("carol3")].join("\n"));
  assert.deepEqual(kinds(hits), ["home path", "home path", "home path"]);
  assert.deepEqual(hits.map((h) => h.line), [2, 3, 4]);
  for (const h of hits) assert.ok(!/alice1|bob22|carol3/.test(h.match), h.match);
});

test("PRIV-7 home path allowed when the user is in allowUsers (case-insensitive); others still flagged", async () => {
  const cfg = { allowUsers: ["Demo", "user"] };
  assert.deepEqual(await scan(HOMEPATH("demo") + "\n" + MACPATH("USER") + "\n" + WINPATH("demo"), cfg), []);
  assert.deepEqual(kinds(await scan(HOMEPATH("zed99"), cfg)), ["home path"]);
});

test("PRIV-8 tokens and keys: each kind flagged, none echoed whole", async () => {
  const cases = [["GitHub token", GH], ["npm token", NPM], ["API secret key", SK], ["AWS access key", AWS], ["Slack token", SLACK], ["private key", PEM]];
  for (const [kind, value] of cases) {
    const hits = await scan("x = " + value + "\n");
    assert.deepEqual(kinds(hits), [kind], kind);
    assert.ok(!hits[0].match.includes(value) || kind === "private key", kind + " echoed whole");
    if (kind !== "private key") assert.ok(hits[0].match.length < value.length, kind + " not shortened");
  }
  assert.deepEqual(await scan("sk-short and gh" + "p_tooshort and AK" + "IA123"), []);
});

test("PRIV-9 allowEmails config: exact address allowed (case-insensitive), a neighbour is not", async () => {
  const cfg = { allowEmails: [PERSONAL_EMAIL.toUpperCase()] };
  assert.deepEqual(await scan(PERSONAL_EMAIL, cfg), []);
  assert.deepEqual(kinds(await scan("other.person" + at + "gmail.com", cfg)), ["email"]);
});

test("PRIV-10 extraPatterns: custom rule uses its name as the kind, masked, with line number", async () => {
  const cfg = { extraPatterns: [{ name: "project code", pattern: "ZQX-[0-9]{4}" }] };
  const hits = await scan("a\nb ZQX-1234 c", cfg);
  assert.deepEqual(hits.map((h) => [h.kind, h.line]), [["project code", 2]]);
  assert.ok(!hits[0].match.includes("ZQX-1234"));
  assert.deepEqual(await scan("ZQX-12", cfg), []);
});

test("PRIV-11 denylist: whole word, case-insensitive, masked to 2 chars + ellipsis", async () => {
  const cfg = { denylist: ["Rivendell"] };
  const hits = await scan("a\nvisited RIVENDELL today", cfg);
  assert.deepEqual(hits.map((h) => [h.kind, h.line, h.match]), [["denylisted term", 2, "Ri…"]]);
  assert.deepEqual(await scan("Rivendellish and xrivendell", cfg), []);
});

test("PRIV-12 clean text gives no hits; same line twice gives two hits with the right lines", async () => {
  assert.deepEqual(await scan("just words\nand more\n"), []);
  const hits = await scan("a\n" + PERSONAL_EMAIL + " " + PERSONAL_EMAIL + "\n\n" + PHONE);
  assert.deepEqual(hits.map((h) => [h.kind, h.line]), [["email", 2], ["email", 2], ["phone number", 4]]);
});

// ---------------- CLI ----------------
test("PRIV-13 CLI: clean repo prints 'check-private: clean' and exits 0", () => {
  const d = repo({ "a.txt": "hello\n" });
  const r = run(d);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /check-private: clean/);
});

test("PRIV-14 CLI: finding exits 1 with 'file:line: kind: masked' and never the full value", () => {
  const d = repo({ "src/a.txt": "ok\n" + PERSONAL_EMAIL + "\n", "src/b.txt": "t = " + GH + "\n" });
  const r = run(d);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /^src\/a\.txt:2: email: jan\*\*\*/m);
  assert.match(r.out, /^src\/b\.txt:1: GitHub token: /m);
  assert.ok(!r.out.includes("jane.doe") && !r.out.includes(GH), r.out);
  assert.ok(!/check-private: clean/.test(r.out));
});

test("PRIV-15 CLI: any .env* file is a finding even when its content is harmless", () => {
  const d = repo({ ".env": "A=1\n", "cfg/.env.local": "B=2\n", "ok.txt": "fine\n" });
  const r = run(d);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /^\.env:1: env file:/m);
  assert.match(r.out, /^cfg\/\.env\.local:1: env file:/m);
  assert.ok(!/ok\.txt/.test(r.out));
});

test("PRIV-16 CLI: skips binaries, lockfiles and node_modules by default", () => {
  const bad = "x " + PERSONAL_EMAIL + "\n";
  const d = repo({ "package-lock.json": bad, "pnpm-lock.yaml": bad, "yarn.lock": bad, "node_modules/p/i.js": bad, "img.png": bad, "bin.dat": "a\0b " + PERSONAL_EMAIL });
  const r = run(d);
  assert.equal(r.code, 0, r.out);
});

test("PRIV-17 CLI: untracked files that are not ignored are scanned; gitignored ones are not", () => {
  const d = repo({ ".gitignore": "ignored.txt\n", "a.txt": "ok\n" });
  put(d, "new.txt", PERSONAL_EMAIL + "\n");
  put(d, "ignored.txt", PERSONAL_EMAIL + "\n");
  const r = run(d);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /^new\.txt:1: email:/m);
  assert.ok(!/ignored\.txt/.test(r.out));
});

test("PRIV-18 CLI --staged: scans the staged blob, not the working tree", () => {
  const d = repo({ "a.txt": "clean\n" });
  git(d, "commit", "-qm", "init");
  put(d, "a.txt", PERSONAL_EMAIL + "\n");
  git(d, "add", "a.txt");
  put(d, "a.txt", "clean again\n"); // working tree is clean, the staged blob is not
  const r = run(d, ["--staged"]);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /^a\.txt:1: email:/m);
});

test("PRIV-19 CLI --staged: an unstaged dirty file is ignored; nothing staged is clean", () => {
  const d = repo({ "a.txt": "clean\n" });
  git(d, "commit", "-qm", "init");
  put(d, "a.txt", PERSONAL_EMAIL + "\n"); // modified, not staged
  put(d, "u.txt", PERSONAL_EMAIL + "\n"); // untracked
  const r = run(d, ["--staged"]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /check-private: clean/);
});

test("PRIV-20 CLI --staged: a staged .env file is a finding", () => {
  const d = repo({ ".env": "A=1\n" });
  const r = run(d, ["--staged"]);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /^\.env:1: env file:/m);
});

// ---------------- config ----------------
test("PRIV-21 config: studio-checks.json 'private' allowUsers and allowEmails are honoured by the CLI", () => {
  const files = { "a.txt": HOMEPATH("demo") + "\n" + PERSONAL_EMAIL + "\n" };
  const d = repo(files, { config: { agents: { verify: "x" }, private: { allowUsers: ["demo"] } } });
  const r1 = run(d);
  assert.equal(r1.code, 1, r1.out);
  assert.ok(!/home path/.test(r1.out), "allowed user flagged: " + r1.out);
  assert.match(r1.out, /^a\.txt:2: email:/m);
  const d2 = repo(files, { config: { private: { allowUsers: ["demo"], allowEmails: [PERSONAL_EMAIL] } } });
  assert.equal(run(d2).code, 0);
});

test("PRIV-22 config: 'skip' regex strings exclude paths", () => {
  const d = repo({ "fixtures/x.txt": PERSONAL_EMAIL + "\n", "src/y.txt": "ok\n" }, { config: { private: { skip: ["^fixtures/"] } } });
  const r = run(d);
  assert.equal(r.code, 0, r.out);
});

test("PRIV-23 config: extraPatterns apply in the CLI under the pattern's name", () => {
  const d = repo({ "a.txt": "x ZQX-1234\n" }, { config: { private: { extraPatterns: [{ name: "project code", pattern: "ZQX-[0-9]{4}" }] } } });
  const r = run(d);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /^a\.txt:1: project code: /m);
});

test("PRIV-24 config: STUDIO_CHECKS env points to another config file", () => {
  const d = repo({ "a.txt": HOMEPATH("demo") + "\n" });
  put(d, "alt/checks.json", JSON.stringify({ private: { allowUsers: ["demo"] } }));
  assert.equal(run(d).code, 1);
  const r = run(d, [], { STUDIO_CHECKS: join(d, "alt", "checks.json") });
  assert.equal(r.code, 0, r.out);
});

test("PRIV-25 config: a missing studio-checks.json, or one without a 'private' section, still works with defaults", () => {
  const none = repo({ "a.txt": PERSONAL_EMAIL + "\n" });
  assert.ok(!existsSync(join(none, "studio-checks.json")));
  const r = run(none);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /^a\.txt:1: email:/m);
  const bare = repo({ "a.txt": "ok\n" }, { config: { agents: { verify: "x" } } });
  assert.equal(run(bare).code, 0);
});

// ---------------- denylist ----------------
test("PRIV-26 PRIVATE_DENYLIST: terms (comments and blanks ignored) match whole words, case-insensitively, and print masked", () => {
  const d = repo({ "a.txt": "line\nmet Rivendell today\nxrivendellx\n", "b.txt": "Gondor\n" });
  const list = join(d, "..", "deny-" + Math.random().toString(36).slice(2) + ".txt");
  writeFileSync(list, "# private names\n\nrivendell\n  Gondor  \n");
  const r = run(d, [], { PRIVATE_DENYLIST: list });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /^a\.txt:2: denylisted term: ri…$/m);
  assert.match(r.out, /^b\.txt:1: denylisted term: go…$/m);
  assert.ok(!/a\.txt:3/.test(r.out));
  assert.ok(!/rivendell|gondor/i.test(r.out.replace(/ri…|go…/gi, "")), "full term echoed: " + r.out);
});

test("PRIV-27 PRIVATE_DENYLIST pointing at a missing file does not crash; generic rules still run", () => {
  const d = repo({ "a.txt": "ok\n" });
  const r = run(d, [], { PRIVATE_DENYLIST: join(d, "nope.txt") });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /check-private: clean/);
});

// ---------------- manifest ----------------
test("PRIV-28 templates/manifest.json lists tools/check-private.mjs -> scripts/check-private.mjs, managed", async () => {
  const { readFileSync } = await import("node:fs");
  const m = JSON.parse(readFileSync(join(root, "templates", "manifest.json"), "utf8"));
  const e = m.entries.find((x) => x.src === "tools/check-private.mjs");
  assert.ok(e, "no manifest entry for tools/check-private.mjs");
  assert.equal(e.dest, "scripts/check-private.mjs");
  assert.equal(e.policy, "managed");
});
