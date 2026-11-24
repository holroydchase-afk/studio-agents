// Failing-first tests for the repo-check hardening round (privacy-security findings STK-PS-R10, R11, R12, R15, R16),
// written by qa-tdd before any production code. Separate from tests/stakeholder-repo-check.test.mjs, which is not edited.
// Every test builds its own small fixture repo in a temp dir. No network. Secret-looking values are assembled at run
// time and never written into this file.
//
// Contracts these tests pin where the privacy-security brief leaves a choice (engineer: follow them, or change them with qa-tdd):
//   R10  Fail closed. Anything the scan cannot read (binary file with a NUL, over 1 MB, unreadable, inside ANY dir named
//        .git or node_modules except a top-level .git) refuses the run: exit 1, no stdout, stderr names the file (escaped).
//        --allow-unscanned turns that into exit 0 with a top-level `unscanned` array in the JSON; each entry names the file
//        and gives a reason. A clean repo has `unscanned: []`. Only a top-level .git is skipped, and it is reported under
//        `skipped` or `unscanned`. UTF-16 files with a BOM (LE or BE) are decoded and scanned, flag or no flag.
//   R11  A 1 MB hostile line finishes in under 2 s; a real JWT on another line is still found (exit 1, file and line named).
//   R12  guard.writeAtomic: random temp name, exclusive create (wx), mode 0600, never writes through a planted symlink,
//        leaves no temp file; the CLI refuses --out == --index-out; if the second write fails the first file is removed.
//   R15  File names, symlink names and `uses:` refs never reach the output holding an email or token (refuse or redact);
//        names and refs are at most 80 chars; `skipped` is sorted by file in code point order and capped at 100 entries,
//        with a numeric `skipped_omitted` giving how many were left out.
//   R16  Caps, each refused with a reason and no stack trace: more than 5000 directories ("director"), more than 5000
//        symlinks ("symlink"), nesting deeper than 200 levels ("depth|deep|nest"). A cap of 20 levels or more is fine for real repos.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS = path.join(ROOT, "plugins", "stakeholder", "tools");
const TOOL = path.join(TOOLS, "repo-check.mjs");
const GUARD = path.join(TOOLS, "lib", "guard.mjs");
const STD = path.join(ROOT, "tests", "fixtures", "stakeholder", "repo-standards.frozen.md");

let n = 0;
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), `skt1h-${process.pid}-${n++}-`));
const read = (p) => fs.readFileSync(p, "utf8");
const put = (root, rel, text = "x\n") => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); return p; };
const SHA = "a".repeat(40);
const CI_OK = `name: ci\non: [push]\npermissions:\n  contents: read\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@${SHA}\n`;
const V = () => ({ email: "fixture-user@notreserved.net", key: "ghp_" + "Q".repeat(36) });
const jwt = () => `eyJ${"a".repeat(10)}.eyJ${"b".repeat(10)}.${"c".repeat(12)}`;

function cleanRepo() {
  const r = tmp();
  put(r, "README.md", "# Demo\n\nWhat it is and why.\n");
  put(r, "LICENSE", "MIT License\n");
  put(r, ".github/workflows/ci.yml", CI_OK);
  put(r, "package-lock.json", "{}\n");
  return r;
}
function run(clone, extra = [], { index = true } = {}) {
  assert.ok(fs.existsSync(TOOL), "plugins/stakeholder/tools/repo-check.mjs does not exist");
  const dir = tmp(); const idx = path.join(dir, "index.json");
  const args = [TOOL, clone, "--standards", STD, ...(index ? ["--index-out", idx] : []), ...extra];
  const t0 = Date.now();
  const r = spawnSync("node", args, { encoding: "utf8", cwd: ROOT, timeout: 30000, maxBuffer: 64 * 1024 * 1024 });
  let json = null; try { json = JSON.parse(r.stdout); } catch {}
  return { code: r.status, out: r.stdout || "", err: r.stderr || "", json, ms: Date.now() - t0, idx, idxText: index && fs.existsSync(idx) ? read(idx) : "" };
}
const ok = (clone, extra) => { const r = run(clone, extra); assert.equal(r.code, 0, `exit ${r.code}\n${r.err.slice(0, 600)}`); assert.ok(r.json, "stdout is not JSON"); return r; };
const refused = (r, nameRe, why) => { assert.equal(r.code, 1, `${why}: expected exit 1, got ${r.code}; stdout ${r.out.slice(0, 200)}`); assert.equal(r.out, "", "a refused run writes no JSON"); assert.match(r.err, nameRe, `${why}: stderr must name the file; stderr was: ${r.err.slice(0, 300)}`); assert.doesNotMatch(r.err, /\n\s+at |RangeError|TypeError/, "no stack trace"); };
const all = (r) => r.out + r.err + r.idxText;

