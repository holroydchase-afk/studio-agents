# Spec check: icon-only tab bar for parents, words for viewers (Easy view On)

Hi Chase, I'm Hearth's chief of staff. Short answer: this change is already decided, specced and built. Nothing new needs building. What is left is two small copy drifts, both docs/comments only.

## Already in place (read from the repo, nothing run)
- Decided: DEC-66 (Easy view, Nov 17, `docs/product/decisions/2026-11-17-easy-view.md`) and DEC-70 (Nov 19, `decisions/2026-11-19-native-tab-bar.md`). Persona checks exist.
- Specced: `docs/product/SPEC-REDESIGN.md` RD-76 (Easy view Off: icons only, spoken names, role, selected state, 48 pt), RD-77 (On: icon plus 17 pt+ word, never hidden), RD-78 (More setting), RD-106/107 (iPhone native bar when Off).
- Built: `app/src/screens/TabBar.tsx` (`usesNativeTabs`, `nativeTabLook`, `nativeLabelMode`, `HearthTabBar` shows words only when Easy view is on), `app/src/app/(tabs)/_layout.tsx`, `app/src/state/prefs.ts` (default `easyView: role === 'viewer'`, so viewers On, parents Off). Tests: `tabs.test.tsx`, `easyView.test.tsx`, `easyViewReview.test.tsx`.
- Rule text: `CLAUDE.md` rule 3 and `DESIGN-SYSTEM.md` DS-3/DS-5 already carry the exception.
- Open item (TRACKER R59): Chase checks it on his iPhone in Expo Go after merge; switching Easy view resets to Gallery.

## Drift found (the only work)
1. `README.md` line 34 says "every icon has a word under it". That contradicts the rule: parents' tab bar is icon-only, and reactions are icon-only (DEC-38). Suggested fix: "every icon has a word under it, except the parents' tab bar and the reaction buttons, which are icons that speak their names; Easy view (on by default for grandparents) adds words under the tabs." Keep this to claims MARKETING.md allows (positioning agent to confirm).
2. `app/src/screens/TabBar.tsx` header comment lines 5-6 ("Every tab has ... a word ... labels that never hide (DS-5)") are stale next to lines 7-8 and DS-5. Comment-only fix: say the words show with Easy view On.

Also note, not a bug: Android with Easy view Off uses `nativeLabelMode` 'unlabeled' while `nativeTabLook` returns `labelHidden: false`; RD-107 covers it, so I left it.

## Suggested plan (about 20 minutes, one PR, docs and comment only)
- staff-pm: confirm no new scope (done here).
- qa-tdd skipped: docs/comment only (no code behavior change). Is there a test that greps README for the icon claim? Not found; optional guard.
- positioning: approve README wording. privacy-security, ux-reviewer: not needed (no data, no screen change).
- Update HANDOFF.md in the same PR; PR body needs an `Agents:` line.

## Needs from Chase
One word: "yes" to the two copy fixes. Separately, his iPhone check of R59.
