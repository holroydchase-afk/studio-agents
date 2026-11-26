// Failing-first tests for EvalPM capture (docs/product/SPEC-EVALPM-CAPTURE.md, EVPM-C1..C9).
// Spawns `node evalpm/evalpm.mjs capture <add|list|build|stamp|check> [--agent A] [--root DIR] ...`; fixtures in temp dirs only.
// CHOICES PINNED HERE (spec leaves open): captures live at <root>/evals/captures/<agent>/<id>.json with a `date` of YYYY-MM-DD;
//   build writes <root>/evals/captures/<agent>.tasks.json (array of {id, split, text, rubric, capture:{kind, verdict}});
//   list prints "<n> new" for captures added since the last build; refusals print one line on stderr or stdout and exit 1.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EP = path.join(ROOT, "evalpm", "evalpm.mjs");
const TOOL = path.join(ROOT, "tools", "eval-pipeline.mjs");
// built at runtime so secret scanners do not flag this file
const KEY = ["sk", "A1b2C3d4E5f6G7h8i9J0"].join("-");
const GHP = ["ghp", "Z9y8X7w6V5u4T3s2R1q0P9o8N7m6L5k4J3"].join("_");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "evpmc-"));
const wr = (p, d) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, typeof d === "string" ? d : JSON.stringify(d, null, 1)); return p; };
const rd = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const splitOf = (id) => (crypto.createHash("sha256").update(id).digest()[0] % 3 === 0 ? "dev" : "heldout");

function cap(root, sub, args) {
  const r = spawnSync(process.execPath, [EP, "capture", sub, ...args, "--root", root], { encoding: "utf8", cwd: root, timeout: 60000 });
  return { code: r.status, out: r.stdout || "", err: r.stderr || "", all: (r.stdout || "") + (r.stderr || "") };
}
const tool = (root, args) => {
  const r = spawnSync(process.execPath, [TOOL, ...args, "--root", root], { encoding: "utf8", cwd: root, timeout: 60000 });
  return { code: r.status, all: (r.stdout || "") + (r.stderr || "") };
};
const ok = (r, w = "") => { assert.equal(r.code, 0, `${w} exit ${r.code}\n${r.all}`); return r; };
const refused = (r, w = "") => { assert.equal(r.code, 1, `${w} should exit 1, got ${r.code}\n${r.all}`); assert.ok(r.all.trim().length > 0, `${w}: needs a reason`); return r; };
const A = "demo";
const capFile = (root, id) => path.join(root, "evals", "captures", A, `${id}.json`);
const tasksFile = (root) => path.join(root, "evals", "captures", `${A}.tasks.json`);
const imp = (root, id, o = {}) => cap(root, "add", ["--agent", A, "--id", id, "--kind", "improvement",
  "--prompt", o.prompt ?? `Summarise the change called ${id} for a busy reader`, "--before", o.before ?? "It was long and vague and buried the point deep inside",
  "--after", o.after ?? "It leads with the decision and then lists three short reasons", "--verdict", o.verdict ?? "better", ...(o.extra ?? [])]);
const bug = (root, id, o = {}) => cap(root, "add", ["--agent", A, "--id", id, "--kind", "bug",
  "--prompt", o.prompt ?? `Review the plan named ${id}`, "--missed", o.missed ?? "the migration drops the audit column without a backup", ...(o.extra ?? [])]);
const ids = (n) => Array.from({ length: n }, (_, i) => `case-${i + 1}`);

test("EVPM-C1 add writes the capture file with the spec fields", () => {
  const root = tmp();
  ok(imp(root, "tidy-summary", { extra: ["--note", "one line"] }));
  const c = rd(capFile(root, "tidy-summary"));
  assert.equal(c.id, "tidy-summary"); assert.equal(c.kind, "improvement"); assert.equal(c.verdict, "better");
  assert.match(c.prompt, /tidy-summary/); assert.match(c.before, /buried/); assert.match(c.after, /decision/); assert.equal(c.note, "one line");
  assert.equal(c.split, splitOf("tidy-summary")); assert.match(c.date, /^\d{4}-\d{2}-\d{2}$/);
  ok(bug(root, "missed-backup"));
  const b = rd(capFile(root, "missed-backup"));
  assert.equal(b.kind, "bug"); assert.match(b.missed, /audit column/);
});

