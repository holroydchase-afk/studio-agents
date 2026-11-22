**Decision: cut.** Don't build an in-page camera. The file picker on an iPhone already offers "Take Photo" and opens the phone's own camera, so the need is met today.

**Critical path:** nothing to build. One check: CAM-1, open the page on an iPhone and confirm the picker shows "Take Photo" (0.5 session, ux-reviewer).

**Not doing:**
- In-page camera (live preview plus capture button): it adds a permission prompt, a fallback path and iOS Safari edge cases, and gains nothing over the native camera.
- Forcing the camera with the `capture` attribute: it removes the option to pick an existing photo, which the scanner also needs.

**Biggest risk:** the picker doesn't offer Take Photo on some phone or browser, so the repo's claim is wrong. CAM-1 handles it. If it fails, reopen this with the failing device named.

**Decisions for Chase:** none. If the iPhone check fails, say so and I'll rescope.

**Handoffs:** ux-reviewer, check CAM-1 on an iPhone and make the input's label obvious, done when CAM-1 passes with a one-line note.

Note: the repo had no CLAUDE.md or HANDOFF.md, so I worked from the one fact you gave me. check-spec and spec-lint both exit 0 (SL-2 waived: a cut builds nothing, so there is no empty case).

lint-ok: SL-2 verdict is cut; nothing is built, so there is no list or count to be empty

```spec
verdict: cut
bet: Chase's iPhone visitors get a photo into the scanner in one tap; it already works through the phone's file picker, so no new build is needed
criterion: CAM-1 | manual | Open the page on an iPhone and tap the photo input -> the picker lists "Take Photo" and the native camera opens
cut: In-page camera (live preview and capture button) | the phone file picker already offers "Take Photo" and opens the native camera, so the need is met; an in-page camera adds a permission prompt, a fallback path and iOS Safari edge cases for no gain
cut: Forcing the camera with the capture attribute | it removes the choice to pick an existing photo, which the scanner also needs
risk: The picker does not offer Take Photo on some phone or browser, so the claim in the repo is wrong | CAM-1
handoff: ux-reviewer | check CAM-1 on an iPhone and name the input's label so the Take Photo path is obvious | CAM-1 passes with a one-line note
```
