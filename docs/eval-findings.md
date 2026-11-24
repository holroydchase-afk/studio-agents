# Eval findings: real product issues found by the agents

Filed Nov 24, 2026 (Chase: pull every real issue the three agents found during evals, tie each to its product, and have each product fix it so QA-TDD gets before and after proof). Planted test bugs are not listed. Sources: UX review rounds and the Opus-labeled after-shots (`evals/reports/inbox.jsonl` RPT-1..22), Chase's answer key (items 1 to 23), the Energy Scanner pilot run, the dark-mode audit, and the "still open" real misses in `evals/agent-misses/README.md`.

Each product has one intake issue (label `intake`, plus `eval-finding`) holding a checkbox per finding. Before state is the commit named below. QA-TDD records the before (a failing test or a 390px screenshot at that commit) and the after at the fixing commit.

| Product | Intake | Before commit | Findings | P0 |
|---|---|---|---|---|
| Charlie | [charlie#60](https://github.com/holroydchase-afk/charlie/issues/60) | `51265e4` | 7 (EF-CH-1..7) | 1 |
| Crew Clock | [crew-clock#53](https://github.com/holroydchase-afk/crew-clock/issues/53) | `9adcf3b` | 11 (EF-CK-1..11) | 1 |
| Hearth | [hearth#162](https://github.com/holroydchase-afk/hearth/issues/162) | `ff4543e` | 10 (EF-HE-1..10) | 1 |
| Role Radar | [role-radar#91](https://github.com/holroydchase-afk/role-radar/issues/91) | `8148b02` | 5 (EF-RR-1..5) | 1 |
| ccwatts | [ccwatts#112](https://github.com/holroydchase-afk/ccwatts/issues/112) | `7b7f6c3` | 6 (EF-CC-1..6) | 0 |
| Energy Scanner | [energy-scanner#57](https://github.com/holroydchase-afk/energy-scanner/issues/57) | `6adb450` | 3 (EF-ES-1..3) | 0 |
| Build Slate, portfolio site, hero-backgrounds | none | | 0 | 0 |

Total 42 findings (some are P2 sets that group several reviewer notes). Not re-filed: dark mode layering already open as charlie#55 and energy-scanner#54; ccwatts and Hearth elevation (audit D-3) is folded into their issues.

## Dedupes
- Charlie max loss: RPT-14, RPT-18, answer-key item 21, CH-S4 (agent-misses) and CH-S22 (batch 7, real sizing code) are one finding, EF-CH-1.
- Charlie items 20, 22, 23 and the busy-card note: EF-CH-2, EF-CH-3, EF-CH-4, EF-CH-5.
- Crew Clock P0 (RPT-19, item 3) is EF-CK-1; items 1, 2, 4 to 8 are EF-CK-2..8; RPT-11 is EF-CK-9; RPT-22 is EF-CK-10 (related to open intake crew-clock#38).
- Hearth P0 (RPT-20, item 17) is EF-HE-1; item 16 and RPT-5 to RPT-8 and RPT-4 are EF-HE-2..7; Hearth items 14 and 15 (icon-only tab bar) are not filed because DEC-66 makes it intended.
- ccwatts items 10 to 13 and RPT-9, RPT-10 are EF-CC-1..6.
- Role Radar RPT-1, RPT-2, RPT-3, RPT-12 are EF-RR-1..4; RR-Q9 is EF-RR-5.
- Energy Scanner: of the pilot's 11 findings only R7, R8, R9 were still open after the recheck (EF-ES-1..3).

## Skipped on purpose
- Planted and historical bugs already fixed in `evals/agent-misses/` cases (the case fixtures), and QA-R findings about studio-agents' own tools (they are fixed in studio-agents PRs).
- ES-S5 (Energy Scanner's 60-second phone check) is Chase's own step.
- Charlie CHL-R5..R25 are filed as one P2 set; the full table is in the Charlie issue and `/mnt/project-files/ux/after-2026-11-22/findings-charlie.md`.

## Not verified
These were not re-run against today's main. Each intake tells the product to check whether the item is already fixed and close it with evidence (pm-tools `docs/INTAKE.md`). Two spot checks done while filing: Crew Clock `js/api.js` still reads `backendUrl` (EF-CK-11 stands), and Hearth `MessagesScreen.tsx` already passes an accessible label to the Open button (EF-HE-1 may be partly fixed).