test("EVPM-C1 add refuses bad input with exit 1 and one reason", () => {
  const root = tmp();
  refused(imp(root, "Bad_ID"), "bad id");
  refused(imp(root, "has space"), "space id");
  refused(cap(root, "add", ["--agent", A, "--id", "x1", "--kind", "bug", "--missed", "m"]), "missing prompt");
  refused(cap(root, "add", ["--agent", A, "--id", "x2", "--kind", "improvement", "--prompt", "p", "--after", "a", "--verdict", "better"]), "no before");
  refused(cap(root, "add", ["--agent", A, "--id", "x3", "--kind", "improvement", "--prompt", "p", "--before", "b", "--verdict", "better"]), "no after");
  refused(cap(root, "add", ["--agent", A, "--id", "x4", "--kind", "improvement", "--prompt", "p", "--before", "b", "--after", "a"]), "no verdict");
  refused(imp(root, "x5", { verdict: "great" }), "bad verdict");
  refused(cap(root, "add", ["--agent", A, "--id", "x6", "--kind", "bug", "--prompt", "p"]), "bug without missed");
  refused(cap(root, "add", ["--agent", A, "--id", "x7", "--kind", "other", "--prompt", "p"]), "bad kind");
  refused(imp(root, "x8", { after: "a".repeat(4001) }), "over 4000");
  refused(bug(root, "x9", { missed: "m".repeat(4001) }), "over 4000 missed");
  assert.ok(!fs.existsSync(path.join(root, "evals", "captures", A)) || fs.readdirSync(path.join(root, "evals", "captures", A)).length === 0, "refusals write nothing");
  ok(imp(root, "x10", { after: "a".repeat(4000) }), "exactly 4000 is fine");
});

test("EVPM-C1 duplicate id refused unless --replace", () => {
  const root = tmp();
  ok(imp(root, "dup-one"));
  refused(imp(root, "dup-one"), "duplicate");
  ok(imp(root, "dup-one", { verdict: "worse", extra: ["--replace"] }));
  assert.equal(rd(capFile(root, "dup-one")).verdict, "worse");
});

