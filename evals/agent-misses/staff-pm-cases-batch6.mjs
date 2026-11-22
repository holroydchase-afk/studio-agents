// Batch 6 of the staff-pm miss cases (Nov 22): cases built from REAL past misses mined from the product repos' own review files,
// LESSONS and git history (not written by the case author). Each case keeps the real ask shape and the facts that were in the repo
// before the miss; the evidence line names the source. Facts were taken from the files and history by a mining pass; not every fact
// was re-checked at its pre-miss commit (see the evidence comments). Held-out cases are never read while tuning.
export const PM_BATCH6 = [
  // ---- dev (read while tuning) ----
  // real: commit 25fb8fd (Nov 17) and docs/eng/LESSONS.md 'Nov 17, 2026': "returning visitors kept the old demo family"; "no test covered a browser that had visited before"
  {
    id: "hearth-demo-returning-visitors", miss: "HE-S20", pattern: "missing-criteria", priority: "P1", split: "dev", src: "he",
    ask: "Change the public demo to show a new sample family with the owner's own photos.",
    context: "The owner has about an hour a night.",
    repo: {
      "HANDOFF.md": "# HANDOFF.md\n\nseedDemo writes a last visit 3 days ago for the sample users, kept if one is saved. Start over clears it.\n",
      "docs/eng/TESTING.md": "# TESTING.md\n\nPublic demo checks DEMO-1..3 cover the no-login sample build: it opens on the sample family, add, reload and start over.\n",
      "docs/reviews/2026-10-23-harden.md": "# 2026-10-23-harden.md\n\nThe demo keeps its state in the browser's local storage, with a memory fallback when storage is blocked.\n",
    },
    mustCover: "BOTH: (1) The spec says what a browser that already holds the old saved sample family sees after the change, and the expected result is the new family; AND (2) A named test loads the new demo over an older saved copy and checks the new family and pictures show",
  },
  // real: docs/reviews/2026-11-19-tech-debt/sec.md SEC-R1 and commit 363a138: "A relative can read the names of every group they are in with a plain GET /rest/v1/circles"; fixed by migration 0027 fifteen days after commit 657d9e2 shipped DE
  {
    id: "hearth-group-names-raw-api", miss: "HE-S21", pattern: "missing-criteria", priority: "P0", split: "dev", src: "he",
    ask: "Spec the change so only parents see a group's name; relatives should never see it.",
    context: "The owner has about an hour a night.",
    repo: {
      "CLAUDE.md": "# CLAUDE.md\n\nNever bypass RLS. A post you can't see behaves as not found. Every feature is checked against anchors A1 Anxiety-less and A2 Guilt-free.\n",
      "backend/supabase/migrations/0002_beta_api.sql": "# 0002_beta_api.sql\n\nThe circles select policy lets any member read the circle row, including its name, with a plain table read.\n",
      "backend/supabase/migrations/0001_init.sql": "# 0001_init.sql\n\nexport_my_data returns the member's circles, with their names, in the data export.\n",
      "docs/eng/API.md": "# API.md\n\nThe app talks to the backend through RPCs and the table API; the contract tests check both.\n",
    },
    mustCover: "BOTH: (1) The spec lists every path a relative can read a group name (screen, RPC, table read, data export) and says each is closed; AND (2) A test signs in as a relative and calls the raw table read and the export, asserting no group name comes back",
  },
  // real: docs/reviews/2026-11-19-tech-debt/pm.md PM-R2: "README claims group chat is E2E encrypted with MLS; the repo's own claims register doesn't carry it and its own gate (MS6) says not yet"
  {
    id: "hearth-readme-claim-not-in-register", miss: "HE-S22", pattern: "done-without-done-check", priority: "P1", split: "dev", src: "he",
    ask: "Plan the README rewrite that works as the portfolio front door for Hearth.",
    context: "The owner has about an hour a night.",
    repo: {
      "CLAUDE.md": "# CLAUDE.md\n\nPublic copy uses only claims in docs/product/MARKETING.md, which has a claims register.\n",
      "docs/product/TRACKER.md": "# TRACKER.md\n\nMS6: add 'messages are end-to-end encrypted (MLS)' to the claims register once deployed, with the limits. State: not done.\nMS3 hand test between two phones is not done, and an outside audit of the messenger is still open.\n",
    },
    mustCover: "BOTH: (1) Every security or privacy sentence in the new README maps to a row in the claims register, and any claim whose row is missing or gated is softened or the row is added first; AND (2) The done check greps the README's claims against the register and lists any that are unmatched",
  },
  // real: docs/reviews/2026-11-19-tech-debt/pm.md PM-R4: "Migrations 0024_start_family, 0025_search, 0026_sms_sign_in on main; no deploy record (last recorded: 0023, HANDOFF.md:244)"
  {
    id: "hearth-migrations-no-deploy-record", miss: "HE-S23", pattern: "done-without-done-check", priority: "P1", split: "dev", src: "he",
    ask: "Scope the search feature, including its database migration, to done.",
    context: "The owner has about an hour a night.",
    repo: {
      "HANDOFF.md": "# HANDOFF.md\n\nThe last migration recorded as deployed to the hosted project is 0023. Deploys to the hosted backend wait for the owner's word.\n",
      "CLAUDE.md": "# CLAUDE.md\n\nRule 8 says a build is ready only once a phone opened it. Backend deploys use backend/scripts/deploy.sh.\n",
      "README.md": "# README.md\n\nThe Status section lists search as built.\n",
    },
    mustCover: "BOTH: (1) Done is split into merged, deployed and smoke-tested, and the spec names where each state is recorded; AND (2) The spec adds a row for the new migration to a deploy ledger and says what the README may claim before the deploy",
  },
  // ---- held-out (never read while tuning; scored once per change) ----
  // real: docs/reviews/2026-11-19-tech-debt/pm.md PM-R1: "README.md:34 'every icon has a word under it'; DEC-66/DEC-70 made tabs icon-only with Easy view Off. Same drift R49 just fixed, one day later"
  {
    id: "hearth-readme-icon-rule-drift", miss: "HE-S24", pattern: "missing-criteria", priority: "P2", split: "heldout", src: "he",
    ask: "Spec the change that makes the tab bar icon-only for parents and keeps words for viewers with Easy view on.",
    context: "The owner has about an hour a night.",
    repo: {
      "README.md": "# README.md\n\nBuilt for the least tech-savvy relative: text 17 pt or larger, 48 pt tap targets, every icon has a word under it, and no action needs a gesture.\n",
      "CLAUDE.md": "# CLAUDE.md\n\nRule 3 says verb labels and words under icons, with no gesture-only actions. The README is the public front door and was just corrected for drift on Nov 18.\n",
      "docs/product/DESIGN-SYSTEM.md": "# DESIGN-SYSTEM.md\n\nHearth's stricter overrides DS-1..DS-9 sit on top of the native guidelines; the tab bar rules are written here.\n",
    },
    mustCover: "BOTH: (1) The spec lists every doc that states the old words-under-icons rule (README, CLAUDE.md rule 3, DESIGN-SYSTEM) and says each is updated in the same PR; AND (2) A check or grep in the done criteria finds no remaining statement of the old rule",
  },
  // real: docs/eng/LESSONS.md '2026-10-29: The repo was public before the go': "The review found the repo already public, since at least Oct 28 14:26Z when Pages first deployed. The go ... was still listed as the owner's."
  {
    id: "charlie-public-before-the-go", miss: "CH-S20", pattern: "undefined-rule", priority: "P0", split: "heldout", src: "ch",
    ask: "Plan the Pages deploy of the static demo and the step that makes the repo public.",
    context: "The owner has about an hour a night.",
    repo: {
      "PLAN.md": "# PLAN.md\n\nM1.5 pre-public privacy review: review done, waiting on the owner's decision to go public. M1.6 Pages deploy is blocked on M1.5.\n",
      ".github/workflows/pages.yml": "# pages.yml\n\nThe workflow builds and deploys after CI passes on main and skips itself while the repo is private, because going public is the owner's call.\n",
      "CLAUDE.md": "# CLAUDE.md\n\nNever change repo visibility without the owner's go.\n",
    },
    mustCover: "BOTH: (1) The plan names who flips visibility, how the owner's go is recorded, and that nothing deploys before it is recorded; AND (2) The plan includes a check of the repo's actual visibility against the recorded go, before the first Pages run",
  },
  // real: commit 70b9415 (Oct 23): "--path no longer reads or writes history (it merged the sample into real totals)"; HANDOFF note: "the README told people to run the sample with --path, which merged synthetic data into their real history"
  {
    id: "ccwatts-sample-merged-into-history", miss: "CC-S20", pattern: "missing-criteria", priority: "P1", split: "heldout", src: "cc",
    ask: "Plan the History feature that keeps daily usage rollups after Claude Code cleans up old logs.",
    context: "The owner has about an hour a night.",
    repo: {
      "PLAN.md": "# PLAN.md\n\nOn every run, write daily rollups of counts to ~/.ccwatts/history.jsonl. Done when deleting the Claude Code logs doesn't erase history and two runs give identical totals.\n",
      "README.md": "# README.md\n\nThe quick start suggests running the CLI with --path on the sample fixture file to see sample data.\n",
      "CLAUDE.md": "# CLAUDE.md\n\nEvery number shown has a range and the method version. Counts only; no content or full paths in anything written.\n",
    },
    mustCover: "BOTH: (1) The plan says which runs write history and states that a run on a sample or an explicit path never writes or reads the user's real history; AND (2) A test runs the documented sample command in a throwaway home and asserts the history file is unchanged",
  },
  // real: docs/reviews/2026-10-23-privacy-security.md F-02 (P0): "Nothing records a worker's location consent" and F-04 (P1): "No retention ... lat/lng/accuracy_m/address/photo_key have no expiry"; HANDOFF before review: "nothing in the app
  {
    id: "crew-clock-consent-and-retention", miss: "CK-S20", pattern: "missing-criteria", priority: "P0", split: "heldout", src: "ck",
    ask: "Plan the milestone that makes the clock-in app ready for the real crew.",
    context: "The owner has about an hour a night.",
    repo: {
      "HANDOFF.md": "# HANDOFF.md\n\nOpen decision: the plan says each worker signs a one-line location consent; nothing in the app records it yet.\nThe boss is clocked in by a foreman for teammates, and the app reads the phone's GPS when a punch starts.\n",
      "supabase/migrations/20261022000000_init.sql": "# 20261022000000_init.sql\n\nThe punches table stores lat, lng, accuracy, address and photo key, with no expiry or cleanup job.\n",
    },
    mustCover: "BOTH: (1) The plan makes a stored consent record (text version, time, device) a gate before any GPS read, including when a foreman clocks someone in; AND (2) The plan states a retention period for location, photo and chat data and a test that old rows are removed",
  },
  // real: docs/eng/LESSONS.md 'Oct 18, 2026': "Expo Go refused it: The installed version of Expo Go is for SDK 57.0.0. The project you opened uses SDK 54"; "A reasonable 'keep 54 for iOS 15.1' note in BETA-SPEC and REMAINING (CH-4) kept it 
  {
    id: "hearth-sdk-vs-ios15-constraint", miss: "HE-S25", pattern: "wrong-problem-scoped", priority: "P1", split: "heldout", src: "he",
    ask: "Plan the first build the owner can open on his own iPhone, and the phone support floor for the beta.",
    context: "The owner has about an hour a night.",
    repo: {
      "docs/product/REMAINING.md": "# REMAINING.md\n\nCH-4 phone survey decides the SDK pin: SDK 54 covers iOS 15.1 and up, which includes one tester's older iPad.\n",
      "docs/product/BETA-SPEC.md": "# BETA-SPEC.md\n\nSupported phones are Android 7+ and iOS 16.4+ on Expo SDK 56+; SDK 54/55 support iOS 15.1+. Pin the SDK after the phone inventory comes back.\n",
      "docs/product/PM-REVIEW.md": "# PM-REVIEW.md\n\nOld phones can decide scope: iOS 16.4 excludes iPhone 7 and older, which grandparents still carry.\n",
    },
    mustCover: "BOTH: (1) The plan names the real target (the App Store Expo Go on the owner's phone) and checks the SDK against what it runs today, not against the repo's own config; AND (2) Where two constraints conflict (older iOS support vs Expo Go running only the newest SDK), the plan puts a decision to the owner at once instead of a note",
  },
];
