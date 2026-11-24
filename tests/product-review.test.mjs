// Tests for tools/product-review.mjs (PRV-1..16): the product-review pipeline pieces found missing on the Hearth
// pilot (studio-agents issue "Product review pipeline: gaps found on the Hearth pilot").
// Written test-first by the main session; red until tools/product-review.mjs exists.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = path.join(ROOT, "tools", "product-review.mjs");
const load = () => import("../tools/product-review.mjs");

// Gap 1: claims check. The Hearth README states counts and the command beside them; QA said none existed.
const README = [
  "# Hearth",
  "",
  "| Tests | 1,291 app tests (Jest, 141 files), 1,199 database checks (SQL), web end-to-end tests. Counted Nov 18, 2026 with `bash scripts/test-totals.sh` |",
  "",
  "Also 77 decisions in the log and 6 post mortems.",
].join("\n");

test("PRV-1 claimsCheck finds a test count and the command named beside it", async () => {
  const { claimsCheck } = await load();
  const r = claimsCheck(README);
  const app = r.claims.find((c) => c.number === 1291);
  assert.ok(app, "1,291 app tests found");
  assert.equal(app.noun, "app tests");
  assert.equal(app.command, "bash scripts/test-totals.sh");
  assert.ok(r.claims.find((c) => c.number === 1199 && /database checks/.test(c.noun)));
});

test("PRV-2 claimsCheck ignores non-test numbers and README without counts", async () => {
  const { claimsCheck } = await load();
  assert.equal(claimsCheck("# Tool\n\nWorks in 3 steps and has 77 decisions.").claims.length, 0);
});

test("PRV-3 claimsCheck flags a count with no command as unverifiable", async () => {
  const { claimsCheck } = await load();
  const r = claimsCheck("We run 400 tests in CI.");
  assert.equal(r.claims.length, 1);
  assert.equal(r.claims[0].command, null);
  assert.equal(r.unverifiable, 1);
});

// Gap 2: freshness.
test("PRV-4 checkFreshness is stale when shots predate HEAD by more than the lag", async () => {
  const { checkFreshness } = await load();
  assert.equal(checkFreshness({ shotsAt: "2026-11-19", headAt: "2026-11-24" }).stale, true);
  assert.equal(checkFreshness({ shotsAt: "2026-11-24", headAt: "2026-11-24" }).stale, false);
  assert.equal(checkFreshness({ shotsAt: "2026-11-22", headAt: "2026-11-24", maxLagDays: 2 }).stale, false);
});

test("PRV-5 checkFreshness rejects bad dates", async () => {
  const { checkFreshness } = await load();
  assert.throws(() => checkFreshness({ shotsAt: "yesterday", headAt: "2026-11-24" }), /date/i);
});

// Gap 3: lane map.
test("PRV-6 laneFor gives Hearth its own UX designer and everyone else ux-reviewer", async () => {
  const { laneFor } = await load();
  assert.equal(laneFor("hearth", "ux"), "grandparent-ux");
  assert.equal(laneFor("ccwatts", "ux"), "ux-reviewer");
  assert.equal(laneFor("hearth", "qa"), "qa-tdd");
  assert.equal(laneFor("hearth", "stakeholder"), "stakeholder");
  assert.throws(() => laneFor("hearth", "bogus"), /lane/i);
});

// Gap 5: one entry point that names the three runs and their logging commands.
test("PRV-7 planReview lists the three lanes with the logging command for each", async () => {
  const { planReview } = await load();
  const p = planReview("hearth");
  assert.deepEqual(p.runs.map((r) => r.lane), ["stakeholder", "ux", "qa"]);
  assert.equal(p.runs[1].agent, "grandparent-ux");
  assert.ok(p.runs.every((r) => r.log === `bash scripts/log-agent-run.sh --as ${r.agent}`));
});

// Gaps 4 and 6: report contract with labels and a validation header.
const UX = [
  "source: ux",
  "validation: validated",
  "item: UX-1 | P2 | viewed | Grey sent-by line is low contrast on the Feed",
  "item: UX-2 | P1 | inferred | Dark mode not reviewed",
].join("\n");
const QA = [
  "source: qa",
  "validation: validated",
  "item: QA-1 | P1 | observed | No README test count found by the checker, but one exists",
].join("\n");
const STK = [
  "source: stakeholder",
  "validation: unvalidated: docs-only, no quote index",
  "item: STK-1 | P1 | inferred | Headline reads as overclaiming next to the key-holding line",
].join("\n");

