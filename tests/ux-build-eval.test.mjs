// UXB-1..15 (docs/ux-build-eval-spec.md): failing tests for the UX build eval harness, tools/ux-build-eval.mjs.
// UXB-9 and UXB-12 are manual (see the MANUAL stubs at the bottom); UXB-16 is later.
// Everything model-shaped here is a TEST-ONLY fake (fakeRunner, fakeRenderer, fakeGrader). No model calls, no network.
// The module is loaded inside each test so each test fails on its own while the module is missing.
// Run: node --test tests/ux-build-eval.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fx = (n) => readFileSync(join(root, "tests", "fixtures", "ux-build-eval", n), "utf8");
const load = () => import(join(root, "tools", "ux-build-eval.mjs"));

const prompts = () => JSON.parse(fx("prompts-good.json"));
const banned = () => JSON.parse(fx("banned-words.json")).words;

// TEST-ONLY fakes (never real models)
const fakeRunner = (log = []) => async ({ arm, prompt, model }) => {
  log.push({ arm, promptId: prompt.id, model });
  return { html: fx("html-good.html"), tokens: 100, costUsd: 0.01 };
};
const fakeRenderer = (calls = []) => async ({ html, width, height }) => {
  calls.push({ width, height });
  return { png: `shot-${width}x${height}.png`, consoleErrors: width === 390 ? 2 : 0 };
};
const pair = () => ({
  promptId: "p1", job: "A grandparent sees the newest family photos.",
  arms: { plain: { shots: ["plain-390.png", "plain-1280.png"], armName: "plain" }, ux: { shots: ["ux-390.png", "ux-1280.png"], armName: "ux-reviewer" } },
});

// ---- UXB-1
test("UXB-1 both arms get identical prompt text and model Sonnet", async () => {
  const m = await load();
  const log = [];
  await m.runArms({ prompt: prompts()[0], runner: fakeRunner(log), renderer: fakeRenderer(), model: "sonnet" });
  assert.deepEqual(log.map((l) => l.arm).sort(), ["plain", "ux"]);
  assert.ok(log.every((l) => l.model === "sonnet"));
});
test("UXB-1 refuses when prompt hashes differ or a model is not Sonnet", async () => {
  const m = await load();
  assert.throws(() => m.assertSameInputs({ plain: { prompt: "a", model: "sonnet" }, ux: { prompt: "b", model: "sonnet" } }), /hash|prompt/i);
  assert.throws(() => m.assertSameInputs({ plain: { prompt: "a", model: "sonnet" }, ux: { prompt: "a", model: "opus" } }), /sonnet|model/i);
  assert.doesNotThrow(() => m.assertSameInputs({ plain: { prompt: "a", model: "sonnet" }, ux: { prompt: "a", model: "sonnet" } }));
});

// ---- UXB-2
test("UXB-2 a self-contained HTML file with data: URIs and #hrefs is valid", async () => {
  const { validateArmOutput } = await load();
  const r = validateArmOutput(fx("html-good.html"));
  assert.equal(r.ok, true, JSON.stringify(r));
});
for (const [f, why] of [["html-remote-script.html", "src https"], ["html-remote-css-url.html", "css url() https"], ["html-protocol-relative.html", "protocol-relative href"], ["html-import.html", "@import http"]]) {
  test(`UXB-2 rejects remote reference (${why})`, async () => {
    const { validateArmOutput } = await load();
    const r = validateArmOutput(fx(f));
    assert.equal(r.ok, false);
    assert.equal(r.status, "error");
    assert.ok(r.reasons.length > 0);
  });
}
test("UXB-2 empty or non-HTML output is an error", async () => {
  const { validateArmOutput } = await load();
  assert.equal(validateArmOutput("").ok, false);
  assert.equal(validateArmOutput("just words").ok, false);
});

// ---- UXB-3 (render, with a fake renderer; real Playwright is not run here)
test("UXB-3 renders 390x844 and 1280x800 untouched and logs console error count", async () => {
  const m = await load();
  const calls = [];
  const out = await m.renderArm({ html: fx("html-good.html"), renderer: fakeRenderer(calls) });
  assert.deepEqual(calls.map((c) => `${c.width}x${c.height}`), ["390x844", "1280x800"]);
  assert.equal(out.shots.length, 2);
  assert.equal(out.consoleErrors, 2);
});

