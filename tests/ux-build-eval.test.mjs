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
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, statSync, readFileSync as readFile } from "node:fs";
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
  // Fake updated: it used to return nonexistent paths; it now writes a tiny real file so a missing shot means a real failure.
  const shotDir = mkdtempSync(join(tmpdir(), "uxb-dev-shots-"));
  let shotN = 0;
  const renderer = async ({ width, height }) => { const png = join(shotDir, `shot-${width}x${height}-${shotN++}.png`); writeFileSync(png, "png"); return { png, consoleErrors: 0 }; };
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

// =====================================================================================================
// Round 2 (QA-R1, QA-R2, QA-R3, multi-run, remote-URL rule, scorecard-ready results). Fakes are TEST-ONLY.
// Contracts chosen here (change them only with the test):
//   runDevSet({..., runs = 1, shotsRoot})  runs = runs per arm per prompt; shotsRoot = where neutral shot dirs go
//     (default: a fresh temp dir). Shots are COPIED to shotsRoot/<s1|s2...>/..., so the grader never sees the
//     renderer's paths, --out, change id or any arm name.
//   grader(...) may return a string, {text, costUsd} or {error:{kind}} (a failed spawn).
//   runClaudeGrader({job, pairShotsAB, spawn, mkdtemp, timeout}) -> {text, costUsd} | {error:{kind}}
//   results file: {schemaVersion:1, pairs:[{promptId, run, order:[arm,arm], scores:{plain,ux}, status, reason?}],
//     summary:{scoredPairs, erroredPairs, wins:{plain,ux}, ties, meanPolish:{plain,ux}, perPrompt:{id:{plain,ux,scoredPairs}}}}
//   parseCliArgs(argv) -> {runs (default 1), changeId, out, split, ...}; cliPaths({changeId, root}) -> {outFile, shotsRoot}
// =====================================================================================================
import { spawnSync } from "node:child_process";
import { sep, basename } from "node:path";

const armHtml = (arm, id) => `<!doctype html><html><head><title>t</title></head><body><p>ARM:${arm} PROMPT:${id}</p></body></html>`;
const POLISH = { p1: { ux: 9, plain: 5 }, p3: { ux: 7, plain: 7 }, p4: { ux: 6, plain: 8 }, p5: { ux: 9, plain: 5 } };
function r2Fakes({ changeId, errorPlainFor = ["p2"], polish = (id) => POLISH[id] ?? { ux: 9, plain: 5 }, graderReply } = {}) {
  const log = { order: {}, active: 0, maxActive: 0, grader: [], labels: [] };
  const runner = async ({ arm, prompt }) => {
    log.active++; log.maxActive = Math.max(log.maxActive, log.active);
    (log.order[prompt.id] ??= []).push(arm);
    await new Promise((r) => setTimeout(r, 1));
    log.active--;
    if (arm === "plain" && errorPlainFor.includes(prompt.id)) return { error: { kind: "rate_limit" } };
    return { html: armHtml(arm, prompt.id), tokens: 10, costUsd: 0.1 };
  };
  let n = 0;
  const renderer = async ({ html, width, height }) => {
    const [, arm, id] = html.match(/ARM:(\w+) PROMPT:(\w+)/);
    // deliberately arm- and change-revealing paths: the harness must not hand these to the grader
    const dir = join(mkdtempSync(join(tmpdir(), "uxb-r-")), `${changeId ?? "c"}-out-${arm}`);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `shot-${arm}-${width}x${height}-${n++}.png`);
    writeFileSync(file, `${arm}:${id}`);
    return { png: file, consoleErrors: 0 };
  };
  const grader = async ({ job, pairShotsAB }) => {
    log.grader.push({ job, pairShotsAB });
    if (graderReply) return graderReply;
    const [a, b] = ["A", "B"].map((l) => readFile(pairShotsAB[l][0], "utf8").split(":"));
    log.labels.push(a[0]);
    const sc = polish(a[1]);
    const g = (arm) => ({ clean: [true, true, true, true, true], polish: sc[arm] });
    return JSON.stringify({ A: g(a[0]), B: g(b[0]) });
  };
  return { log, runner, renderer, grader };
}
async function r2Run(over = {}) {
  const m = await load();
  const changeId = over.changeId ?? "chg-r2";
  const f = r2Fakes({ changeId, ...over.fake });
  const outFile = outPath("res.json");
  const set = over.prompts ?? prompts();
  await m.runDevSet({ prompts: set, split: "dev", runner: f.runner, renderer: f.renderer, grader: f.grader, changeId, model: "sonnet", outFile, ...over.opts });
  return { f, outFile, res: JSON.parse(readFile(outFile, "utf8")), m };
}
const eight = () => Array.from({ length: 8 }, (_, i) => ({ ...prompts()[i % 5], id: `q${i + 1}`, split: "dev" }));

