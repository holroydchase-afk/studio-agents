// Golden cases for the staff-pm miss evals: one short ask plus the repo notes a PM would have, per real spec miss
// in README.md. Source of truth: `node tools/eval-miss-cases.mjs` writes plugins/studio/evals/staff-pm-miss-<id>/.
// The grader passes only if the spec or answer explicitly covers `mustCover`; generic criteria don't count.
// `ask` and `context` must not hint at the miss (the tool rejects the words gap, bug, fix, broken, wrong).
// Cases are invented-name rebuilds of the situation, not checkouts. `split`: dev may guide tuning staff-pm.md;
// held-out cases are scored once per change and never read while tuning.

export const PM_CASES = [
  {
    id: "rounding-rule", miss: "CK-S3", pattern: "undefined-rule", priority: "P1", split: "dev", src: "ck",
    ask: "Write the spec for the Week screen: hours for each day, plus a week total.",
    context: "Hours are stored to the minute. The boss reads this screen to run payroll. Today shows hours to one decimal.",
    mustCover: "one stated rounding rule, so that the week total equals the sum of the day values the user sees (or an explicit statement of how a visible mismatch is explained), with an acceptance criterion that tests it using values that round differently when summed versus rounded one by one",
  },
  {
    id: "failed-load-saves-visit", miss: "HE-S5", pattern: "missing-criteria", priority: "P1", split: "dev", src: "he",
    ask: "Spec a \"New for you\" badge on Feed that counts posts since you last looked, and resets when you open Feed.",
    context: "The app keeps a last-visit time per person. Feed loads from the network and can fail on weak signal. Users are grandparents on older phones.",
    mustCover: "what happens when the feed fails to load or is empty because of an error: the last-visit time must not be saved (the badge and count survive until a successful load), with an acceptance criterion for it",
  },
  {
    id: "windows-drive-root", miss: "CC-S2", pattern: "missing-criteria", priority: "P2", split: "dev", src: "cc",
    ask: "Spec how the CLI labels a project in its table: the folder's name, and \"(root)\" when the project is the top of the filesystem.",
    context: "The CLI reads usage logs that record the working directory as a path string. People run it on macOS, Linux and Windows.",
    mustCover: "Windows drive roots (such as \"C:\\\" and \"D:/\") alongside \"/\" as root cases, and trailing separators, each with an acceptance criterion or test input",
  },
  {
    id: "done-includes-public-copy", miss: "ES-S4", pattern: "done-without-done-check", priority: "P0", split: "dev", src: "es",
    ask: "Spec \"bedtime mode\": after 9 PM the app swaps the scan for a short wind-down checklist. What does done look like?",
    context: "The README and a case-study page describe the app as a photo aura scanner, with a screenshot of the scan screen. The repo is a public portfolio piece that recruiters open first.",
    mustCover: "a done definition that includes updating the public README screenshot and the case study so they tell the new story (not only the code and tests), as an explicit checklist item",
  },
  {
    id: "count-beyond-first-page", miss: "HE-S4", pattern: "missing-criteria", priority: "P1", split: "heldout", src: "he",
    ask: "Spec the \"New for you\" count on the Feed tab.",
    context: "The feed endpoint returns posts 20 at a time, newest first. A busy family can post 40 photos in a weekend.",
    mustCover: "what the count shows when more posts than one page arrived since the last visit (a total from the server, or a stated cap such as \"20+\"), with an acceptance criterion using more than 20 new posts",
  },
  {
    id: "removed-pages-redirect", miss: "HE-S6", pattern: "missing-criteria", priority: "P1", split: "heldout", src: "he",
    ask: "Spec the navigation redesign: four tabs, and the Groups, Me and Help pages go away because their content moves into the tabs.",
    context: "The app has been live for family members for a month. Invite emails and notification messages contain links to /groups, /me and /help. People have the old pages bookmarked.",
    mustCover: "what happens to the old addresses: redirects (or a stated landing page) for /groups, /me and /help from links, bookmarks and notifications, with an acceptance criterion that visits each old address",
  },
  {
    id: "phone-first-screen-ci-fonts", miss: "RR-S6", pattern: "missing-criteria", priority: "P1", split: "heldout", src: "rr",
    ask: "Spec the public demo page for a job-search tracker: a ranked list of roles with a score and a status for each.",
    context: "Recruiters open portfolio links on their phones first. Layout tests run in CI on a different machine than the one the page is built on.",
    mustCover: "both a phone first-screen criterion (what is visible at about 390px wide without scrolling, such as the top role and its score) and a layout-test rule that tolerates font differences between machines (slack in width checks, or a pinned font), each testable",
  },
  {
    id: "green-deploy-not-done", miss: "ES-S5", pattern: "done-without-done-check", priority: "P1", split: "heldout", src: "es",
    ask: "Gate review for ES-M2.2: should we call this milestone done and say it's live?",
    context: "ES-M2.2's done check, written in the plan, is \"the link loads on a phone\". The deploy workflow finished green this afternoon and the build contains the new page. Nobody has opened the link on a phone yet.",
    mustCover: "a no-go (or go with the named condition) because the plan's own done check, loading the link on a phone, has no evidence yet, listing it as not met rather than rounding up from the green deploy, and who does the check",
  },
];
