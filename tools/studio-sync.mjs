#!/usr/bin/env node
// studio-sync: one manifest-driven sync of studio files into a product repo.
// Usage: node tools/studio-sync.mjs <targetRepo> [--check] [--force] [--json]
// Exit 0 synced or clean; 1 --check found changes; 2 conflicts (local edits, or a file the record never saw
// that differs from the source). --force overwrites conflicts. --check writes nothing.
// Policies (templates/manifest.json): "managed" files follow the source; "seed" files are created once and
// never touched again. The target keeps .studio-sync.json: source sha, time and a hash per file.
// Plain Node, no dependencies. Source repo = the folder above this file.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RECORD = ".studio-sync.json";
const hashOf = (buf) => createHash("sha256").update(buf).digest("hex");
const readBuf = (p) => readFileSync(p);

// Short, content-free diff stat: line counts only (no text is echoed).
function stat(local, source) {
  const count = (b) => { const m = new Map(); for (const l of b.toString("utf8").split("\n")) m.set(l, (m.get(l) || 0) + 1); return m; };
  const a = count(local), b = count(source);
  let removed = 0, added = 0;
  for (const [l, n] of a) removed += Math.max(0, n - (b.get(l) || 0));
  for (const [l, n] of b) added += Math.max(0, n - (a.get(l) || 0));
  return added + removed ? `+${added} -${removed} lines (source vs local)` : "same lines, different order or ending";
}

// Follow `from "./x.mjs"` and `import "./x.mjs"` imports transitively (like scripts/sync-tools.sh).
function withDeps(source, entries) {
  const out = [], byDest = new Set();
  const add = (e) => { if (byDest.has(e.dest)) return false; byDest.add(e.dest); out.push(e); return true; };
  const follow = (e) => {
    if (!e.src.endsWith(".mjs") || e.policy !== "managed") return;
    const file = join(source, e.src);
    if (!existsSync(file)) return;
    const re = /(?:from|import)\s*["'](\.\/[^"']+\.mjs)["']/g;
    const text = readFileSync(file, "utf8");
    for (let m; (m = re.exec(text)); ) {
      const src = posix.normalize(posix.join(posix.dirname(e.src), m[1]));
      if (!existsSync(join(source, src))) continue;
      const dep = { src, dest: posix.normalize(posix.join(posix.dirname(e.dest), m[1])), policy: "managed", neededBy: e.dest };
      if (add(dep)) follow(dep);
    }
  };
  for (const e of entries) add(e);
  for (const e of [...out]) follow(e);
  return out;
}

export async function syncRepo({ source, target, sha, force = false, check = false }) {
  source = resolve(source); target = resolve(target);
  const manifest = JSON.parse(readFileSync(join(source, "templates", "manifest.json"), "utf8"));
  if (!sha) {
    const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd: source, encoding: "utf8" });
    sha = r.status === 0 ? r.stdout.trim() : "unknown";
  }
  const recPath = join(target, RECORD);
  const old = existsSync(recPath) ? JSON.parse(readFileSync(recPath, "utf8")) : { files: {} };
  const files = { ...(old.files || {}) };
  const res = { sha, updated: [], unchanged: [], conflicts: [], seeded: [] };
  const write = (e) => {
    if (check) return;
    mkdirSync(dirname(join(target, e.dest)), { recursive: true });
    copyFileSync(join(source, e.src), join(target, e.dest));
  };
  for (const e of withDeps(source, manifest.entries)) {
    const sbuf = readBuf(join(source, e.src)), sh = hashOf(sbuf);
    const dp = join(target, e.dest);
    if (!existsSync(dp)) {
      write(e); files[e.dest] = { hash: sh };
      (e.policy === "seed" ? res.seeded : res.updated).push(e.dest);
      continue;
    }
    if (e.policy === "seed") { res.unchanged.push(e.dest); if (!files[e.dest]) files[e.dest] = { hash: hashOf(readBuf(dp)) }; continue; }
    const dbuf = readBuf(dp), dh = hashOf(dbuf);
    if (dh === sh) { res.unchanged.push(e.dest); files[e.dest] = { hash: sh }; continue; }
    const recorded = files[e.dest] && files[e.dest].hash;
    if (recorded && dh === recorded) { write(e); files[e.dest] = { hash: sh }; res.updated.push(e.dest); continue; }
    if (force) { write(e); files[e.dest] = { hash: sh }; res.updated.push(e.dest); continue; }
    res.conflicts.push({ dest: e.dest, reason: recorded ? "local-edit" : "unrecorded-differs", stat: stat(dbuf, sbuf) });
  }
  if (!check) {
    const next = { sha, syncedAt: new Date().toISOString(), files };
    const strip = (r) => JSON.stringify({ sha: r.sha, files: r.files });
    if (!existsSync(recPath) || strip(old) !== strip(next)) writeFileSync(recPath, JSON.stringify(next, null, 2) + "\n");
  }
  return res;
}

function lines(res, check, force) {
  const out = [];
  const verb = check ? "would update" : "updated";
  for (const d of res.updated) out.push(`${verb} ${d}`);
  for (const d of res.seeded) out.push(`${check ? "would seed" : "seeded"} ${d}`);
  for (const c of res.conflicts) out.push(`CONFLICT ${c.dest} (${c.reason}): ${c.stat}${force ? "" : "; use --force to overwrite"}`);
  for (const d of res.unchanged) out.push(`unchanged ${d}`);
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const pos = args.filter((a) => !a.startsWith("--"));
  const bad = [...flags].filter((f) => !["--check", "--force", "--json"].includes(f));
  if (pos.length !== 1 || bad.length) {
    console.error("usage: node tools/studio-sync.mjs <targetRepo> [--check] [--force] [--json]");
    process.exit(2);
  }
  const source = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const check = flags.has("--check"), force = flags.has("--force");
  const res = await syncRepo({ source, target: pos[0], force, check });
  if (flags.has("--json")) console.log(JSON.stringify(res, null, 2));
  else console.log(lines(res, check, force).join("\n"));
  if (res.conflicts.length) process.exit(2);
  if (check && (res.updated.length || res.seeded.length)) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
