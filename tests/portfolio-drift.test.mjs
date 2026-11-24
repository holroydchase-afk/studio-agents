// PDRIFT-1..6 and TRAIN-1..9: failing-first tests for tools/portfolio-drift.mjs and tools/release-train.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { watchedFiles, buildIntake } from "../tools/portfolio-drift.mjs";
import { eligible, order, verifyPage, releaseNote, decideShip, HOME_MARKER } from "../tools/release-train.mjs";

const cfg = { product: "ccwatts", portfolioPage: "ccwatts.html", watch: ["packages/web/**", "docs/product/MARKETING.md", "*.md"], ignore: ["**/*.test.*", "docs/internal/**"] };

test("PDRIFT-1 only files behind the demo or page count", () => {
  const f = watchedFiles(["packages/web/src/app.ts", "packages/core/x.ts", "docs/product/MARKETING.md"], cfg);
  assert.deepEqual(f, ["packages/web/src/app.ts", "docs/product/MARKETING.md"]);
});
test("PDRIFT-2 ignore patterns win over watch patterns", () => {
  assert.deepEqual(watchedFiles(["packages/web/a.test.ts", "docs/internal/x.md"], cfg), []);
});
test("PDRIFT-3 no config means nothing is watched", () => {
  assert.deepEqual(watchedFiles(["a.html"], null), []);
  assert.equal(buildIntake({ repo: "r", sha: "abc", title: "t", files: [], config: cfg }), null);
});
test("PDRIFT-4 intake follows the INTAKE format and has a stable dedupe title", () => {
  const i = buildIntake({ repo: "holroydchase-afk/ccwatts", sha: "abcdef1234", title: "Add dark mode (#12)", files: ["packages/web/a.ts"], config: cfg, date: "2026-11-24" });
  assert.equal(i.title, "INTAKE: portfolio drift from ccwatts");
  assert.deepEqual(i.labels, ["intake", "portfolio-drift"]);
  for (const k of ["From:", "Ask:", "Why:", "Facts:", "Done when:", "Reply:"]) assert.ok(i.body.includes(k), k);
  assert.ok(i.body.includes("ccwatts.html") && i.body.includes("abcdef1") && i.body.includes("packages/web/a.ts"));
});
test("PDRIFT-5 body is capped and carries no secrets or private links", () => {
  const files = Array.from({ length: 200 }, (_, n) => `packages/web/f${n}.ts`);
  const i = buildIntake({ repo: "o/ccwatts", sha: "abc1234", title: "x", files, config: cfg });
  assert.ok(i.body.length < 4000);
  assert.ok(!/claude\.ai|token|secret/i.test(i.body));
});
test("PDRIFT-6 action and workflow template exist and never fail the product's build", async () => {
  const fs = await import("node:fs");
  const a = fs.readFileSync(new URL("../actions/portfolio-drift/action.yml", import.meta.url), "utf8");
  assert.match(a, /using: composite/); assert.match(a, /continue-on-error|\|\| true|exit 0/);
  assert.ok(fs.existsSync(new URL("../templates/portfolio-drift.yml", import.meta.url)));
  assert.ok(fs.existsSync(new URL("../templates/portfolio-watch.json", import.meta.url)));
});

const pr = (n, o = {}) => ({ number: n, repo: "pm-tools", labels: ["release-train"], draft: false, checks: "success", mergeable: true, createdAt: `2026-11-2${n % 10}T10:00:00Z`, body: "Merge after: none", ...o });
test("TRAIN-1 only labeled, non-draft, green, mergeable PRs ride", () => {
  const r = eligible([pr(1), pr(2, { labels: [] }), pr(3, { draft: true }), pr(4, { checks: "failure" }), pr(5, { mergeable: false }), pr(6, { checks: "pending" })]);
  assert.deepEqual(r.ready.map((p) => p.number), [1]);
  assert.equal(r.held.length, 5);
  assert.ok(r.held.every((h) => h.reason));
});
test("TRAIN-2 oldest first within a repo", () => {
  assert.deepEqual(order([pr(3), pr(1), pr(2)]).map((p) => p.number), [1, 2, 3]);
});
test("TRAIN-3 portfolio repo merges last so it sees the final demos", () => {
  const o = order([pr(1, { repo: "holroydchase-afk.github.io" }), pr(2, { repo: "pm-tools" }), pr(3, { repo: "hero-backgrounds" })]);
  assert.equal(o.at(-1).repo, "holroydchase-afk.github.io");
});
test("TRAIN-4 Merge after: #N holds a PR until N is merged or also riding", () => {
  const r = eligible([pr(1, { body: "Merge after: #9" }), pr(2, { body: "Merge after: #1" })]);
  assert.deepEqual(r.ready, []);
  assert.ok(r.held.some((h) => h.number === 1 && /#9/.test(h.reason)));
  assert.ok(r.held.some((h) => h.number === 2 && /#1/.test(h.reason)));
});
test("TRAIN-5 Merge after a PR that also rides orders it after", () => {
  const r = eligible([pr(1, { body: "Merge after: #2", createdAt: "2026-11-20T00:00:00Z" }), pr(2, { createdAt: "2026-11-21T00:00:00Z" })]);
  assert.deepEqual(order(r.ready).map((p) => p.number), [2, 1]);
});
test("TRAIN-6 verify: page must be 200 and the home marker intact", () => {
  assert.equal(verifyPage({ status: 200, body: `<h1>${HOME_MARKER}</h1>`, mustContain: HOME_MARKER }).ok, true);
  assert.equal(verifyPage({ status: 200, body: "<h1>Hi</h1>", mustContain: HOME_MARKER }).ok, false);
  assert.equal(verifyPage({ status: 500, body: HOME_MARKER, mustContain: HOME_MARKER }).ok, false);
  assert.equal(HOME_MARKER, "Hey there, I'm Chase.");
});
test("TRAIN-7 release note lists merged, held and verification, one post", () => {
  const n = releaseNote({ merged: [pr(1)], held: [{ number: 2, repo: "pm-tools", reason: "checks failing" }], verified: [{ url: "https://chaseholroyd.com/", ok: true }], date: "2026-11-24" });
  assert.match(n, /Release train 2026-11-24/); assert.match(n, /pm-tools#1/); assert.match(n, /checks failing/); assert.match(n, /chaseholroyd\.com/);
});
test("TRAIN-8 a failed verification is called out and says revert PR, never delete", () => {
  const n = releaseNote({ merged: [pr(1)], held: [], verified: [{ url: "https://chaseholroyd.com/", ok: false, why: "marker missing" }], date: "d" });
  assert.match(n, /FAILED/); assert.match(n, /revert PR/); assert.doesNotMatch(n, /delete the branch/i);
});
test("TRAIN-9 ship decision: auto-ship or tonight's yes; silence ships nothing", () => {
  assert.equal(decideShip({ autoShip: true }).ship, true);
  assert.equal(decideShip({ autoShip: false, yesTonight: true }).ship, true);
  const d = decideShip({ autoShip: false, yesTonight: false });
  assert.equal(d.ship, false); assert.match(d.reason, /yes/i);
});