// ================================================================ STK-PS-R10 the stop gate fails closed
test("STK-PS-R10 a UTF-16LE file with a BOM and an email is decoded and stops the run, file and line named, value never printed", () => {
  const c = cleanRepo(); const v = V();
  fs.writeFileSync(path.join(c, "notes16.txt"), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(`hello\n${v.email}\n`, "utf16le")]));
  const r = run(c); refused(r, /notes16\.txt:2:.*email/i, "utf16le email");
  assert.ok(!all(r).includes(v.email));
});

test("STK-PS-R10 a UTF-16BE file with a BOM and a ghp_ token stops the run, even with --allow-unscanned (it is decoded, not skipped)", () => {
  const c = cleanRepo(); const v = V();
  const be = Buffer.from(`${v.key}\n`, "utf16le"); be.swap16();
  fs.writeFileSync(path.join(c, "be16.txt"), Buffer.concat([Buffer.from([0xfe, 0xff]), be]));
  refused(run(c), /be16\.txt:1:/, "utf16be token");
  refused(run(c, ["--allow-unscanned"]), /be16\.txt:1:/, "utf16be token with the flag");
});

test("STK-PS-R10 a file with a NUL byte and a ghp_ token is refused by name; with --allow-unscanned it is listed under unscanned with a reason", () => {
  const c = cleanRepo(); const v = V();
  put(c, "blob.bin", `\u0000${v.key}\u0000`);
  const r = run(c); refused(r, /blob\.bin/, "binary file"); assert.ok(!all(r).includes(v.key));
  const a = ok(c, ["--allow-unscanned"]);
  const e = (a.json.unscanned || []).find((x) => JSON.stringify(x).includes("blob.bin"));
  assert.ok(e, `blob.bin is not under unscanned: ${JSON.stringify(a.json.unscanned)}`);
  assert.ok(typeof e === "object" && Object.entries(e).some(([k, val]) => !/file|path|name/.test(k) && typeof val === "string" && val.length > 0), "an unscanned entry gives a reason");
  assert.ok(!all(a).includes(v.key));
});

test("STK-PS-R10 a file over 1 MB with an email at its end is refused by name, not skipped", () => {
  const c = cleanRepo(); const v = V();
  put(c, "big.txt", "a".repeat(1048577) + "\n" + v.email + "\n");
  const r = run(c); refused(r, /big\.txt/, "oversize file");
  assert.ok(!all(r).includes(v.email));
  const a = ok(c, ["--allow-unscanned"]);
  assert.ok((a.json.unscanned || []).some((x) => JSON.stringify(x).includes("big.txt")), JSON.stringify(a.json.unscanned));
});

test("STK-PS-R10 a token in sub/node_modules/leak.txt and one in sub/.git/leak.txt are scanned: the run is refused and names the file", () => {
  for (const dir of ["node_modules", ".git"]) {
    const c = cleanRepo(); const v = V();
    put(c, `sub/${dir}/leak.txt`, `${v.key}\n`);
    const r = run(c); refused(r, new RegExp(`sub/${dir.replace(".", "\\.")}/leak\\.txt:1:`), `nested ${dir}`);
    assert.ok(!all(r).includes(v.key));
  }
});

test("STK-PS-R10 a top-level node_modules is scanned too; only a top-level .git is skipped, and it is reported", () => {
  const c = cleanRepo(); const v = V();
  put(c, "node_modules/p/index.js", `// ${v.email}\n`);
  refused(run(c), /node_modules\/p\/index\.js:1:/, "top-level node_modules");
  const d = cleanRepo(); put(d, ".git/config", `[x]\n token = ${v.key}\n`);
  const r = ok(d);
  assert.match(JSON.stringify([r.json.skipped, r.json.unscanned]), /\.git/, "the skipped top-level .git is reported");
  assert.ok(!all(r).includes(v.key));
});

