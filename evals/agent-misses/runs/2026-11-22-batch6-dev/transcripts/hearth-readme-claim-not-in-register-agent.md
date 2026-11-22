# Hearth README rewrite: plan (staff-pm)

**Answer:** needs-decision. The README can be planned and built, but it cannot go live until the claims register exists, because `docs/product/MARKETING.md` is missing from this repo. CLAUDE.md says public copy may use only claims in that register. So the first step is creating the register with the claims the README needs. Chase confirms them, and that is the only thing he has to do.

## What the repo says (quoted)
- CLAUDE.md: "Public copy uses only claims in docs/product/MARKETING.md, which has a claims register."
- Missing files: `MARKETING.md` (so no register exists), `HANDOFF.md`, `STORY.md`, `PERSONAS.md`, `ANCHORS.md`, the existing README, and `docs/runs/` is empty. Facts below come only from CLAUDE.md and TRACKER.md.
- TRACKER: "MS6: add 'messages are end-to-end encrypted (MLS)' to the claims register once deployed, with the limits. State: not done."
- TRACKER: "MS3 hand test between two phones is not done, and an outside audit of the messenger is still open."
- Caution: the end-to-end encryption claim is NOT registered, not deployed, not hand-tested, and not audited. The README must not say Hearth's messages are end-to-end encrypted, "secure messaging" or "MLS-protected". At most it may say private messaging with MLS is in progress, only after Chase approves that wording. Safest default: leave messaging out of the front door.

## Critical path
1. **M1.1** Create `docs/product/MARKETING.md` with a claims register (claim, status registered/pending, limits, evidence). Seed it only with claims Chase has confirmed. Done when the file exists, E2EE is listed as pending with the TRACKER limits, and Chase has replied yes/no on each seeded claim. 0.5 session.
2. **M1.2** Pull README facts and run a claim audit. Missing source docs (story, personas, handoff) are named as gaps, not guessed. Every sentence of the draft maps to a register row or is marked "describes work, makes no claim". Done when the audit table has zero unmapped claims. 0.5 session.
3. **M1.3** Positioning drafts the README as a portfolio front door: what it is, who for, the proof (screens, tests, decision log), what is in progress. Uses only registered claims. Done when README-1..4 pass. 1 session.
4. **M1.4** ux-reviewer showcase review, privacy-security check for real family names, then Chase approves. Done when nothing at P0 is open and Chase approves. 1 session.
5. **M1.5** Update the stale-doc list: HANDOFF (once it exists) and the TRACKER row for this README. Done when both are changed in the same PR. 0.5 session.

Total about 3.5 sessions, so 3 to 4 nights. If MS6 lands first (deployed, hand-tested, audited), add the E2EE claim to the register and the README gets one extra line.

## Not doing
- Any end-to-end encryption or MLS claim in the README: not registered, not deployed, MS3 and the audit are open.
- Screenshots, badges, a demo video, roadmap sections: not needed to prove the bet.
- Rewriting STORY or other docs: out of scope.
- Marketing-site, domain or name changes: Chase's call, separate.

## Biggest risk
A README sentence that overstates security. Handled by M1.2 (claim audit) and README-1/README-2 below.

## Decisions for Chase
- Which claims go in the first register? Recommend only what he can truthfully back today: private family photo sharing with explicit audiences, data in the US, no ads or trackers, not used for AI training (as stated in CLAUDE.md), each with its limits. He confirms yes/no per line.
- How does the README describe messaging? Recommend omitting it until MS6 is done.
- Is the portfolio audience recruiters? Recommend yes: lead with the problem and decisions, not the feature list.

## Handoffs
- qa-tdd: failing checks for README-1..4 (a script that compares README claim phrases to the register) -> red for the right reason.
- positioning: draft the README from the register -> every sentence maps to a row.
- ux-reviewer: showcase review -> no P0/P1.
- privacy-security: README and register for private data -> none found.

Rollback: revert the README merge commit and redeploy if a claim proves wrong; the register is the source of truth.

lint-ok: SL-6 the README is a public static page with no sign-in or owner-only behavior, so signed-out and other-user cases do not apply

```spec
verdict: needs-decision
bet: A recruiter or hiring manager reads the Hearth README and understands the problem, the decisions and the proof in under two minutes; it worked when Chase can send the link in an application and every claim in it traces to the claims register
step: M1.1 | Create MARKETING.md with a claims register seeded with Chase-confirmed claims | file exists, E2EE listed as pending with limits, Chase answered each seeded claim | 0.5 session
step: M1.2 | Claim audit of README facts against the register | zero unmapped claims, missing source docs named | 0.5 session
step: M1.3 | Draft the README as the portfolio front door | README-1 to README-4 green | 1 session
step: M1.4 | ux-reviewer and privacy-security review, then Chase approves | no open P0 findings | 1 session
step: M1.5 | Update stale docs in the same PR (HANDOFF if present, TRACKER row) | both changed in the PR | 0.5 session
criterion: README-1 | auto | Given a README containing the phrase "end-to-end encrypted" and a register where that claim is pending, then the check fails with 1 unregistered claim
criterion: README-2 | auto | Given a README sentence "Data stays in the US" and a register row with that claim marked registered, then the check passes with 0 unregistered claims
criterion: README-3 | auto | Given a missing MARKETING.md, then the check exits non-zero with 1 error naming the file
criterion: README-5 | manual | Open the README at 360px by 640px -> the answer to who it is for and what it is fits in at most 2 screens
criterion: README-6 | auto | Given the README as released, then every register claim it quotes matches the released text and 0 claims are missing
criterion: README-4 | manual | Open the README on a phone -> the first screen shows 1 sentence saying who Hearth is for, and 0 security claims missing from the register
cut: End-to-end encryption or MLS claim | not registered, not deployed, MS3 hand test and outside audit still open
cut: Badges, screenshots and demo video | not needed to prove the bet
cut: Rewriting STORY and other docs | out of scope for the README
risk: P0 unregistered security claim in the README | README-1
risk: P0 claims register does not exist yet | M1.1
decision: Which claims seed the register | Only claims Chase can back today (private audiences, US data, no ads or trackers, no AI training), each with limits
decision: How the README treats messaging | Omit until MS6 is deployed, hand-tested and audited
handoff: qa-tdd | failing checks for README-1 to README-4 | red for the right reason
handoff: positioning | draft README from the register | every sentence maps to a register row
handoff: ux-reviewer | showcase review of the README | no P0 or P1
handoff: privacy-security | check README and register for private data | none found
```
