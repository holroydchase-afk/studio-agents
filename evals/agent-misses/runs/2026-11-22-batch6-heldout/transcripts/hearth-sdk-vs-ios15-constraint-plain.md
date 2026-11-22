# First iPhone build and beta phone floor

Source: only the three files in `docs/product/` (BETA-SPEC, PM-REVIEW, REMAINING). They are short and there is no code, no phone inventory and no app in this repo.

## Answer

1. **The first build does not depend on the floor.** Build it for the owner's own iPhone on whichever SDK the vendor's live page says is current. Do not pin an SDK yet. The pin belongs to the CH-4 phone survey, which has not come back.
2. **Floor for the beta: provisional, not final.** Android 7+ and iOS 16.4+, per BETA-SPEC. Say plainly that it is provisional until CH-4 returns.
3. **The real fork is one tradeoff.** It is the only thing the docs leave open, and the survey answers it:
   - **Keep iOS 16.4+ (SDK 56+).** This drops iPhone 7 and older. PM-REVIEW notes grandparents still carry those.
   - **Pin SDK 54 for iOS 15.1+.** This keeps the tester's older iPad and iPhone 7-era phones. It costs an older SDK, which means fewer new features and an earlier upgrade later.
   - Anything with a grandparent on iOS 15 or lower points to SDK 54. If the survey shows nobody below iOS 16.4, take SDK 56+.

## What is shaky in the docs

- **The SDK/iOS claims are unverified.** BETA-SPEC and REMAINING both state them with no source. Hearth's own rule is to take versions from the vendor's live page, never from memory. Check the Expo SDK table before pinning. I had no verified source here, so I have not confirmed "SDK 54/55 = iOS 15.1+" or "SDK 56+ = iOS 16.4+".
- **The docs disagree on which SDKs reach iOS 15.1.** BETA-SPEC says 54 and 55; REMAINING says only 54. Treat 54 as the safe one until the vendor page settles it.
- **The "older iPad" is a tablet.** It may never be a grandparent's phone. Confirm it matters before it drives the pin.

## Plan for the first build (about 3 evenings of an hour)

**Night 1: the one thing only the owner can do.**
- Get the CH-4 survey out to the beta group: model and iOS or Android version of each phone and tablet, from Settings > General > About. This is the longest lead item. Send it tonight.
- Tell Claude his own iPhone's iOS version. That is the only input the first build needs.

**Night 2: Claude does the work, the owner checks one thing.**
- Look up the current SDK and what Expo Go supports on the vendor's live page.
- Create a minimal app (one screen) and run `scripts/check-expo-go.sh`, the repo's check for whether a build opens in Expo Go (Hearth's rule is that a build is ready only once a phone opened it or this passes).
- Owner action: scan one QR code or open one link on his iPhone. Claude sends the exact link, one step.

**Night 3: floor decision.**
- Read the survey with the owner. Apply the tradeoff above. Record the pin and the floor in BETA-SPEC, with the vendor page as the source, so "provisional" becomes final.

## What the owner needs to decide

One decision: **if any beta phone is on iOS 15, accept SDK 54 or drop that phone?** Recommendation: wait for the survey, and if iOS 15 phones turn up, pin SDK 54. Reason: the beta is about 12 grandparents, and one unsupported phone loses a whole household.

## Blockers
- CH-4 survey results (owner and relatives).
- Owner's iPhone iOS version, to confirm the first build runs on it.