test("STK-PS-R10 an unreadable file is refused by name (skipped when running as root, which can read anything)", { skip: process.getuid && process.getuid() === 0 ? "root can read a mode 000 file" : false }, () => {
  const c = cleanRepo(); const f = put(c, "locked.txt", "x\n"); fs.chmodSync(f, 0o000);
  try { refused(run(c), /locked\.txt/, "unreadable file"); } finally { fs.chmodSync(f, 0o600); }
});

test("STK-PS-R10 a clean repo has an empty unscanned list and exits 0 with no flag", () => {
  const r = ok(cleanRepo());
  assert.deepEqual(r.json.unscanned, []);
});

test("STK-PS-R10 an unknown flag value is still a usage error: --allow-unscanned takes no value", () => {
  const r = run(cleanRepo(), ["--allow-unscanned", "yes"]);
  assert.equal(r.code, 2, `exit ${r.code}\n${r.err}`);
});

// ================================================================ STK-PS-R11 the JWT pattern is not quadratic
test("STK-PS-R11 a 1 MB hostile line of repeated eyJ finishes in under 2 s", () => {
  const c = cleanRepo(); put(c, "hostile.txt", "eyJ".repeat(340000) + "\n");
  const r = run(c);
  assert.ok(r.code === 0 || r.code === 1, `exit ${r.code} (timeout or crash?)\n${r.err.slice(0, 300)}`);
  assert.ok(r.ms < 2000 + 600, `took ${r.ms} ms; the scan itself must be under 2 s (600 ms allowed for process start)`);
});

test("STK-PS-R11 scanText on a 1 MB hostile line returns in under 2 s (run in a child with a 10 s kill, so a quadratic pattern fails instead of hanging)", () => {
  assert.ok(fs.existsSync(GUARD), "guard.mjs does not exist");
  const code = `import(${JSON.stringify(pathToFileURL(GUARD).href)}).then(({scanText})=>{const t=Date.now();scanText("eyJ".repeat(340000));process.stdout.write(String(Date.now()-t));})`;
  const r = spawnSync("node", ["-e", code], { encoding: "utf8", timeout: 10000 });
  assert.equal(r.status, 0, `scanText did not finish in 10 s (status ${r.status}, signal ${r.signal})`);
  assert.ok(Number(r.stdout) < 2000, `scanText took ${r.stdout} ms`);
});

test("STK-PS-R11 a real JWT is still detected, alone and on the line after a hostile one", () => {
  const c = cleanRepo(); put(c, "a.txt", `token header ${jwt()}\n`);
  refused(run(c), /a\.txt:1:.*(key|token|secret)/i, "plain JWT");
  const d = cleanRepo(); put(d, "b.txt", "eyJ".repeat(300000) + "\n" + jwt() + "\n");
  const r = run(d); refused(r, /b\.txt:2:/, "JWT after a hostile line");
  assert.ok(r.ms < 2600, `took ${r.ms} ms`);
});

// ================================================================ STK-PS-R12 safe atomic writes
const planted = (dir, file) => path.join(dir, `.${path.basename(file)}.tmp-${process.pid}`); // the old predictable temp name

test("STK-PS-R12 writeAtomic never writes through a symlink planted at the old temp name", async () => {
  const { writeAtomic } = await import(pathToFileURL(GUARD).href);
  const dir = tmp(); const victim = put(tmp(), "victim.txt", "PRECIOUS"); const file = path.join(dir, "out.json");
  fs.symlinkSync(victim, planted(dir, file));
  try { writeAtomic(file, "NEW\n"); } catch {}
  assert.equal(read(victim), "PRECIOUS", "the symlink target was overwritten");
});

test("STK-PS-R12 writeAtomic uses a random temp name: a regular file at the old name is left alone, and the output is written", async () => {
  const { writeAtomic } = await import(pathToFileURL(GUARD).href);
  const dir = tmp(); const file = path.join(dir, "out.json"); put(dir, path.basename(planted(dir, file)), "SQUATTER");
  writeAtomic(file, "NEW\n");
  assert.equal(read(file), "NEW\n");
  assert.equal(read(planted(dir, file)), "SQUATTER", "the predictable temp name was reused");
});

