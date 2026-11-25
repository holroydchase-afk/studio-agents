#!/usr/bin/env node
// sync-tools.sh copies the tools this one runs as child processes: spawns "./agent-guard.mjs", spawns "./check-spec.mjs", spawns "./spec-lint.mjs"
// pm-receipts: runs staff-pm's three checks itself and prints the only text the agent may use to describe them.
// Why: graders marked staff-pm down for "tool checks it could not have run". Prose claims are unverifiable; a
// receipt is a real exit code from a process this tool started.
//
// Usage: node tools/pm-receipts.mjs <spec.md> [--root DIR]
//   Runs, in order: agent-guard kill staff-pm, check-spec, spec-lint (siblings of this file).
//   Prints one "Checks: ..." line, then one "tool: <name> | ok|failed|not run | exit N" line per check, then
//   "waivers: N" (count of lint-ok lines in the spec; the waiver text stays in the spec file, never in chat).
//   A tool file missing beside this one prints "not run" and exits 1: nothing is ever reported ok without running.
//   --out FILE writes the same text to FILE and prints nothing (the chat reply never shows it).
// Exit 0 every check ok; 1 a check failed or could not run; 2 usage error or unreadable spec.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const USAGE = "usage: pm-receipts.mjs <spec.md> [--root DIR] [--out FILE]";
const args = process.argv.slice(2);
let root = process.cwd();
let outFile = null;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--root") root = resolve(args[++i] ?? ".");
  else if (args[i] === "--out") outFile = resolve(args[++i] ?? "");
  else if (args[i].startsWith("-")) { console.error(USAGE); process.exit(2); }
  else files.push(args[i]);
}
if (files.length !== 1) { console.error(USAGE); process.exit(2); }
let text;
try { text = readFileSync(files[0], "utf8"); } catch { console.error(`can't read ${files[0]}`); process.exit(2); }

const checks = [
  ["agent-guard kill staff-pm", "agent-guard.mjs", ["kill", "staff-pm", "--root", root]],
  ["check-spec", "check-spec.mjs", [files[0]]],
  ["spec-lint", "spec-lint.mjs", [files[0]]],
];
const lines = [];
let bad = 0;
for (const [label, file, a] of checks) {
  const p = join(HERE, file);
  if (!existsSync(p)) { lines.push(`tool: ${label} | not run | exit -`); bad++; continue; }
  const r = spawnSync("node", [p, ...a], { encoding: "utf8" });
  const code = r.status ?? -1;
  if (code !== 0) bad++;
  lines.push(`tool: ${label} | ${code === 0 ? "ok" : "failed"} | exit ${code}`);
}
const waivers = text.split(/\r?\n/).filter((l) => /^\s*lint-ok:\s*SL-\d+/i.test(l)).length;
const body = [`Checks: ${bad ? `${bad} of ${checks.length} did not pass` : `all ${checks.length} passed`}`, ...lines, `waivers: ${waivers}`].join("\n") + "\n";
if (outFile) writeFileSync(outFile, body); else process.stdout.write(body);
process.exit(bad ? 1 : 0);