// ---- QA-R2 arm order
test("QA-R2 arm order is randomized per prompt: across 8 prompt ids both orders occur", async () => {
  const { f } = await r2Run({ prompts: eight(), fake: { errorPlainFor: [] } });
  const firsts = new Set(Object.values(f.log.order).map((o) => o[0]));
  assert.deepEqual([...firsts].sort(), ["plain", "ux"], JSON.stringify(f.log.order));
  assert.ok(Object.values(f.log.order).every((o) => o.length === 2 && new Set(o).size === 2));
});
test("QA-R2 the order is repeatable (seeded from changeId:promptId) and arms still run one at a time", async () => {
  const a = await r2Run({ prompts: eight(), fake: { errorPlainFor: [] } });
  const b = await r2Run({ prompts: eight(), fake: { errorPlainFor: [] } });
  assert.deepEqual(a.f.log.order, b.f.log.order);
  assert.equal(a.f.log.maxActive, 1);
});
test("QA-R2 the results file lists the order used per prompt, matching what actually ran", async () => {
  const { f, res } = await r2Run({ prompts: eight(), fake: { errorPlainFor: [] } });
  assert.equal(res.pairs.length, 8);
  for (const p of res.pairs) assert.deepEqual(p.order, f.log.order[p.promptId], p.promptId);
});

// ---- QA-R1 neutral shot paths
test("QA-R1 the grader sees only neutral s1/s2-style paths under shotsRoot, never --out, change id or arm names", async () => {
  const root = mkdtempSync(join(tmpdir(), "neutral-root-"));
  const changeId = "chg-ux-plain-leak";
  const { f, outFile } = await r2Run({ changeId, opts: { shotsRoot: root } });
  assert.ok(f.log.grader.length > 0);
  const outDirName = basename(dirname(outFile)).toLowerCase();
  for (const { pairShotsAB } of f.log.grader) {
    const aDirs = new Set(), bDirs = new Set();
    for (const [label, set] of [["A", aDirs], ["B", bDirs]]) for (const p of pairShotsAB[label]) {
      assert.ok(p.startsWith(root + sep), `${p} is not under shotsRoot`);
      assert.ok(existsSync(p), `${p} must exist (copied)`);
      const rel = p.slice(root.length + 1).toLowerCase();
      for (const bad of ["ux", "plain", changeId.toLowerCase(), outDirName]) assert.ok(!rel.includes(bad), `${rel} leaks "${bad}"`);
      assert.match(rel.split(sep)[0], /^s\d+$/, `${rel}: first segment should be s1/s2 style`);
      set.add(rel.split(sep)[0]);
    }
    assert.equal(aDirs.size, 1); assert.equal(bDirs.size, 1);
    assert.notDeepEqual([...aDirs], [...bDirs], "A and B live in different neutral dirs");
  }
});
test("QA-R1 with the default shots root the grader paths still carry no change id, out dir or arm name from us", async () => {
  const changeId = "chg-leakcheck-plain";
  const { f, outFile } = await r2Run({ changeId });
  for (const { pairShotsAB } of f.log.grader) for (const p of [...pairShotsAB.A, ...pairShotsAB.B]) {
    assert.ok(existsSync(p));
    assert.ok(!p.includes(changeId), p);
    assert.ok(!p.includes(basename(dirname(outFile))), p);
    assert.ok(!/plain/i.test(p), p);
    assert.match(basename(dirname(p)), /^s\d+$/, p);
  }
});

