#!/usr/bin/env node
// Portfolio drift: when a merged change touches files behind a product's portfolio demo or page, build an
// `intake` issue for the portfolio repo. Pure functions plus a tiny CLI; the Action does the GitHub calls.
// Counts and paths only: never file contents, tokens or private links.
import fs from "node:fs";

const MAX_FILES = 25;

function globToRe(g) {
  let re = "";
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*" && g[i + 1] === "*") { re += ".*"; i++; if (g[i + 1] === "/") i++; }
    else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp("^" + re + "$");
}
const any = (file, globs) => (globs || []).some((g) => globToRe(g).test(file));

export function watchedFiles(files, config) {
  if (!config || !Array.isArray(config.watch)) return [];
  return files.filter((f) => any(f, config.watch) && !any(f, config.ignore));
}

export function buildIntake({ repo, sha, title, files, config, date }) {
  const hit = watchedFiles(files || [], config);
  if (!hit.length) return null;
  const product = config.product || String(repo).split("/").pop();
  const shown = hit.slice(0, MAX_FILES).map((f) => `  - ${f}`).join("\n");
  const more = hit.length > MAX_FILES ? `\n  - ... and ${hit.length - MAX_FILES} more` : "";
  const page = config.portfolioPage || "the product page";
  const body = [
    `From: ${product} portfolio-drift check, ${date || new Date().toISOString().slice(0, 10)}`,
    `Ask: Check that ${page} and the ${product} demo on the portfolio still match ${product} main, and update them if not.`,
    `Why: A merged change touched files behind the portfolio's ${product} page or demo (screens, copy, features or claims).`,
    `Facts: ${repo} @ ${String(sha).slice(0, 7)}, "${String(title).replace(/\s+/g, " ").slice(0, 120)}". Watched files changed (${hit.length}):\n${shown}${more}`,
    `Done when: ${page} and any demo copy match ${product} main, or a comment here says nothing needed to change. Log it in ${product}'s HANDOFF.md under "Portfolio / public presence".`,
    `Reply: none`,
  ].join("\n");
  return { title: `INTAKE: portfolio drift from ${product}`, labels: ["intake", "portfolio-drift"], body };
}

// CLI: node portfolio-drift.mjs --repo o/r --sha S --title T --files changed.txt --config .portfolio-watch.json
if (import.meta.url === `file://${process.argv[1]}`) {
  const a = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, arr) => (v.startsWith("--") ? [...acc, [v.slice(2), arr[i + 1]]] : acc), []));
  let config = null;
  try { config = JSON.parse(fs.readFileSync(a.config || ".portfolio-watch.json", "utf8")); } catch { /* no config: watch nothing */ }
  const files = fs.existsSync(a.files || "") ? fs.readFileSync(a.files, "utf8").split("\n").filter(Boolean) : [];
  const out = buildIntake({ repo: a.repo, sha: a.sha, title: a.title, files, config });
  if (out) process.stdout.write(JSON.stringify(out));
}
