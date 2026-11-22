#!/usr/bin/env node
// ux-flows: the ux-reviewer's "capture flows" step. Reads a product's flows file and runs ux-shots once per
// flow (phone and laptop, light and dark), then prints the `flow:` lines for the run log (check-ux-run).
// Safe mode: remote http(s) targets are refused unless the file says "demo": true; ux-shots always runs
// with --no-network, so a flow never talks to anything but its own page. Cost cap: docs/ux-agent-bar.md.
//
// flows file (JSON), usually docs/design/flows.json in the product repo:
//   {"product":"Example App","target":"http://localhost:8123/","cost_cap_usd":1,"demo":false,
//    "flows":[{"name":"Sign in","path":"/signin","clicks":["#go"],"wait":"#form"}]}
//
// Usage: node scripts/ux-flows.mjs <flows.json> [--out DIR] [--dry-run] [--json]
//   --out DIR   where shots go, one folder per flow (default dist/ux-run)
//   --dry-run   print the plan (one line per flow) and run nothing; with --json, the plan as JSON
// Exit 0 ok; 1 with one reason per line on stderr when the file is invalid; 2 on a usage error or unreadable file.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const USAGE = "usage: ux-flows.mjs <flows.json> [--out DIR] [--dry-run] [--json]";

export const slug = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const isRemote = (target) => {
  if (!/^https?:\/\//i.test(target)) return false;
  try { return !["localhost", "127.0.0.1", "[::1]", "::1"].includes(new URL(target).hostname); } catch { return true; }
};

export function validateFlows(c) {
  const errors = [];
  if (!c || typeof c !== "object") return ["flows file must be a JSON object with product, target and flows"];
  if (typeof c.product !== "string" || !c.product.trim()) errors.push("product is missing or empty");
  if (typeof c.target !== "string" || !c.target.trim()) errors.push("target is missing or empty: a local URL, demo URL or file");
  else if (isRemote(c.target) && c.demo !== true) errors.push(`target ${c.target} is remote: safe mode only reviews local builds; set "demo": true if it is a sample-data demo`);
  if (c.cost_cap_usd !== undefined && !(typeof c.cost_cap_usd === "number" && c.cost_cap_usd > 0)) errors.push("cost_cap_usd must be a number above 0");
  if (!Array.isArray(c.flows) || !c.flows.length) { errors.push("flows needs at least one flow"); return errors; }
  const seen = new Set();
  c.flows.forEach((f, i) => {
    const n = f && typeof f.name === "string" ? f.name.trim() : "";
    if (!n) { errors.push(`flow ${i + 1} has no name`); return; }
    if (seen.has(n.toLowerCase())) errors.push(`flow name "${n}" is not unique`);
    seen.add(n.toLowerCase());
    if (f.path !== undefined && !(typeof f.path === "string" && f.path.startsWith("/"))) errors.push(`flow "${n}": path must start with /`);
    if (f.clicks !== undefined && !(Array.isArray(f.clicks) && f.clicks.every((s) => typeof s === "string"))) errors.push(`flow "${n}": clicks must be an array of selectors`);
  });
  return errors;
}

export function planFlows(c, outDir) {
  return c.flows.map((f) => {
    const out = join(outDir, slug(f.name));
    const args = [c.target, "--out", out, "--no-network"];
    if (f.path) args.push("--path", f.path);
    for (const sel of f.clicks || []) args.push("--click", sel);
    if (f.wait) args.push("--wait", f.wait);
    return { name: f.name, out, args };
  });
}

export const skeleton = (c, outDir) => c.flows.map((f) => `flow: ${f.name} | phone,laptop | ${join(outDir, slug(f.name))}`).join("\n");

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  const args = process.argv.slice(2);
  let out = "dist/ux-run", dry = false, json = false, file = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-h" || a === "--help") { console.log(USAGE); process.exit(0); }
    else if (a === "--out") { if (args[i + 1] === undefined) { console.error(USAGE); process.exit(2); } out = args[++i]; }
    else if (a === "--dry-run") dry = true;
    else if (a === "--json") json = true;
    else if (a.startsWith("-") || file) { console.error(USAGE); process.exit(2); }
    else file = a;
  }
  if (!file) { console.error(USAGE); process.exit(2); }
  let config;
  try { config = JSON.parse(readFileSync(file, "utf8")); } catch { console.error(`can't read ${file} as JSON`); process.exit(2); }
  const errors = validateFlows(config);
  if (errors.length) { for (const e of errors) console.error(e); process.exit(1); }
  const plan = planFlows(config, out);
  if (dry) {
    if (json) console.log(JSON.stringify(plan));
    else for (const p of plan) console.log(`${p.name}: ${p.args.join(" ")}`);
    process.exit(0);
  }
  const shots = join(dirname(fileURLToPath(import.meta.url)), "ux-shots.mjs");
  for (const p of plan) {
    const r = spawnSync(process.execPath, [shots, ...p.args], { stdio: "inherit" });
    if (r.status !== 0 && r.status !== 1) { console.error(`flow "${p.name}": ux-shots failed (exit ${r.status})`); process.exit(2); }
  }
  console.log(skeleton(config, out));
}