test("STK-PS-R12 writeAtomic creates the file with mode 0600 and leaves no temp file behind", async () => {
  const { writeAtomic } = await import(pathToFileURL(GUARD).href);
  const dir = tmp(); const file = path.join(dir, "out.json"); const old = process.umask(0o022);
  try { writeAtomic(file, "NEW\n"); } finally { process.umask(old); }
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  assert.deepEqual(fs.readdirSync(dir), ["out.json"]);
});

test("STK-PS-R12 --out and --index-out naming the same path are refused before anything is written", () => {
  const c = cleanRepo(); const dir = tmp(); const p = path.join(dir, "same.json");
  const r = run(c, ["--out", p, "--index-out", p], { index: false });
  assert.equal(r.code, 1, `exit ${r.code}\n${r.err}`); assert.equal(r.out, "");
  assert.match(r.err, /same|identical|different/i);
  assert.ok(!fs.existsSync(p), "nothing is written");
});

test("STK-PS-R12 the same path spelled two ways (./ and ..) is also refused", () => {
  const c = cleanRepo(); const dir = tmp(); fs.mkdirSync(path.join(dir, "sub"));
  const a = path.join(dir, "same.json"); const b = path.join(dir, "sub", "..", "same.json");
  const r = run(c, ["--out", a, "--index-out", b], { index: false });
  assert.equal(r.code, 1, `exit ${r.code}\n${r.err}`); assert.ok(!fs.existsSync(a));
});

test("STK-PS-R12 if the second write fails, the first file is removed", () => {
  const c = cleanRepo(); const dir = tmp(); const idx = path.join(dir, "index.json");
  const r = run(c, ["--index-out", idx, "--out", path.join(dir, "no-such-dir", "out.json")], { index: false });
  assert.equal(r.code, 1, `exit ${r.code}\n${r.err}`);
  assert.ok(!fs.existsSync(idx), "the index file written first was not removed");
  assert.equal(r.out, "");
});

// ================================================================ STK-PS-R15 names and refs are scanned and bounded
test("STK-PS-R15 a symlink and a file whose NAME holds an email or a token never put that value in any output", () => {
  const c = cleanRepo(); const v = V(); const out = tmp();
  fs.symlinkSync(path.join(out, "x"), path.join(c, `${v.email}.lnk`));
  fs.symlinkSync(path.join(out, "y"), path.join(c, `${v.key}.lnk`));
  put(c, `${v.email}.bak`, "x\n"); put(c, `${v.key}.tmp`, "x\n");
  const r = run(c);
  assert.ok(r.code === 0 || r.code === 1, `exit ${r.code}`);
  assert.ok(!all(r).includes(v.email), "an email in a file name reached the output");
  assert.ok(!all(r).includes(v.key), "a token in a file name reached the output");
});

test("STK-PS-R15 a workflow uses: ref holding an email is never echoed (--allow-email lets the file content through)", () => {
  const c = cleanRepo(); const v = V();
  put(c, ".github/workflows/x.yml", `name: x\non: [push]\npermissions:\n  contents: read\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: org/act@${v.email}\n`);
  const r = run(c, ["--allow-email", v.email]);
  assert.ok(r.code === 0 || r.code === 1, `exit ${r.code}`);
  assert.ok(!all(r).replace(/"address":\s*"[^"]*"/g, "").includes(v.email), "an email in a uses: ref reached findings or the index");
});

test("STK-PS-R15 a 300-char uses: ref and a 300-char symlink name are cut to 80 chars in findings, the index and skipped", () => {
  const c = cleanRepo(); const longRef = "o".repeat(300); const longName = "n".repeat(200);
  put(c, ".github/workflows/x.yml", `name: x\non: [push]\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: org/${longRef}@main\n`);
  fs.symlinkSync(path.join(tmp(), "z"), path.join(c, longName));
  const r = ok(c);
  assert.ok(!all(r).includes("o".repeat(81)), "a uses: ref longer than 80 chars was echoed");
  assert.ok(!all(r).includes("n".repeat(81)), "a file name longer than 80 chars was echoed");
  for (const s of r.json.skipped || []) for (const val of Object.values(s)) if (typeof val === "string") assert.ok(val.length <= 80 || /\s/.test(val), `skipped value over 80 chars: ${val.slice(0, 60)}...`);
});

test("STK-PS-R15 skipped is sorted by file in code point order, even across directories", () => {
  const c = cleanRepo(); const o = tmp();
  fs.symlinkSync(path.join(o, "x"), path.join(c, "a.b")); fs.mkdirSync(path.join(c, "a")); fs.symlinkSync(path.join(o, "y"), path.join(c, "a", "z"));
  fs.symlinkSync(path.join(o, "w"), path.join(c, "B"));
  const r = ok(c);
  const names = (r.json.skipped || []).map((s) => (typeof s === "string" ? s : s.file || s.path || s.name));
  assert.deepEqual(names, [...names].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0)), `skipped is not sorted: ${JSON.stringify(names)}`);
  assert.ok(names.length >= 3);
});