// ---- QA-R3 grader failure kinds
for (const kind of ["timeout", "exit_nonzero", "rate_limit"]) {
  test(`QA-R3 a failed grader (${kind}) records that kind on the errored pair, not 'unparseable'`, async () => {
    const { res } = await r2Run({ fake: { errorPlainFor: [], graderReply: { error: { kind } } } });
    assert.ok(res.pairs.length > 0 && res.pairs.every((p) => p.status === "error"), JSON.stringify(res.pairs[0]));
    for (const p of res.pairs) { assert.match(String(p.reason), new RegExp(kind)); assert.ok(!/unparseable/.test(String(p.reason))); }
    assert.ok(!JSON.stringify(res).includes("unparseable"));
    assert.equal(res.summary.scoredPairs, 0);
    assert.equal(res.summary.wins.ux + res.summary.wins.plain + res.summary.ties, 0, "errors are never wins, losses or ties");
  });
}
test("QA-R3 runClaudeGrader maps a failed spawn to {error:{kind}} and a good one to text and cost", async () => {
  const { runClaudeGrader } = await load();
  const call = (r) => runClaudeGrader({ job: "A grandparent sees photos.", pairShotsAB: SHOTS, mkdtemp: tmpMk(), spawn: async () => r });
  assert.equal((await call({ status: null, signal: "SIGTERM", error: Object.assign(new Error("ETIMEDOUT"), { code: "ETIMEDOUT" }) })).error.kind, "timeout");
  assert.equal((await call({ status: 1, stdout: "", stderr: "429 rate limit" })).error.kind, "rate_limit");
  assert.equal((await call({ status: 2, stdout: "", stderr: "boom" })).error.kind, "exit_nonzero");
  const ok = await call({ status: 0, stdout: JSON.stringify({ result: "{}", total_cost_usd: 0.3 }) });
  assert.equal(ok.error, undefined); assert.equal(ok.text, "{}"); assert.equal(ok.costUsd, 0.3);
});

// ---- multi-run
test("UXB-14 multi-run: --runs N runs N times per arm per prompt and records n.runsPerArm", async () => {
  const { f, res } = await r2Run({ opts: { runs: 3 }, fake: { errorPlainFor: [] } });
  for (const id of ["p1", "p2", "p3", "p4", "p5"]) assert.equal(f.log.order[id].length, 6, id);
  assert.equal(res.n.runsPerArm, 3);
  assert.equal(res.n.prompts, 5);
  assert.equal(f.log.maxActive, 1);
  assert.equal(res.pairs.length, 15);
  assert.deepEqual(res.pairs.filter((p) => p.promptId === "p1").map((p) => p.run).sort(), [0, 1, 2]);
});
test("UXB-14 multi-run: default is one run per arm", async () => {
  const { f, res } = await r2Run({ fake: { errorPlainFor: [] } });
  assert.equal(res.n.runsPerArm, 1);
  assert.equal(f.log.order.p1.length, 2);
});
test("UXB-7 multi-run: every run pair is graded separately, blind and shuffled, and scores map back to the right arm", async () => {
  const { f, res } = await r2Run({ prompts: eight(), opts: { runs: 2 }, fake: { errorPlainFor: [] } });
  assert.equal(f.log.grader.length, 16, "one grader call per run pair");
  assert.equal(res.pairs.length, 16);
  assert.deepEqual([...new Set(f.log.labels)].sort(), ["plain", "ux"], "A is sometimes plain, sometimes ux");
  for (const p of res.pairs) { assert.equal(p.scores.ux, 9, p.promptId); assert.equal(p.scores.plain, 5, p.promptId); assert.equal(p.status, "ok"); }
});
test("UXB-15 multi-run: an errored pair is excluded, not a loss; summary has wins, ties, mean polish and per-prompt means", async () => {
  const { f, res } = await r2Run({ opts: { runs: 3 } });
  assert.equal(f.log.grader.length, 12, "p2 plain errored in all 3 runs: 3 pairs never graded");
  const p2 = res.pairs.filter((p) => p.promptId === "p2");
  assert.equal(p2.length, 3);
  for (const p of p2) { assert.equal(p.status, "error"); assert.match(String(p.reason), /rate_limit/); assert.ok(!Number.isFinite(p.scores?.plain) && !Number.isFinite(p.scores?.ux)); }
  const s = res.summary;
  assert.equal(s.scoredPairs, 12);
  assert.equal(s.erroredPairs, 3);
  assert.deepEqual(s.wins, { plain: 3, ux: 6 });
  assert.equal(s.ties, 3);
  assert.equal(s.meanPolish.ux, 7.75);
  assert.equal(s.meanPolish.plain, 6.25);
  assert.equal(s.perPrompt.p1.ux, 9); assert.equal(s.perPrompt.p1.plain, 5);
  assert.equal(s.perPrompt.p3.ux, 7); assert.equal(s.perPrompt.p3.plain, 7);
  assert.equal(s.perPrompt.p4.ux, 6); assert.equal(s.perPrompt.p4.plain, 8);
  assert.equal(s.perPrompt.p2?.scoredPairs ?? 0, 0);
  const p1 = res.pairs.filter((p) => p.promptId === "p1");
  assert.equal(p1.length, 3);
  assert.ok(p1.every((p) => p.scores.ux === 9 && p.scores.plain === 5), "per-run scores kept");
});
test("UXB-15 multi-run: tally excludes only the errored run pair and reports means", async () => {
  const { tally } = await load();
  const t = tally([
    { promptId: "p1", run: 0, arm: "plain", status: "ok", polish: 4 }, { promptId: "p1", run: 0, arm: "ux", status: "ok", polish: 8 },
    { promptId: "p1", run: 1, arm: "plain", status: "error", polish: null }, { promptId: "p1", run: 1, arm: "ux", status: "ok", polish: 9 },
    { promptId: "p1", run: 2, arm: "plain", status: "ok", polish: 6 }, { promptId: "p1", run: 2, arm: "ux", status: "ok", polish: 6 },
  ]);
  assert.deepEqual(t.wins, { plain: 0, ux: 1 });
  assert.equal(t.ties, 1);
  assert.deepEqual(t.losses, { plain: 1, ux: 0 });
  assert.deepEqual(t.meanPolish, { plain: 5, ux: 7 });
  assert.deepEqual(t.perPrompt.p1, { plain: 5, ux: 7, scoredPairs: 2 });
});

