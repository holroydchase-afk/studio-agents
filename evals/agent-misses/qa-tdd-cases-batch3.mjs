// Batch 3 of the qa-tdd miss cases (Nov 22): ten more rebuilt reproductions from README.md, all `heldout`.
// Unread held-out set: never read while tuning, scored once per change. Same format and rules as qa-tdd-cases.mjs.
// Each case uses a miss id that no earlier cases file uses, and prefers patterns with few or no cases so far.
const T = `import { test } from "node:test";\nimport assert from "node:assert/strict";\n`;

export const QA_BATCH3 = [
  {
    id: "skip-reads-as-pass", miss: "CH-Q3", pattern: "self-referential-or-skipped-tests", priority: "P1", split: "heldout", src: "ch",
    ask: "CI prints one verdict line for the security browser tests: PASS or FAIL.",
    file: "verdict.mjs",
    code: `// Turns test-runner results into the verdict line CI prints for the security checks.
export function verdict(results) {
  const failed = results.filter((r) => r.status === "fail").length;
  return failed === 0 ? "PASS" : "FAIL (" + failed + ")";
}
`,
    testFile: "verdict.test.mjs",
    test: `${T}import { verdict } from "./verdict.mjs";
test("VERDICT-1 all passing prints PASS", () => {
  assert.equal(verdict([{ name: "a", status: "pass" }, { name: "b", status: "pass" }]), "PASS");
});
test("VERDICT-2 one failure prints FAIL (1)", () => {
  assert.equal(verdict([{ name: "a", status: "pass" }, { name: "b", status: "fail" }]), "FAIL (1)");
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { verdict } from "./verdict.mjs";
test("GAP a skipped security test does not read as PASS", () => {
  assert.notEqual(verdict([{ name: "a", status: "pass" }, { name: "csp-browser", status: "skip" }]), "PASS");
});
`,
    gapText: "`verdict` counts only failures, so a security test that was skipped in CI (the browser was missing) still prints PASS. A skip looks the same as a pass and nobody notices the check never ran. The tests use only passing and failing results",
    gapTest: "`verdict` for results where one test has status \"skip\" must not be \"PASS\"",
  },
  {
    id: "reset-during-sync", miss: "CK-Q2", pattern: "flaky-or-wrong-timing", priority: "P1", split: "heldout", src: "ck",
    ask: "\"Reset sample data\" clears the punches shown on the Today list, including ones still waiting to send.",
    file: "store.mjs",
    code: `// Local punch store: unsent punches wait in the outbox, sent ones show on the Today list.
export function makeStore() {
  const s = { outbox: [], sent: [] };
  return {
    s,
    punch(p) { s.outbox.push(p); },
    async sync(send) {
      for (const p of s.outbox.slice()) { await send(p); s.sent.push(p); }
      s.outbox = [];
    },
    reset() { s.outbox = []; s.sent = []; },
  };
}
`,
    testFile: "store.test.mjs",
    test: `${T}import { makeStore } from "./store.mjs";
test("STORE-1 a synced punch moves from outbox to sent", async () => {
  const st = makeStore();
  st.punch({ id: 1 });
  await st.sync(async () => {});
  assert.equal(st.s.outbox.length, 0);
  assert.equal(st.s.sent.length, 1);
});
test("STORE-2 reset empties both lists", () => {
  const st = makeStore();
  st.punch({ id: 1 });
  st.reset();
  assert.deepEqual([st.s.outbox.length, st.s.sent.length], [0, 0]);
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { makeStore } from "./store.mjs";
test("GAP a reset while a sync is in flight leaves nothing behind", async () => {
  const st = makeStore();
  st.punch({ id: 1 });
  let release;
  const gate = new Promise((r) => { release = r; });
  const syncing = st.sync(() => gate);
  st.reset();
  release();
  await syncing;
  assert.equal(st.s.sent.length, 0, "the in-flight punch came back after the reset");
});
`,
    gapText: "`sync` copies the outbox and keeps sending after `reset` runs, then pushes the punch onto the sent list. A reset pressed while a sync is in flight leaves the punch behind. Both tests run the two actions one after the other and never overlap them",
    gapTest: "start `sync` with a send that waits, call `reset`, let the send finish, and the sent list must be empty",
  },
  {
    id: "dark-palette-never-applied", miss: "CO-Q3", pattern: "rename-and-coverage-gaps", priority: "P1", split: "heldout", src: "co",
    ask: "The page needs readable text in dark mode too, checked by a contrast test.",
    file: "theme.mjs",
    code: `// Colour palettes and the stylesheet text the page ships. Contrast follows WCAG.
export const palette = { light: { fg: "#1a1a1a", bg: "#ffffff" }, dark: { fg: "#f2f2f2", bg: "#121212" } };
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export function contrast(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
export function css() {
  return ":root { color: " + palette.light.fg + "; background: " + palette.light.bg + "; }";
}
`,
    testFile: "theme.test.mjs",
    test: `${T}import { palette, contrast } from "./theme.mjs";
test("THEME-1 the light palette has 4.5:1 contrast", () => {
  assert.ok(contrast(palette.light.fg, palette.light.bg) >= 4.5);
});
test("THEME-2 the dark palette has 4.5:1 contrast", () => {
  assert.ok(contrast(palette.dark.fg, palette.dark.bg) >= 4.5);
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { palette, css } from "./theme.mjs";
test("GAP the stylesheet applies the dark palette in dark mode", () => {
  const out = css();
  assert.match(out, /prefers-color-scheme:\\s*dark/);
  assert.ok(out.includes(palette.dark.bg), "the dark background never reaches the stylesheet");
});
`,
    gapText: "The dark-mode contrast test reads the dark palette constant, but `css()` never emits a dark-mode rule, so the shipped page has no dark colours at all. The test passes with the rule missing because it checks the numbers, not what the page ships",
    gapTest: "`css()` must contain a `prefers-color-scheme: dark` rule that uses the dark background colour",
  },
  {
    id: "voice-default-lost", miss: "CO-Q2", pattern: "rename-and-coverage-gaps", priority: "P2", split: "heldout", src: "co",
    ask: "Each persona gets a speech voice that matches its gender, and the device's default voice otherwise.",
    file: "voice.mjs",
    code: `// Picks a speech voice for a persona from the voices the device offers.
export function pickVoice(persona, voices) {
  const match = voices.find((v) => v.gender === persona.gender);
  return match ?? voices[0];
}
`,
    testFile: "voice.test.mjs",
    test: `${T}import { pickVoice } from "./voice.mjs";
const voices = [{ name: "Zoe", gender: "female" }, { name: "Sam", gender: "male", default: true }];
test("VOICE-1 a male persona gets the male voice", () => {
  assert.equal(pickVoice({ name: "Dev", gender: "male" }, voices).name, "Sam");
});
test("VOICE-2 a female persona gets the female voice", () => {
  assert.equal(pickVoice({ name: "Ana", gender: "female" }, voices).name, "Zoe");
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { pickVoice } from "./voice.mjs";
const voices = [{ name: "Zoe", gender: "female" }, { name: "Sam", gender: "male", default: true }];
test("GAP a persona with no matching voice gets the device default", () => {
  assert.equal(pickVoice({ name: "Kit" }, voices).name, "Sam");
  assert.equal(pickVoice({ name: "Lee", gender: "nonbinary" }, voices).name, "Sam");
});
`,
    gapText: "When no voice matches the persona, `pickVoice` returns the first voice in the list instead of the one the device marks as default, so a persona with no gender set gets whichever voice happens to be listed first (a female voice for a male character in the real case). The tests only cover personas that have a matching voice",
    gapTest: "`pickVoice` for a persona with no gender, or a gender no voice has, must return the voice marked `default: true`",
  },
  {
    id: "unescape-order", miss: "PS-Q3", pattern: "guard-written-after-the-bug", priority: "P1", split: "heldout", src: "ps",
    ask: "The notes field shows saved text with its HTML escapes turned back into plain characters.",
    file: "unescape.mjs",
    code: `// Turns escaped text from the saved notes back into plain characters.
export function unescapeHtml(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
`,
    testFile: "unescape.test.mjs",
    test: `${T}import { unescapeHtml } from "./unescape.mjs";
test("UNESC-1 turns &lt; and &gt; into characters", () => {
  assert.equal(unescapeHtml("a &lt; b &gt; c"), "a < b > c");
});
test("UNESC-2 turns &amp; into &", () => {
  assert.equal(unescapeHtml("Fish &amp; chips"), "Fish & chips");
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { unescapeHtml } from "./unescape.mjs";
test("GAP escaped escapes are unescaped only once", () => {
  assert.equal(unescapeHtml("&amp;lt;script&amp;gt;"), "&lt;script&gt;");
});
`,
    gapText: "`&amp;` is replaced first, so text that was escaped twice (`&amp;lt;`) turns into `&lt;` and then into `<` in the same pass. Unescaping must run once, with `&amp;` last, or the output can contain markup the user never typed. A static code scanner flagged this after the tests passed. The tests use single-escaped text only",
    gapTest: "`unescapeHtml(\"&amp;lt;script&amp;gt;\")` must return `&lt;script&gt;`, not `<script>`",
  },
  {
    id: "undo-position", miss: "PS-Q4", pattern: "tool-tests-missed-edge-cases", priority: "P2", split: "heldout", src: "ps",
    ask: "Deleting a roadmap card can be undone, and the card comes back.",
    file: "column.mjs",
    code: `// One roadmap column. Remove takes a card out; undo puts the last removed card back.
export function makeColumn(cards) {
  const list = cards.slice();
  let last = null;
  return {
    ids: () => list.map((c) => c.id),
    remove(id) {
      const i = list.findIndex((c) => c.id === id);
      if (i >= 0) last = list.splice(i, 1)[0];
    },
    undo() {
      if (last) { list.push(last); last = null; }
    },
  };
}
`,
    testFile: "column.test.mjs",
    test: `${T}import { makeColumn } from "./column.mjs";
test("COL-1 undo brings back the last card", () => {
  const col = makeColumn([{ id: "a" }, { id: "b" }, { id: "c" }]);
  col.remove("c");
  col.undo();
  assert.deepEqual(col.ids(), ["a", "b", "c"]);
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { makeColumn } from "./column.mjs";
test("GAP undo puts a card back where it was", () => {
  const col = makeColumn([{ id: "a" }, { id: "b" }, { id: "c" }]);
  col.remove("a");
  col.undo();
  assert.deepEqual(col.ids(), ["a", "b", "c"]);
});
`,
    gapText: "`undo` appends the card to the end of the column instead of restoring its position, so removing the first card and undoing moves it to the bottom. The test removes the last card, where the two look the same",
    gapTest: "removing \"a\" from [a, b, c] and calling `undo` must give [a, b, c] again",
  },
  {
    id: "bullet-styles", miss: "PS-Q6", pattern: "tool-tests-missed-edge-cases", priority: "P2", split: "heldout", src: "ps",
    ask: "A checker reads the \"- key: value\" lines of a story-keeper log entry into fields.",
    file: "entry.mjs",
    code: `// Reads the bullet lines of a log entry ("- key: value") into an object.
export function parseEntry(text) {
  const out = {};
  for (const line of text.split("\\n")) {
    const m = line.match(/^- ([a-z]+): (.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
`,
    testFile: "entry.test.mjs",
    test: `${T}import { parseEntry } from "./entry.mjs";
test("ENTRY-1 reads two fields", () => {
  assert.deepEqual(parseEntry("- call: ship it\\n- why: cheaper"), { call: "ship it", why: "cheaper" });
});
test("ENTRY-2 ignores lines that are not bullets", () => {
  assert.deepEqual(parseEntry("Notes\\n- call: ship it"), { call: "ship it" });
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { parseEntry } from "./entry.mjs";
test("GAP other bullet markers and indented bullets are read", () => {
  const out = parseEntry("* call: ship it\\n  - why: cheaper\\n+ owner: me");
  assert.deepEqual(Object.keys(out).sort(), ["call", "owner", "why"]);
});
`,
    gapText: "The pattern accepts only a bullet that starts with a hyphen in the first column. Entries written with `*` or `+`, or with an indented bullet, are silently dropped, so the checker reports fields as missing (or passes an entry whose fields it never saw). The tests use one bullet style",
    gapTest: "`parseEntry(\"* call: ship it\\n  - why: cheaper\\n+ owner: me\")` must return all three fields",
  },
  {
    id: "docs-folder-code", miss: "PS-Q7", pattern: "tool-tests-missed-edge-cases", priority: "P1", split: "heldout", src: "ps",
    ask: "A PR check lets a PR skip the failing-test step when it changes only docs or config files.",
    file: "may-skip.mjs",
    code: `// True when every changed file is docs or config, so a PR may say "qa-tdd skipped".
export function maySkipQa(files) {
  return files.length > 0 && files.every((f) => /\\.(md|json|ya?ml)$/.test(f) || f.startsWith("docs/"));
}
`,
    testFile: "may-skip.test.mjs",
    test: `${T}import { maySkipQa } from "./may-skip.mjs";
test("SKIP-1 a README change may skip", () => assert.equal(maySkipQa(["README.md"]), true));
test("SKIP-2 a source change may not", () => assert.equal(maySkipQa(["src/app.mjs", "README.md"]), false));
test("SKIP-3 an empty change may not", () => assert.equal(maySkipQa([]), false));
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { maySkipQa } from "./may-skip.mjs";
test("GAP a script that lives under docs/ is code, so it may not skip", () => {
  assert.equal(maySkipQa(["docs/build-index.mjs"]), false);
});
`,
    gapText: "The rule treats anything under `docs/` as documentation, so a code file placed in that folder (a build script) lets a PR skip the failing-test step. The skip rule is the gate that keeps untested code out, and the tests only pass source files in `src/`",
    gapTest: "`maySkipQa([\"docs/build-index.mjs\"])` must be false",
  },
  {
    id: "palm-wide-layout", miss: "ES-Q2", pattern: "real-device-gap", priority: "P1", split: "heldout", src: "es",
    ask: "At 900px and wider the photo result sits beside the picture with its text left-aligned.",
    file: "layout.mjs",
    code: `// Text alignment of the result panel by mode ("photo" or "palm") and screen width.
export function resultAlign(mode, width) {
  return width >= 900 ? "left" : "center";
}
`,
    testFile: "layout.test.mjs",
    test: `${T}import { resultAlign } from "./layout.mjs";
test("LAYOUT-1 photo mode at 1200px is left-aligned", () => assert.equal(resultAlign("photo", 1200), "left"));
test("LAYOUT-2 photo mode at 400px is centred", () => assert.equal(resultAlign("photo", 400), "center"));
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { resultAlign } from "./layout.mjs";
test("GAP palm mode stays centred on a wide screen", () => {
  assert.equal(resultAlign("palm", 1200), "center");
});
`,
    gapText: "The wide-screen rule ignores the mode, so the palm reading, which has no picture beside it, is left-aligned at 900px and wider too. The rule should apply to photo mode only. The tests check photo mode at both widths and never open palm mode on a wide screen",
    gapTest: "`resultAlign(\"palm\", 1200)` must be \"center\"",
  },
  {
    id: "today-vs-week-hours", miss: "CK-Q3", pattern: "real-device-gap", priority: "P1", split: "heldout", src: "ck",
    ask: "The Today list and the Week table both show hours worked, to one decimal.",
    file: "hours.mjs",
    code: `// Hours worked (minutes in, hours out to one decimal) for the Today list and the Week table.
export const todayHours = (minutes) => Math.round((minutes / 60) * 10) / 10;
export const weekHours = (dayMinutes) =>
  Math.ceil((dayMinutes.reduce((a, m) => a + m, 0) / 60) * 10) / 10;
`,
    testFile: "hours.test.mjs",
    test: `${T}import { todayHours, weekHours } from "./hours.mjs";
test("HOURS-1 Today shows 8.5 for 510 minutes", () => assert.equal(todayHours(510), 8.5));
test("HOURS-2 Week sums two 8-hour days to 16", () => assert.equal(weekHours([480, 480]), 16));
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { todayHours, weekHours } from "./hours.mjs";
test("GAP the same day shows the same hours on Today and on Week", () => {
  assert.equal(weekHours([505]), todayHours(505));
});
`,
    gapText: "The two views round differently (`Math.round` on Today, `Math.ceil` on Week), so 505 minutes shows 8.4 on one screen and 8.5 on the other. Each view's own test passes on round numbers; nothing compares the two. Only a manual look at the live app showed it",
    gapTest: "`weekHours([505])` must equal `todayHours(505)`",
  },
];
