#!/usr/bin/env node
// qa-cycle: the ledger and gates for the qa-tdd build cycle (docs/product/SPEC-QA-CYCLE.md, QACYC-1..7).
//
// Commit subjects carry the phase tag: [qa:pre], [qa:post], [qa:red BUG-1], [qa:fix BUG-1] (one id per tag).
//
//   ledger --base REF [--root DIR]     counts test declarations added per tag in REF..HEAD, red and fixed ids,
//                                      removed declarations and untagged commits.
//   verify --base REF [--root DIR] [--min-post N] [--min-fixed M]
//                                      red before fix with the same id, fix touches no test file, red touches only
//                                      test files and adds a test, an id is fixed once; optional minimums.
//   gate --base REF [--root DIR] [--qa-report FILE] [--run-log FILE]
//                                      verify plus HANDOFF.md changed, no untagged commit on product code, and the
//                                      qa block / run log valid when given. Prints the manual merge steps on pass.
//   miss add --pattern P --text T [--root DIR]
//                                      appends one JSON line to evals/agent-misses/qa-tdd-inbox.jsonl.
//   ideas [--root DIR]                 groups misses by pattern; prints patterns with 2 or more.
//   harden-check --base REF [--root DIR] [--max-tests N] [--max-fixes N] [--branch-prefix P]
//                                      autonomous hardening run: branch prefix, caps, only tests and tagged fixes,
//                                      verify, kill switch. Defaults: --max-tests 20, --max-fixes 5, qa-hardening/.
//   score DIR                          per-arm means from DIR/*/result.json (the eval).
//
// Every subcommand takes --json. Exit 0 pass, 1 tripped (one reason per line on stderr), 2 usage error or
// unreadable input. Read-only git, plain Node, no network. Needs check-qa-report.mjs, check-agent-run.mjs and
// agent-guard.mjs beside it (sync all four).
import { readFileSync, readdirSync, statSync, mkdirSync, appendFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { checkQaReport } from "./check-qa-report.mjs";
import { checkAgentRun } from "./check-agent-run.mjs";
import { isTestPath } from "./agent-guard.mjs";

export const DEFAULT_MAX_TESTS = 20;
export const DEFAULT_MAX_FIXES = 5;
export const DEFAULT_PREFIX = "qa-hardening/";
export const INBOX = join("evals", "agent-misses", "qa-tdd-inbox.jsonl");
export const MEASURES = ["tests_pre", "tests_post", "bugs_found", "bugs_fixed", "edge_cases", "code_quality", "perf_path", "procedure", "seconds"];
const USAGE = [
  "usage: qa-cycle.mjs ledger --base REF [--root DIR] [--json]",
  "       qa-cycle.mjs verify --base REF [--root DIR] [--min-post N] [--min-fixed M] [--json]",
  "       qa-cycle.mjs gate --base REF [--root DIR] [--qa-report FILE] [--run-log FILE] [--json]",
  "       qa-cycle.mjs miss add --pattern P --text T [--root DIR] [--json]",
  "       qa-cycle.mjs ideas [--root DIR] [--json]",
  "       qa-cycle.mjs harden-check --base REF [--root DIR] [--max-tests N] [--max-fixes N] [--branch-prefix P] [--json]",
  "       qa-cycle.mjs score DIR [--json]",
].join("\n");

class UsageError extends Error {}

const isDir = (p) => { try { return statSync(p).isDirectory(); } catch { return false; } };
const isFile = (p) => { try { return statSync(p).isFile(); } catch { return false; } };

// ---------- git (read-only) ----------
function git(cwd, args) {
  const r = spawnSync("git", ["-c", "core.quotepath=false", ...args], {
    cwd, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  });
  return { ok: r.status === 0, out: r.stdout || "", err: (r.stderr || "").trim() };
}

function openRepo(root, base) {
  if (!isDir(root)) throw new UsageError(`--root ${root} is not a folder`);
  const top = git(root, ["rev-parse", "--show-toplevel"]);
  if (!top.ok) throw new UsageError(`${root} is not inside a git repo`);
  const repoRoot = top.out.replace(/\n$/, "");
  if (base === undefined) throw new UsageError("--base REF is required");
  if (base === "" || base.startsWith("-")) throw new UsageError(`--base "${base}" is not a commit in this repo`);
  const rev = git(repoRoot, ["rev-parse", "--verify", "--quiet", "--end-of-options", `${base}^{commit}`]);
  if (!rev.ok) throw new UsageError(`--base "${base}" is not a commit in this repo`);
  return { repoRoot, sha: rev.out.trim() };
}

// ---------- test declarations ----------
const DECL = /^\s*(?:(?:test|it)\s*\(|def\s+test_|func\s+Test)/;

// Parses `git log -p -U0` output into commits: {sha, subject, files: [{path, added, removed}]}.
function readCommits(repoRoot, sha) {
  const log = git(repoRoot, ["log", "--reverse", "--no-merges", "--no-renames", "-p", "-U0", "--format=%x01%H%x02%s", `${sha}..HEAD`, "--"]);
  if (!log.ok) throw new UsageError(`git log failed: ${log.err}`);
  const commits = [];
  for (const chunk of log.out.split("\x01").filter(Boolean)) {
    const lines = chunk.split("\n");
    const [hash, subject = ""] = lines[0].split("\x02");
    const files = [];
    let cur = null, inHunk = false;
    for (const line of lines.slice(1)) {
      const h = /^diff --git a\/(.+) b\/\1$/.exec(line);
      if (h) { cur = { path: h[1], added: 0, removed: 0 }; files.push(cur); inHunk = false; continue; }
      if (!cur) continue;
      if (line.startsWith("@@")) { inHunk = true; continue; }
      if (!inHunk) continue;
      if (line.startsWith("+") && DECL.test(line.slice(1))) cur.added++;
      else if (line.startsWith("-") && DECL.test(line.slice(1))) cur.removed++;
    }
    commits.push({ sha: hash, subject, files });
  }
  return commits;
}

// ---------- tags ----------
export function parseTag(subject) {
  let m = /^\[qa:(pre|post)\]/.exec(subject);
  if (m) return { kind: m[1], ids: [] };
  m = /^\[qa:(red|fix)(?:[ \t]+([^\]]*))?\]/.exec(subject);
  if (m) return { kind: m[1], ids: (m[2] || "").split(/\s+/).filter(Boolean) };
  return { kind: null, ids: [] };
}

const testFiles = (c) => c.files.filter((f) => isTestPath(f.path));
const addedTests = (c) => testFiles(c).reduce((s, f) => s + f.added, 0);
const short = (c) => c.sha.slice(0, 7);

export function buildLedger(commits) {
  const l = { pre: 0, post: 0, red: [], fixed: [], removed: 0, untagged: 0 };
  for (const c of commits) {
    const t = parseTag(c.subject);
    l.removed += testFiles(c).reduce((s, f) => s + f.removed, 0);
    if (!t.kind) { l.untagged++; continue; }
    if (t.kind === "pre") l.pre += addedTests(c);
    else if (t.kind === "post") l.post += addedTests(c);
    else if (t.ids.length === 1) {
      const list = t.kind === "red" ? l.red : l.fixed;
      if (!list.includes(t.ids[0])) list.push(t.ids[0]);
    }
  }
  return l;
}

export function verifyCommits(commits) {
  const reasons = [];
  const redSeen = new Set();
  const fixedSeen = new Set();
  for (const c of commits) {
    const t = parseTag(c.subject);
    if (t.kind !== "red" && t.kind !== "fix") continue;
    if (t.ids.length !== 1) {
      reasons.push(`commit ${short(c)} [qa:${t.kind}] must name exactly one id, found ${t.ids.length ? `more than one (${t.ids.join(" ")})` : "none"}`);
      continue;
    }
    const id = t.ids[0];
    if (t.kind === "red") {
      const bad = c.files.filter((f) => !isTestPath(f.path)).map((f) => f.path);
      if (bad.length) reasons.push(`${id}: red commit ${short(c)} touches non-test files: ${bad.join(", ")}`);
      if (addedTests(c) === 0) reasons.push(`${id}: red commit ${short(c)} adds no test`);
      redSeen.add(id);
    } else {
      if (!redSeen.has(id)) reasons.push(`${id}: fix commit ${short(c)} has no earlier red commit with the same id`);
      const touched = c.files.filter((f) => isTestPath(f.path)).map((f) => f.path);
      if (touched.length) reasons.push(`${id}: fix commit ${short(c)} touches a test file: ${touched.join(", ")}`);
      if (fixedSeen.has(id)) reasons.push(`${id}: fixed twice (second fix commit ${short(c)})`);
      fixedSeen.add(id);
    }
  }
  return reasons;
}

function parseCount(name, s) {
  if (s === undefined) return undefined;
  if (!/^\d+$/.test(s)) throw new UsageError(`${name} "${s}" must be a whole number, 0 or more`);
  return Number(s);
}

// ---------- subcommands ----------
function cmdLedger(opts, root) {
  const { repoRoot, sha } = openRepo(root, opts.base);
  const ledger = buildLedger(readCommits(repoRoot, sha));
  const text = [
    `pre-build tests added: ${ledger.pre}`,
    `post-build tests added: ${ledger.post}`,
    `red (bugs found): ${ledger.red.length ? ledger.red.join(", ") : "none"}`,
    `fixed: ${ledger.fixed.length ? ledger.fixed.join(", ") : "none"}`,
    `removed test declarations: ${ledger.removed}`,
    `untagged commits: ${ledger.untagged}`,
  ].join("\n");
  return { raw: ledger, text, reasons: [], notes: [] };
}

function cmdVerify(opts, root) {
  const minPost = parseCount("--min-post", opts["min-post"]) ?? 0;
  const minFixed = parseCount("--min-fixed", opts["min-fixed"]) ?? 0;
  const { repoRoot, sha } = openRepo(root, opts.base);
  const commits = readCommits(repoRoot, sha);
  const reasons = verifyCommits(commits);
  const l = buildLedger(commits);
  if (l.post < minPost) reasons.push(`post-build tests ${l.post} is under --min-post ${minPost}`);
  if (l.fixed.length < minFixed) reasons.push(`fixes ${l.fixed.length} is under --min-fixed ${minFixed}`);
  return { reasons, notes: [] };
}

export const MERGE_STEPS = [
  "Merge steps (manual, in this order):",
  "  1. Merge your own PRs on green, oldest first.",
  "  2. Use a merge commit (no squash, no force-push).",
  "  3. A merge that changes a live demo or live product waits for Chase's go; list the open PRs in merge order.",
  "  4. Before merging, tell Chase about any older open PR you cannot merge.",
];

function cmdGate(opts, root) {
  const { repoRoot, sha } = openRepo(root, opts.base);
  const commits = readCommits(repoRoot, sha);
  const reasons = verifyCommits(commits);
  const changed = git(repoRoot, ["diff", "--name-only", "--no-renames", "-z", sha, "--"]);
  if (!changed.ok) throw new UsageError(`git diff failed: ${changed.err}`);
  if (!changed.out.split("\0").includes("HANDOFF.md")) reasons.push(`HANDOFF.md did not change since ${opts.base}: update it in this PR`);
  for (const c of commits) {
    if (parseTag(c.subject).kind) continue;
    const code = c.files.map((f) => f.path).filter((p) => !isTestPath(p) && !/\.md$/i.test(p));
    if (code.length) reasons.push(`untagged commit ${short(c)} touches product code: ${code.join(", ")} (tag it [qa:...] or route it through the cycle)`);
  }
  if (opts["qa-report"] !== undefined) {
    let text = null;
    try { text = readFileSync(opts["qa-report"], "utf8"); } catch { reasons.push(`qa report: can't read ${opts["qa-report"]}`); }
    if (text !== null) for (const e of checkQaReport(text).errors) reasons.push(`qa report: ${e}`);
  }
  if (opts["run-log"] !== undefined) {
    let text = null;
    try { text = readFileSync(opts["run-log"], "utf8"); } catch { reasons.push(`run log: can't read ${opts["run-log"]}`); }
    if (text !== null) for (const e of checkAgentRun(text).errors) reasons.push(`run log: ${e}`);
  }
  return { reasons, notes: [], text: MERGE_STEPS.join("\n") };
}

const FULL_PATH = /(^|[\s"'(=])\/[\w.@-]+\/[\w.@/-]*|[A-Za-z]:\\/;

function cmdMissAdd(opts, root) {
  const pattern = (opts.pattern ?? "").trim();
  const text = (opts.text ?? "").trim();
  if (!pattern) throw new UsageError("miss add needs a non-empty --pattern");
  if (!text) throw new UsageError("miss add needs a non-empty --text");
  if (FULL_PATH.test(pattern) || FULL_PATH.test(text)) throw new UsageError("refusing text with a full path: use a file name or a repo-relative path, and no prompt content");
  if (!isDir(root)) throw new UsageError(`--root ${root} is not a folder`);
  const file = join(root, INBOX);
  mkdirSync(join(root, "evals", "agent-misses"), { recursive: true });
  appendFileSync(file, JSON.stringify({ pattern, text }) + "\n");
  return { reasons: [], notes: [], text: `recorded miss "${pattern}"` };
}

function cmdIdeas(opts, root) {
  if (!isDir(root)) throw new UsageError(`--root ${root} is not a folder`);
  const file = join(root, INBOX);
  const groups = new Map();
  if (isFile(file)) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      if (!line.trim()) continue;
      let o;
      try { o = JSON.parse(line); } catch { throw new UsageError(`${INBOX} has a line that is not JSON`); }
      if (!o || typeof o.pattern !== "string" || typeof o.text !== "string") throw new UsageError(`${INBOX} has a line without pattern and text`);
      const g = groups.get(o.pattern) || { pattern: o.pattern, count: 0, example: o.text };
      g.count++;
      groups.set(o.pattern, g);
    }
  }
  const ideas = [...groups.values()].filter((g) => g.count >= 2).sort((a, b) => b.count - a.count || a.pattern.localeCompare(b.pattern));
  const text = ideas.length
    ? ideas.map((i) => `${i.pattern} (${i.count} misses): e.g. "${i.example}". Idea: add a check or a rule in qa-tdd for this pattern; Chase accepts or rejects.`).join("\n")
    : "no ideas yet";
  return { raw: { ideas }, text, reasons: [], notes: [] };
}

function cmdHarden(opts, root) {
  const maxTests = parseCount("--max-tests", opts["max-tests"]) ?? DEFAULT_MAX_TESTS;
  const maxFixes = parseCount("--max-fixes", opts["max-fixes"]) ?? DEFAULT_MAX_FIXES;
  const prefix = opts["branch-prefix"] ?? DEFAULT_PREFIX;
  const { repoRoot, sha } = openRepo(root, opts.base);
  const commits = readCommits(repoRoot, sha);
  const reasons = [];
  const br = git(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const branch = br.ok ? br.out.trim() : "";
  if (!prefix || !branch.startsWith(prefix)) reasons.push(`branch "${branch}" must start with ${prefix || "a prefix"} (hardening runs get their own branch)`);
  reasons.push(...verifyCommits(commits));
  const ledger = buildLedger(commits);
  const tests = commits.reduce((s, c) => s + addedTests(c), 0);
  if (tests > maxTests) reasons.push(`new tests ${tests} is over --max-tests ${maxTests}`);
  if (ledger.fixed.length > maxFixes) reasons.push(`fixes ${ledger.fixed.length} is over --max-fixes ${maxFixes}`);
  for (const c of commits) {
    const t = parseTag(c.subject);
    if (t.kind === "fix") continue;
    const bad = c.files.map((f) => f.path).filter((p) => !isTestPath(p));
    if (bad.length) reasons.push(`${t.kind ? `[qa:${t.kind}]` : "untagged"} commit ${short(c)} changes non-test files that are not a tagged fix: ${bad.join(", ")}`);
  }
  for (const sw of ["agents.off", "qa-tdd.off"]) {
    if (isFile(join(repoRoot, ".claude", sw))) reasons.push(`kill switch .claude/${sw} is on: stop the run (delete the file to resume)`);
  }
  return { reasons, notes: [] };
}

const GRADER = ["edge_cases", "code_quality", "perf_path", "procedure"];

function cmdScore(dir) {
  if (!dir) throw new UsageError("score needs DIR");
  if (!isDir(dir)) throw new UsageError(`${dir} is not a folder`);
  const runs = [];
  for (const name of readdirSync(dir).sort()) {
    const f = join(dir, name, "result.json");
    if (!isFile(f)) continue;
    let r;
    try { r = JSON.parse(readFileSync(f, "utf8")); } catch { throw new UsageError(`${name}/result.json is not valid JSON`); }
    const bad = (why) => new UsageError(`${name}/result.json: ${why}`);
    if (!r || typeof r !== "object") throw bad("must be an object");
    if (typeof r.arm !== "string" || !r.arm.trim()) throw bad("arm is missing");
    if (typeof r.case !== "string" || !r.case.trim()) throw bad("case is missing");
    if (typeof r.seconds !== "number" || !Number.isFinite(r.seconds) || r.seconds < 0) throw bad("seconds must be a number");
    const l = r.ledger;
    if (!l || typeof l !== "object" || !Number.isFinite(l.pre) || !Number.isFinite(l.post) || !Array.isArray(l.red) || !Array.isArray(l.fixed)) throw bad("ledger must have pre, post, red[] and fixed[]");
    if (!r.grader || typeof r.grader !== "object") throw bad("grader is missing");
    for (const k of GRADER) {
      const v = r.grader[k];
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 5) throw bad(`grader.${k} must be a number from 0 to 5`);
    }
    runs.push(r);
  }
  if (!runs.length) throw new UsageError(`no */result.json found in ${dir}`);
  const mean = (xs) => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100;
  const arms = {};
  for (const arm of [...new Set(runs.map((r) => r.arm))].sort()) {
    const rs = runs.filter((r) => r.arm === arm);
    const perCase = new Map();
    for (const r of rs) perCase.set(r.case, (perCase.get(r.case) || 0) + 1);
    arms[arm] = {
      n: rs.length,
      claim: [...perCase.values()].every((c) => c >= 5),
      means: {
        tests_pre: mean(rs.map((r) => r.ledger.pre)),
        tests_post: mean(rs.map((r) => r.ledger.post)),
        bugs_found: mean(rs.map((r) => r.ledger.red.length)),
        bugs_fixed: mean(rs.map((r) => r.ledger.fixed.length)),
        edge_cases: mean(rs.map((r) => r.grader.edge_cases)),
        code_quality: mean(rs.map((r) => r.grader.code_quality)),
        perf_path: mean(rs.map((r) => r.grader.perf_path)),
        procedure: mean(rs.map((r) => r.grader.procedure)),
        seconds: mean(rs.map((r) => r.seconds)),
      },
    };
  }
  const text = Object.entries(arms).map(([arm, a]) =>
    [`${arm} (n=${a.n})${a.claim ? "" : " n < 5: do not claim"}`, ...MEASURES.map((m) => `  ${m}: ${a.means[m]}`)].join("\n")).join("\n");
  return { raw: { arms }, text, reasons: [], notes: [] };
}

// ---------- CLI ----------
function parseArgs(argv, flags) {
  const pos = [];
  const opts = { json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (flags.includes(a)) {
      const v = argv[i + 1];
      if (v === undefined || (v.startsWith("-") && v !== "" && !/^-\d/.test(v))) throw new UsageError(`${a} needs a value`);
      opts[a.slice(2)] = v;
      i++;
    } else if (a.startsWith("--")) throw new UsageError(`unknown option ${a}`);
    else pos.push(a);
  }
  return { pos, opts };
}

export function main(argv) {
  const [sub, ...rest] = argv;
  if (sub === "-h" || sub === "--help") return { code: 0, out: USAGE, err: "" };
  try {
    let result;
    const rootOf = (opts) => {
      if (opts.root === "") throw new UsageError("--root needs a value");
      return opts.root !== undefined ? resolve(opts.root) : process.cwd();
    };
    const noPos = (pos) => { if (pos.length) throw new UsageError(`${sub} takes no positional arguments`); };
    let opts;
    if (sub === "ledger" || sub === "verify" || sub === "gate" || sub === "harden-check") {
      const flags = { ledger: ["--base", "--root"], verify: ["--base", "--root", "--min-post", "--min-fixed"],
        gate: ["--base", "--root", "--qa-report", "--run-log"],
        "harden-check": ["--base", "--root", "--max-tests", "--max-fixes", "--branch-prefix"] }[sub];
      const p = parseArgs(rest, flags);
      noPos(p.pos);
      opts = p.opts;
      const fn = { ledger: cmdLedger, verify: cmdVerify, gate: cmdGate, "harden-check": cmdHarden }[sub];
      result = fn(opts, rootOf(opts));
    } else if (sub === "miss") {
      const p = parseArgs(rest, ["--pattern", "--text", "--root"]);
      opts = p.opts;
      if (p.pos.length !== 1 || p.pos[0] !== "add") throw new UsageError("miss takes one action: add");
      result = cmdMissAdd(opts, rootOf(opts));
    } else if (sub === "ideas") {
      const p = parseArgs(rest, ["--root"]);
      noPos(p.pos);
      opts = p.opts;
      result = cmdIdeas(opts, rootOf(opts));
    } else if (sub === "score") {
      const p = parseArgs(rest, []);
      opts = p.opts;
      if (p.pos.length !== 1) throw new UsageError("score takes one DIR");
      result = cmdScore(p.pos[0]);
    } else {
      throw new UsageError(sub === undefined ? "no subcommand" : `unknown subcommand "${sub}"`);
    }
    const ok = result.reasons.length === 0;
    let out;
    if (opts.json) out = JSON.stringify(result.raw ?? { ok, reasons: result.reasons });
    else out = ok ? [result.text, ...result.notes].filter(Boolean).join("\n") : "";
    const err = [...result.reasons, ...(opts.json ? result.notes : [])].join("\n");
    return { code: ok ? 0 : 1, out, err };
  } catch (e) {
    if (e instanceof UsageError) return { code: 2, out: "", err: `${e.message}\n${USAGE}` };
    throw e;
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  const { code, out, err } = main(process.argv.slice(2));
  if (out) console.log(out);
  if (err) console.error(err);
  process.exit(code);
}