test("EVPM-C2 URLs become (link removed)", () => {
  const root = tmp();
  ok(imp(root, "has-url", { prompt: "Check https://example.com/private/page?x=1 and report", before: "see http://internal.test/a before", after: "now see www-less https://b.example.org/z done" }));
  const raw = fs.readFileSync(capFile(root, "has-url"), "utf8");
  assert.ok(!/https?:\/\//.test(raw), raw);
  assert.ok(!raw.includes("example.com") && !raw.includes("internal.test"));
  assert.match(rd(capFile(root, "has-url")).prompt, /\(link removed\)/);
});

test("EVPM-C2 key-shaped strings refused and never echoed", () => {
  for (const secret of [KEY, GHP]) {
    const root = tmp();
    for (const field of ["--prompt", "--before", "--after", "--note"]) {
      const args = ["--agent", A, "--id", "k1", "--kind", "improvement", "--prompt", "p", "--before", "b", "--after", "a", "--verdict", "better"];
      args[args.indexOf(field) + 1] = `text with ${secret} inside`;
      if (field === "--note") args.push("--note", `text with ${secret} inside`);
      const r = cap(root, "add", args);
      refused(r, `secret in ${field}`);
      assert.ok(!r.all.includes(secret), `secret echoed for ${field}`);
    }
    const r = bug(root, "k2", { missed: `leaked ${secret}` });
    refused(r, "secret in missed"); assert.ok(!r.all.includes(secret));
    assert.ok(!fs.existsSync(capFile(root, "k1")) && !fs.existsSync(capFile(root, "k2")), "nothing written");
  }
  const root = tmp();
  ok(imp(root, "short-sk", { prompt: "mention sk-short only" }), "sk- with under 16 chars is allowed");
});

test("EVPM-C3 @file reads the file; missing file exits 1", () => {
  const root = tmp();
  const bf = wr(path.join(root, "b.txt"), "the old answer rambled for ages without a point"), af = wr(path.join(root, "a.txt"), "the new answer states the point first");
  ok(cap(root, "add", ["--agent", A, "--id", "from-file", "--kind", "improvement", "--prompt", "p", "--before", `@${bf}`, "--after", `@${af}`, "--verdict", "tie"]));
  const c = rd(capFile(root, "from-file"));
  assert.match(c.before, /rambled/); assert.match(c.after, /point first/);
  refused(cap(root, "add", ["--agent", A, "--id", "nofile", "--kind", "improvement", "--prompt", "p", "--before", `@${path.join(root, "nope.txt")}`, "--after", "a", "--verdict", "better"]), "missing file");
  assert.ok(!fs.existsSync(capFile(root, "nofile")));
});

test("EVPM-C4 list prints counts by kind and verdict, split counts and new since build", () => {
  const root = tmp();
  ok(imp(root, "l-one", { verdict: "better" })); ok(imp(root, "l-two", { verdict: "worse" })); ok(imp(root, "l-three", { verdict: "tie" })); ok(bug(root, "l-bug"));
  let r = ok(cap(root, "list", ["--agent", A]));
  assert.match(r.out, /improvement\D+3/i); assert.match(r.out, /bug\D+1/i);
  assert.match(r.out, /better\D+1/i); assert.match(r.out, /worse\D+1/i); assert.match(r.out, /tie\D+1/i);
  const all = ["l-one", "l-two", "l-three", "l-bug"], dev = all.filter((i) => splitOf(i) === "dev").length;
  assert.match(r.out, new RegExp(`dev\\D+${dev}\\b`, "i")); assert.match(r.out, new RegExp(`held-?out\\D+${4 - dev}\\b`, "i"));
  assert.match(r.out, /4 new/);
  ok(cap(root, "build", ["--agent", A]));
  r = ok(cap(root, "list", ["--agent", A])); assert.match(r.out, /0 new/);
  ok(imp(root, "l-five"));
  r = ok(cap(root, "list", ["--agent", A])); assert.match(r.out, /1 new/);
});

test("EVPM-C5 build writes the tasks file with rubrics per kind, skips ties and says how many", () => {
  const root = tmp();
  ok(imp(root, "b-better", { verdict: "better" })); ok(imp(root, "b-worse", { verdict: "worse" })); ok(imp(root, "b-tie", { verdict: "tie" })); ok(bug(root, "b-bug"));
  const r = ok(cap(root, "build", ["--agent", A]));
  assert.match(r.out, /1 (tie|skipped)|skipped\D+1/i, r.out);
  const t = rd(tasksFile(root)), by = Object.fromEntries(t.map((x) => [x.id, x]));
  assert.equal(t.length, 3); assert.ok(!by["b-tie"]);
  for (const x of t) { assert.ok(["dev", "heldout"].includes(x.split)); assert.equal(x.split, splitOf(x.id)); assert.ok(x.text && x.rubric); }
  assert.equal(by["b-bug"].rubric, "Pass only if the reply raises this problem, which a past review missed: the migration drops the audit column without a backup");
  assert.equal(by["b-better"].rubric, "Pass only if the reply does what the accepted result does: It leads with the decision and then lists three short reasons. It fails if it repeats the problem in the earlier result: It was long and vague and buried the point deep inside");
  assert.equal(by["b-worse"].rubric, "Pass only if the reply avoids what the rejected result does: It leads with the decision and then lists three short reasons, and keeps what the earlier result did: It was long and vague and buried the point deep inside");
  assert.deepEqual(by["b-better"].capture, { kind: "improvement", verdict: "better" });
  assert.deepEqual(by["b-worse"].capture, { kind: "improvement", verdict: "worse" });
  assert.equal(by["b-bug"].capture.kind, "bug");
});

test("EVPM-C5 build is byte-identical on rebuild and independent of add order", () => {
  const a = tmp(), b = tmp(), set = ids(6);
  for (const i of set) ok(imp(a, i));
  for (const i of [...set].reverse()) ok(imp(b, i));
  ok(cap(a, "build", ["--agent", A])); const first = fs.readFileSync(tasksFile(a));
  ok(cap(a, "build", ["--agent", A])); assert.ok(first.equals(fs.readFileSync(tasksFile(a))), "rebuild differs");
  ok(cap(b, "build", ["--agent", A])); assert.ok(first.equals(fs.readFileSync(tasksFile(b))), "order changed output");
});

test("EVPM-C5 split is stable by id and never changes on replace or later adds", () => {
  const root = tmp();
  for (const i of ids(8)) ok(imp(root, i));
  for (const i of ids(8)) assert.equal(rd(capFile(root, i)).split, splitOf(i), i);
  const splits = new Set(ids(8).map(splitOf)); assert.equal(splits.size, 2, "fixture ids should cover both splits");
  ok(imp(root, "case-1", { verdict: "worse", extra: ["--replace"] }));
  assert.equal(rd(capFile(root, "case-1")).split, splitOf("case-1"));
});

test("EVPM-C5 build with no cases exits 1 with one reason", () => {
  const root = tmp();
  refused(cap(root, "build", ["--agent", A]), "nothing captured");
  ok(imp(root, "only-tie", { verdict: "tie" }));
  const r = refused(cap(root, "build", ["--agent", A]), "only ties");
  assert.ok(!fs.existsSync(tasksFile(root)), "no tasks file when no cases");
  assert.equal(r.all.trim().split("\n").length, 1, r.all);
});

test("EVPM-C6 leak guard: text is the prompt only, no 6-word run from before/after/missed/note or the verdict leaks", () => {
  const root = tmp();
  const before = "alpha bravo charlie delta echo foxtrot golf hotel", after = "one two three four five six seven eight nine", note = "kilo lima mike november oscar papa quebec";
  ok(imp(root, "leak-a", { prompt: "Please rewrite the status update for the team", before, after, extra: ["--note", note] }));
  ok(bug(root, "leak-b", { prompt: "Review the rollout plan for the team", missed: "romeo sierra tango uniform victor whiskey xray", extra: ["--note", note] }));
  ok(cap(root, "build", ["--agent", A]));
  const t = rd(tasksFile(root));
  const runs = (s) => { const w = s.toLowerCase().split(/\s+/).filter(Boolean), o = []; for (let i = 0; i + 6 <= w.length; i++) o.push(w.slice(i, i + 6).join(" ")); return o; };
  const secrets = [before, after, note, "romeo sierra tango uniform victor whiskey xray"].flatMap(runs);
  for (const x of t) {
    for (const r of secrets) assert.ok(!x.text.toLowerCase().includes(r), `leak of "${r}" in ${x.id}`);
    assert.equal(x.text, rd(capFile(root, x.id)).prompt, "text is the prompt only");
    assert.ok(!/\bbetter\b|\bworse\b/.test(x.text.replace(/rewrite/g, "")), "verdict not in text");
  }
});

test("EVPM-C6 a 6-word run shared with the prompt is allowed through", () => {
  const root = tmp();
  const shared = "the quick brown fox jumps over";
  ok(imp(root, "shared-run", { prompt: `Explain why ${shared} the lazy dog`, before: `old ${shared} text`, after: "new answer" }));
  ok(cap(root, "build", ["--agent", A]));
  assert.match(rd(tasksFile(root))[0].text, /the quick brown fox jumps over/);
});

test("EVPM-C7 stamp and check on an agent file", () => {
  const root = tmp(), f = wr(path.join(root, "agent.md"), "You are a careful reviewer.\n");
  const r0 = refused(cap(root, "check", ["--agent", A, "--agent-file", f]), "no stamp yet");
  assert.match(r0.all, /agent changed since last run/);
  ok(cap(root, "stamp", ["--agent", A, "--agent-file", f]));
  const r1 = ok(cap(root, "check", ["--agent", A, "--agent-file", f]));
  assert.match(r1.out, /agent unchanged since last run/);
  fs.appendFileSync(f, "One more rule.\n");
  const r2 = refused(cap(root, "check", ["--agent", A, "--agent-file", f]), "changed");
  assert.match(r2.all, /agent changed since last run/);
  ok(cap(root, "stamp", ["--agent", A, "--agent-file", f]));
  ok(cap(root, "check", ["--agent", A, "--agent-file", f]));
  const stamps = [];
  const walk = (d) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); fs.statSync(p).isDirectory() ? walk(p) : stamps.push(p); } };
  walk(root);
  assert.ok(stamps.some((p) => fs.readFileSync(p, "utf8").includes(sha(fs.readFileSync(f)))), "sha256 of the agent file is recorded under --root");
  assert.ok(stamps.every((p) => p.startsWith(root)));
});

