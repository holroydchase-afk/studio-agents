#!/usr/bin/env node
// Fails when a workflow `uses:` is not pinned to a full 40-character commit SHA.
// Usage: node check-actions-pinned.mjs <workflow-file-or-folder>...
// Local actions (./path) are fine; a trailing `# vN` comment is allowed.
// Skips comments and the text of block scalars (`run: |`). Exit 0 clean, 1 offenders, 2 bad usage.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const SHA = /^[0-9a-f]{40}$/;

function collect(p, out) {
  const st = statSync(p);
  if (st.isDirectory()) {
    for (const e of readdirSync(p).sort()) {
      if (e === "node_modules" || e === ".git") continue;
      collect(join(p, e), out);
    }
  } else if (/\.ya?ml$/.test(p)) out.push(p);
}

export function findUnpinned(text) {
  const bad = [];
  let blockIndent = -1;
  text.split("\n").forEach((raw, i) => {
    const indent = raw.length - raw.trimStart().length;
    if (blockIndent >= 0) {
      if (raw.trim() === "" || indent > blockIndent) return;
      blockIndent = -1;
    }
    const line = raw.trim();
    if (line.startsWith("#")) return;
    if (/:\s*[|>][+-]?\d?\s*(#.*)?$/.test(line)) {
      blockIndent = indent;
      return;
    }
    const m = line.match(/^(?:-\s*)?uses:\s*(['"]?)([^\s#'"]+)\1/);
    if (!m) return;
    const ref = m[2];
    if (ref.startsWith("./")) return;
    const at = ref.lastIndexOf("@");
    if (at < 0 || !SHA.test(ref.slice(at + 1))) bad.push({ line: i + 1, uses: ref });
  });
  return bad;
}

function main(args) {
  if (args.length === 0) {
    console.error("usage: check-actions-pinned.mjs <workflow-file-or-folder>...");
    return 2;
  }
  const files = [];
  for (const a of args) {
    if (!existsSync(a)) {
      console.error(`no such file or folder: ${a}`);
      return 2;
    }
    collect(a, files);
  }
  let n = 0;
  for (const f of files) {
    for (const b of findUnpinned(readFileSync(f, "utf8"))) {
      console.log(`${f}:${b.line}  ${b.uses}  (pin to a full commit SHA, keep a # vN comment)`);
      n++;
    }
  }
  if (n) console.error(`${n} unpinned action${n === 1 ? "" : "s"}`);
  return n ? 1 : 0;
}

import { fileURLToPath } from "node:url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exit(main(process.argv.slice(2)));
