// Batch 2 of the staff-pm miss cases (Nov 22): twelve more situations rebuilt from README.md, all `heldout`.
// Fresh: never read while tuning, scored once per change. Same format and rules as staff-pm-cases.mjs
// (`ask` and `context` must not hint at the miss; the tool rejects the words gap, bug, fix, broken, wrong).
export const PM_BATCH2 = [
  {
    id: "phone-page-height", miss: "CC-S3", pattern: "overlong-page-or-ux-budget", priority: "P2", split: "heldout", src: "cc",
    ask: "Spec adding a \"pace\" section to the usage page: how this week compares with last week, plus a short explanation.",
    context: "The page is read mostly on phones. It already has a summary, a chart and a table of projects.",
    mustCover: "a budget for the phone page (a maximum height or number of screens) and where the new section sits or folds so the key figure stays near the top, with a testable criterion",
  },
  {
    id: "sample-data-window-claim", miss: "CC-S4", pattern: "ambiguous-wording-or-copy", priority: "P1", split: "heldout", src: "cc",
    ask: "Write the copy and acceptance criteria for the heading above the playground's chart.",
    context: "The playground runs on a sample file that ships with the page. Visitors can also load their own log.",
    mustCover: "wording that matches what the data is (fixed sample data, not a live \"last 30 days\"), and a rule or check that the label changes when the visitor loads their own file",
  },
  {
    id: "readme-unreleased-features", miss: "CC-S5", pattern: "ambiguous-wording-or-copy", priority: "P0", split: "heldout", src: "cc",
    ask: "Update the README for the new release so hiring managers can try the tool.",
    context: "The repo is public and linked from a portfolio. Some of the described features are merged but the package published to the registry is the previous version.",
    mustCover: "a check that every command and feature the README describes works with the version a visitor installs from the registry today (or is labelled as not yet released), with an acceptance criterion for it",
  },
  {
    id: "san-francisco-remote", miss: "RR-S3", pattern: "missing-criteria", priority: "P2", split: "heldout", src: "rr",
    ask: "Spec the \"US remote\" filter for the role list.",
    context: "Job posts write their location in many ways. Users want roles they can do from anywhere in the US.",
    mustCover: "how location strings with a city and a remote marker (such as \"San Francisco (Remote)\") are classified, plus other messy forms (\"Remote - US\", \"Hybrid\"), each as a test input with the expected result",
  },
  {
    id: "recruiter-page-rollback", miss: "RR-S7", pattern: "missing-criteria", priority: "P1", split: "heldout", src: "rr",
    ask: "Spec putting the recruiter list behind a login on the live page.",
    context: "The live page is used every day. The recruiter list holds private contact details.",
    mustCover: "a rollback path if the login change fails on the live page, and a check that only the owner can see the list (including a signed-out and a different-user case), each with an acceptance criterion",
  },
  {
    id: "easy-view-laptop", miss: "HE-S3", pattern: "missing-criteria", priority: "P1", split: "heldout", src: "he",
    ask: "Spec an \"Easy view\" setting that makes text and buttons larger for older relatives.",
    context: "The app is used on phones by family. The public demo is also opened on laptops by recruiters.",
    mustCover: "how Easy view looks and behaves on a laptop-width screen (the demo), not only on phones, with an acceptance criterion at a wide viewport",
  },
  {
    id: "banned-photos-replacement", miss: "ES-S3", pattern: "missing-criteria", priority: "P0", split: "heldout", src: "es",
    ask: "Plan the demo for a public portfolio project that reads a photo of a person.",
    context: "The repo is public. A rule says never to commit photos of real, identifiable people.",
    mustCover: "what a recruiter sees and does in the demo given that no real photos can be shipped: a named replacement (a generated or licensed sample, with its source recorded) as an explicit milestone with a done check",
  },
  {
    id: "crew-app-single-backend", miss: "CK-S4", pattern: "missing-criteria", priority: "P1", split: "heldout", src: "ck",
    ask: "Spec the separation between the public demo build and the crew's real app.",
    context: "Both come from one codebase. The demo stores everything in the browser. The real app talks to a hosted database. The repo is public.",
    mustCover: "an enforced rule (a test or build check) that the real app only uses the hosted database and the demo build can never be given a backend address, not only a written statement",
  },
  {
    id: "geofence-fairness", miss: "CK-S5", pattern: "missing-criteria", priority: "P1", split: "heldout", src: "ck",
    ask: "Spec the rule that decides whether a worker is on site when they tap clock in.",
    context: "Workers have cheap phones and the site is in a hollow with weak GPS. A refused clock-in costs someone their pay.",
    mustCover: "a fairness bar (what share of workers physically on site must pass, measured) and the weak-GPS case (poor accuracy still lets the punch through with a flag), each with an acceptance criterion",
  },
  {
    id: "live-vs-saved-data", miss: "CH-S1", pattern: "missing-criteria", priority: "P1", split: "heldout", src: "ch",
    ask: "Plan connecting the screener to a live market-data source.",
    context: "Today it runs on saved sample files. The live source is rate limited and sometimes refuses a symbol.",
    mustCover: "what happens when one symbol is refused or the source is down (the rest still load, with a visible note), and a first live run as a named step with checks against real responses, not only the saved samples",
  },
  {
    id: "weekly-rebuild-no-check", miss: "CH-S3", pattern: "missing-criteria", priority: "P1", split: "heldout", src: "ch",
    ask: "Spec keeping the public demo's dates current.",
    context: "The demo is a static build with sample data. A scheduled job rebuilds it on Mondays.",
    mustCover: "a check that the scheduled rebuild actually ran and that the page's visible date is within a stated number of days of today, with an alert or visible failure if it is not",
  },
  {
    id: "cash-tying-risk-size", miss: "CH-S4", pattern: "undefined-rule", priority: "P1", split: "heldout", src: "ch",
    ask: "Spec how position size is chosen for each idea given the user's risk setting (Conservative, Balanced, Aggressive).",
    context: "Some ideas tie up cash until they close, such as selling a put. Others risk only what is paid up front. Everything is paper trading.",
    mustCover: "a stated rule for what counts as the amount at risk for trades that tie up cash, with a cap per risk setting and a test input where the cash tied up is much larger than the premium, so a Conservative idea cannot show a very large maximum loss",
  },
  // Cross-lane subset (Chase, Nov 22): staff-pm with a TDD mindset. Built from QA-TDD misses; the criterion that
  // would have caught the bug must appear in the spec as a test input written before the build.
  {
    id: "tdd-zero-exit-price", miss: "CH-Q2", pattern: "unhandled-input-edges", priority: "P1", split: "heldout", src: "ch",
    ask: "Spec closing a paper trade: record the exit price and the profit or loss in dollars.",
    context: "The user types or picks the exit price. Trades can be stocks or options.",
    mustCover: "an acceptance criterion with a test input of an exit price of 0 (an option that expires worthless) giving the full loss, so zero is treated as a real price and not as missing",
  },
  {
    id: "tdd-status-as-saved", miss: "RR-Q4", pattern: "public-demo-shipped-with-defects", priority: "P1", split: "heldout", src: "rr",
    ask: "Spec the summary line on the page that counts roles by status.",
    context: "Statuses are saved by a dropdown on the form and also arrive from an email import. The page is also published as a public demo.",
    mustCover: "an acceptance criterion that uses the status values exactly as the app saves them (including capital letters), so the demo cannot show zero for a status that has roles, ideally checked on the published demo",
  },
  {
    id: "tdd-double-press", miss: "CH-Q2", pattern: "unhandled-input-edges", priority: "P1", split: "heldout", src: "ch",
    ask: "Spec the \"Paper trade this idea\" button on an idea card.",
    context: "Users are often on older phones with slow screens, and tap again when nothing seems to happen.",
    mustCover: "an acceptance criterion with a test of two quick presses on the same idea that results in exactly one trade",
  },
  {
    id: "tdd-week-boundaries", miss: "CC-Q2", pattern: "date-clock", priority: "P1", split: "heldout", src: "cc",
    ask: "Spec the pace line: the average kWh per day so far this week. Weeks run Monday to Sunday.",
    context: "It appears on a demo page and on the real dashboard.",
    mustCover: "acceptance criteria with a pinned clock (not today's date) at the first day (Monday) and the last day (Sunday) of the week, each with an expected finite number",
  },
];
