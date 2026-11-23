// Batch 5 of the qa-tdd miss cases (Nov 23): four flaky 1-in-N reproductions, all `heldout`, `flaky: true`.
// The shipped test passes most runs; it fails by chance (about 1 run in 8) because of a race, a timing budget,
// shared state or completion order. Only running the suite several times shows it. The gap test repeats the
// operation many times so it is red every time, which lets --verify prove the repro. Real misses: RR-Q8, RR-Q6,
// HE-Q6, CK-Q5. Unread held-out set: never read while tuning, scored once per change.
const T = `import { test } from "node:test";\nimport assert from "node:assert/strict";\n`;

export const QA_BATCH5 = [
  {
    id: "focus-after-draw-race", miss: "RR-Q8", pattern: "flaky-or-wrong-timing", priority: "P1", split: "heldout", src: "rr", flaky: true,
    ask: "Opening the skip form moves focus to the reason field once the form has drawn.",
    file: "skipform.mjs",
    code: `// Opens the skip form and moves focus into the reason field once the form has drawn.
export function openSkipForm(form) {
  form.open = true;
  const drawMs = Math.random() < 0.12 ? 25 : 1;
  setTimeout(() => { form.focused = "reason"; }, drawMs);
}
`,
    testFile: "skipform.test.mjs",
    test: `${T}import { openSkipForm } from "./skipform.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
test("FOCUS-1 the form is open straight away", () => {
  const form = {};
  openSkipForm(form);
  assert.equal(form.open, true);
});
test("FOCUS-2 opening the form focuses the reason field", async () => {
  const form = {};
  openSkipForm(form);
  await sleep(10);
  assert.equal(form.focused, "reason");
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { openSkipForm } from "./skipform.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
test("GAP the 10 ms wait in FOCUS-2 leaves some forms unfocused when the draw is slow", async () => {
  const forms = Array.from({ length: 300 }, () => ({}));
  forms.forEach((f) => openSkipForm(f));
  await sleep(10);
  assert.equal(forms.filter((f) => f.focused !== "reason").length, 0);
});
`,
    gapText: "FOCUS-2 waits a fixed 10 ms for focus, but the form sometimes takes 25 ms to draw, so the test fails about one run in eight and passes when run again. It is a flaky timing race, not a green test: a single run says nothing. Running the suite several times shows it, and the right test waits for the focus event or a promise instead of a fixed sleep",
    gapTest: "opening 300 forms and waiting the same 10 ms must leave none unfocused (red, because about 12% draw slowly)",
  },
  {
    id: "timing-budget-under-load", miss: "RR-Q6", pattern: "flaky-or-wrong-timing", priority: "P1", split: "heldout", src: "rr", flaky: true,
    ask: "Building the roles index is fast: it finishes in under 50 ms.",
    file: "index-build.mjs",
    code: `// Builds the roles index; the work takes 2 ms, or about 60 ms when the machine is busy.
export function buildIndex(items) {
  const busy = Math.random() < 0.1 ? 60 : 2;
  const t = Date.now();
  while (Date.now() - t < busy) { /* spin */ }
  return new Map(items.map((i) => [i.id, i]));
}
`,
    testFile: "index-build.test.mjs",
    test: `${T}import { buildIndex } from "./index-build.mjs";
test("INDEX-1 the index holds every role by id", () => {
  const m = buildIndex([{ id: 1 }, { id: 2 }]);
  assert.equal(m.get(2).id, 2);
});
test("INDEX-2 building the index takes under 50 ms", () => {
  const t = Date.now();
  buildIndex(Array.from({ length: 100 }, (_, i) => ({ id: i })));
  assert.ok(Date.now() - t < 50, "too slow");
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { buildIndex } from "./index-build.mjs";
test("GAP over 100 builds at least one breaks the 50 ms budget INDEX-2 asserts", () => {
  let worst = 0;
  for (let i = 0; i < 100; i++) {
    const t = Date.now();
    buildIndex([{ id: i }]);
    worst = Math.max(worst, Date.now() - t);
  }
  assert.ok(worst < 50, "slowest build " + worst + " ms");
});
`,
    gapText: "INDEX-2 asserts a wall-clock budget on a build that sometimes takes about 60 ms on a busy machine, so it fails roughly one run in ten and passes on a rerun. The test measures machine load, not the code, and a single green run proves nothing. Repeated runs show it; the stable fix is to test the work done (or inject a clock) instead of elapsed time",
    gapTest: "100 builds, the slowest must stay under the same 50 ms budget (red, because about 10% take 60 ms)",
  },
  {
    id: "results-in-finish-order", miss: "CK-Q5", pattern: "flaky-or-wrong-timing", priority: "P1", split: "heldout", src: "ck", flaky: true,
    ask: "`loadAll` loads each teammate's punches in parallel and returns them in the order the teammates were listed.",
    file: "loadall.mjs",
    code: `// Loads every teammate's punches in parallel; results come back in the order the teammates were listed.
export async function loadAll(teammates, fetchPunches) {
  const out = [];
  await Promise.all(teammates.map(async (t) => { out.push({ who: t, punches: await fetchPunches(t) }); }));
  return out;
}
`,
    testFile: "loadall.test.mjs",
    test: `${T}import { loadAll } from "./loadall.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slowSometimes = async (t) => { await sleep(t === "Ana" && Math.random() < 0.12 ? 20 : 1); return [t.length]; };
test("LOAD-1 every teammate is loaded", async () => {
  const r = await loadAll(["Ana", "Ben"], async (t) => [t.length]);
  assert.equal(r.length, 2);
});
test("LOAD-2 results follow the listed order", async () => {
  const r = await loadAll(["Ana", "Ben"], slowSometimes);
  assert.deepEqual(r.map((x) => x.who), ["Ana", "Ben"]);
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { loadAll } from "./loadall.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
test("GAP when the first teammate answers last the results are still in the listed order", async () => {
  const r = await loadAll(["Ana", "Ben"], async (t) => { await sleep(t === "Ana" ? 20 : 1); return []; });
  assert.deepEqual(r.map((x) => x.who), ["Ana", "Ben"]);
});
`,
    gapText: "`loadAll` pushes each result when its fetch finishes, so the list is in completion order, not the listed order. LOAD-2 only fails when the first fetch is slow, which its fake does about one run in eight, so it passes most runs and fails on a few. Running the suite several times shows a flaky test; the real defect is the completion-order push (the fix is indexing results by position)",
    gapTest: "with the first teammate answering last, `loadAll([\"Ana\",\"Ben\"], ...)` must still return Ana first",
  },
  {
    id: "shared-temp-file-parallel", miss: "HE-Q6", pattern: "flaky-or-wrong-timing", priority: "P1", split: "heldout", src: "he", flaky: true,
    ask: "The outbox keeps queued items in a temp file; both test files check it.",
    file: "outbox.mjs",
    code: `// Outbox queue kept in one temp file.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
export const file = () => path.join(os.tmpdir(), "outbox-queue.json");
export const reset = () => fs.writeFileSync(file(), "[]");
export const all = () => JSON.parse(fs.readFileSync(file(), "utf8"));
export const push = (x) => fs.writeFileSync(file(), JSON.stringify([...all(), x]));
`,
    testFile: "outbox.test.mjs",
    test: `${T}import { reset, push, all } from "./outbox.mjs";
test("OUTBOX-1 a pushed item is queued", () => {
  reset();
  for (let i = 0; i < 200; i++) push(i);
  assert.equal(all().length, 200);
});
`,
    extra: [
      { name: "outbox-reset.test.mjs", content: `import { test } from "node:test";\nimport assert from "node:assert/strict";\nimport { reset, push, all } from "./outbox.mjs";\ntest("OUTBOX-2 reset empties the queue", () => {\n  push("x");\n  reset();\n  assert.deepEqual(all(), []);\n});\n` },
    ],
    gapName: "gap.test.mjs",
    gap: `${T}import { spawnSync } from "node:child_process";
test("GAP two test processes get different queue files", () => {
  const run = () => spawnSync(process.execPath, ["--input-type=module", "-e", "import('./outbox.mjs').then((m) => console.log(m.file()))"], { encoding: "utf8" }).stdout.trim();
  assert.notEqual(run(), run());
});
`,
    gapText: "Both test files use the same fixed temp file, and `node --test` runs files in parallel processes. One file's `reset()` can land between the other's `push` calls, so OUTBOX-1 fails now and then (and OUTBOX-2 can read a half-written file) and both pass when rerun. The shared state is the cause: every process computes the same path. Running the suite repeatedly shows the flake; reading the two files shows the shared path",
    gapTest: "the queue file path must differ between two test processes (for example include the process id), red now because both resolve the same path",
  },
];
