# Share screen spec (postcard model)

Full spec: /tmp/claude-0/-home-user/b8b84e58-0233-5131-8574-4629777f1214/scratchpad/h3/sand/staff-pm-miss-share-screen-feels-like-a-form-plain/SPEC-SHARE.md

**Answer:** make the screen a postcard, not a form. Front is the photo, big. Back is a few words and a "To:" line. One primary verb button, "Send".

**Flow**
1. "Choose a photo" (big verb button, system picker, one photo).
2. Photo shown as the card front; below it a paper-style message area, "Write a few words (optional)". Never required.
3. "To: Gammy, Pawpaw and Mom" defaults to the last-used group, with a plain "Change" button. Then "Send".

**Rules carried over from the repo**
- Text 17pt+, tap targets 48pt+, verb labels, no gesture-only actions, "group" not "circle".
- Audience always visible and explicit. Send is disabled with "Choose who gets this" if no recipient resolves.
- EXIF/GPS stripped on the device, no captions in logs, nothing to AI or analytics.

**After sending:** a full-screen "Sent to Gammy and Pawpaw." with "Send another" and "Done". It persists until dismissed, with no vanishing toast. Offline, it queues and says "On its way. It will go when you have signal."

**Out of scope:** multiple photos, filters, crop, stickers, location, drafts, scheduling (ideas go to the ANCHORS ideas log).

**Acceptance (failing tests first):** SHARE-1 send with no message; SHARE-2 "To:" visible before Send; SHARE-3 no EXIF/GPS; SHARE-4 offline queue; SHARE-5 size and label rules; SHARE-6 persistent confirmation; SHARE-7 no captions in logs.

**Before it is final:** persona check, grandparent-ux word review, privacy-security on the media path, DECISION-LOG entry.

**Decisions for Chase:** (1) default audience is last-used group with a visible "To:" line (recommended) vs. always ask; (2) keep postcard styling subtle for legibility (recommended). I wrote this without opening the repo's code, so the existing Share screen and the SPEC-MEDIA rules still need to be checked at build time.