test("STK-PS-R15 skipped is capped at 100 entries and skipped_omitted counts the rest", () => {
  const c = cleanRepo(); const o = tmp(); const d = path.join(c, "links"); fs.mkdirSync(d);
  for (let i = 0; i < 300; i++) fs.symlinkSync(path.join(o, "t"), path.join(d, `l${String(i).padStart(3, "0")}`));
  const r = ok(c);
  assert.ok(r.json.skipped.length <= 100, `skipped holds ${r.json.skipped.length} entries`);
  assert.equal(r.json.skipped.length + r.json.skipped_omitted, 300, "skipped + skipped_omitted must cover every skipped file");
  assert.ok(r.json.skipped_omitted >= 200, `skipped_omitted is ${r.json.skipped_omitted}`);
});

// ================================================================ STK-PS-R16 caps on directories, depth and symlinks
const capRefused = (r, re, why) => { assert.equal(r.code, 1, `${why}: exit ${r.code}\n${r.err.slice(0, 300)}`); assert.equal(r.out, ""); assert.match(r.err, re, why); assert.doesNotMatch(r.err, /\n\s+at |RangeError|stack/i, "no stack trace"); };

test("STK-PS-R16 more than 5000 directories is refused with a reason naming directories and the cap", () => {
  const c = cleanRepo(); const d = path.join(c, "dirs"); fs.mkdirSync(d);
  for (let i = 0; i < 5001; i++) fs.mkdirSync(path.join(d, `d${i}`));
  const r = run(c); capRefused(r, /director/i, "dir cap"); assert.match(r.err, /too many|cap|5000/i);
});

test("STK-PS-R16 more than 5000 symlinks is refused with a reason naming symlinks and the cap", () => {
  const c = cleanRepo(); const d = path.join(c, "links"); fs.mkdirSync(d); const t = path.join(tmp(), "t");
  for (let i = 0; i < 5001; i++) fs.symlinkSync(t, path.join(d, `l${i}`));
  const r = run(c); capRefused(r, /symlink/i, "symlink cap"); assert.match(r.err, /too many|cap|5000/i);
});

test("STK-PS-R16 nesting 1500 empty directories deep is refused with a depth reason, not a stack overflow", () => {
  const c = cleanRepo(); let p = c;
  try { for (let i = 0; i < 1500; i++) { p = path.join(p, "d"); fs.mkdirSync(p); } } catch { return; } // a filesystem that cannot hold it: nothing to test
  const r = run(c); capRefused(r, /depth|deep|nest/i, "depth cap, 1500 levels");
});

test("STK-PS-R16 nesting 201 empty directories deep is refused; 20 levels deep is fine", () => {
  const deep = cleanRepo(); let p = deep; for (let i = 0; i < 201; i++) { p = path.join(p, "d"); fs.mkdirSync(p); }
  capRefused(run(deep), /depth|deep|nest/i, "depth cap, 201 levels");
  const shallow = cleanRepo(); p = shallow; for (let i = 0; i < 20; i++) { p = path.join(p, "d"); fs.mkdirSync(p); }
  put(shallow, "d/d/d/note.txt", "hello\n");
  ok(shallow);
});
