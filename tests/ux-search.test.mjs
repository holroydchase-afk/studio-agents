// UXSEARCH: tests for tools/ux-search.mjs, keyword and tag search for the ux-reviewer's memory and dedup.
// No embeddings, no network. Run: node --test tests/ux-search.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tokenize, search, similarity, loadDocs } from "../tools/ux-search.mjs";
import { planIssues } from "../tools/ux-issues.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const tool = join(root, "tools", "ux-search.mjs");
const cli = (...a) => spawnSync("node", [tool, ...a], { encoding: "utf8" });
const docs = [
  { id: "a", source: "rule", text: "Tap targets must be at least 48px on a phone" },
  { id: "b", source: "finding", text: "Sign in button is below the fold on a phone", tags: ["UX-R1", "G4"] },
  { id: "c", source: "finding", text: "Empty state has no next step", tags: ["UX-R5", "G5"] },
];

test("UXSEARCH-1 tokenize lowercases, splits, drops stopwords and short tokens, strips a trailing s", () => {
  const t = tokenize("The Buttons are TOO small, on a phone's 48px-wide UI!");
  assert.ok(t.includes("button"));
  assert.ok(t.includes("small"));
  assert.ok(t.includes("phone"));
  assert.ok(t.includes("48px"));
  assert.ok(!t.includes("the") && !t.includes("are") && !t.includes("on") && !t.includes("ui"));
  assert.ok(t.every((x) => x === x.toLowerCase() && x.length >= 3));
  assert.deepEqual(tokenize(""), []);
});

test("UXSEARCH-2 search ranks by overlap and returns id, source, score, snippet", () => {
  const r = search("sign in button phone", docs);
  assert.equal(r[0].id, "b");
  assert.equal(r[0].source, "finding");
  assert.equal(typeof r[0].score, "number");
  assert.equal(typeof r[0].snippet, "string");
  assert.ok(r[0].score >= r[r.length - 1].score);
});

test("UXSEARCH-3 rarer words weigh more (idf)", () => {
  const d = [
    { id: "common", source: "rule", text: "phone phone layout" },
    { id: "rare", source: "rule", text: "gesture layout" },
    { id: "x", source: "rule", text: "phone screen" },
    { id: "y", source: "rule", text: "phone screen" },
  ];
  assert.equal(search("phone gesture", d)[0].id, "rare");
});

test("UXSEARCH-4 a query word equal to a tag adds a bonus", () => {
  const d = [
    { id: "plain", source: "finding", text: "button below the fold", tags: [] },
    { id: "tagged", source: "finding", text: "button below the fold", tags: ["G4"] },
  ];
  const r = search("g4 button", d);
  assert.equal(r[0].id, "tagged");
  assert.ok(r[0].score > r[1].score);
});

test("UXSEARCH-5 empty query, no match and limit behave; ties keep input order", () => {
  assert.deepEqual(search("", docs), []);
  assert.deepEqual(search("   ", docs), []);
  assert.deepEqual(search("zzzqqq", docs), []);
  const many = Array.from({ length: 8 }, (_, i) => ({ id: `d${i}`, source: "rule", text: "same words here" }));
  assert.equal(search("same words", many).length, 5);
  assert.equal(search("same words", many, { limit: 2 }).length, 2);
  assert.deepEqual(search("same words", many).map((r) => r.id), ["d0", "d1", "d2", "d3", "d4"]);
});

test("UXSEARCH-6 similarity is Jaccard over tokens, 0 to 1", () => {
  assert.equal(similarity("sign button fold", "sign button fold"), 1);
  assert.equal(similarity("alpha beta", "gamma delta"), 0);
  assert.equal(similarity("alpha beta gamma", "alpha beta delta"), 0.5);
  assert.equal(similarity("", ""), 0);
});

