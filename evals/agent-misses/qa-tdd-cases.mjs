// Golden cases for the qa-tdd miss evals: one tiny rebuilt reproduction per real miss in README.md.
// Source of truth. `node tools/eval-miss-cases.mjs` writes plugins/studio/evals/qa-tdd-miss-<id>/ from it,
// `--check` fails if those files are stale, and `--verify` proves each repro: the shipped test passes and
// the gap test fails against the source, so a case can't ship without the bug it claims.
// Repros are rebuilt reproductions of the pre-fix code (not checkouts), under 25 lines, no real data.
// `split`: dev cases may be used while tuning qa-tdd.md; held-out cases are scored once per change and
// never read while tuning (the same rule as the UX evals).

import { QA_BATCH2 } from "./qa-tdd-cases-batch2.mjs";
import { QA_BATCH3 } from "./qa-tdd-cases-batch3.mjs";
import { QA_BATCH4 } from "./qa-tdd-cases-batch4.mjs";
import { QA_BATCH5 } from "./qa-tdd-cases-batch5.mjs";

const QA_BASE = [
  {
    id: "weekday-clock", miss: "CC-Q1", pattern: "date-clock", priority: "P1", split: "dev", src: "cc",
    ask: "Our pace page shows how many days are left in the week (Monday to Sunday).",
    file: "pace.mjs",
    code: `// Days left in the Monday-to-Sunday week after today. Sunday has none.
export function daysLeftInWeek(now = new Date()) {
  return 7 - now.getDay();
}
`,
    testFile: "pace.test.mjs",
    test: `import { test } from "node:test";
import assert from "node:assert/strict";
import { daysLeftInWeek } from "./pace.mjs";
test("PACE-1 four days left on a Wednesday", () => {
  assert.equal(daysLeftInWeek(new Date("2026-11-18T12:00:00")), 4);
});
test("PACE-2 six days left on a Monday", () => {
  assert.equal(daysLeftInWeek(new Date("2026-11-16T12:00:00")), 6);
});
`,
    gapName: "gap.test.mjs",
    gap: `import { test } from "node:test";
import assert from "node:assert/strict";
import { daysLeftInWeek } from "./pace.mjs";
test("GAP Sunday has zero days left", () => {
  assert.equal(daysLeftInWeek(new Date("2026-11-22T12:00:00")), 0);
});
`,
    gapText: "`daysLeftInWeek` uses `7 - getDay()`, and `getDay()` is 0 on Sunday, so Sunday reports 7 days left instead of 0. The tests pin a Wednesday and a Monday only, so the suite passes six days a week and breaks on the seventh. It should treat Sunday as day 7 (or use a Monday-based index)",
    gapTest: "`daysLeftInWeek(new Date(\"2026-11-22T12:00:00\"))` must be 0 (Nov 22 2026 is a Sunday)",
  },
  {
    id: "night-key-utc", miss: "ES-Q3", pattern: "date-clock", priority: "P0", split: "heldout", src: "es",
    ask: "Each night's checklist is saved under a night key so ticks don't carry into tomorrow.",
    file: "night.mjs",
    code: `// The night a checklist tick belongs to. \`tzOffsetMin\` is minutes behind UTC
// (Pacific is 480), the same sign as Date#getTimezoneOffset.
export function nightKey(now = new Date(), tzOffsetMin = now.getTimezoneOffset()) {
  return now.toISOString().slice(0, 10);
}
`,
    testFile: "night.test.mjs",
    test: `import { test } from "node:test";
import assert from "node:assert/strict";
import { nightKey } from "./night.mjs";
test("NIGHT-1 key is the calendar date at noon UTC", () => {
  assert.equal(nightKey(new Date("2026-11-18T12:00:00Z"), 0), "2026-11-18");
});
`,
    gapName: "gap.test.mjs",
    gap: `import { test } from "node:test";
import assert from "node:assert/strict";
import { nightKey } from "./night.mjs";
test("GAP 10:30 PM Pacific is still the same night", () => {
  assert.equal(nightKey(new Date("2026-11-19T06:30:00Z"), 480), "2026-11-18");
});
`,
    gapText: "`nightKey` ignores `tzOffsetMin` and cuts the key from the UTC date, so at 10:30 PM Pacific (06:30Z the next day) the key flips to tomorrow and the user's ticks vanish mid-evening. The only test uses noon UTC with offset 0, so no timezone or clock-crossing case runs. It should apply the offset before taking the date",
    gapTest: "`nightKey(new Date(\"2026-11-19T06:30:00Z\"), 480)` must be \"2026-11-18\"",
  },
  {
    id: "storage-throws", miss: "HE-Q1", pattern: "real-device-gap", priority: "P1", split: "dev", src: "he",
    ask: "The Easy view switch remembers its setting in browser storage.",
    file: "easy.mjs",
    code: `// Remembers the Easy view switch. \`storage\` is localStorage in the browser.
export function saveEasy(storage, on) {
  storage.setItem("easyView", JSON.stringify(on));
  return true;
}
`,
    testFile: "easy.test.mjs",
    test: `import { test } from "node:test";
import assert from "node:assert/strict";
import { saveEasy } from "./easy.mjs";
test("EASY-1 saves the switch", () => {
  const m = new Map();
  const storage = { setItem: (k, v) => m.set(k, v) };
  assert.equal(saveEasy(storage, true), true);
  assert.equal(m.get("easyView"), "true");
});
`,
    gapName: "gap.test.mjs",
    gap: `import { test } from "node:test";
import assert from "node:assert/strict";
import { saveEasy } from "./easy.mjs";
test("GAP a full or blocked storage does not break the switch", () => {
  const storage = { setItem() { throw new DOMException("full", "QuotaExceededError"); } };
  assert.equal(saveEasy(storage, true), false);
});
`,
    gapText: "`saveEasy` calls `setItem` with no try/catch. iPhone Safari (private mode, or a full quota) throws `QuotaExceededError`, so the switch crashes instead of working for the session. The only test uses a Map that never throws, which is why desktop Chrome and the suite both pass. It should catch and return false",
    gapTest: "a storage whose `setItem` throws a `QuotaExceededError` must make `saveEasy` return false, not throw",
  },
  {
    id: "stale-demo-family", miss: "HE-Q2", pattern: "real-device-gap", priority: "P1", split: "heldout", src: "he",
    ask: "The public demo loads a sample family and keeps it in browser storage for return visits.",
    file: "demo.mjs",
    code: `// Loads the demo family. \`seed\` carries a \`version\`; storage is localStorage.
export function loadDemoFamily(storage, seed) {
  const raw = storage.getItem("demoFamily");
  if (raw) return JSON.parse(raw);
  storage.setItem("demoFamily", JSON.stringify(seed));
  return seed;
}
`,
    testFile: "demo.test.mjs",
    test: `import { test } from "node:test";
import assert from "node:assert/strict";
import { loadDemoFamily } from "./demo.mjs";
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const seed = { version: 2, names: ["Gammy", "Pawpaw"] };
test("DEMO-1 a fresh browser gets the seed", () => {
  assert.deepEqual(loadDemoFamily(mem(), seed), seed);
});
test("DEMO-2 the second visit reads the same family back", () => {
  const s = mem();
  loadDemoFamily(s, seed);
  assert.deepEqual(loadDemoFamily(s, seed), seed);
});
`,
    gapName: "gap.test.mjs",
    gap: `import { test } from "node:test";
import assert from "node:assert/strict";
import { loadDemoFamily } from "./demo.mjs";
test("GAP a returning visitor with an older family gets the new seed", () => {
  const m = new Map([["demoFamily", JSON.stringify({ version: 1, names: ["Old"] })]]);
  const storage = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  const seed = { version: 2, names: ["Gammy"] };
  assert.deepEqual(loadDemoFamily(storage, seed), seed);
});
`,
    gapText: "`loadDemoFamily` returns whatever is stored and never compares `version`, so a returning visitor keeps the old demo family after the seed changes. Both tests start from an empty browser, so only first-time visitors are covered. A stored copy with an older version must be replaced by the seed",
    gapTest: "storage holding `{version: 1}` with a seed of `{version: 2}` must return and store the seed",
  },
  {
    id: "substring-match", miss: "RR-Q1", pattern: "matching-and-sorting-edges", priority: "P1", split: "dev", src: "rr",
    ask: "Our inbox sync moves an application's status when an email subject names the company.",
    file: "match.mjs",
    code: `// Which tracked company does an email subject mention? First match wins.
export function matchCompany(subject, companies) {
  const s = subject.toLowerCase();
  return companies.find((c) => s.includes(c.toLowerCase())) ?? null;
}
`,
    testFile: "match.test.mjs",
    test: `import { test } from "node:test";
import assert from "node:assert/strict";
import { matchCompany } from "./match.mjs";
const tracked = ["Volt", "Acme"];
test("MATCH-1 finds a named company", () => {
  assert.equal(matchCompany("Interview with Volt on Friday", tracked), "Volt");
});
test("MATCH-2 no company, no match", () => {
  assert.equal(matchCompany("Your weekly newsletter", tracked), null);
});
`,
    gapName: "gap.test.mjs",
    gap: `import { test } from "node:test";
import assert from "node:assert/strict";
import { matchCompany } from "./match.mjs";
test("GAP a word that merely contains the name does not match", () => {
  assert.equal(matchCompany("Re: your revolt.example order", ["Volt", "Acme"]), null);
});
`,
    gapText: "`matchCompany` uses `includes`, so \"Volt\" matches inside \"revolt.example\" and the sync moves the wrong role. It needs a whole-word match (word boundaries, escaping regex characters in company names). Neither test has a near-miss",
    gapTest: "`matchCompany(\"Re: your revolt.example order\", [\"Volt\", \"Acme\"])` must be null",
  },
  {
    id: "text-sorted-dates", miss: "RR-Q2", pattern: "matching-and-sorting-edges", priority: "P2", split: "heldout", src: "rr",
    ask: "The skipped-roles list shows the most recently ruled-out role first.",
    file: "skipped.mjs",
    code: `// Newest ruled-out date first. \`ruledOut\` looks like "2026-11-9" (year-month-day).
export function sortSkipped(items) {
  return [...items].sort((a, b) => b.ruledOut.localeCompare(a.ruledOut));
}
`,
    testFile: "skipped.test.mjs",
    test: `import { test } from "node:test";
import assert from "node:assert/strict";
import { sortSkipped } from "./skipped.mjs";
test("SKIP-1 newest first across months", () => {
  const out = sortSkipped([
    { id: "a", ruledOut: "2026-10-30" },
    { id: "b", ruledOut: "2026-11-02" },
  ]);
  assert.deepEqual(out.map((x) => x.id), ["b", "a"]);
});
`,
    gapName: "gap.test.mjs",
    gap: `import { test } from "node:test";
import assert from "node:assert/strict";
import { sortSkipped } from "./skipped.mjs";
test("GAP day 10 sorts after day 9", () => {
  const out = sortSkipped([
    { id: "a", ruledOut: "2026-11-9" },
    { id: "b", ruledOut: "2026-11-10" },
  ]);
  assert.deepEqual(out.map((x) => x.id), ["b", "a"]);
});
`,
    gapText: "`sortSkipped` compares the dates as text, so unpadded days sort wrongly: \"2026-11-9\" ranks above \"2026-11-10\" and an older skip lands above today's. The only test uses zero-padded dates. It should parse to numbers or dates before comparing",
    gapTest: "`2026-11-10` must sort before `2026-11-9` in newest-first order",
  },
  {
    id: "risk-bad-inputs", miss: "CH-Q1", pattern: "unhandled-input-edges", priority: "P1", split: "dev", src: "ch",
    ask: "This sizes the worst-case loss on an options idea from price, strike and implied volatility.",
    file: "risk.mjs",
    code: `// Worst-case dollar loss for one idea. Premium is a simple estimate: price * iv * 0.4.
const round2 = (n) => Math.round(n * 100) / 100;
export function maxLoss({ price, strike, iv, contracts = 1 }) {
  const premium = price * iv * 0.4;
  return round2(Math.min(premium, strike) * 100 * contracts);
}
`,
    testFile: "risk.test.mjs",
    test: `import { test } from "node:test";
import assert from "node:assert/strict";
import { maxLoss } from "./risk.mjs";
test("RISK-1 matches the premium formula", () => {
  const input = { price: 50, strike: 55, iv: 0.3, contracts: 2 };
  const premium = input.price * input.iv * 0.4;
  assert.equal(maxLoss(input), Math.round(Math.min(premium, input.strike) * 100 * 2 * 100) / 100);
});
`,
    gapName: "gap.test.mjs",
    gap: `import { test } from "node:test";
import assert from "node:assert/strict";
import { maxLoss } from "./risk.mjs";
test("GAP zero or negative inputs are rejected, not priced", () => {
  assert.throws(() => maxLoss({ price: -5, strike: 55, iv: 0.3 }), RangeError);
  assert.throws(() => maxLoss({ price: 50, strike: 0, iv: 0.3 }), RangeError);
  assert.throws(() => maxLoss({ price: 50, strike: 55, iv: 0 }), RangeError);
});
`,
    gapText: "`maxLoss` accepts zero or negative price, strike or implied volatility and returns a number (a negative or $0 max loss), where it should reject them. The one test recomputes the same formula, so it can only agree with the code and says nothing about bad inputs. It should throw a `RangeError`",
    gapTest: "negative price, zero strike and zero iv must each throw `RangeError`",
  },
  {
    id: "rounded-totals", miss: "CK-S3", pattern: "undefined-rule", priority: "P1", split: "heldout", src: "ck",
    ask: "The week view lists hours per day and a week total, all to one decimal.",
    file: "hours.mjs",
    code: `// One-decimal display for hours.
export const fmt = (h) => Math.round(h * 10) / 10;
export const dayLabels = (days) => days.map(fmt);
export function weekTotal(days) {
  return fmt(days.reduce((a, b) => a + b, 0));
}
`,
    testFile: "hours.test.mjs",
    test: `import { test } from "node:test";
import assert from "node:assert/strict";
import { dayLabels, weekTotal } from "./hours.mjs";
test("HOURS-1 a plain week", () => {
  assert.deepEqual(dayLabels([8, 8, 8, 8, 8]), [8, 8, 8, 8, 8]);
  assert.equal(weekTotal([8, 8, 8, 8, 8]), 40);
});
`,
    gapName: "gap.test.mjs",
    gap: `import { test } from "node:test";
import assert from "node:assert/strict";
import { dayLabels, weekTotal } from "./hours.mjs";
test("GAP the total equals the sum of the days shown", () => {
  const days = [2.34, 2.34, 2.34, 2.34, 2.34, 2.34, 2.34];
  const shown = dayLabels(days).reduce((a, b) => a + b, 0);
  assert.equal(Math.round(shown * 10) / 10, weekTotal(days));
});
`,
    gapText: "the week total rounds the raw sum while each day rounds on its own, so the page can show seven days of 2.3 (16.1) beside a total of 16.4. There is no single rounding rule, and the test only uses whole hours so the two always agree. The total must equal the sum of the displayed days (or the days must visibly say they are rounded)",
    gapTest: "for seven days of 2.34, the sum of `dayLabels` must equal `weekTotal`",
  },
  {
    id: "name-denylist-case", miss: "HE-Q7", pattern: "privacy-leak-not-tested", priority: "P0", split: "dev", src: "he",
    ask: "A pre-push check scans text for real family names without keeping the names in the repo: it stores only hashes of the names.",
    file: "names.mjs",
    code: `import { createHash } from "node:crypto";
// Returns the words in \`text\` whose sha256 is in \`bannedHashes\` (hashes of lowercase names).
const sha = (w) => createHash("sha256").update(w).digest("hex");
export function leaks(text, bannedHashes) {
  return text.split(/\\W+/).filter((w) => bannedHashes.includes(sha(w)));
}
`,
    testFile: "names.test.mjs",
    test: `import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { leaks } from "./names.mjs";
const banned = [createHash("sha256").update("quill").digest("hex")];
test("NAMES-1 flags a banned name", () => {
  assert.deepEqual(leaks("thanks to quill for the photos", banned), ["quill"]);
});
test("NAMES-2 clean text has no leaks", () => {
  assert.deepEqual(leaks("thanks for the photos", banned), []);
});
`,
    gapName: "gap.test.mjs",
    gap: `import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { leaks } from "./names.mjs";
test("GAP capitalised and shouted names are flagged too", () => {
  const banned = [createHash("sha256").update("quill").digest("hex")];
  assert.equal(leaks("Thanks, QUILL and Quill's pie", banned).length, 2);
});
`,
    gapText: "`leaks` hashes each word as written, but the hashes are of lowercase names, so \"Quill\" and \"QUILL\" never match: the names people actually write in prose, headings and commit messages slip through, and the check passes on a repo full of real names. Both tests use a lowercase name. It must lowercase each word before hashing (and the PM should also ask about possessives, punctuation and names split across lines)",
    gapTest: "`leaks(\"Thanks, QUILL and Quill's pie\", [sha256(\"quill\")])` must return 2 matches",
  },
];

export const QA_CASES = [...QA_BASE, ...QA_BATCH2, ...QA_BATCH3, ...QA_BATCH4, ...QA_BATCH5];