test("EVPM-C8 built tasks plus a suite config pass check-suite, then freeze and verify", () => {
  const root = tmp();
  for (const i of ids(3)) ok(imp(root, i));
  ok(bug(root, "missed-one"));
  ok(cap(root, "build", ["--agent", A]));
  const t = rd(tasksFile(root));
  const cfg = {
    agent: A, kind: "cases", tasks: `evals/captures/${A}.tasks.json`, rubric: `evals/${A}/rubric.md`,
    split: { dev: t.filter((x) => x.split === "dev").length, heldout: t.filter((x) => x.split === "heldout").length },
    arms: ["agent", "plain"], runs: 3, votes: 3, grader_model: "model-grader-9", agent_model: "model-alpha-1",
    key: `evals/suites/${A}.key.json`, direct: false, strip: [],
  };
  wr(path.join(root, cfg.rubric), "Judge each reply against the task's own rubric.\n");
  const suite = `evals/suites/${A}.json`; wr(path.join(root, suite), cfg);
  ok(tool(root, ["check-suite", suite]), "check-suite");
  ok(tool(root, ["freeze", "--suite", suite]), "freeze");
  ok(tool(root, ["verify", "--suite", suite]), "verify");
});

test("EVPM-C9 help and README mention capture with the section and a worked example", () => {
  const h = spawnSync(process.execPath, [EP, "help"], { encoding: "utf8" });
  assert.equal(h.status, 0); assert.match(h.stdout, /capture/);
  assert.match(h.stdout, /add/); assert.match(h.stdout, /build/);
  const readme = fs.readFileSync(path.join(ROOT, "evalpm", "README.md"), "utf8");
  assert.match(readme, /Grow your suite from your own improvements/);
  assert.match(readme, /evalpm\.mjs capture add/); assert.match(readme, /evalpm\.mjs capture build/);
  assert.match(readme, /private repo/i); assert.match(readme, /personal data/i);
});