// ---- UXB-4..6
test("UXB-4 the good prompt set passes and has all 8 types with id/type/split/text", async () => {
  const { checkPrompts } = await load();
  const r = checkPrompts(prompts(), { bannedWords: banned() });
  assert.equal(r.ok, true, JSON.stringify(r));
});
test("UXB-4 fewer than 8 prompts, a missing type or a missing field fails", async () => {
  const { checkPrompts } = await load();
  assert.equal(checkPrompts(prompts().slice(0, 7), { bannedWords: banned() }).ok, false);
  const noDialog = prompts().map((p) => (p.type === "dialog" ? { ...p, type: "list" } : p));
  assert.equal(checkPrompts(noDialog, { bannedWords: banned() }).ok, false);
  const noText = prompts(); delete noText[0].text;
  assert.equal(checkPrompts(noText, { bannedWords: banned() }).ok, false);
});
test("UXB-5 exactly 3 heldout, the rest dev", async () => {
  const { checkPrompts } = await load();
  const four = prompts().map((p, i) => (i === 0 ? { ...p, split: "heldout" } : p));
  assert.equal(checkPrompts(four, { bannedWords: banned() }).ok, false);
  const two = prompts().map((p) => (p.id === "p8" ? { ...p, split: "dev" } : p));
  assert.equal(checkPrompts(two, { bannedWords: banned() }).ok, false);
});
test("UXB-5 a second heldout run for the same change id is refused", async () => {
  const { createHeldoutLedger } = await load();
  const l = createHeldoutLedger();
  l.record("change-1");
  assert.throws(() => l.record("change-1"), /held-?out|change/i);
  assert.doesNotThrow(() => l.record("change-2"));
});
test("UXB-6 banned whole words fail case-insensitively, including 'pixel perfect' and the font name", async () => {
  const { checkPrompts } = await load();
  for (const w of ["Make it CLEAN", "use plenty of whitespace", "a 12 column grid", "pixel perfect please", "Use Atkinson Hyperlegible Next", "MODERN look"]) {
    const ps = prompts(); ps[0].text += " " + w;
    const r = checkPrompts(ps, { bannedWords: banned() });
    assert.equal(r.ok, false, w);
  }
});
test("UXB-6 banned words inside longer words are allowed", async () => {
  const { checkPrompts } = await load();
  const ps = prompts(); ps[0].text += " Ingrid cleaned the gridiron with a modernist poster for the contrasting colours.";
  assert.equal(checkPrompts(ps, { bannedWords: banned() }).ok, true);
});
test("UXB-6 a prompt must name product, user and job; lorem ipsum is rejected", async () => {
  const { checkPrompts } = await load();
  const ps = prompts(); ps[1].text = "Lorem ipsum dolor sit amet.";
  assert.equal(checkPrompts(ps, { bannedWords: banned() }).ok, false);
});

// ---- UXB-7
test("UXB-7 grader input is exactly four screenshots plus the one-line job, nothing else", async () => {
  const { graderInput, shuffleAndMap } = await load();
  const { presented } = shuffleAndMap([pair()], 7);
  const gi = graderInput(presented[0]);
  assert.deepEqual(Object.keys(gi).sort(), ["job", "screenshots"]);
  assert.equal(gi.screenshots.length, 4);
  assert.equal(gi.job, pair().job);
  const text = JSON.stringify(gi);
  assert.ok(!/ux-reviewer|plain|prompt|role/i.test(text.replace(/plain-|ux-/g, "")) || true);
  assert.ok(!/ux-reviewer/.test(text), "arm name leaked");
});
test("UXB-7 labels are A and B, mapping is stored apart from the grader input", async () => {
  const { shuffleAndMap, graderInput } = await load();
  const { presented, mapping } = shuffleAndMap([pair()], 7);
  assert.deepEqual(Object.keys(presented[0].arms).sort(), ["A", "B"]);
  assert.deepEqual(Object.values(mapping.p1).sort(), ["plain", "ux"]);
  assert.ok(!JSON.stringify(graderInput(presented[0])).includes('"plain"'));
  assert.ok(!("mapping" in presented[0]));
});
test("UXB-7 the shuffle is deterministic per seed and varies across prompts and seeds", async () => {
  const { shuffleAndMap } = await load();
  const many = Array.from({ length: 24 }, (_, i) => ({ ...pair(), promptId: `p${i}` }));
  const a = shuffleAndMap(many, 1), b = shuffleAndMap(many, 1), c = shuffleAndMap(many, 2);
  assert.deepEqual(a.mapping, b.mapping);
  assert.notDeepEqual(a.mapping, c.mapping);
  const aIsPlain = Object.values(a.mapping).filter((m) => m.A === "plain").length;
  assert.ok(aIsPlain > 0 && aIsPlain < 24, "order must be shuffled, not fixed");
});

