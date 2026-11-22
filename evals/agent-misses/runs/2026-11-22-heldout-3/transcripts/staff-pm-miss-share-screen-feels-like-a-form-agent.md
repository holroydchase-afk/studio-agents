**Decision:** Build Share as three postcard steps (Pick, Write, Send), one question per screen, not one form. Three small calls for you below; none block the build, defaults are in the spec.

Repo has no CLAUDE.md, HANDOFF.md or persona docs in this sandbox, so I worked from your brief only: grandparents who avoid social media, postcard not form.

**Critical path**
1. M1.1 Three-step flow, one question per screen. Done when PHOTO-1, PHOTO-2 green. 1 session.
2. M1.2 Postcard preview: photo, words, who gets it, one big Send. Done when PHOTO-3 green. 1 session.
3. M1.3 Sent and failed states in plain words, draft kept. Done when PHOTO-5, PHOTO-6 green. 1 session.
4. M1.4 One real relative, real phone, no help, timed. Done when PHOTO-7 recorded. 1 session.

**Not doing:** filters/crop, multi-photo, emoji/tags/location, drafts list and scheduled send. All add form fields or surface.

**Biggest risk:** an audience picker turns it back into a form. Handled by PHOTO-8: default group, one line saying who sees it, picker only behind "Change who sees it".

**Decisions for Chase**
- Default audience is the family group, picker one tap away? Yes.
- Words optional? Yes.
- Button "Send to <name>" or "Mail it"? "Send to <name>".

**Handoffs:** qa-tdd writes failing tests, engineer builds, ux-reviewer checks against the grandparent persona, positioning does the postcard wording.

Tools: agent-guard kill ok; agent-memory ok (no matches); check-spec and spec-lint exit 0. Run log skipped (eval).

```spec
verdict: needs-decision
bet: A grandparent who avoids social media can send a photo with a few words on her own, first try, and it feels like mailing a postcard; it worked when 5 of 6 first-time relatives send without help in under 60 seconds
step: M1.1 | Share flow as three postcard steps (Pick, Write, Send), one question per screen | PHOTO-1 and PHOTO-2 green | 1 session
step: M1.2 | Postcard preview: photo with the words under it, who gets it, one big Send button | PHOTO-3 green | 1 session
step: M1.3 | Sent and failed states in plain words, with the draft kept | PHOTO-5 and PHOTO-6 green | 1 session
step: M1.4 | Test with one real relative on a real phone, no help, timed | PHOTO-7 recorded | 1 session
criterion: PHOTO-1 | auto | Given the Share tab with no photo chosen, when it opens, then 1 primary button labeled "Choose a photo" is shown and no text field, dropdown or checkbox is on screen
criterion: PHOTO-2 | auto | Given a photo is chosen, when the Write step opens, then the photo shows at the top with 1 optional field labeled "Add a few words", and Next is enabled with 0 characters typed
criterion: PHOTO-3 | auto | Given a photo and the words "Happy birthday Gammy", when the postcard preview opens, then the photo and those words show together and the only enabled action is the 48pt button "Send to Gammy"
criterion: PHOTO-4 | auto | Given any Share step, when rendered, then every text is 17pt or larger, every tap target is 48pt or larger, and every action has a verb label with words under its icon
criterion: PHOTO-5 | auto | Given a send with no signal, when Send is tapped, then the screen says "We'll send it as soon as you have signal", the photo and words are kept, and the queue holds 1 item
criterion: PHOTO-6 | auto | Given a send that fails twice in a row, when the second failure lands, then the draft is still saved and 1 button "Try again" shows with no error code
criterion: PHOTO-7 | manual | Open Share on a real phone as a first-time relative with no help -> a photo is sent in under 60 seconds with 0 help requests
criterion: PHOTO-8 | auto | Given the audience for this post is the family default group, when the preview opens, then exactly 1 line names who will see it and no audience picker is shown unless "Change who sees it" is tapped
criterion: PHOTO-9 | auto | Given a 360px by 640px phone, when any Share step renders, then it fits in at most 1 screen tall with the main button visible without scrolling
cut: Filters, crop and edit tools | a postcard is sent as taken; not on the critical path for a grandparent
cut: Multi-photo posts | one photo per postcard keeps it a single decision; revisit after the first-session test
cut: Captions with emoji, tags or location | adds form fields and pulls against "a few words"
cut: Draft list and scheduled send | extra surface for people who avoid apps
risk: Audience choice turns the screen back into a form, or hides who sees the photo | PHOTO-8
risk: A failed send loses the photo and the words | PHOTO-6
risk: Small text or targets on old phones block the first send | PHOTO-4
decision: Is the default audience always the family default group, with the picker one tap away? | Yes, because a grandparent should not choose an audience each time
decision: Is the words field optional? | Yes, optional, so a photo alone can still be sent
decision: Is the final screen called "Send" or "Mail it"? | "Send to <name>", because verb labels plain and literal win with this audience
handoff: qa-tdd | failing tests for PHOTO-1 to PHOTO-6, PHOTO-8 and PHOTO-9 | red for the right reason
handoff: engineer | build M1.1 to M1.3 | PHOTO-1 to PHOTO-6, PHOTO-8 and PHOTO-9 green 3x
handoff: ux-reviewer | review the three steps against the grandparent persona and DS rules | no P0 or P1
handoff: positioning | postcard wording for the buttons and sent message | words approved by Chase
```