test("EVPM-C all: the capture tests never wrote into the repo", () => {
  assert.ok(!fs.existsSync(path.join(ROOT, "evals", "captures")), "evals/captures must not appear in the repo");
});

// ---- review fixes (EVPM-C-PS-R1..R4, R6, R7; EVPM-C-UX-R1..R3, R5), each red first
const addArgs = (extra) => ["--agent", A, "--id", "r1", "--kind", "bug", "--missed", "m", ...extra];

test("EVPM-C-PS-R1 @file is confined to --root: outside, dotfile and symlink escapes are refused, nothing copied", () => {
  const root = tmp(), out = tmp();
  const secret = wr(path.join(out, "secret.txt"), "TOPSECRETCONTENT for nobody");
  wr(path.join(root, ".env"), "TOPSECRETCONTENT dotfile");
  fs.symlinkSync(secret, path.join(root, "link.txt"));
  for (const target of [secret, "../" + path.basename(out) + "/secret.txt", ".env", "link.txt"]) {
    const r = refused(cap(root, "add", addArgs(["--prompt", `@${target}`])), `@${target}`);
    assert.ok(!r.all.includes("TOPSECRETCONTENT"));
    assert.ok(!fs.existsSync(capFile(root, "r1")), "nothing written");
  }
  wr(path.join(root, "notes", "ok.txt"), "a fine prompt inside the root");
  ok(cap(root, "add", addArgs(["--prompt", "@notes/ok.txt"])));
  const big = wr(path.join(root, "big.txt"), "x".repeat(5000));
  refused(cap(root, "add", ["--agent", A, "--id", "r2", "--kind", "bug", "--missed", "m", "--prompt", `@${big}`]), "oversize file");
});

