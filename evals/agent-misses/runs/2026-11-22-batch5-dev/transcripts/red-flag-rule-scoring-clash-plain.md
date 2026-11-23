Spec is written: `docs/SPEC-ONSITE-RED-FLAG.md`. HANDOFF.md is updated. Nothing is built or committed.

**The rule:** a posting that requires five days on site loses 15 points and shows a "5 days on site" badge with the matched phrase. Hybrid, remote and postings that say nothing about location get no penalty. The penalty and an on/off switch live in `criteria.yaml`.

**The clash I found:** pay already caps the total at 60 below the floor, so the two rules touch the same number. The spec fixes the order: weighted sum, then red-flag penalties (floor 0), then the pay cap. They never stack past the cap, and both reasons show when both fire. Example: a 90 with the flag and good pay becomes 75 and drops out of Top 5 (80+). A 85 below the pay floor with the flag is 60.

**Stale doc:** `docs/scoring.md` says the scan summary reads "pay adds up to +10", which was true when pay was a bonus. Pay is now weight 20 with a cap, so that line is wrong. I did not change it. It is listed in HANDOFF as a fix to make with this work.

The spec has 9 acceptance tests ready for the failing-test step.

**Decision for you:** is 15 points right? I picked it so one flag can push a strong role out of Top 5 without burying it. It is one number in `criteria.yaml`.

Next step: qa-tdd writes the red tests, then the build.
