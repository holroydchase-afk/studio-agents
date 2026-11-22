**Decision: needs-decision, don't build it yet.** The repo already tried this. DEC-58 switched to the system font in PR 114, and PR 146 reversed it six days later because relatives said 1, l and I looked alike. DEC-31 sets one font, Atkinson Hyperlegible, for legibility for older eyes. Beta with relatives is two weeks out, and the ask brings no new evidence.

**Critical path (only if Chase reopens it)**
1. M1.1: Side-by-side check on the beta relatives' real phones with a 1/l/I test sheet. Done when each relative reads 10 of 10 strings right in the winning font. 0.5 session.
2. M1.2: If the system font wins, swap it and log a decision that reverses DEC-31 and DEC-58. Done when M1.1 is done and Chase says yes. 1 session.
3. M1.3: If Atkinson wins, record the result in DECISIONS.md and close the ask. 0.25 session.

**Not doing:** a per-user font toggle (adds a setting relatives won't find), and any font change before the beta.

**Biggest risk:** repeating the DEC-58 failure. FONT-3 handles it.

**Stale text a change would touch:** DEC-31, DEC-58, the HANDOFF.md state line, and any shipped font file.

**Decisions for Chase**
- Reopen DEC-31? Recommend no, not before the beta. Keep Atkinson and run M1.1 after relatives have used it for a week.
- Is "feels native" about the font or the layout? Ask one relative what feels off first; it is usually spacing, back gestures and tab bars.

**Handoffs:** qa-tdd writes failing tests for FONT-1, FONT-2, FONT-4 and FONT-5, but only if Chase says go on M1.2. ux-reviewer does the 1/l/I read-aloud check on 2 reference phones.

Tool note: `agent-memory` failed because `tools/check-ux-run.mjs` is missing from the tools folder, so past findings were not searched. Beyond that, I read CLAUDE.md, HANDOFF.md and DECISIONS.md. The kill guard passed. `check-spec`, `spec-lint`, `check-agent-run` and the cost guard all ran clean (exit 0), but the run log has tokens 0 and cost 0 with `escalated: yes` because the harness showed no counts.

Files: docs/SPEC-SYSTEM-FONT.md, docs/runs/2026-11-22-staff-pm.md, REPORT.md (all in the working directory).

```spec
verdict: needs-decision
bet: Older relatives on phones find the app feels native without losing letter clarity; it worked when no relative mixes up 1, l or I in the beta check and none asks for the old look back
step: M1.1 | Side-by-side check: Atkinson vs system font on the beta relatives' real phones, using a 1/l/I test sheet | each relative reads 10 of 10 test strings right in the winning font | 0.5 session
step: M1.2 | If system wins: swap font and log DEC entry that reverses DEC-31 and DEC-58 | M1.1 done and Chase says yes | 1 session
step: M1.3 | If Atkinson wins: record the result in DECISIONS.md and close the ask | DEC entry added | 0.25 session
criterion: FONT-1 | auto | Given the app's stylesheet, then the font stack for body, buttons and inputs is identical on every screen (one family name, 0 screens with a different one)
criterion: FONT-2 | auto | Given the string "Il1 I1l 1lI" rendered at 17pt in the chosen font, then the glyph shapes for 1, l and I are distinct in a screenshot comparison on iOS and Android reference phones
criterion: FONT-3 | manual | Given 3 relatives on their own phones and a sheet of 10 strings like "Il1" and "lI1" -> each reads 10 of 10 correctly
criterion: FONT-4 | auto | Given Dynamic Type or Android font scale at 100% and 200%, then body text is 17pt or larger at 100% and no tap target falls below 48pt at 200%
criterion: FONT-5 | auto | Given the system font fails to load or the phone has an unusual default, then the fallback stack still resolves to a sans serif and the layout has 0 clipped labels
criterion: FONT-6 | manual | Given the old font is removed, then HANDOFF.md line "Atkinson Hyperlegible everywhere" and DEC-31 are updated and no font file is still shipped in the build
cut: Per-user font toggle | adds a setting for relatives who will not find it; revisit only if FONT-3 splits
cut: Any font change before the beta | beta with relatives is two weeks out and the font was already reversed once
risk: Repeating the DEC-58 failure, where 1, l and I look alike on the system font | FONT-3
risk: Different system fonts on iOS and Android make the look and the clarity differ per phone | FONT-2
decision: Do we re-open DEC-31 at all? | No, not before the beta; keep Atkinson and run M1.1 after relatives have used it for a week
decision: If the goal is "feels native", is it the font or the layout? | Ask one relative what feels off first; native feel usually comes from spacing, back gestures and tab bars, not the typeface
handoff: qa-tdd | failing tests for FONT-1, FONT-2, FONT-4, FONT-5 | red for the right reason, only if Chase says go on M1.2
handoff: ux-reviewer | read-aloud check of the 1/l/I test sheet on 2 reference phones | findings with IDs, P0 to P2
```
