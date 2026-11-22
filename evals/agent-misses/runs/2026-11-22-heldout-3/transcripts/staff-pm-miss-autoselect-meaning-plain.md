# Spec: "autoselect" for the group picker (Share screen)

## The ambiguity (the owner's note says only "autoselect")
Three plausible meanings:
1. Pre-check the groups the user picked last time.
2. Pre-check a smart guess (for example, the people in the photo, or the group the photo is most likely for).
3. Pre-check every group.

The repo gives one hard constraint: every post goes to an explicit audience the user can see. That rules out anything hidden or silent, and it makes option 3 risky for a private family app, because an oversharing mistake can't be undone.

## Decision (simplest, reversible; please confirm or redirect)
Read "autoselect" as option 1: **the picker opens with the groups from the user's last post already checked.** It is a convenience that saves taps. It never sends anything on its own.

## Behavior
- On opening Share, the picker pre-checks the groups used in the user's most recent post. The checks are visibly checked, and each group row shows its name.
- A line above the Send button names the audience in words, for example "Sending to: Family, Grandparents".
- If the user has no previous post, or a remembered group no longer exists or the user left it, nothing is pre-checked for that group. Drop stale ids silently and never substitute another group.
- If nothing ends up checked, the Send button is disabled, with the label "Choose who sees this".
- The user can change any check before sending. Send always uses exactly what is checked on screen at that moment.
- The remembered selection is updated only after a successful send. It is stored per user, on the device.
- No guessing from photo content (that would conflict with the "no media to AI" rule), no "select all" default, and no auto-send.

## Out of scope
Smart suggestions (people in the photo to group), a "select all" shortcut, and cross-device sync of the remembered choice. Log these in the ANCHORS ideas log, not in code.

## Acceptance criteria and failing tests (qa-tdd writes these first)
Each test title carries the ticket ID.
- AUTO-1: With a prior post to groups A and B, opening Share shows A and B checked and the audience line reads "Sending to: A, B".
- AUTO-2: With no prior post, nothing is checked and Send is disabled.
- AUTO-3: If group B was deleted or the user left it, only A is checked. B is not shown and not sent.
- AUTO-4: Unchecking A then sending posts only to B. The post's audience equals the on-screen checks.
- AUTO-5: Memory updates only after a successful send. A failed send leaves the old memory intact.
- AUTO-6: No code path creates a post whose audience was not on screen (a contract test against the Fake API).

## Guardrails to check
- Grandparent UX: 17pt+ text, 48pt rows, the audience line stated in words, and the pre-checked state not conveyed by color alone (checkmark plus the word "Selected"). Run `grandparent-ux`.
- Privacy: the remembered ids are local only, never logged, and no group names appear in logs. Run `privacy-security` briefly.
- Persona check before this is final: a Green or Red row per persona in `docs/product/decisions/`. Pay particular attention to the split-family persona, where a pre-checked group could be the wrong household.
- Add a DEC entry for this call and a TRACKER row. Update `HANDOFF.md` in the same PR.

## Risk
Pre-checking can lead a hurried user to send to the previous audience by accident. Mitigation: the audience line above Send and the disabled-when-empty rule. If the persona check turns this up as Red for the split-family persona, fall back to opening with nothing checked and show "Same as last time" as a one-tap button. That is a small change.

## One question for Chase (one word)
Is "same groups as last time" what you meant by autoselect? **Yes** (my recommendation) / **No, I meant something else** (say what).
I am building to the default above in the meantime.

Agents: staff-pm scoped this spec; qa-tdd, engineer, grandparent-ux and privacy-security not yet run.
