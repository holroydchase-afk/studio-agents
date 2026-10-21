# Moving Hearth onto the studio agents

Hearth's agents were the originals. The generic versions keep their method; the Hearth facts move into Hearth's docs.

| Hearth agent | Becomes | Hearth-only facts to keep in Hearth's docs |
|---|---|---|
| staff-pm | `staff-pm` | Six beta jobs, `BETA-<job>-<n>` IDs, grandparent test (5 tasks, <60 s, 4 of 5), milestone ladder → `CLAUDE.md` "Agent notes" |
| qa-tdd | `qa-tdd` | Playwright `e2e/`, `backend/tests/rls_test.sql`, Deno tests, `tracker/build_seed.py` → `docs/eng/TESTING.md` |
| app-engineer | `engineer` | Stack, privacy invariants (RLS, EXIF strip, no AI/analytics, 2048 px resize) → already in `CLAUDE.md` / `docs/architecture/` |
| privacy-security | `privacy-security` | A1–A3 anchors, the 9-item threat list, vendor list → `docs/architecture/04-threat-model.md` |
| marketing | `positioning` | Claims register and ideas → `docs/product/MARKETING.md` (already there) |
| grandparent-ux | **stays as is** | Hearth's best agent; its persona table is family-specific. It can delegate method to `ux-reviewer` later |
| funding-analyst | **archive** | Move to `docs/archive/agents/` in case Hearth ever raises money |

Steps (one PR): run `sync.sh`, delete the replaced files, update the roster table in `CLAUDE.md` (so `scripts/check-agents.sh` passes), add the "Agent notes" section, add a `HANDOFF.md` line.
