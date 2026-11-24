// SCSTUDIO: tests for tools/studio-scorecard.mjs, the living scorecard regenerated from the eval logs.
// Question it answers (Chase, Nov 24): is each agent better than plain Claude, is the portfolio better, what did the work buy.
// Rules: every rate is "n" next to it with an interval; below n=10 or a sign-test p of 0.05 or more the verdict is "not proven";
// manual evidence needs a source; outcomes that are not measured say so; tokens say "not measured" and show work shipped.
// Run: node --test tests/studio-scorecard.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { wilson, signP, verdict, countMergesByDay, buildStudioScorecard, renderHtml } from "../tools/studio-scorecard.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const tool = join(here, "..", "tools", "studio-scorecard.mjs");
const put = (root, rel, obj) => { const p = join(root, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, typeof obj === "string" ? obj : JSON.stringify(obj)); };

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "scs-"));
  put(root, "evals/lazy-prompts/runs/2026-11-24-fresh/results.json", {
    date: "2026-11-24", grader: "opus, blind",
    results: [{ id: "a-r1", winner: "agent" }, { id: "a-r2", winner: "agent" }, { id: "b-r1", winner: "plain" }, { id: "b-r2", winner: "tie" }, { id: "c-r1", winner: "agent" }],
  });
  put(root, "evals/agent-misses/runs/2026-11-23-heldout-9/results.json", {
    results: [
      { case: "qa-tdd-1", arm: "agent", pass: true }, { case: "qa-tdd-2", arm: "agent", pass: true }, { case: "qa-tdd-3", arm: "agent", pass: false },
      { case: "qa-tdd-1", arm: "plain", pass: false }, { case: "qa-tdd-2", arm: "plain", pass: true }, { case: "qa-tdd-3", arm: "plain", pass: true },
    ],
  });
  put(root, "docs/scorecard/evidence.json", { entries: [
    { agent: "qa-tdd", id: "neutral", label: "Format-neutral detection", agent_wins: 0, plain_wins: 0, ties: 20, n: 20, source: "docs/agent-training-plan.md", grader: "criteria" },
    { agent: "stakeholder", id: "not-run", label: "Stakeholder agent", status: "not run", source: "docs/stakeholder-agent-plan.md" },
  ] });
  return root;
}

test("SCSTUDIO-1 signP and wilson match known values", () => {
  assert.ok(Math.abs(signP(7, 1) - 0.0703) < 0.001);
  assert.ok(Math.abs(signP(10, 5) - 0.3018) < 0.001);
  assert.equal(signP(0, 0), 1);
  const [lo, hi] = wilson(10, 15);
  assert.ok(lo > 0.4 && lo < 0.45 && hi > 0.84 && hi < 0.9, `${lo} ${hi}`);
});

test("SCSTUDIO-2 verdict is not proven below n=10 or p 0.05, edge only above both", () => {
  assert.match(verdict(3, 0), /not proven/);
  assert.match(verdict(7, 1), /not proven/);
  assert.match(verdict(10, 5), /not proven/);
  assert.match(verdict(20, 2), /edge shown/);
  assert.match(verdict(2, 20), /worse/);
});

test("SCSTUDIO-3 lazy-prompt runs become a staff-pm comparison with ties kept out of the sign test", () => {
  const c = buildStudioScorecard(fixture());
  const pm = c.agents.find((a) => a.agent === "staff-pm");
  const row = pm.comparisons.find((r) => r.id === "lazy-2026-11-24-fresh");
  assert.deepEqual([row.agent_wins, row.plain_wins, row.ties, row.n], [3, 1, 1, 5]);
  assert.match(row.verdict, /not proven/);
  assert.ok(row.source.includes("evals/lazy-prompts"));
  assert.equal(row.grader, "opus, blind");
});

test("SCSTUDIO-4 agent-misses arms are paired by case name: discordant pairs only", () => {
  const c = buildStudioScorecard(fixture());
  const row = c.agents.find((a) => a.agent === "qa-tdd").comparisons.find((r) => r.id === "misses-2026-11-23-heldout-9");
  assert.deepEqual([row.agent_wins, row.plain_wins, row.ties, row.n], [1, 1, 1, 3]);
});

test("SCSTUDIO-5 evidence entries need a source; a missing one is reported, not shown", () => {
  const root = fixture();
  put(root, "docs/scorecard/evidence.json", { entries: [{ agent: "ux-reviewer", id: "x", label: "No source", agent_wins: 5, plain_wins: 0, n: 5 }] });
  const c = buildStudioScorecard(root);
  assert.equal(c.agents.find((a) => a.agent === "ux-reviewer")?.comparisons.length ?? 0, 0);
  assert.match(c.problems.join("\n"), /x.*source/);
});

test("SCSTUDIO-6 evidence with a status and no counts is shown as that status", () => {
  const c = buildStudioScorecard(fixture());
  const s = c.agents.find((a) => a.agent === "stakeholder");
  assert.equal(s.status, "not run");
});

test("SCSTUDIO-7 outcomes are not measured without a private outcomes file, and shown with one", () => {
  const root = fixture();
  let c = buildStudioScorecard(root);
  assert.ok(c.outcomes.length >= 4);
  assert.ok(c.outcomes.every((o) => o.value === "not measured"));
  const p = join(root, "outcomes.json");
  writeFileSync(p, JSON.stringify({ visits: { value: 120, as_of: "2026-11-30", source: "Umami" } }));
  c = buildStudioScorecard(root, { outcomesPath: p });
  assert.equal(c.outcomes.find((o) => o.key === "visits").value, 120);
  assert.equal(c.outcomes.find((o) => o.key === "recruiter_replies").value, "not measured");
});

test("SCSTUDIO-8 tokens are not measured and the page shows work shipped instead", () => {
  const c = buildStudioScorecard(fixture());
  assert.equal(c.tokens.measured, false);
  assert.match(c.tokens.label, /not measured/i);
});

test("SCSTUDIO-9 countMergesByDay counts merge dates", () => {
  assert.deepEqual(countMergesByDay(["2026-11-22", "2026-11-22", "2026-11-23"]), { "2026-11-22": 2, "2026-11-23": 1 });
});

test("SCSTUDIO-10 html names every agent, shows n, says not proven, and has no external hosts", () => {
  const html = renderHtml(buildStudioScorecard(fixture()));
  for (const a of ["qa-tdd", "staff-pm", "stakeholder"]) assert.ok(html.includes(a), a);
  assert.match(html, /n = \d+/);
  assert.match(html, /not proven/i);
  assert.doesNotMatch(html, /https?:\/\/(?!github\.com\/holroydchase-afk)/);
  assert.match(html, /prefers-color-scheme: dark/);
});

test("SCSTUDIO-11 CLI writes json and html and exits 0; bad flag exits 2", () => {
  const root = fixture(), out = mkdtempSync(join(tmpdir(), "scs-out-"));
  const r = spawnSync("node", [tool, "--root", root, "--json", join(out, "s.json"), "--html", join(out, "s.html")], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(spawnSync("node", [tool, "--nope"], { encoding: "utf8" }).status, 2);
});
