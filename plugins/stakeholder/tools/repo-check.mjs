#!/usr/bin/env node
// repo-check: checks a local clone against the public repo standards checklist, using only what it can see on disk.
//   repo-check <clone-dir> [--standards <file>] [--index-out <file>] [--out <file>] [--allow-email <address>] [--allow-unscanned]
// Plain Node, no packages. It reads files and never runs, fetches or follows anything in them. It guesses nothing:
// a thing it cannot see locally is listed (needs_github_data, needs_human), never marked pass or fail.
// A file it cannot read (binary, over 1 MB, unreadable) refuses the run unless --allow-unscanned,
// which lists such files under "unscanned". Exit 0 ok, 1 refused or failed (one reason per line on stderr), 2 usage. Output is JSON on stdout, or in --out.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { esc, cmp, Refusal, MAX_BYTES, scanText, walkTree, readTexts, writeAtomic, samePath, safeName, runMain } from "./lib/guard.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_STANDARDS = path.join(HERE, "..", "..", "..", "docs", "repo-standards.md");
const CAP_FINDINGS = 10;
const SHA = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex");

// Item identity is the first 8 hex of the hash of a standards line. The wording is never stored here: a line whose
// hash is not in this table (the checklist was edited) is unmapped, never judged by a check meant for other text.
const CHECK_BY_LINE_HASH = {
  a34a62bf: "readme", efca3b07: "license", "5e79e637": "contributing", "3562ac3c": "conduct", d14f5239: "security",
  "0d7ec983": "templates", "52ebae7d": "gh:description and topics", "37a626a2": "gh:social preview",
  "83cf75e8": "ci", "67eacebe": "gh:branch protection", eb70cc50: "deps", "05cae05a": "updates", d60439f7: "permissions",
  "522aa1bb": "human:history not scanned (the tree is checked for secrets and personal data; git history is not)",
  "21444f42": "gh:releases", "8dff4288": "clutter", "7ecf6f3d": "scratch",
  "23d41005": "human:naming consistency", "00944946": "gh:default branch", "02ca2bdb": "badge",
  f7b6e821: "human:readable commit history", "3d943da3": "human:runs in five commands",
};
const SEVERITY = { readme: "P0", license: "P0", contributing: "P1", conduct: "P2", security: "P1", templates: "P2", ci: "P1", deps: "P1", updates: "P2", permissions: "P1", clutter: "P2", scratch: "P2", badge: "P2" };
const FIX = {
  readme: "Add a README that says what the project is, how to install and use it.",
  license: "Add a LICENSE file with a recognised license.",
  contributing: "Add a short CONTRIBUTING.md saying how to report a bug and open a pull request.",
  conduct: "Add a CODE_OF_CONDUCT.md (the Contributor Covenant is fine).",
  security: "Add a SECURITY.md saying how to report a vulnerability privately.",
  templates: "Add issue templates and a pull request template under .github.",
  ci: "Add a GitHub Actions workflow that runs tests and lint on every pull request.",
  deps: "Commit a lockfile and pin every GitHub Action to a full version tag or a commit SHA.",
  updates: "Add a Dependabot or Renovate configuration.",
  permissions: "Set least-privilege permissions at the top of every workflow.",
  clutter: "Move planning, handoff and agent notes out of the repo root into docs/internal.",
  scratch: "Remove stray scratch files, .DS_Store files and large binaries from the tree.",
  badge: "Add a CI badge to the README that points at a workflow file that exists.",
};
const GITHUB_MISSING = {
  "gh:description and topics": "repo description and topics (set on GitHub, not in the clone)",
  "gh:social preview": "social preview image (set on GitHub, not in the clone)",
  "gh:branch protection": "branch protection settings on the default branch",
  "gh:default branch": "default branch name on GitHub",
  "gh:releases": "releases and tags with notes",
};

const usage = (m) => { throw new Refusal([`usage: repo-check <clone-dir> [--standards <file>] [--index-out <file>] [--out <file>] [--allow-email <address>] [--allow-unscanned]`, m].filter(Boolean), 2); };

