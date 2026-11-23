# Plan: Hearth README as the portfolio front door

## Finding first (blocks the copy step)
- CLAUDE.md rule: public copy may use only claims in `docs/product/MARKETING.md` (claims register).
- That file does not exist in this repo, so the register has zero approved claims.
- TRACKER.md MS6: "messages are end-to-end encrypted (MLS)" is NOT in the register yet ("State: not done"), it waits on deployment. MS3 two-phone hand test is not done and an outside messenger audit is open.
- So the README must not say messages are end-to-end encrypted, "secure", or "audited". At most: "I'm building an MLS-based messenger; it is not deployed or audited yet" (as a status, which should itself be added to the register as a limited claim before use).
- I only had CLAUDE.md and TRACKER.md; I did not see the rest of the repo or the product story, so the sections below are structure, not copy.

## Plan (about 3 one-hour nights)
Night 1 - Claims and facts (about 1h)
1. Create `docs/product/MARKETING.md` with a claims register: claim, status (approved / pending / banned), evidence, limits. Seed with what Chase can verify; list the MLS E2E claim as "pending (MS6): needs deployment, MS3 hand test, limits written".
2. Chase picks: which 4-6 true claims the front door leads with (one-word yes/no per claim; I recommend only those with evidence).

Night 2 - Draft (about 1h)
3. `positioning` agent drafts README using only approved claims. Proposed order for a recruiter skimming in 60 seconds:
   - One-line what and who for (private photo sharing for split families and grandparents), proof-of-concept status stated plainly.
   - Screenshot or short demo link (if a public demo exists; confirm).
   - Why I built it / my role (solo PM-builder; decisions and trade-offs).
   - What works today vs. in progress (honest status table; messenger shown as "in progress").
   - Product thinking: anchors, persona checks, decision log links.
   - Architecture and stack, short, linking deeper docs.
   - How to run / test.
4. `ux-reviewer` showcase pass for the recruiter view; `privacy-security` check, since the README is public and touches privacy claims.

Night 3 - Review and ship (about 1h)
5. Claim audit: every sentence with a claim maps to a register row. Fix or cut any that do not.
6. PR with `Agents:` line and HANDOFF.md update. README change is docs-only, so it can merge on green per repo rules unless Chase wants a look first.

## Decisions for Chase
- Approve leaving E2E encryption out of the README until MS6 is done (recommended). Alternative: say "building toward" it, only after it is registered as a limited claim.
- Is there a public demo or screenshots to lead with?

## Not done
No README written; no MARKETING.md created (the register needs Chase's evidence).