// ---- UXB-2 remote-URL rule: only LOADED remote resources are rejected
test("UXB-2 a plain <a href> to a remote page is not a loaded resource and does not exclude the arm", async () => {
  const { validateArmOutput } = await load();
  for (const href of ["https://github.com/holroydchase-afk", "http://example.com/x", "//example.com/x", "mailto:a@b.co"]) {
    const r = validateArmOutput(`<!doctype html><html><body><a href="${href}">link</a><p>x</p></body></html>`);
    assert.equal(r.ok, true, `${href}: ${JSON.stringify(r)}`);
  }
});
for (const [why, html] of [
  ["img src", '<img src="https://x.example.com/a.png" alt="">'],
  ["iframe src", '<iframe src="https://x.example.com/"></iframe>'],
  ["link rel=stylesheet", '<link rel="stylesheet" href="https://x.example.com/a.css">'],
  ["link rel=stylesheet, href first, single quotes", "<link href='https://x.example.com/a.css' rel='stylesheet'>"],
  ["script src", '<script src="//x.example.com/a.js"></script>'],
  ["inline fetch", '<script>fetch("https://api.example.com/data")</script>'],
  ["css url()", '<style>body{background:url(https://x.example.com/a.png)}</style>'],
  ["css @import", '<style>@import url("https://x.example.com/a.css");</style>'],
  ["srcset", '<img srcset="a.png 1x, https://x.example.com/b.png 2x" alt="">'],
]) {
  test(`UXB-2 a loaded remote resource is still rejected (${why})`, async () => {
    const { validateArmOutput } = await load();
    const r = validateArmOutput(`<!doctype html><html><body>${html}</body></html>`);
    assert.equal(r.ok, false);
    assert.equal(r.status, "error");
    assert.ok(r.reasons.length > 0);
  });
}
test("UXB-2 a non-stylesheet <link> (icon, canonical) is not a loaded remote resource", async () => {
  const { validateArmOutput } = await load();
  const r = validateArmOutput('<!doctype html><html><head><link rel="canonical" href="https://example.com/"></head><body>x</body></html>');
  assert.equal(r.ok, true, JSON.stringify(r));
});

