**Answer:** Don't build this yet. It reverses a reversal. DEC-58 moved to the system font in PR 114, and PR 146 undid it six days later because relatives said 1, l and I looked alike. DEC-31 (Atkinson Hyperlegible, for older eyes) is back in force, and HANDOFF says the beta with relatives is two weeks out. "More native" is taste. The only evidence on file says the system font hurt our core persona. This needs your call.

**Critical path (if you pick the trial)**
1. M1.1: Chase decides keep or trial, logged as a DEC citing DEC-31 and DEC-58. Done when logged. 0.2 session.
2. M1.2: Glyph test on relatives' own phones (iOS and Android), both fonts side by side. Done when FONT-1 and FONT-2 results are recorded. 0.5 session.
3. M1.3: Switch behind one constant with a one-line revert. Done when FONT-3, FONT-4 and FONT-6 are green 3x. 1 session.
4. M1.4: Update stale docs and screenshots. Done when FONT-5 checks out on the shipped build. 0.5 session.

**Not doing:** mixed fonts per screen, a user font setting, switching before the beta.

**Biggest risk:** the 1/l/I confusion comes back (handled by FONT-1). Second risk: a second flip-flop eats your hour a night.

**Decisions for Chase**
- Keep Atkinson through the beta, or trial first? Recommend keep Atkinson, then revisit after relatives' feedback.
- If trial: all 5 relatives must pass the glyph test, since DEC-31 puts legibility first.

**Handoffs:** qa-tdd writes failing tests for FONT-3, FONT-4 and FONT-6 (only if you pick the trial). Engineer builds M1.3. ux-reviewer checks the glyph results.

Files: spec at docs/SPEC-PHONE-FONT.md, run log at docs/runs/2026-11-22-staff-pm.md. check-spec, spec-lint (one SL-7 waiver with reason), check-agent-run and the cost guard all pass. The harness showed no token or cost count, so the run log has tokens: 0 and escalated: yes.

```spec
verdict: needs-decision
bet: Older relatives on their own phones read every screen as easily as today; it worked when 5 of 5 relatives tell 1, l and I apart in the glyph test and none ask for the old look back in the beta
step: M1.1 | Chase decides: keep Atkinson, or trial the system font | decision logged as DEC with reason, citing DEC-31 and DEC-58 | 0.2 session
step: M1.2 | Glyph test on real relatives' phones (iOS and Android), both fonts side by side | FONT-1 and FONT-2 results recorded | 0.5 session
step: M1.3 | If trial passes, switch behind one constant with a one-line revert | FONT-3 and FONT-4 green 3x | 1 session
step: M1.4 | Update stale docs and screenshots after the switch | FONT-5 checked on the shipped build | 0.5 session
criterion: FONT-1 | manual | Given a relative's own phone showing the strings "Il1" and "O0" in the system font -> they name 1, l and I correctly, 3 of 3 strings, 5 of 5 relatives
criterion: FONT-2 | manual | Given the same phone with Atkinson and the system font side by side -> each relative picks the easier one, and a majority of 3 or more of 5 pick the system font or the trial stops
criterion: FONT-3 | auto | Given the font stack in the app, then body text uses 1 font-family constant, and no screen sets its own family
criterion: FONT-4 | auto | Given the system font on, then body text stays 17pt or larger and every tap target stays 48pt or larger on 3 screen sizes
criterion: FONT-5 | manual | Given the shipped build -> HANDOFF, DEC-31 and screenshots all state the same font, 0 mentions of the old one
criterion: FONT-6 | auto | Given Dynamic Type or Android font scale at 200 percent, then no text clips and no tap target drops below 48pt
cut: Mixed fonts per screen | splits the look and was never tested with relatives
cut: User font setting | adds scope; deep not wide
cut: Switching before the beta | beta is two weeks out and the last switch was reversed on legibility grounds
risk: The system font brings back the 1, l and I confusion that caused the PR 146 reversal | FONT-1
risk: A second flip-flop wastes the one hour a night | M1.1
decision: Keep Atkinson through the beta, or trial the system font first? | Keep Atkinson through the beta; revisit after relatives' feedback, and only then run the glyph test
decision: If trial, is a majority of relatives preferring it enough? | Require 5 of 5 pass the glyph test, since DEC-31 puts legibility first
handoff: qa-tdd | failing tests for FONT-3, FONT-4 and FONT-6, only if Chase picks the trial | red for the right reason
handoff: engineer | build M1.3 behind one constant | FONT-3, FONT-4 and FONT-6 green 3x
handoff: ux-reviewer | review glyph test results against the grandparent rules | no P0 or P1
```
