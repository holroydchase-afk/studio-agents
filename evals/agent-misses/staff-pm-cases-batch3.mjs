// Batch 3 of the staff-pm miss cases (Nov 22): ten more situations rebuilt from README.md, all `heldout`.
// Unread held-out set: never read while tuning, scored once per change. Same format and rules as staff-pm-cases.mjs
// (`ask` and `context` must not hint at the miss; the tool rejects the words gap, bug, fix, broken, wrong).
export const PM_BATCH3 = [
  {
    id: "spec-over-inflight-rewrite", miss: "CC-S1", pattern: "concurrent-work-collision", priority: "P1", split: "heldout", src: "cc",
    ask: "Spec adding a per-project filter to the usage page.",
    context: "HANDOFF.md lists another open PR, in progress and not merged, that rewrites the layout and chart of the same usage page this week.",
    mustCover: "names the in-progress PR that touches the same page, and either sequences this work behind it or states how it will be rebased, with a criterion that the filter is specced against the page as it will look after the rewrite",
  },
  {
    id: "contradicting-copy-rules", miss: "CK-S2", pattern: "concurrent-work-collision", priority: "P2", split: "heldout", src: "ck",
    ask: "Spec the wording of the hours line on the Today screen for a shift that is still open.",
    context: "Spec A, in the repo, says an open shift shows \"so far\" beside its hours. Spec B, written later by a review round, says the Today screen never shows \"so far\". Neither is marked as replacing the other.",
    mustCover: "notices that the two specs contradict each other, says which one wins (or flags it for the owner to choose) and records it, and gives one acceptance criterion for the open-shift text that does not depend on both",
  },
  {
    id: "new-pipeline-while-demo-defects-live", miss: "CH-S5", pattern: "concurrent-work-collision", priority: "P1", split: "heldout", src: "ch",
    ask: "Plan a \"hunch\" feature: the user types a hunch about a company and the app turns it into a researched paper-trade idea.",
    context: "The public demo has two open P1 issues on its idea cards, listed in HANDOFF.md as in progress. The owner has about an hour a night.",
    mustCover: "notices the open P1 demo issues and sequences them first (or gives a clear go or no-go with the reason), and does not plan the new feature in parallel with them",
  },
  {
    id: "restyle-or-less-text", miss: "ES-S1", pattern: "wrong-problem-scoped", priority: "P1", split: "heldout", src: "es",
    ask: "Spec the work to improve the home screen. The owner looked at it and said: \"It's too much. I don't know where to look.\"",
    context: "The screen has a title, three lines of guiding text above the upload button, a how-it-works strip and a footer. The last review scored it 7 out of 10 for visual polish.",
    mustCover: "reads the complaint as too much text and too many things competing for attention, and scopes cutting or collapsing the guiding text with a measurable budget (words or elements above the main action), not only a colour, type or spacing restyle",
  },
  {
    id: "license-holder-name", miss: "CO-S1", pattern: "wrong-identity-detail", priority: "P1", split: "heldout", src: "co",
    ask: "Add an open-source license to the repo.",
    context: "The repo is public and sits under the owner's GitHub account, whose login is a short handle that is not their name. The owner's portfolio site shows their full name.",
    mustCover: "names the copyright holder as the person's real name as published on the site (or asks the owner to confirm it), not the GitHub login, with an acceptance criterion that checks the license line against it",
  },
  {
    id: "camera-already-native", miss: "ES-S2", pattern: "built-then-cut", priority: "P1", split: "heldout", src: "es",
    ask: "Spec letting the user take a photo inside the web page for the scanner.",
    context: "The page runs in the browser, mostly on iPhones. The file picker on a phone already offers \"Take Photo\", which opens the phone's own camera.",
    mustCover: "asks whether the phone's own camera through the file picker already meets the need before building an in-page camera, and makes the cheaper native capture the first step with a check on a real iPhone before any custom camera is built",
  },
  {
    id: "portrait-without-source-photo", miss: "PS-S1", pattern: "built-then-cut", priority: "P2", split: "heldout", src: "ps",
    ask: "Plan a larger portrait on the portfolio home page.",
    context: "The only portrait image the site has today is a small file. The design shows the portrait at 1600 pixels wide on large screens.",
    mustCover: "checks that a source photo of the needed size exists before the build, names it as a prerequisite owned by the site owner, and states the fallback (keep the current small portrait) if it does not exist",
  },
  {
    id: "deploy-target-needs-paid-api", miss: "PS-S6", pattern: "built-then-cut", priority: "P1", split: "heldout", src: "ps",
    ask: "Recommend where to run the studio's agents on a schedule, with a cost estimate.",
    context: "The owner is on a flat monthly plan and has said there is no paid API route. Agent runs today happen inside the owner's own coding sessions.",
    mustCover: "checks the stated constraint (flat plan, no paid API) before recommending, rejects or flags any option that needs metered API billing, and gives a verdict that works inside the plan with the extra cost stated",
  },
  {
    id: "autoselect-meaning", miss: "HE-S2", pattern: "ambiguous-wording-or-copy", priority: "P2", split: "heldout", src: "he",
    ask: "Spec \"autoselect\" for the group picker on the Share screen.",
    context: "The Share screen lists the groups a photo can be sent to. The owner's note says only \"autoselect\". Every post must go to an explicit audience the user can see.",
    mustCover: "does not silently choose a meaning: it lists at least two readings (including pre-ticking the last-used group), picks one with a reason or flags it for the owner, and states as an acceptance criterion that nothing is posted to a group the user did not see ticked",
  },
  {
    id: "share-screen-feels-like-a-form", miss: "HE-S1", pattern: "thrash-and-reversal", priority: "P2", split: "heldout", src: "he",
    ask: "Spec the Share screen where a relative picks a photo, adds a few words and sends it.",
    context: "The users are grandparents who avoid social media. The owner wants sending to feel like mailing a postcard, not filling in a form.",
    mustCover: "turns the postcard feel into checkable criteria (a limit on visible fields and controls before the first action, one clear main action, plain words instead of form labels) and a scored review of the built screen against them before it is called done",
  },
];