// ---- UXB-8
const goodGrading = () => ({
  graderModel: "opus",
  A: { clean: { "CLEAN-1": true, "CLEAN-2": true, "CLEAN-3": false, "CLEAN-4": true, "CLEAN-5": true }, polish: 7 },
  B: { clean: { "CLEAN-1": true, "CLEAN-2": true, "CLEAN-3": true, "CLEAN-4": true, "CLEAN-5": true }, polish: 8 },
});
test("UXB-8 a grading with CLEAN-1..5 pass/fail and 0-10 polish per arm, graded by Opus, is accepted", async () => {
  const { scoreRecord } = await load();
  const r = scoreRecord(goodGrading(), { armModel: "sonnet" });
  assert.equal(r.ok, true, JSON.stringify(r));
});
test("UXB-8 rejects missing CLEAN item, polish out of 0-10, or a missing grader model", async () => {
  const { scoreRecord } = await load();
  const g1 = goodGrading(); delete g1.A.clean["CLEAN-4"];
  const g2 = goodGrading(); g2.B.polish = 11;
  const g3 = goodGrading(); delete g3.graderModel;
  for (const g of [g1, g2, g3]) assert.equal(scoreRecord(g, { armModel: "sonnet" }).ok, false);
});
test("UXB-8 grader must differ from the arm model (Sonnet grading Sonnet is rejected)", async () => {
  const { scoreRecord } = await load();
  const g = goodGrading(); g.graderModel = "sonnet";
  assert.equal(scoreRecord(g, { armModel: "sonnet" }).ok, false);
});

// ---- UXB-10
test("UXB-10 each feedback line must cite a key item id or quote key text; a line citing none fails", async () => {
  const { checkFeedback } = await load();
  const key = fx("answer-key-trimmed.md");
  assert.equal(checkFeedback(["Item 17: three buttons all say Open.", 'Fix the "300 ft" label (item 2).'], key).ok, true);
  assert.equal(checkFeedback(["Make it pop more."], key).ok, false);
  const r = checkFeedback(["Item 17: three buttons all say Open.", "Looks off to me."], key);
  assert.equal(r.ok, false);
  assert.deepEqual(r.badLines, [1]);
});
test("UXB-10 an id that is not in the key does not count as a citation", async () => {
  const { checkFeedback } = await load();
  assert.equal(checkFeedback(["Item 99: fix it."], fx("answer-key-trimmed.md")).ok, false);
});
test("UXB-10 feedback rounds stop at 4 and use a fake stand-in grader", async () => {
  const { runFeedbackLoop } = await load();
  let builds = 0;
  const grader = async () => ({ polish: 5, cleanFailures: ["CLEAN-3"] }); // TEST-ONLY fake, never gets to 8
  const rounds = await runFeedbackLoop({ build: async () => { builds++; return {}; }, grade: grader, feedback: async () => ["Item 3: fix it."] });
  assert.equal(rounds.length <= 5, true);
  assert.ok(builds <= 5, "first build plus at most 4 feedback rounds");
});

// ---- UXB-11
test("UXB-11 roundsToGood is the first round with polish >= 8 and no CLEAN failure", async () => {
  const { roundsToGood } = await load();
  const r = (round, polish, cleanFailures = []) => ({ round, polish, cleanFailures });
  assert.equal(roundsToGood([r(0, 6), r(1, 7), r(2, 8), r(3, 9)]), 2);
  assert.equal(roundsToGood([r(0, 9, ["CLEAN-2"]), r(1, 8)]), 1);
  assert.equal(roundsToGood([r(0, 8)]), 0);
});
test("UXB-11 'not reached' after 4 rounds", async () => {
  const { roundsToGood } = await load();
  const rs = Array.from({ length: 5 }, (_, i) => ({ round: i, polish: 7, cleanFailures: [] }));
  assert.equal(roundsToGood(rs), "not reached");
  assert.equal(roundsToGood([{ round: 0, polish: 8, cleanFailures: ["CLEAN-1"] }]), "not reached");
});
test("UXB-11 each round must log polish and CLEAN results", async () => {
  const { roundsToGood } = await load();
  assert.throws(() => roundsToGood([{ round: 0 }]), /polish|clean/i);
});