function parseArgs(argv) {
  const o = { dir: null, standards: null, indexOut: null, out: null, allow: new Set(), allowUnscanned: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--allow-unscanned") { o.allowUnscanned = true; continue; }
    if (a.startsWith("--")) {
      if (!["--standards", "--index-out", "--out", "--allow-email"].includes(a)) usage(`unknown option ${esc(a)}`);
      const v = argv[++i]; if (v === undefined || v.startsWith("--")) usage(`${a} needs a value`);
      if (a === "--standards") o.standards = v; else if (a === "--index-out") o.indexOut = v; else if (a === "--out") o.out = v; else o.allow.add(v.toLowerCase());
    } else if (o.dir === null) o.dir = a; else usage("only one clone directory is allowed");
  }
  if (o.dir === null) usage("missing <clone-dir>");
  if (o.out && o.indexOut && samePath(o.out, o.indexOut)) throw new Refusal("--out and --index-out name the same file; use two different files");
  return o;
}

// Standards file -> numbered sections only; unnumbered sections hold no items. Items: {id, key|null}.
function loadItems(file) {
  let text;
  try { if (fs.statSync(file).size > MAX_BYTES) throw new Refusal(`${esc(path.basename(file))}: standards file is too large (over 1 MB)`); text = fs.readFileSync(file, "utf8"); }
  catch (e) { if (e instanceof Refusal) throw e; throw new Refusal(`cannot read the standards file ${esc(path.basename(file))}`); }
  const items = []; let section = null, n = 0;
  for (const line of text.split("\n")) {
    if (/^## /.test(line)) { const m = /^## (\d+)\./.exec(line); section = m ? m[1] : null; n = 0; continue; }
    if (section && line.startsWith("- ")) { n++; items.push({ id: `S${section}.${n}`, key: CHECK_BY_LINE_HASH[SHA(line.slice(2).trim()).slice(0, 8)] || null }); }
  }
  return { items, sha: SHA(text) };
}

const idKey = (id) => id.slice(1).split(".").map(Number);
const idCmp = (a, b) => { const x = idKey(a), y = idKey(b); return x[0] - y[0] || x[1] - y[1]; };

function inspect(root) {
  return walkTree(root, { dirAsFile: (rel) => /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(rel) });
}

function main(argv) {
  const o = parseArgs(argv);
  let standards = o.standards;
  if (!standards) {
    if (!fs.existsSync(DEFAULT_STANDARDS)) usage("--standards <file> is required outside the studio-agents repo: an installed plugin has no docs/repo-standards.md");
    standards = DEFAULT_STANDARDS;
  }
  let st; try { st = fs.statSync(o.dir); } catch { throw new Refusal("the clone directory does not exist or cannot be read"); }
  if (!st.isDirectory()) throw new Refusal("the clone path is not a directory");
  const { items, sha } = loadItems(standards);

  const root = path.resolve(o.dir);
  const { entries, skipped, unscanned } = inspect(root);
  const texts = readTexts(root, entries, unscanned);

  // Secrets and personal data stop the run: no output of any kind is written.
  const problems = []; const allowedCount = new Map();
  for (const [rel, text] of [...texts].sort((a, b) => cmp(a[0], b[0]))) {
    const { hits, allowed } = scanText(text, o.allow);
    for (const h of hits) problems.push(`${safeName(rel)}:${h.line}: ${h.category} found; nothing was written`);
    for (const [k, v] of allowed) allowedCount.set(k, (allowedCount.get(k) || 0) + v);
  }
  if (!o.allowUnscanned) for (const u of unscanned) problems.push(`${u.file}: ${u.reason}; the run stops because this file could not be checked (--allow-unscanned lists it and goes on)`);
  if (problems.length) throw new Refusal(problems);
  for (const a of o.allow) if (!allowedCount.has(a)) allowedCount.set(a, 0);

  // ---- what the clone shows
  const rootFiles = entries.filter((e) => !e.rel.includes("/"));
  const rootFind = (re) => rootFiles.find((e) => re.test(e.rel));
  const has = (re) => entries.some((e) => re.test(e.rel));
  const workflows = entries.filter((e) => /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(e.rel));
  const wfText = (rel) => texts.get(rel) || "";

  const unpinned = []; let usesCount = 0;
  for (const w of workflows) {
    for (const line of wfText(w.rel).split("\n")) {
      const m = /^\s*(?:-\s*)?uses:\s*['"]?([^\s'"#]+)/.exec(line); if (!m) continue;
      const ref = m[1]; if (ref.startsWith("./") || ref.startsWith("docker://")) continue;
      usesCount++;
      const at = ref.lastIndexOf("@"); const v = at === -1 ? "" : ref.slice(at + 1);
      if (!(/^[0-9a-f]{40}$/i.test(v) || /^v?\d+\.\d+\.\d+/.test(v))) unpinned.push(ref);
    }
  }
  const noPerms = workflows.filter((w) => !/^\s*permissions\s*:/m.test(wfText(w.rel))).map((w) => path.posix.basename(w.rel));
  const readme = rootFind(/^readme(\.(md|rst|txt|markdown))?$/i);
  const readmeText = readme ? texts.get(readme.rel) || "" : "";
  const badgeFlows = [...readmeText.matchAll(/actions\/workflows\/([A-Za-z0-9_.-]+\.ya?ml)/g)].map((m) => m[1]);
  const wfNames = new Set(workflows.map((w) => path.posix.basename(w.rel)));
  const badBadges = [...new Set(badgeFlows.filter((n) => !wfNames.has(n)))];
  const clutter = rootFiles.filter((e) => /^(handoff|plan|story|notes|todo|anchors|claude|agents)(\.[a-z]+)?$/i.test(e.rel)).map((e) => e.rel);
  const scratch = entries.filter((e) => /(^|\/)\.DS_Store$/.test(e.rel) || /\.(tmp|swp|bak|orig)$|~$/.test(e.rel)).map((e) => e.rel);
  const big = entries.filter((e) => e.size > MAX_BYTES).map((e) => e.rel);
  const shown = (arr) => arr.slice(0, 3).map((x) => safeName(x)).join(", ") + (arr.length > 3 ? ` and ${arr.length - 3} more` : "");

  // A check returns null (pass), or { status, fact } (fail or partial), or a bucket string for items it cannot judge.
  const checks = {
    readme: () => (readme ? "human:overclaims, install and usage steps in the README" : { status: "fail", fact: "root has no README file" }),
    license: () => (rootFind(/^licen[sc]e(\.(md|txt))?$/i) ? null : { status: "fail", fact: "root has no LICENSE file" }),
    contributing: () => (rootFind(/^contributing\.md$/i) || has(/^(\.github|docs)\/contributing\.md$/i) ? null : { status: "fail", fact: "root has no CONTRIBUTING file" }),
    conduct: () => (rootFind(/^code_of_conduct\.md$/i) || has(/^(\.github|docs)\/code_of_conduct\.md$/i) ? null : { status: "fail", fact: "root has no CODE_OF_CONDUCT file" }),
    security: () => (rootFind(/^security\.md$/i) || has(/^(\.github|docs)\/security\.md$/i) ? null : { status: "fail", fact: "root has no SECURITY file" }),
    templates: () => {
      const issue = has(/^\.github\/issue_template(\/[^/]+|\.md)$/i); const pr = has(/^(\.github\/|docs\/)?pull_request_template(\.md|\/[^/]+)$/i) || has(/^\.github\/pull_request_template\/[^/]+$/i);
      if (issue && pr) return null;
      return { status: issue || pr ? "partial" : "fail", fact: issue ? "no pull request template in .github" : pr ? "no issue templates in .github" : "no issue templates or pull request template in .github" };
    },
    ci: () => (workflows.length ? "gh:CI status (whether the workflows run on every pull request and pass)" : { status: "fail", fact: "no workflow files in .github/workflows" }),
    deps: () => {
      const lock = rootFind(/^(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|poetry\.lock|pipfile\.lock|uv\.lock|cargo\.lock|go\.sum|gemfile\.lock|composer\.lock)$/i);
      if (!lock) return { status: "fail", fact: unpinned.length ? `root has no lockfile; unpinned actions: ${shown(unpinned)}` : "root has no lockfile" };
      return unpinned.length ? { status: "partial", fact: `unpinned actions: ${shown(unpinned)}` } : null;
    },
    updates: () => (has(/^\.github\/dependabot\.ya?ml$/i) || has(/^(\.github\/)?(renovate\.json5?|\.renovaterc(\.json5?)?)$/i) ? null : { status: "fail", fact: "no Dependabot or Renovate config" }),
    permissions: () => {
      if (!workflows.length) return { status: "fail", fact: "no workflow files, so no workflow permissions are set" };
      return noPerms.length ? { status: "fail", fact: `workflow ${shown(noPerms)} has no permissions key` } : null;
    },
    clutter: () => (clutter.length ? { status: "fail", fact: `root holds notes or planning files: ${shown(clutter)}` } : null),
    scratch: () => {
      const bad = [...scratch, ...big];
      return bad.length ? { status: "fail", fact: `scratch or large files in the tree: ${shown(bad)}` } : null;
    },
    badge: () => {
      if (!readme) return { status: "fail", fact: "no README, so no CI badge" };
      if (badBadges.length) return { status: "fail", fact: `README badge points at workflow ${shown(badBadges)}, which is not in .github/workflows` };
      return badgeFlows.length ? null : { status: "fail", fact: "README has no CI badge for a workflow" };
    },
  };

  const findings = [], passed = [], needsGithub = [], needsHuman = [], unmapped = [], facts = [];
  for (const it of items) {
    if (!it.key) { unmapped.push(it.id); continue; }
    const r = it.key.startsWith("gh:") || it.key.startsWith("human:") ? it.key : checks[it.key]();
    const g = typeof r === "string" ? r : null;
    if (r === null) passed.push(it.id);
    else if (g && g.startsWith("gh:")) needsGithub.push({ id: it.id, missing: GITHUB_MISSING[g] || g.slice(3) });
    else if (g && g.startsWith("human:")) needsHuman.push({ id: it.id, why: g.slice(6) });
    else facts.push({ item: it.id, key: it.key, status: r.status, text: r.fact });
  }
  // Facts become the repo quote index r1..rn; each finding quotes the fact that produced it.
  const quotes = facts.map((f, i) => ({ id: `r${i + 1}`, text: f.text }));
  const all = facts.map((f, i) => ({ item: f.item, status: f.status, severity: SEVERITY[f.key], quote_id: `r${i + 1}`, persona: "staff-engineer", fix: FIX[f.key] }));
  all.sort((a, b) => cmp(a.severity, b.severity) || idCmp(a.item, b.item));
  findings.push(...all.slice(0, CAP_FINDINGS));
  quotes.push({ id: `r${quotes.length + 1}`, text: `workflows: ${workflows.length}, uses steps: ${usesCount}, unpinned: ${unpinned.length}` });
  quotes.push({ id: `r${quotes.length + 1}`, text: `files read: ${texts.size}, files skipped: ${skipped.length}, files not scanned: ${unscanned.length}` });

  const byFile = (a, b) => cmp(a.file, b.file);
  skipped.sort(byFile); unscanned.sort(byFile);
  const CAP_SKIPPED = 100;
  const result = {
    tool: "repo-check", schema: 1, input: path.basename(root), standards_sha: sha,
    findings, passed, needs_github_data: needsGithub, needs_human: needsHuman, unmapped, skipped: skipped.slice(0, CAP_SKIPPED), skipped_omitted: Math.max(0, skipped.length - CAP_SKIPPED), unscanned,
    omitted: all.length - findings.length,
    allowed_emails: [...allowedCount].sort((a, b) => cmp(a[0], b[0])).map(([address, count]) => ({ address, count })),
  };
  const json = JSON.stringify(result, null, 2) + "\n";
  if (o.indexOut) writeAtomic(o.indexOut, JSON.stringify({ quotes }, null, 2) + "\n");
  if (o.out) {
    try { writeAtomic(o.out, json); } catch (e) { if (o.indexOut) { try { fs.rmSync(o.indexOut, { force: true }); } catch {} } throw e; }
  } else process.stdout.write(json);
}

runMain(main);
