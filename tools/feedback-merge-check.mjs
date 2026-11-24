#!/usr/bin/env node
// feedback-merge-check: the scoped auto-merge gate for the feedback loop (docs/product/SPEC-FEEDBACK-LOOP.md, FBK-25).
//   node tools/feedback-merge-check.mjs --repo NAME [--lines N] [--max-lines N] [--live-paths a,b,c] <file...>
// Exit 0 allow (quiet), 1 refuse (one reason per line on stderr), 2 usage error. An empty file list never allows.
// Refuses: .github/, CLAUDE.md, package manifests and lockfiles, paths with auth/privacy/data/secret, every file in
// the hearth repo, live-site paths (default index.html, CNAME, demo/), and more than 80 changed lines.
// Plain Node, no network.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_LIVE = ["index.html", "CNAME", "demo/"];
export const DEFAULT_MAX_LINES = 80;
const MANIFESTS = ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"];

const norm = (f) => String(f).replace(/\\/g, "/").replace(/^\.\//, "");

export function checkMerge({ repo, files, lines = 0, livePaths = DEFAULT_LIVE, maxLines = DEFAULT_MAX_LINES } = {}) {
  const list = (files || []).map(norm).filter(Boolean);
  if (!list.length) return { ok: false, reasons: ["no files given: nothing to check, so no auto-merge"] };
  const reasons = [];
  if (String(repo ?? "").toLowerCase() === "hearth") reasons.push("repo hearth is never auto-merged (real families)");
  for (const f of list) {
    const base = f.split("/").pop();
    if (f.startsWith(".github/")) reasons.push(`${f}: .github/ is never auto-merged`);
    if (base === "CLAUDE.md") reasons.push(`${f}: CLAUDE.md is never auto-merged`);
    if (MANIFESTS.includes(base)) reasons.push(`${f}: dependency manifest or lockfile is never auto-merged`);
    const m = f.toLowerCase().match(/auth|privacy|data|secret/);
    if (m) reasons.push(`${f}: path touches ${m[0]} and is never auto-merged`);
    for (const lp of livePaths) {
      const hit = lp.endsWith("/") ? f.startsWith(lp) : f === lp || base === lp;
      if (hit) { reasons.push(`${f}: live site path (${lp}) waits for Chase's go`); break; }
    }
  }
  if (lines > maxLines) reasons.push(`${lines} changed lines is over the ${maxLines} line cap`);
  return { ok: reasons.length === 0, reasons };
}

function main(argv) {
  const usage = "usage: feedback-merge-check.mjs --repo NAME [--lines N] [--max-lines N] [--live-paths a,b,c] <file...>";
  const o = { files: [] };
  const num = (name, v) => { if (!/^\d+$/.test(v ?? "")) throw new Error(`--${name} must be a whole number`); return Number(v); };
  try {
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i];
      if (a === "--repo") o.repo = argv[++i];
      else if (a === "--lines") o.lines = num("lines", argv[++i]);
      else if (a === "--max-lines") o.maxLines = num("max-lines", argv[++i]);
      else if (a === "--live-paths") { const v = argv[++i]; if (v === undefined) throw new Error("--live-paths needs a value"); o.livePaths = v.split(",").map((s) => s.trim()).filter(Boolean); }
      else if (a.startsWith("--")) throw new Error(`unknown option ${a}`);
      else o.files.push(a);
    }
    if (!o.repo) throw new Error("--repo is required");
    if (!o.files.length) throw new Error("no files given");
  } catch (e) { return { code: 2, err: `${e.message}\n${usage}` }; }
  const r = checkMerge(o);
  return { code: r.ok ? 0 : 1, err: r.reasons.join("\n") };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { code, err } = main(process.argv.slice(2));
  if (err) console.error(err);
  process.exitCode = code;
}