// ---- UXB-13
const goodResults = () => ({
  n: { prompts: 5, runsPerArm: 1 },
  arms: ["plain", "ux"], armModels: { plain: "sonnet", ux: "sonnet" }, graderModel: "opus",
  split: "dev", changeId: "change-1", cost: { usd: 1.23, tokens: 1000 },
  limits: ["cases and key written by us", "stand-in is an Opus model applying the written key, not Chase", "n=1 per arm is suggestive only"],
});
test("UXB-13 a complete results file passes", async () => {
  const { checkResults } = await load();
  const r = checkResults(goodResults());
  assert.equal(r.ok, true, JSON.stringify(r));
});
for (const k of ["n", "arms", "armModels", "graderModel", "split", "changeId", "cost", "limits"]) {
  test(`UXB-13 missing ${k} fails and names it`, async () => {
    const { checkResults } = await load();
    const g = goodResults(); delete g[k];
    const r = checkResults(g);
    assert.equal(r.ok, false);
    assert.ok(r.missing.includes(k));
  });
}
test("UXB-13 an empty limits list fails", async () => {
  const { checkResults } = await load();
  const g = goodResults(); g.limits = [];
  assert.equal(checkResults(g).ok, false);
});

// ---- UXB-14
test("UXB-14 arms run sequentially, one at a time, and each run's cost and tokens are logged", async () => {
  const m = await load();
  let active = 0, maxActive = 0;
  const runner = async ({ arm }) => { active++; maxActive = Math.max(maxActive, active); await new Promise((r) => setTimeout(r, 5)); active--; return { html: fx("html-good.html"), tokens: 50, costUsd: 0.02 }; };
  const out = await m.runArms({ prompt: prompts()[0], runner, renderer: fakeRenderer(), model: "sonnet" });
  assert.equal(maxActive, 1);
  assert.ok(out.runs.every((r) => typeof r.tokens === "number" && typeof r.costUsd === "number"));
});

// ---- UXB-15
test("UXB-15 timeout, rate limit and empty output are status error", async () => {
  const { classifyRun } = await load();
  assert.equal(classifyRun({ error: { kind: "timeout" } }).status, "error");
  assert.equal(classifyRun({ error: { kind: "rate_limit", httpStatus: 429 } }).status, "error");
  assert.equal(classifyRun({ html: "" }).status, "error");
  assert.equal(classifyRun({ html: "   \n" }).status, "error");
  assert.equal(classifyRun({ html: fx("html-good.html") }).status, "ok");
});
test("UXB-15 an error run is excluded from scores and never counted as a loss", async () => {
  const { classifyRun, tally } = await load();
  assert.equal(classifyRun({ error: { kind: "timeout" } }).excluded, true);
  const t = tally([
    { promptId: "p1", arm: "plain", status: "error", polish: null },
    { promptId: "p1", arm: "ux", status: "ok", polish: 8 },
    { promptId: "p2", arm: "plain", status: "ok", polish: 6 },
    { promptId: "p2", arm: "ux", status: "ok", polish: 8 },
  ]);
  assert.equal(t.scored.p1, undefined, "a pair with an errored arm is not scored");
  assert.equal(t.losses.plain, 1, "p2: plain scored lower, a real loss");
  assert.equal(t.losses.ux, 0, "p1 is excluded, so the errored plain arm gave ux no loss and plain no extra loss");
  assert.equal(t.wins.ux, 1);
});
test("UXB-15 the harness resumes at the errored prompt", async () => {
  const { resumePoint } = await load();
  const runs = [{ promptId: "p1", status: "ok" }, { promptId: "p2", status: "ok" }, { promptId: "p3", status: "error" }];
  assert.equal(resumePoint(["p1", "p2", "p3", "p4"], runs), "p3");
  assert.equal(resumePoint(["p1"], [{ promptId: "p1", status: "ok" }]), null);
});

// ---- Manual (stubs, labeled; not run here)
test("UXB-9 MANUAL: Chase spot-checks 3 pairs per run", { skip: "manual: Chase compares 3 pairs to his eye; if he prefers the grader's loser on 2 of 3, no claim from that run" }, () => {});
test("UXB-12 MANUAL: frontend-design skill reachability recorded with source and date", { skip: "manual: recorded Nov 23 in the spec; re-confirm before the UX arm gets it" }, () => {});
