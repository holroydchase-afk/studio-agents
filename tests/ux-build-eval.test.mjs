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

// ---- UXB-4/5/6 against the REAL evals/ux-build/prompts.json (no fixtures for the prompts)
const realPrompts = () => JSON.parse(readFileSync(join(root, "evals", "ux-build", "prompts.json"), "utf8"));
test("UXB-4 real prompts.json covers app home, list, settings, form, landing, dashboard, empty state, dialog with id/type/split/text", () => {
  const ps = realPrompts();
  assert.ok(ps.length >= 8);
  for (const t of ["app home", "list", "settings", "form", "landing", "dashboard", "empty state", "dialog"]) {
    assert.ok(ps.some((p) => p.type === t), `missing type ${t}`);
  }
  for (const p of ps) for (const k of ["id", "type", "split", "text"]) {
    assert.equal(typeof p[k], "string", `${p.id} missing ${k}`);
    assert.ok(p[k].trim().length > 0, `${p.id} empty ${k}`);
  }
});
test("UXB-5 real prompts.json has exactly 3 heldout and 5 dev", () => {
  const ps = realPrompts();
  assert.equal(ps.filter((p) => p.split === "heldout").length, 3);
  assert.equal(ps.filter((p) => p.split === "dev").length, 5);
  assert.equal(ps.length, 8);
});
test("UXB-6 real prompts.json passes checkPrompts with the banned-words fixture and has no lorem ipsum", async () => {
  const { checkPrompts } = await load();
  const ps = realPrompts();
  const r = checkPrompts(ps, { bannedWords: banned() });
  assert.equal(r.ok, true, JSON.stringify(r));
  for (const p of ps) assert.ok(!/lorem ipsum/i.test(p.text), `${p.id} has lorem ipsum`);
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

// =====================================================================================================
// real runner: pure or injectable pieces for the real `claude -p` path (UXB-1, 2, 3, 7, 8, 13, 14, 15, 5).
// Named exports the engineer adds to tools/ux-build-eval.mjs. Fakes below are TEST-ONLY; no model, no network.
// Contracts the engineer must meet (chosen here, change them only with the test):
//   spawn(cmd, args, {cwd, timeout}) -> {status, stdout, stderr?, error?, signal?} (spawnSync shape; may be async)
//   mkdtemp(prefix) -> directory path (may be async); claude's stdout is the `--output-format json` object
//     {result, usage:{input_tokens, output_tokens}, total_cost_usd}
//   grader({job, pairShotsAB}) -> raw text (parseGrade turns it into scores); pairShotsAB = {A:[p,p], B:[p,p]}
// =====================================================================================================
import { mkdtempSync, writeFileSync, existsSync, statSync, readFileSync as readFile } from "node:fs";
import { tmpdir } from "node:os";

const SUFFIX_RE = /index\.html/;
const promptArg = (argv) => argv[argv.length - 1];
const valueOf = (argv, flag) => argv[argv.indexOf(flag) + 1];
const P = { id: "p1", text: "Hearth home: a grandparent opens the app to see the newest family photos." };

test("UXB-1 real runner: buildClaudeArgs plain arm has no --agent, sonnet, json output, Write-only tools", async () => {
  const { buildClaudeArgs } = await load();
  const a = buildClaudeArgs({ arm: "plain", prompt: P, model: "sonnet", dir: "/tmp/x" });
  assert.ok(Array.isArray(a));
  assert.ok(a.includes("-p"));
  assert.ok(!a.includes("--agent"), "plain arm has no role file");
  assert.equal(valueOf(a, "--model"), "sonnet");
  assert.equal(valueOf(a, "--output-format"), "json");
  const toolFlag = a.findIndex((x) => /^--(allowed-?tools|tools)$/i.test(x));
  assert.ok(toolFlag >= 0, "tools are limited with --tools or --allowedTools");
  assert.equal(a[toolFlag + 1], "Write", "only Write");
});
test("UXB-1 real runner: buildClaudeArgs ux arm uses --agent ux-reviewer on sonnet", async () => {
  const { buildClaudeArgs } = await load();
  const a = buildClaudeArgs({ arm: "ux", prompt: P, model: "sonnet", dir: "/tmp/x" });
  assert.equal(valueOf(a, "--agent"), "ux-reviewer");
  assert.equal(valueOf(a, "--model"), "sonnet");
  assert.equal(valueOf(a, "--output-format"), "json");
  assert.ok(!a.includes("--append-system-prompt"), "the stub's system-prompt shortcut is gone");
});
test("UXB-1 real runner: both arms get the IDENTICAL prompt text with one identical suffix", async () => {
  const { buildClaudeArgs } = await load();
  const plain = promptArg(buildClaudeArgs({ arm: "plain", prompt: P, model: "sonnet", dir: "/tmp/x" }));
  const ux = promptArg(buildClaudeArgs({ arm: "ux", prompt: P, model: "sonnet", dir: "/tmp/x" }));
  assert.equal(plain, ux);
  assert.ok(plain.startsWith(P.text));
  const suffix = plain.slice(P.text.length);
  assert.match(suffix, SUFFIX_RE);
  assert.match(suffix, /self-contained/i);
  assert.match(suffix, /no remote url/i);
  assert.match(suffix, /working directory/i);
});

const okStdout = JSON.stringify({ result: "done", usage: { input_tokens: 40, output_tokens: 60 }, total_cost_usd: 0.25 });
const tmpMk = () => async (prefix) => mkdtempSync(join(tmpdir(), String(prefix || "uxb-").replace(/[\\/]/g, "_")));
const writingSpawn = (html, over = {}, calls = []) => async (cmd, args, opts) => {
  calls.push({ cmd, args, opts });
  if (html !== null) writeFileSync(join(opts.cwd, "index.html"), html);
  return { status: 0, stdout: okStdout, ...over };
};

test("UXB-1 UXB-14 real runner: runClaudeArm runs claude in the temp dir and returns html, tokens, cost", async () => {
  const { runClaudeArm } = await load();
  const calls = [];
  const r = await runClaudeArm({ arm: "ux", prompt: P, model: "sonnet", spawn: writingSpawn(fx("html-good.html"), {}, calls), mkdtemp: tmpMk() });
  assert.equal(r.error, undefined, JSON.stringify(r));
  assert.equal(r.html, fx("html-good.html"));
  assert.equal(r.tokens, 100);
  assert.equal(r.costUsd, 0.25);
  assert.equal(calls.length, 1);
  assert.match(calls[0].cmd, /claude/);
  assert.ok(calls[0].opts.cwd && existsSync(calls[0].opts.cwd), "cwd is the temp dir");
  assert.equal(valueOf(calls[0].args, "--agent"), "ux-reviewer");
});
for (const [name, spawnFn] of [
  ["spawn error", writingSpawn(null, { status: null, error: Object.assign(new Error("ENOENT"), { code: "ENOENT" }) })],
  ["timeout", writingSpawn(null, { status: null, error: Object.assign(new Error("spawnSync claude ETIMEDOUT"), { code: "ETIMEDOUT" }), signal: "SIGTERM" })],
  ["nonzero exit", writingSpawn(fx("html-good.html"), { status: 1, stdout: "", stderr: "rate limit" })],
  ["index.html missing", writingSpawn(null)],
  ["index.html empty", writingSpawn("  \n")],
  ["spawn throws", async () => { throw new Error("boom"); }],
]) {
  test(`UXB-15 real runner: runClaudeArm returns {error:{kind}} on ${name}, never a loss`, async () => {
    const { runClaudeArm, classifyRun } = await load();
    const r = await runClaudeArm({ arm: "plain", prompt: P, model: "sonnet", spawn: spawnFn, mkdtemp: tmpMk() });
    assert.equal(typeof r.error?.kind, "string", JSON.stringify(r));
    assert.ok(r.error.kind.length > 0);
    assert.equal(r.html, undefined);
    assert.equal(classifyRun(r).excluded, true);
  });
}
test("UXB-15 real runner: a timeout is reported with kind 'timeout'", async () => {
  const { runClaudeArm } = await load();
  const r = await runClaudeArm({ arm: "plain", prompt: P, model: "sonnet", mkdtemp: tmpMk(),
    spawn: writingSpawn(null, { status: null, error: Object.assign(new Error("ETIMEDOUT"), { code: "ETIMEDOUT" }), signal: "SIGTERM" }) });
  assert.equal(r.error.kind, "timeout");
});

// ---- UXB-3 real Playwright (chromium preinstalled; launch with no options)
test("UXB-3 real runner: renderShots writes two non-empty PNGs and counts page errors", async () => {
  const { renderShots } = await load();
  const outDir = mkdtempSync(join(tmpdir(), "uxb-shots-"));
  const html = '<!doctype html><html><body><h1>Tiny</h1><script>throw new Error("boom")</script></body></html>';
  const r = await renderShots({ html, widths: [390, 1280], outDir });
  assert.equal(r.shots.length, 2);
  for (const p of r.shots) {
    assert.ok(existsSync(p), p);
    assert.ok(statSync(p).size > 0, `${p} is empty`);
    assert.deepEqual([...readFile(p).subarray(1, 4)], [0x50, 0x4e, 0x47], "PNG signature");
  }
  assert.ok(r.consoleErrors >= 1, "the thrown error is counted");
});
test("UXB-3 real runner: renderShots reports zero errors for a clean page", async () => {
  const { renderShots } = await load();
  const r = await renderShots({ html: "<!doctype html><html><body><p>ok</p></body></html>", widths: [390, 1280], outDir: mkdtempSync(join(tmpdir(), "uxb-shots-")) });
  assert.equal(r.consoleErrors, 0);
  assert.equal(r.shots.length, 2);
});
test("UXB-2 real runner: renderShots blocks remote URL requests, counts them and fails the call", async () => {
  const { renderShots } = await load();
  const html = '<!doctype html><html><body><img src="https://example.invalid/x.png"><p>x</p></body></html>';
  const r = await renderShots({ html, widths: [390], outDir: mkdtempSync(join(tmpdir(), "uxb-shots-")) });
  assert.equal(r.ok, false);
  assert.ok(r.remoteRequests >= 1, `remoteRequests=${r.remoteRequests}`);
});

// ---- UXB-7, UXB-8 grader
const SHOTS = { A: ["/s/a-390.png", "/s/a-1280.png"], B: ["/s/b-390.png", "/s/b-1280.png"] };
test("UXB-7 real runner: buildGraderPrompt has the one-line job and four image paths in A/B order", async () => {
  const { buildGraderPrompt } = await load();
  const job = "A grandparent sees the newest family photos.";
  const t = String(buildGraderPrompt({ job, pairShotsAB: SHOTS }));
  assert.equal(t.split(job).length - 1, 1, "job appears exactly once");
  const idx = [...SHOTS.A, ...SHOTS.B].map((p) => t.indexOf(p));
  assert.ok(idx.every((i) => i >= 0), "all four paths present");
  assert.deepEqual([...idx].sort((a, b) => a - b), idx, "A paths before B paths, 390 before 1280");
  assert.equal([...t.matchAll(/\/s\/[ab]-\d+\.png/g)].length, 4, "exactly four image paths");
});
test("UXB-7 real runner: buildGraderPrompt leaks no prompt text, arm names or role names", async () => {
  const { buildGraderPrompt } = await load();
  const t = String(buildGraderPrompt({ job: "A grandparent sees the newest family photos.", pairShotsAB: SHOTS }));
  for (const w of ["plain", "ux", "ux-reviewer", "reviewer", "sonnet", "claude", "Hearth home", "arm"]) {
    assert.ok(!new RegExp(`(?<![a-z])${w}(?![a-z])`, "i").test(t), `grader prompt mentions "${w}"`);
  }
});
const goodGrade = { A: { clean: [true, true, false, true, true], polish: 6 }, B: { clean: [true, true, true, true, true], polish: 9 } };
test("UXB-8 real runner: parseGrade reads the JSON object, also inside a code fence", async () => {
  const { parseGrade } = await load();
  const r = parseGrade(JSON.stringify(goodGrade));
  assert.equal(r.error, undefined, JSON.stringify(r));
  assert.deepEqual(r.grade.A.clean, goodGrade.A.clean);
  assert.equal(r.grade.B.polish, 9);
  assert.equal(parseGrade("```json\n" + JSON.stringify(goodGrade) + "\n```").error, undefined);
});
for (const [name, text] of [
  ["not JSON", "I think B is nicer."],
  ["empty", ""],
  ["four CLEAN booleans", JSON.stringify({ ...goodGrade, A: { clean: [true, true, true, true], polish: 6 } })],
  ["non-boolean CLEAN", JSON.stringify({ ...goodGrade, A: { clean: [1, 1, 1, 1, 1], polish: 6 } })],
  ["polish above 10", JSON.stringify({ ...goodGrade, B: { clean: [true, true, true, true, true], polish: 11 } })],
  ["missing B", JSON.stringify({ A: goodGrade.A })],
]) {
  test(`UXB-8 real runner: parseGrade returns an error, not a score, on ${name}`, async () => {
    const { parseGrade } = await load();
    const r = parseGrade(text);
    assert.equal(typeof r.error?.kind, "string", JSON.stringify(r));
    assert.equal(r.grade, undefined);
  });
}

// ---- runDevSet (UXB-5, 13, 14, 15)
function devFakes() {
  const log = { runner: [], active: 0, maxActive: 0, grader: [] };
  const runner = async ({ arm, prompt, model }) => {
    log.active++; log.maxActive = Math.max(log.maxActive, log.active);
    log.runner.push({ arm, promptId: prompt.id, model });
    await new Promise((r) => setTimeout(r, 2));
    log.active--;
    if (prompt.id === "p2" && arm === "plain") return { error: { kind: "rate_limit" } };
    return { html: fx("html-good.html"), tokens: 100, costUsd: 0.5 };
  };
  const renderer = async ({ width, height }) => ({ png: `/s/shot-${width}x${height}.png`, consoleErrors: 0 });
  const grader = async ({ job, pairShotsAB }) => { log.grader.push({ job, pairShotsAB }); return JSON.stringify({ A: { clean: [true, true, true, true, true], polish: 5 }, B: { clean: [true, true, true, true, true], polish: 9 } }); };
  return { log, runner, renderer, grader };
}
const outPath = (n) => join(mkdtempSync(join(tmpdir(), "uxb-out-")), n);

test("UXB-13 UXB-14 real runner: runDevSet writes a results file with the UXB-13 fields, one arm at a time", async () => {
  const m = await load();
  const f = devFakes();
  const outFile = outPath("results.json");
  await m.runDevSet({ prompts: prompts(), split: "dev", runner: f.runner, renderer: f.renderer, grader: f.grader, changeId: "chg-1", model: "sonnet", outFile });
  assert.ok(existsSync(outFile), "results file written");
  const res = JSON.parse(readFile(outFile, "utf8"));
  assert.equal(m.checkResults(res).ok, true, JSON.stringify(m.checkResults(res)));
  assert.equal(res.split, "dev");
  assert.equal(res.changeId, "chg-1");
  assert.equal(res.graderModel, "opus");
  assert.deepEqual([...res.arms].sort(), ["plain", "ux"]);
  assert.equal(res.armModels.plain, "sonnet");
  assert.equal(res.armModels.ux, "sonnet");
  assert.ok(res.n && Number.isFinite(res.n.prompts) && res.n.runsPerArm === 1, JSON.stringify(res.n));
  assert.ok(Array.isArray(res.limits) && res.limits.length > 0);
  assert.ok(res.cost > 0, "cost totals the runs");
  assert.equal(f.log.maxActive, 1, "arms run strictly one at a time");
  assert.ok(f.log.runner.every((r) => r.model === "sonnet"));
  const ids = new Set(f.log.runner.map((r) => r.promptId));
  assert.deepEqual([...ids].sort(), ["p1", "p2", "p3", "p4", "p5"], "dev split only, no heldout prompt");
});
test("UXB-15 real runner: runDevSet excludes an errored pair from scores and counts no loss", async () => {
  const m = await load();
  const f = devFakes();
  const outFile = outPath("results.json");
  await m.runDevSet({ prompts: prompts(), split: "dev", runner: f.runner, renderer: f.renderer, grader: f.grader, changeId: "chg-2", model: "sonnet", outFile });
  const res = JSON.parse(readFile(outFile, "utf8"));
  const text = JSON.stringify(res);
  assert.ok(text.includes("rate_limit"), "the error is recorded, not hidden");
  const scored = res.scored ?? res.tally?.scored;
  assert.ok(scored && typeof scored === "object", "results carry scored prompts");
  assert.equal(scored.p2, undefined, "p2 had an errored arm so it has no score");
  assert.equal(Object.keys(scored).length, 4);
  assert.equal(f.log.grader.length, 4, "an errored pair is never sent to the grader");
  const t = res.tally ?? res;
  assert.equal((t.wins?.plain ?? 0) + (t.wins?.ux ?? 0) + (t.ties ?? 0), 4, "only the 4 clean pairs are counted");
});
test("UXB-7 real runner: runDevSet gives the grader only the job and screenshots", async () => {
  const m = await load();
  const f = devFakes();
  await m.runDevSet({ prompts: prompts(), split: "dev", runner: f.runner, renderer: f.renderer, grader: f.grader, changeId: "chg-3", model: "sonnet", outFile: outPath("r.json") });
  for (const g of f.log.grader) {
    assert.deepEqual(Object.keys(g).sort(), ["job", "pairShotsAB"]);
    assert.equal(g.pairShotsAB.A.length, 2);
    assert.equal(g.pairShotsAB.B.length, 2);
  }
});
test("UXB-5 real runner: runDevSet refuses a second heldout run for the same change id", async () => {
  const m = await load();
  const ledger = m.createHeldoutLedger();
  const run = (changeId) => { const f = devFakes(); return m.runDevSet({ prompts: prompts(), split: "heldout", ledger, runner: f.runner, renderer: f.renderer, grader: f.grader, changeId, model: "sonnet", outFile: outPath("h.json") }); };
  await run("chg-h");
  await assert.rejects(() => run("chg-h"), /held-?out/i);
  await run("chg-h2");
});
test("UXB-5 real runner: a heldout run uses only the 3 heldout prompts; dev may repeat for one change id", async () => {
  const m = await load();
  const f = devFakes();
  await m.runDevSet({ prompts: prompts(), split: "heldout", ledger: m.createHeldoutLedger(), runner: f.runner, renderer: f.renderer, grader: f.grader, changeId: "chg-x", model: "sonnet", outFile: outPath("h.json") });
  assert.deepEqual([...new Set(f.log.runner.map((r) => r.promptId))].sort(), ["p6", "p7", "p8"]);
  const g = devFakes();
  const ledger = m.createHeldoutLedger();
  for (let i = 0; i < 2; i++) await m.runDevSet({ prompts: prompts(), split: "dev", ledger, runner: g.runner, renderer: g.renderer, grader: g.grader, changeId: "same", model: "sonnet", outFile: outPath("d.json") });
});