test("EVPM-C-PS-R2 more key shapes are refused and never echoed", () => {
  const shapes = [["github", "pat", "11ABCDEFG0123456789abcdefghij"].join("_"), "AK" + "IA" + "ABCDEFGHIJKLMNOP", ["xox", "b-1234567890-abcdefghij"].join(""),
    ["eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiIxMjM0NTY3ODkwIn0", "abcdefghijklmnop"].join("."), "-----BEGIN " + "PRIVATE KEY-----", "Bearer " + "abcdefghijklmnopqrstuvwx",
    ["sk", "live", "abcdefghijklmnop1234"].join("_"), ["sb", "secret", "abcdefghijklmnop1234"].join("_"), "AI" + "zaSyA1234567890abcdefghijklmnopqrstu"];
  for (const s of shapes) {
    const root = tmp(), r = refused(cap(root, "add", addArgs(["--prompt", `value ${s} here`])), s.slice(0, 6));
    assert.ok(!r.all.includes(s), "echoed");
    assert.ok(!fs.existsSync(capFile(root, "r1")));
  }
});

test("EVPM-C-PS-R3 any URL scheme in any case, and email addresses, are removed", () => {
  const root = tmp();
  ok(cap(root, "add", addArgs(["--prompt", "See HTTPS://Example.COM/x then postgres://user:pw@db.internal/app and s3://bucket/key, mail jane.doe@example.org now"])));
  const c = rd(capFile(root, "r1"));
  for (const bad of ["example.com", "pw@", "db.internal", "bucket", "jane.doe", "example.org"]) assert.ok(!c.prompt.toLowerCase().includes(bad), `${bad} in ${c.prompt}`);
  assert.match(c.prompt, /\(link removed\)/);
});

test("EVPM-C-PS-R4 first write puts a .gitignore of * in evals/captures", () => {
  const root = tmp();
  ok(cap(root, "add", addArgs(["--prompt", "p"])));
  assert.equal(fs.readFileSync(path.join(root, "evals", "captures", ".gitignore"), "utf8").trim(), "*");
});

test("EVPM-C-PS-R6 a corrupt capture file is refused in one line without quoting its content", () => {
  const root = tmp();
  ok(bug(root, "fine-one"));
  wr(capFile(root, "broken"), '{"id": "broken", SECRETBITS not json');
  for (const sub of ["list", "build"]) {
    const r = refused(cap(root, sub, ["--agent", A]), sub);
    assert.ok(!r.all.includes("SECRETBITS"), r.all); assert.equal(r.all.trim().split("\n").length, 1);
    assert.match(r.all, /broken/);
  }
});

test("EVPM-C-PS-R7 oversize agent file refused", () => {
  const root = tmp(), f = wr(path.join(root, "huge.md"), "x".repeat(6 * 1024 * 1024));
  refused(cap(root, "stamp", ["--agent", A, "--agent-file", f]), "huge agent file");
});

test("EVPM-C-UX-R1..R3, R5 clearer messages", () => {
  const root = tmp();
  let r = cap(root, "--root-only", []); void r;
  const none = spawnSync(process.execPath, [EP, "capture", "--root", root], { encoding: "utf8" });
  assert.equal(none.status, 2); assert.match(none.stderr, /capture needs a command: add, list, build, stamp or check/);
  const noFile = refused(cap(root, "check", ["--agent", A]), "no agent file");
  assert.match(noFile.all, /capture stamp --agent .* --agent-file/);
  const missing = refused(cap(root, "stamp", ["--agent", A, "--agent-file", "nope.md"]), "missing agent file");
  assert.match(missing.all, /cannot read nope\.md/);
  const imp1 = refused(cap(root, "add", ["--agent", A, "--id", "u1", "--kind", "improvement", "--prompt", "p"]), "improvement missing");
  assert.match(imp1.all, /--before, --after and --verdict/);
});
