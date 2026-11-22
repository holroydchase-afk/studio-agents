# Staff PM: first phone build and the beta phone floor

Note: this repo has no CLAUDE.md or HANDOFF.md, only three one-line docs in `docs/product/`. I worked from those and say where that leaves gaps.

## Answer
Do not pin the SDK yet. The repo's own docs disagree about the floor, and the survey that settles it (CH-4) has not come back. BETA-SPEC says iOS 16.4+ on SDK 56+, and PM-REVIEW says that excludes iPhone 7 and older. REMAINING says SDK 54 covers iOS 15.1+, which includes one tester's older iPad. Build the first version for Chase's own iPhone, and pin only after the survey, with a default of the 16.4 floor.

## Critical path
1. M1.1 | Chase's iPhone model and iOS version, plus the CH-4 survey sent to every beta tester | each answer is a row: person, device, iOS or Android version | 0.25 session (Chase, one message)
2. M1.2 | Pin decision: if every tester is on iOS 16.4+ or Android 7+, pin SDK 56+. If any tester is below 16.4, Chase decides between SDK 54/55 and swapping that tester's device | the pin is one line in BETA-SPEC with the survey table beside it | 0.25 session
3. M1.3 | First build, a thin "sign in and see one photo" screen, on the pinned SDK, opened on Chase's iPhone | Chase opens it on his phone and sees the screen | 1 session
4. M1.4 | Floor check: the build is run once on the oldest device in the survey | opens and shows the screen on that device, or the failure is logged | 1 session (needs the device)

Order matters. M1.3 cannot be called ready before M1.2. A build that has not been opened on a phone is not ready.

## Not doing
- Any feature beyond one screen: the first build only proves the phone path.
- Supporting both floors "just in case": it doubles the test matrix for an hour-a-night owner.
- App Store or TestFlight work: not needed to open a first build on his own phone.

## Biggest risk
The pin gets made from memory or from one tester. The docs say SDK 54 covers iOS 15.1, but they were not checked against the vendor's current page here, so treat both the SDK-to-iOS mapping and which SDK the phone-side test app supports as unverified until M1.2 checks them. Handled by M1.1 then M1.2.

## Decisions for Chase
- Which iPhone and iOS version do you have? Recommendation: reply with the model; I look up the rest.
- If a tester is on iOS 15: Recommendation: ask whether they can borrow a newer phone or iPad for the beta before dropping to an older SDK, because the older SDK buys short support life.
- Recommendation for the floor: iOS 16.4 and Android 7, with iPhone 7 and older named as unsupported in the beta invite.

## Done lists
- Merged, deployed and checked are separate: record the pin, the build and the on-phone check as three rows, and claim nothing in README or invites until the on-phone row exists.
- Stale text when the pin lands: BETA-SPEC, PM-REVIEW and REMAINING each state a different floor; update all three.

## Handoffs
- qa-tdd: failing tests for the criteria below, red for the right reason.
- engineer: build M1.3 after the pin.
- ux-reviewer: check the unsupported-phone message wording for grandparents.

Rollback: if a build misbehaves, revert the merge commit and reopen the previous build on the phone; nothing is public yet.

lint-ok: SL-7 no release exists yet; PHONE-6 checks the README and invite against the pinned floor instead.

Tools: agent-guard kill ran ok. agent-memory failed: tools/ux-search.mjs imports a missing check-ux-run.mjs. No run log written, no claim about cost or tokens. check-spec and spec-lint run result below.

```spec
verdict: needs-decision
bet: Chase can open a real build on his own iPhone this week, and every beta tester's phone is on a named floor; it worked when each tester row in the survey is marked supported or excluded
step: M1.1 | Collect Chase's iPhone iOS version and the CH-4 survey rows | every tester has a row with device and OS version | 0.25 session
step: M1.2 | Pin the SDK from the survey | the pin and the floor are one line in BETA-SPEC and match the survey | 0.25 session
step: M1.3 | First build, one screen, opened on Chase's iPhone | Chase opens it on his phone and sees the screen | 1 session
step: M1.4 | Run the build on the oldest surveyed device | opens, or the failure is logged | 1 session
criterion: FLOOR-1 | auto | Given a tester row with iOS 15.8, then the support check returns excluded with the reason "below iOS 16.4"
criterion: FLOOR-2 | auto | Given a tester row with iOS 16.4, then the support check returns supported
criterion: FLOOR-3 | auto | Given a tester row with Android 6, then the support check returns excluded, and Android 7 returns supported
criterion: FLOOR-4 | auto | Given a row with a missing or empty OS version, then the check returns "unknown" and never "supported"
criterion: FLOOR-5 | auto | Given the three docs in docs/product, then each states the same floor once the pin is made, and a doc that says 15.1 fails the check
criterion: PHONE-1 | manual | Open the first build on Chase's iPhone -> the screen shows 1 sign-in button and 1 photo, recorded as a dated row
criterion: PHONE-2 | manual | Open the build on a device below the floor -> the app shows 1 plain message naming "iOS 16.4" as the floor, not a crash
criterion: PHONE-3 | manual | Open the screen on a 360px by 640px phone -> it fits in at most 2 screens tall with no sideways scroll
criterion: PHONE-4 | manual | Open the build signed out -> it shows the sign-in button and 0 photos
criterion: PHONE-5 | manual | Sign in as a second, non-owner account -> it shows 0 photos from the first account
criterion: PHONE-6 | manual | Read the README and the beta invite against the pinned floor -> each says "iOS 16.4" or the chosen floor, and none claims a phone that PHONE-1 did not open
cut: Features beyond one screen | the first build only proves the phone path
cut: Supporting two floors | doubles the test matrix on an hour a night
cut: TestFlight and store work | not needed to open a build on his own phone
risk: Pin chosen before the survey or from memory | M1.2
risk: Docs keep three different floors | FLOOR-5
risk: Oldest tester device never opened the build | PHONE-2
decision: Your iPhone model and iOS version? | reply with the model, I look up the rest
decision: What floor for the beta? | iOS 16.4 and Android 7, name iPhone 7 and older as unsupported in the invite
decision: If a tester is on iOS 15, drop the SDK or change the device? | ask for a newer borrowed device first
handoff: qa-tdd | failing tests for FLOOR-1 to FLOOR-5 | red for the right reason
handoff: engineer | build M1.3 after M1.2 | PHONE-1 done and FLOOR tests green 3x
handoff: ux-reviewer | unsupported-phone message wording | PHONE-2 text reviewed
```
