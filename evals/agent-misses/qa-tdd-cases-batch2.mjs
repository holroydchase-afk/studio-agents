// Batch 2 of the qa-tdd miss cases (Nov 22): eleven more rebuilt reproductions from README.md, all `heldout`.
// The first nine (qa-tdd-cases.mjs) were used to tune qa-tdd.md and one held-out run is spent, so every case here is
// fresh: never read while tuning, scored once per change. Same format and rules as qa-tdd-cases.mjs.
const T = `import { test } from "node:test";\nimport assert from "node:assert/strict";\n`;

export const QA_BATCH2 = [
  {
    id: "path-hash-leak", miss: "CC-Q5", pattern: "privacy-leak-not-tested", priority: "P0", split: "heldout", src: "cc",
    ask: "The CLI's --json output lists each project with its energy use.",
    file: "report.mjs",
    code: `// Builds the JSON the CLI prints. Records are stored as a hash of the full path plus the folder's name.
export function buildReport(projects) {
  return JSON.stringify({ projects: projects.map((p) => ({ ...p })) });
}
`,
    testFile: "report.test.mjs",
    test: `${T}import { buildReport } from "./report.mjs";
test("REPORT-1 lists name and kWh", () => {
  const out = JSON.parse(buildReport([{ name: "web", pathHash: "a1b2c3d4e5f6", kwh: 1.2 }]));
  assert.equal(out.projects[0].name, "web");
  assert.equal(out.projects[0].kwh, 1.2);
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { buildReport } from "./report.mjs";
test("GAP the path hash is not printed", () => {
  const out = buildReport([{ name: "web", pathHash: "a1b2c3d4e5f6", kwh: 1.2 }]);
  assert.ok(!out.includes("a1b2c3d4e5f6"), "path hash leaked into the output");
});
`,
    gapText: "`buildReport` spreads every field of the stored record into the output, so the hash of the project's full path is printed. A path hash can be matched against guessed paths, and the product rule is that nothing written or shown carries path information. The test only checks the fields it expected to see, never what else comes out",
    gapTest: "the output of `buildReport` for a record with `pathHash` \"a1b2c3d4e5f6\" must not contain that value",
  },
  {
    id: "null-gmail-import", miss: "RR-Q3", pattern: "matching-and-sorting-edges", priority: "P1", split: "heldout", src: "rr",
    ask: "The Gmail import turns each email into a tracker row with the sender and subject.",
    file: "import.mjs",
    code: `// Turns emails from the Gmail connector into tracker rows.
export function toRow(email) {
  return { from: email.from.toLowerCase(), subject: email.subject.trim() };
}
export function importAll(emails) {
  return emails.map(toRow);
}
`,
    testFile: "import.test.mjs",
    test: `${T}import { importAll } from "./import.mjs";
test("IMPORT-1 maps two emails", () => {
  const rows = importAll([{ from: "A@EXAMPLE.com", subject: " Hi " }, { from: "b@example.com", subject: "Yo" }]);
  assert.deepEqual(rows, [{ from: "a@example.com", subject: "Hi" }, { from: "b@example.com", subject: "Yo" }]);
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { importAll } from "./import.mjs";
test("GAP a null entry or a missing subject does not stop the import", () => {
  let rows;
  assert.doesNotThrow(() => { rows = importAll([null, { from: "a@example.com" }, { from: "b@example.com", subject: "Yo" }]); });
  assert.ok(rows.length >= 2);
});
`,
    gapText: "`toRow` reads `email.from` and `email.subject` without checking they exist. The connector returns null entries and emails with no subject, and one of them throws and stops the whole import, so no rows are saved. The test uses two well-formed emails only",
    gapTest: "`importAll([null, {from: \"a@example.com\"}, {from: \"b@example.com\", subject: \"Yo\"}])` must not throw and must return rows for the usable emails",
  },
  {
    id: "status-case-count", miss: "RR-Q4", pattern: "public-demo-shipped-with-defects", priority: "P1", split: "heldout", src: "rr",
    ask: "The summary line counts roles by status: applied, interview and offer.",
    file: "summary.mjs",
    code: `// Counts roles by status for the summary line on the page.
export function summary(roles) {
  const out = { applied: 0, interview: 0, offer: 0 };
  for (const r of roles) if (r.status in out) out[r.status]++;
  return out;
}
`,
    testFile: "summary.test.mjs",
    test: `${T}import { summary } from "./summary.mjs";
test("SUM-1 counts each status", () => {
  const s = summary([{ status: "applied" }, { status: "applied" }, { status: "offer" }]);
  assert.deepEqual(s, { applied: 2, interview: 0, offer: 1 });
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { summary } from "./summary.mjs";
test("GAP statuses saved by the form (capitalised) are counted", () => {
  const s = summary([{ status: "Applied" }, { status: "Interview" }]);
  assert.deepEqual(s, { applied: 1, interview: 1, offer: 0 });
});
`,
    gapText: "`summary` matches the status text exactly, but the form saves it capitalised (\"Applied\"), so every real role is skipped and the public page says \"applied 0\". The test feeds lowercase statuses that nothing in the app produces",
    gapTest: "`summary([{status:\"Applied\"},{status:\"Interview\"}])` must count one applied and one interview",
  },
  {
    id: "monday-divide", miss: "CC-Q2", pattern: "date-clock", priority: "P1", split: "heldout", src: "cc",
    ask: "The demo's pace line shows the average kWh per day so far this Monday-to-Sunday week.",
    file: "avg.mjs",
    code: `// Average kWh per day so far this week. Monday is the first day.
export function dailyAverage(totalKwh, now = new Date()) {
  const daysSoFar = (now.getDay() + 6) % 7;
  return totalKwh / daysSoFar;
}
`,
    testFile: "avg.test.mjs",
    test: `${T}import { dailyAverage } from "./avg.mjs";
test("AVG-1 ten kWh by Wednesday", () => {
  assert.equal(dailyAverage(10, new Date("2026-11-18T12:00:00")), 5);
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { dailyAverage } from "./avg.mjs";
test("GAP on a Monday the average is a number", () => {
  assert.ok(Number.isFinite(dailyAverage(10, new Date("2026-11-16T12:00:00"))));
});
`,
    gapText: "`daysSoFar` is 0 on a Monday (it should count today), so the average divides by zero and the demo shows Infinity or NaN every Monday. The test pins a Wednesday only",
    gapTest: "`dailyAverage(10, new Date(\"2026-11-16T12:00:00\"))` (a Monday) must be a finite number",
  },
  {
    id: "zero-close-price", miss: "CH-Q2", pattern: "unhandled-input-edges", priority: "P1", split: "heldout", src: "ch",
    ask: "Closing a paper trade records the exit price and the profit or loss in dollars.",
    file: "trade.mjs",
    code: `// Closes a paper trade and computes its profit or loss in dollars.
export function closeTrade(trade, closePrice) {
  const exit = closePrice || trade.entry;
  return { ...trade, exit, pnl: (exit - trade.entry) * trade.qty };
}
`,
    testFile: "trade.test.mjs",
    test: `${T}import { closeTrade } from "./trade.mjs";
test("TRADE-1 a gain", () => {
  assert.equal(closeTrade({ entry: 10, qty: 2 }, 12).pnl, 4);
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { closeTrade } from "./trade.mjs";
test("GAP an option that expires worthless closes at 0 and loses the entry", () => {
  assert.equal(closeTrade({ entry: 10, qty: 2 }, 0).pnl, -20);
});
`,
    gapText: "`closePrice || trade.entry` treats a close of $0 as \"no price given\" and falls back to the entry, so a trade that expires worthless reports a $0 loss instead of losing everything. The test closes at a positive price only",
    gapTest: "`closeTrade({entry: 10, qty: 2}, 0).pnl` must be -20",
  },
  {
    id: "contrast-locked-in", miss: "ES-Q5", pattern: "self-referential-or-skipped-tests", priority: "P1", split: "heldout", src: "es",
    ask: "The empty check circle on tonight's steps has a visible border against the white page.",
    file: "circle.mjs",
    code: `// Style of the empty check circle and a contrast-ratio helper (WCAG).
export const circle = { border: "#c8c8c8", bg: "#ffffff" };
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export function contrast(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
`,
    testFile: "circle.test.mjs",
    test: `${T}import { circle } from "./circle.mjs";
test("CIRCLE-1 the empty circle has its grey border", () => {
  assert.equal(circle.border, "#c8c8c8");
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { circle, contrast } from "./circle.mjs";
test("GAP the border has at least 3:1 contrast with the page", () => {
  assert.ok(contrast(circle.border, circle.bg) >= 3, "contrast " + contrast(circle.border, circle.bg).toFixed(2));
});
`,
    gapText: "The test asserts the border is the colour the code already uses, so it passes a border with about 1.7:1 contrast against white. Interface components need at least 3:1. The test locked in the defect instead of checking the rule",
    gapTest: "`contrast(circle.border, circle.bg)` must be at least 3",
  },
  {
    id: "host-check-variants", miss: "PS-Q2", pattern: "guard-written-after-the-bug", priority: "P1", split: "heldout", src: "ps",
    ask: "A build check lists any hosts other than our own that a page loads scripts, styles or fonts from.",
    file: "hosts.mjs",
    code: `// Lists the hosts a page loads resources from (the build fails if any are not ours).
export function thirdPartyHosts(html) {
  const found = [];
  for (const m of html.matchAll(/(?:src|href)="https:\\/\\/([^/"]+)/g)) found.push(m[1]);
  return found;
}
`,
    testFile: "hosts.test.mjs",
    test: `${T}import { thirdPartyHosts } from "./hosts.mjs";
test("HOSTS-1 finds a script host", () => {
  assert.deepEqual(thirdPartyHosts('<script src="https://cdn.example.com/a.js"></script>'), ["cdn.example.com"]);
});
test("HOSTS-2 ignores our own relative files", () => {
  assert.deepEqual(thirdPartyHosts('<link href="/site.css">'), []);
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { thirdPartyHosts } from "./hosts.mjs";
test("GAP single quotes, upper case and protocol-relative URLs are caught", () => {
  assert.equal(thirdPartyHosts("<link href='https://fonts.example.com/x.css'>").length, 1, "single quotes");
  assert.equal(thirdPartyHosts('<SCRIPT SRC="HTTPS://Cdn.example.com/a.js">').length, 1, "upper case");
  assert.equal(thirdPartyHosts('<script src="//cdn.example.com/a.js">').length, 1, "protocol-relative");
});
`,
    gapText: "The pattern only matches double-quoted lower-case `https://` attributes. A single-quoted, upper-case or protocol-relative URL loads a third-party host and passes the check. The tests use the one form the author had in mind",
    gapTest: "a single-quoted `href='https://fonts.example.com/x.css'`, an upper-case `SRC=\"HTTPS://...\"` and a protocol-relative `src=\"//cdn.example.com/a.js\"` must each be reported",
  },
  {
    id: "double-click-trade", miss: "CH-Q2", pattern: "unhandled-input-edges", priority: "P1", split: "heldout", src: "ch",
    ask: "Pressing \"Paper trade this idea\" opens one paper trade for that idea.",
    file: "book.mjs",
    code: `// A paper-trade book: one trade per idea.
export function makeBook() {
  const trades = [];
  return {
    open(idea) { trades.push({ id: trades.length + 1, idea }); return trades.length; },
    all: () => trades.slice(),
  };
}
`,
    testFile: "book.test.mjs",
    test: `${T}import { makeBook } from "./book.mjs";
test("BOOK-1 opens a trade", () => {
  const b = makeBook();
  b.open("idea-1");
  assert.equal(b.all().length, 1);
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { makeBook } from "./book.mjs";
test("GAP a double click opens one trade, not two", () => {
  const b = makeBook();
  b.open("idea-1");
  b.open("idea-1");
  assert.equal(b.all().length, 1);
});
`,
    gapText: "`open` never checks whether the idea already has a trade, so a double click (or a slow tap repeated) opens two. The test presses the button once",
    gapTest: "calling `open(\"idea-1\")` twice must leave exactly one trade",
  },
  {
    id: "percent-radius", miss: "PS-Q5", pattern: "tool-tests-missed-edge-cases", priority: "P2", split: "heldout", src: "ps",
    ask: "A design check decides whether an element is a circle from its border radius and width.",
    file: "circle-check.mjs",
    code: `// An element is a circle when its border radius is at least half its width.
export function isCircle(borderRadius, widthPx) {
  return parseFloat(borderRadius) >= widthPx / 2;
}
`,
    testFile: "circle-check.test.mjs",
    test: `${T}import { isCircle } from "./circle-check.mjs";
test("CIRC-1 a 12px radius on a 24px box is a circle", () => assert.equal(isCircle("12px", 24), true));
test("CIRC-2 a 4px radius on a 24px box is not", () => assert.equal(isCircle("4px", 24), false));
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { isCircle } from "./circle-check.mjs";
test("GAP a 50% radius is a circle at any width", () => {
  assert.equal(isCircle("50%", 200), true);
});
`,
    gapText: "`parseFloat(\"50%\")` is 50, which the code compares in pixels, so a 50% radius on a 200px box (a perfect circle, 100px) is called not a circle. Percent radii are common and the tests only use pixels",
    gapTest: "`isCircle(\"50%\", 200)` must be true",
  },
  {
    id: "stale-cache-name", miss: "CK-Q1", pattern: "real-device-gap", priority: "P1", split: "heldout", src: "ck",
    ask: "The service worker caches the app so it opens with no signal, and phones should pick up a new build.",
    file: "sw-cache.mjs",
    code: `// Name of the service-worker cache. A new name makes phones drop the old copy.
export function cacheName(buildId) {
  return "crew-clock-v1";
}
`,
    testFile: "sw-cache.test.mjs",
    test: `${T}import { cacheName } from "./sw-cache.mjs";
test("CACHE-1 the name starts with the app name", () => {
  assert.match(cacheName("abc123"), /^crew-clock/);
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { cacheName } from "./sw-cache.mjs";
test("GAP two different builds use different cache names", () => {
  assert.notEqual(cacheName("build-1"), cacheName("build-2"));
});
`,
    gapText: "The cache name ignores the build id, so after a deploy a phone that already has the cache keeps serving the old files (about 34 hours in the real case). Tests ran on fresh browsers with caching off, so nothing deployed twice",
    gapTest: "`cacheName(\"build-1\")` and `cacheName(\"build-2\")` must differ",
  },
  {
    id: "rename-first-only", miss: "CO-Q1", pattern: "rename-and-coverage-gaps", priority: "P2", split: "heldout", src: "co",
    ask: "A script renames a persona across the docs text (Priya becomes Maya).",
    file: "rename.mjs",
    code: `// Replaces a persona's old name with the new one in a doc's text.
export function renamePersona(text, from, to) {
  return text.replace(from, to);
}
`,
    testFile: "rename.test.mjs",
    test: `${T}import { renamePersona } from "./rename.mjs";
test("RENAME-1 renames the name", () => {
  assert.equal(renamePersona("Priya likes lists.", "Priya", "Maya"), "Maya likes lists.");
});
`,
    gapName: "gap.test.mjs",
    gap: `${T}import { renamePersona } from "./rename.mjs";
test("GAP every mention is renamed, not only the first", () => {
  const out = renamePersona("Priya likes lists. Ask Priya. PRIYA's tip.", "Priya", "Maya");
  assert.ok(!/priya/i.test(out), out);
});
`,
    gapText: "`String.replace` with a string replaces only the first match, so a second mention of the old name survives the rename. The test text mentions the name once",
    gapTest: "`renamePersona(\"Priya likes lists. Ask Priya.\", \"Priya\", \"Maya\")` must leave no \"Priya\"",
  },
];