test("UXSEARCH-7 loadDocs reads design rules, run-log findings and state findings", () => {
  const d = mkdtempSync(join(tmpdir(), "uxsearch-"));
  mkdirSync(join(d, "docs")); mkdirSync(join(d, "runs"));
  copyFileSync(join(root, "docs", "design-rules.md"), join(d, "docs", "design-rules.md"));
  copyFileSync(join(here, "fixtures", "ux-recheck", "before.md"), join(d, "runs", "2026-11-20.md"));
  writeFileSync(join(d, "runs", "notes.md"), "# Notes\nno uxrun block here\n");
  writeFileSync(join(d, "state.json"), JSON.stringify({ product: "Example App", runs: [], findings: { "UX-R9": { priority: "P1", rule: "G7", title: "Modal traps focus", firstSeen: "2026-11-20", lastSeen: "2026-11-20", status: "open" } } }));
  const all = loadDocs(d, { state: join(d, "state.json") });
  const by = (s) => all.filter((x) => x.source === s);
  assert.ok(by("rule").length >= 5);
  const f = by("finding").find((x) => x.tags.includes("UX-R1"));
  assert.ok(f, "finding UX-R1 loaded");
  assert.ok(f.tags.includes("G4"));
  assert.match(f.text, /Sign in button/);
  assert.equal(by("finding").length, 6); // notes.md contributes nothing
  const s = by("state")[0];
  assert.ok(s.tags.includes("UX-R9"));
  assert.match(s.text, /Modal traps focus/);
});

test("UXSEARCH-8 CLI prints ranked results as JSON with --json and honors --limit", () => {
  const d = mkdtempSync(join(tmpdir(), "uxsearch-"));
  mkdirSync(join(d, "docs"));
  copyFileSync(join(root, "docs", "design-rules.md"), join(d, "docs", "design-rules.md"));
  const r = cli("contrast", "--root", d, "--json", "--limit", "2");
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.ok(Array.isArray(out) && out.length >= 1 && out.length <= 2);
  assert.ok("id" in out[0] && "score" in out[0] && "snippet" in out[0]);
  const plain = cli("contrast", "--root", d);
  assert.equal(plain.status, 0, plain.stderr);
  assert.ok(plain.stdout.length > 0);
});

test("UXSEARCH-9 CLI usage errors exit 2", () => {
  assert.equal(cli().status, 2);
  assert.equal(cli("q", "--nope").status, 2);
  assert.equal(cli("q", "--limit", "x").status, 2);
  assert.equal(cli("q", "--root").status, 2);
});

test("UXSEARCH-DEDUP planIssues skips a finding similar to an open issue with a different id", () => {
  const run = { date: "2026-11-20", product: "Example App", tier: "supervised", findings: [
    { id: "UX-R20", priority: "P1", rule: "G4", shots: "s/a.png", problem: "Sign in button is below the fold on a phone", fix: null },
    { id: "UX-R21", priority: "P1", rule: "G2", shots: "s/b.png", problem: "Checkout total is hidden behind the keyboard", fix: null },
  ] };
  const existing = [{ title: "[UX-R1] Sign in button is below the fold on a phone", state: "open" }];
  const p = planIssues(run, { existing });
  assert.deepEqual(p.issues.map((i) => i.id), ["UX-R21"]);
  const s = p.skipped.find((x) => x.id === "UX-R20");
  assert.ok(s, "UX-R20 skipped");
  assert.match(s.reason, /^possible duplicate of/);
  assert.ok(s.reason.includes("Sign in button is below the fold"));
});

test("UXSEARCH-DEDUP a similar CLOSED issue does not block, and exact id keeps the old reason", () => {
  const run = { date: "2026-11-20", product: "Example App", tier: "supervised", findings: [
    { id: "UX-R20", priority: "P1", rule: "G4", shots: "s/a.png", problem: "Sign in button is below the fold on a phone", fix: null },
  ] };
  const closed = planIssues(run, { existing: [{ title: "[UX-R1] Sign in button is below the fold on a phone", state: "closed" }] });
  assert.deepEqual(closed.issues.map((i) => i.id), ["UX-R20"]);
  const same = planIssues(run, { existing: [{ title: "[UX-R20] Sign in button is below the fold on a phone", state: "open" }] });
  assert.match(same.skipped[0].reason, /^duplicate: an open issue already has this id/);
});