test("PRV-8 parseReport accepts a valid report", async () => {
  const { parseReport } = await load();
  const r = parseReport(UX);
  assert.deepEqual(r.errors, []);
  assert.equal(r.source, "ux");
  assert.equal(r.items.length, 2);
});

test("PRV-9 parseReport requires a validation header", async () => {
  const { parseReport } = await load();
  const r = parseReport(UX.replace("validation: validated\n", ""));
  assert.ok(r.errors.some((e) => /validation/.test(e)));
});

test("PRV-10 an unvalidated report must give a reason", async () => {
  const { parseReport } = await load();
  assert.ok(parseReport(STK.replace(": docs-only, no quote index", "")).errors.some((e) => /reason/.test(e)));
  assert.deepEqual(parseReport(STK).errors, []);
});

test("PRV-11 parseReport rejects an unknown label, priority or source", async () => {
  const { parseReport } = await load();
  assert.ok(parseReport(UX.replace("viewed", "guessed")).errors.some((e) => /label/.test(e)));
  assert.ok(parseReport(UX.replace("P2", "P9")).errors.some((e) => /priority/.test(e)));
  assert.ok(parseReport(UX.replace("source: ux", "source: bot")).errors.some((e) => /source/.test(e)));
});

test("PRV-12 only the ux source may claim the viewed label", async () => {
  const { parseReport } = await load();
  assert.ok(parseReport(QA.replace("observed", "viewed")).errors.some((e) => /viewed/.test(e)));
});

// Gap 7: merge into one ranked card.
test("PRV-13 mergeReports ranks by priority, then by evidence strength, with the source on each line", async () => {
  const { mergeReports } = await load();
  const m = mergeReports([UX, QA, STK]);
  assert.deepEqual(m.errors, []);
  assert.deepEqual(m.items.map((i) => i.id), ["QA-1", "UX-2", "STK-1", "UX-1"]);
  assert.equal(m.verdict, "fix");
});

test("PRV-14 mergeReports carries unvalidated forward and says go when nothing is P0 or P1", async () => {
  const { mergeReports } = await load();
  const m = mergeReports([STK]);
  assert.match(m.validation, /^unvalidated/);
  const calm = mergeReports([UX.replace("P1", "P2")]);
  assert.equal(calm.verdict, "go");
  assert.equal(calm.validation, "validated");
});

test("PRV-15 mergeReports refuses a report with errors and names it", async () => {
  const { mergeReports } = await load();
  const m = mergeReports([UX, "source: qa\nitem: bad"]);
  assert.ok(m.errors.length > 0);
});

test("PRV-16 CLI: claims, fresh, lane, plan, merge exit codes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prv-"));
  const readme = path.join(dir, "README.md");
  fs.writeFileSync(readme, README);
  const run = (...a) => spawnSync("node", [TOOL, ...a], { encoding: "utf8" });
  const c = run("claims", readme);
  assert.equal(c.status, 0);
  assert.match(c.stdout, /1291.*bash scripts\/test-totals\.sh/s);
  assert.equal(run("fresh", "--shots", "2026-11-19", "--head", "2026-11-24").status, 1);
  assert.equal(run("fresh", "--shots", "2026-11-24", "--head", "2026-11-24").status, 0);
  assert.match(run("lane", "hearth", "ux").stdout, /grandparent-ux/);
  assert.match(run("plan", "hearth").stdout, /log-agent-run\.sh --as grandparent-ux/);
  const files = [UX, QA, STK].map((t, i) => {
    const f = path.join(dir, `r${i}.md`);
    fs.writeFileSync(f, t);
    return f;
  });
  const m = run("merge", ...files);
  assert.equal(m.status, 0);
  assert.match(m.stdout, /verdict: fix/);
  fs.writeFileSync(files[0], "source: ux\nitem: x");
  assert.equal(run("merge", ...files).status, 1);
});