// ---- scorecard-ready results, CLI defaults, gitignore
test("QA-R6 results file has schemaVersion 1, a flat pairs array and a summary, and still passes checkResults", async () => {
  const { res, m } = await r2Run({ fake: { errorPlainFor: [] } });
  assert.equal(res.schemaVersion, 1);
  assert.ok(Array.isArray(res.pairs) && res.pairs.length === 5);
  for (const p of res.pairs) {
    assert.deepEqual(Object.keys(p).filter((k) => ["promptId", "run", "order", "scores", "status"].includes(k)).sort(), ["order", "promptId", "run", "scores", "status"]);
    assert.equal(typeof p.promptId, "string"); assert.equal(typeof p.run, "number");
    assert.deepEqual([...p.order].sort(), ["plain", "ux"]);
    assert.deepEqual(Object.keys(p.scores).sort(), ["plain", "ux"]);
  }
  for (const k of ["scoredPairs", "erroredPairs", "wins", "ties", "meanPolish", "perPrompt"]) assert.ok(k in res.summary, `summary.${k}`);
  assert.equal(m.checkResults(res).ok, true);
});
test("QA-R6 parseCliArgs: --runs N defaults to 1 and rejects non-positive or non-integer values", async () => {
  const { parseCliArgs } = await load();
  assert.equal(parseCliArgs(["--change-id", "c1"]).runs, 1);
  assert.equal(parseCliArgs(["--change-id", "c1", "--runs", "3"]).runs, 3);
  assert.equal(parseCliArgs(["--change-id", "c1"]).changeId, "c1");
  for (const bad of ["0", "-1", "x", "1.5"]) assert.throws(() => parseCliArgs(["--change-id", "c1", "--runs", bad]), /runs/i, bad);
});
test("QA-R6 default output is evals/ux-build/results/<changeId>.json, shots in results/.shots, not /tmp", async () => {
  const { cliPaths } = await load();
  const p = cliPaths({ changeId: "c1", root: "/repo" });
  assert.equal(p.outFile, join("/repo", "evals", "ux-build", "results", "c1.json"));
  assert.equal(p.shotsRoot, join("/repo", "evals", "ux-build", "results", ".shots"));
  assert.ok(!p.outFile.startsWith(tmpdir()) && !p.shotsRoot.startsWith(tmpdir()));
  const real = cliPaths({ changeId: "c1" });
  assert.ok(real.outFile.startsWith(join(root, "evals", "ux-build", "results") + sep), "default root is the repo");
});
test("QA-R6 .gitignore ignores results/.shots/ but not the committed results json", () => {
  const ign = (p) => spawnSync("git", ["check-ignore", "-q", p], { cwd: root }).status === 0;
  assert.equal(ign("evals/ux-build/results/.shots/r-abc/s1/shot.png"), true, ".shots must be ignored");
  assert.equal(ign("evals/ux-build/results/change-1.json"), false, "results json must stay committable");
});

// ---- QA-R1 a missing or failed screenshot never silently grades
const forPrompt = (renderer, id, bad) => async (a) => (a.html.includes(`PROMPT:${id}`) ? bad(a) : renderer(a));

test("QA-R1 a screenshot path that does not exist errors the pair with reason 'no screenshot', skips the grader, counts no win or loss", async () => {
  const m = await load();
  const f = r2Fakes({ changeId: "chg-ns", errorPlainFor: [] });
  const renderer = forPrompt(f.renderer, "p3", async ({ width }) => ({ png: join(tmpdir(), "uxb-does-not-exist", `s-${width}.png`), consoleErrors: 0 }));
  const outFile = outPath("ns.json");
  await m.runDevSet({ prompts: prompts(), split: "dev", runner: f.runner, renderer, grader: f.grader, changeId: "chg-ns", model: "sonnet", outFile });
  const res = JSON.parse(readFile(outFile, "utf8"));
  const pair = res.pairs.find((x) => x.promptId === "p3");
  assert.equal(pair.status, "error");
  assert.match(pair.reason, /no screenshot/);
  assert.deepEqual(pair.scores, { plain: null, ux: null });
  assert.equal(f.log.grader.length, 4, "the grader saw only the 4 pairs that have real screenshots");
  for (const g of f.log.grader) for (const p of [...g.pairShotsAB.A, ...g.pairShotsAB.B]) assert.ok(statSync(p).size > 0, "no empty placeholder is graded");
  assert.equal(res.scored.p3, undefined);
  const t = res.tally;
  assert.equal(t.wins.plain + t.wins.ux + t.ties, 4, "the missing-shot pair is no win, loss or tie");
  assert.equal(t.losses.plain + t.losses.ux, t.wins.plain + t.wins.ux);
});

test("QA-R1 a renderer that throws errors that run with reason 'render failed', excludes the pair and the set continues", async () => {
  const m = await load();
  const f = r2Fakes({ changeId: "chg-rt", errorPlainFor: [] });
  const renderer = forPrompt(f.renderer, "p2", async () => { throw new Error("browser crashed"); });
  const outFile = outPath("rt.json");
  await m.runDevSet({ prompts: prompts(), split: "dev", runner: f.runner, renderer, grader: f.grader, changeId: "chg-rt", model: "sonnet", outFile });
  const res = JSON.parse(readFile(outFile, "utf8"));
  const pair = res.pairs.find((x) => x.promptId === "p2");
  assert.equal(pair.status, "error");
  assert.match(pair.reason, /render failed/);
  assert.ok(res.runs.filter((r) => r.promptId === "p2").every((r) => r.status === "error" && r.excluded), "the throwing runs are errored and excluded");
  assert.equal(res.pairs.length, 5, "later prompts still ran");
  assert.equal(f.log.grader.length, 4);
  assert.equal(res.summary.scoredPairs, 4);
  const t = res.tally;
  assert.equal(t.wins.plain + t.wins.ux + t.ties, 4, "an error is never a loss");
});
