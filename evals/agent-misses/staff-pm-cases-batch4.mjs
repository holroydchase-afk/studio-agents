// Batch 4 of the staff-pm miss cases (Nov 22): two situations from Chase's after-restyle testing (reports RPT-3 and RPT-7; miss ids continue the README numbering
// in evals/reports/inbox.jsonl), both `heldout`. Fresh: never read while tuning, scored once per change.
// Same format and rules as the earlier batches (`ask` and `context` must not hint at the miss).
export const PM_BATCH4 = [
  {
    id: "demo-criteria-unconfigured", miss: "RR-S10", pattern: "missing-criteria", priority: "P0", split: "heldout", src: "rr",
    ask: "Spec the public demo build of the job-search page so a recruiter can try the Criteria screen.",
    context: "The real page reads the owner's private criteria file. The demo runs on made-up sample data with no criteria file.",
    mustCover: "what the Criteria screen shows in the demo: a configured sample profile or an explicit sample-criteria state, so no control reads as unconfigured, with an acceptance criterion checked on the demo build",
  },
  {
    id: "empty-state-no-action", miss: "HE-S9", pattern: "missing-criteria", priority: "P1", split: "heldout", src: "he",
    ask: "Spec the Events screen in the family photo app.",
    context: "Families add birthdays and visits. Most people open the screen before any event exists. Users are older relatives on phones.",
    mustCover: "what the screen shows when there are no events (a plain explanation of what events are and a large create button), as its own acceptance criterion, not only the list with events",
  },
];
