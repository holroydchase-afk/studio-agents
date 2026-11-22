# Agent misses: QA-TDD and Staff PM

Real misses collected from product projects (Chase, Nov 21 to 22). They are the seed for golden eval cases, the same way Energy Scanner's ES-R1..R68 seeded the UX agent evals. Nothing here is a scoring harness yet; that waits for the UX agent eval thread to finish, then reuses its approach (golden cases, fresh grader, held-out set, seeded repeatability, stale-report CI gate).

Rules for entries: one line each, a link to the PR or commit, no personal data. Nothing was filed as an issue upstream. IDs are `<PROJECT>-Q<n>` (QA-TDD) and `<PROJECT>-S<n>` (Staff PM). Pattern tags let us group cases into eval families.

## Tally

| Project | QA-TDD | Staff PM | Status |
|---|---|---|---|
| ccwatts | 5 | 5 | received |
| Role Radar | 9 | 7 (+2 no link) | received |
| Hearth | 7 | 8 | received |
| Cohort (persona-twins repo) | 4 | 5 | received |
| Product Studio (portfolio site, pm-tools, studio-agents) | 7 | 8 | received |
| Energy Scanner | 5 | 5 | received |
| Charlie | 5 | 5 | received |
| Crew Clock | 5 | 5 | received |
| **Total** | **47** | **48 (+2)** | |

## Patterns so far

QA-TDD
- **date-clock**: test depends on today's date or timezone and the clock isn't pinned (CC-Q1, Q2, Q3; HE-Q3, Q4, CK-Q5, ES-Q3). Biggest family, 6 of 47.
- **real-device-gap**: passes in desktop Chrome or fresh browsers, breaks on iPhone Safari, returning visitors, CI fonts, narrow phones, caching (CC-Q4; HE-Q1, Q2, Q5; RR-Q5; CK-Q1, Q3, Q4; ES-Q1, Q2, Q4).
- **flaky-or-wrong-timing**: races, load flakes, timing the tool instead of the app (RR-Q6, Q8; HE-Q6; CK-Q2).
- **self-referential-or-skipped-tests**: tests check math against its own output, or a skip looks like a pass, or deps/files missing on a fresh copy (CH-Q1, Q3, Q4, Q5; ES-Q5 test locked in the bug).
- **guard-written-after-the-bug**: a check or guard added only after the same defect shipped, or checks too narrow (regex, case, quoting) (PS-Q1, Q2, Q3).
- **tool-tests-missed-edge-cases**: studio tooling passed its own tests until a qa-tdd review found edges (PS-Q4, Q5, Q6, Q7).
- **unhandled-input-edges**: zero/negative values, unknown ticker, double clicks (CH-Q1, Q2).
- **ci-environment-drift**: runner or image changed (RR-Q7), red main left unfixed (RR-Q9, HE-Q3).
- **matching-and-sorting-edges**: substring match, text-sorted dates, null input (RR-Q1, Q2, Q3).
- **privacy-leak-not-tested**: found by review, not tests (CC-Q5, HE-Q7).
- **rename-and-coverage-gaps**: rename left a stale mention, feature with no tests, vacuous test that passes with its rule missing, promised findings left open (CO-Q1..Q4).
- **public-demo-shipped-with-defects** (RR-Q4).

Staff PM
- **missing-criteria**: spec lacks a case (failed load, Windows drive root, redirects, laptop view, phone first screen, rollback) (CC-S2, RR-S6, RR-S7, HE-S3, S4, S5, S6, CO-S4, CK-S4, S5, CH-S1, S2, S3, S4, ES-S3, S5).
- **concurrent-work-collision**: spec overlaps in-flight or live work (CC-S1, RR-S5, CO-S5, CK-S1, S2, CH-S5).
- **thrash-and-reversal**: shipped, then redone within days (RR-S2, S4, HE-S1, S7, S8, CO-S2, S3).
- **wrong-identity-detail**: license named a login, not the person (CO-S1).
- **ambiguous-wording-or-copy**: misread requirement or claim of what isn't true (CC-S4, S5; HE-S2).
- **overlong-page-or-ux-budget** (CC-S3).
- **built-then-cut**: feature or page built, then hidden or removed once its premise failed (PS-S1, S2, S6, S7; ES-S2; also CO-S2, S3).
- **wrong-problem-scoped**: spec solved the stated task, not the user's actual complaint (ES-S1).
- **done-without-done-check**: marked done or live without the stated check, or without public copy/screenshots (ES-S4, S5; also CC-S5).
- **undefined-rule** (rounding, risk sizing) (CK-S3, CH-S4).

## ccwatts

QA-TDD
- CC-Q1 [date-clock] Pace tests broke on Sundays. [8bab663](https://github.com/holroydchase-afk/ccwatts/commit/8bab663), [PR 85](https://github.com/holroydchase-afk/ccwatts/pull/85)
- CC-Q2 [date-clock] `pace --demo` broke on Mondays. [d1f743d](https://github.com/holroydchase-afk/ccwatts/commit/d1f743d), [PR 85](https://github.com/holroydchase-afk/ccwatts/pull/85)
- CC-Q3 [date-clock] Test failed just after midnight UTC. [7e03ce0](https://github.com/holroydchase-afk/ccwatts/commit/7e03ce0), [PR 102](https://github.com/holroydchase-afk/ccwatts/pull/102)
- CC-Q4 [real-device-gap] Phone #pace link opened wrong after [PR 102](https://github.com/holroydchase-afk/ccwatts/pull/102) merged green (from a screenshot; not reproduced yet).
- CC-Q5 [privacy-leak-not-tested] Project path hash leaked into JSON and dashboard output; privacy review caught it. [007f3d6](https://github.com/holroydchase-afk/ccwatts/commit/007f3d6), [PR 66](https://github.com/holroydchase-afk/ccwatts/pull/66)

Staff PM
- CC-S1 [concurrent-work-collision] [PR 101](https://github.com/holroydchase-afk/ccwatts/pull/101) specced while [PR 102](https://github.com/holroydchase-afk/ccwatts/pull/102) rewrote the same page; 101 needs a rebase.
- CC-S2 [missing-criteria] Windows drive roots left out of the [PR 100](https://github.com/holroydchase-afk/ccwatts/pull/100) spec; show "C:" not "(root)".
- CC-S3 [overlong-page] Pace made the phone page 4945px tall, reworked behind a fold. [16ec5f2](https://github.com/holroydchase-afk/ccwatts/commit/16ec5f2), [PR 79](https://github.com/holroydchase-afk/ccwatts/pull/79)
- CC-S4 [ambiguous-wording-or-copy] Playground said "last 30 days" about fixed sample data. [PR 94](https://github.com/holroydchase-afk/ccwatts/pull/94)
- CC-S5 [ambiguous-wording-or-copy] README advertised features not on npm yet, found on interview day. [PR 96](https://github.com/holroydchase-afk/ccwatts/pull/96), [PR 97](https://github.com/holroydchase-afk/ccwatts/pull/97)

## Role Radar

QA-TDD
- RR-Q1 [matching-and-sorting-edges] Gmail matched "Volt" inside revolt.example and could move the wrong role. [#36](https://github.com/holroydchase-afk/role-radar/pull/36)
- RR-Q2 [matching-and-sorting-edges] Ruled-out dates sorted as text, older skips ranked above today's. [#36](https://github.com/holroydchase-afk/role-radar/pull/36)
- RR-Q3 [matching-and-sorting-edges] Core flows lacked edge tests: no redraw on save, 26,491px-wide page, blank fields accepted, null Gmail broke import. [323a165](https://github.com/holroydchase-afk/role-radar/commit/323a165ffe383bc9ce1907468fe75078e92956d5)
- RR-Q4 [public-demo-shipped-with-defects] Public demo shipped a P0 and 3 P1s (stale screenshots, "applied 0"). [5223662](https://github.com/holroydchase-afk/role-radar/commit/5223662ab874078356f251a73f9900e7cfddbd10)
- RR-Q5 [real-device-gap] Layout passed locally, failed on CI fonts. [342bef4](https://github.com/holroydchase-afk/role-radar/commit/342bef45e419f70a951260ff41ceae3ca1d3b3b3)
- RR-Q6 [flaky-or-wrong-timing] Speed test timed Playwright, not the app. [c2916ad](https://github.com/holroydchase-afk/role-radar/commit/c2916ad66d55cf66485eb8c1386188110f4ea44a)
- RR-Q7 [ci-environment-drift] CI broke when ubuntu-latest moved and Chromium wouldn't install. [8015bbd](https://github.com/holroydchase-afk/role-radar/commit/8015bbd447df227714aceaa3b0a39918148e7b16)
- RR-Q8 [flaky-or-wrong-timing] Skip-form test raced focus and flaked. [b7d74b8](https://github.com/holroydchase-afk/role-radar/commit/b7d74b81ee8d6c575f870487083728700ec0ef7b)
- RR-Q9 [ci-environment-drift] Dream PR merged with 26 failures already on main, still unfixed. [#80](https://github.com/holroydchase-afk/role-radar/pull/80)

Staff PM
- RR-S1 [missing-criteria] Red-flag rule shipped with no feedback loop; skip reasons came next. [#38](https://github.com/holroydchase-afk/role-radar/pull/38), [#40](https://github.com/holroydchase-afk/role-radar/pull/40)
- RR-S2 [thrash-and-reversal] Filters reworked twice in two days. [#57](https://github.com/holroydchase-afk/role-radar/pull/57), [#68](https://github.com/holroydchase-afk/role-radar/pull/68)
- RR-S3 [missing-criteria] "San Francisco (Remote)" not treated as US remote. [#68](https://github.com/holroydchase-afk/role-radar/pull/68)
- RR-S4 [thrash-and-reversal] Pay went from +10 bonus to its own weight with a floor; clashed with scan wording. [#74](https://github.com/holroydchase-afk/role-radar/pull/74)
- RR-S5 [concurrent-work-collision] Dream roles scored as anchors, rebuilt a month later; spec missed that the live page was ahead of main. [#16](https://github.com/holroydchase-afk/role-radar/pull/16), [#80](https://github.com/holroydchase-afk/role-radar/pull/80)
- RR-S6 [missing-criteria] Early UI specs had no phone first-screen or CI-font criteria; four UI rounds. [#44](https://github.com/holroydchase-afk/role-radar/pull/44), [#47](https://github.com/holroydchase-afk/role-radar/pull/47)
- RR-S7 [missing-criteria] Private-recruiters deploy had no rollback or owner check until privacy review added them. [f2e315e](https://github.com/holroydchase-afk/role-radar/commit/f2e315e1f8d88b5b43ca044b70367c8e46b2bc25)
- No link: Ashby marking hybrid roles as remote; keyword score overrating roles (domain misses, unfiled; add as RR-S8, RR-S9 only if a PR turns up).

## Hearth

QA-TDD
- HE-Q1 [real-device-gap] iPhone Safari storage limit broke the Grandma Jo switch; Chrome tests couldn't see it. [PR 144](https://github.com/holroydchase-afk/hearth/pull/144) (awaiting merge)
- HE-Q2 [real-device-gap] Returning visitors kept the old demo family; only fresh browsers tested. [PR 118](https://github.com/holroydchase-afk/hearth/pull/118)
- HE-Q3 [date-clock] Backend notify test was a date time-bomb ([PR 117](https://github.com/holroydchase-afk/hearth/pull/117)), then failed every PR until [PR 142](https://github.com/holroydchase-afk/hearth/pull/142).
- HE-Q4 [date-clock] RD-44 demo test drifted with today's date, red on main. [PR 138](https://github.com/holroydchase-afk/hearth/pull/138)
- HE-Q5 [real-device-gap] iPhone glass tab bar covered labels; only Chase's phone caught it. [PR 103](https://github.com/holroydchase-afk/hearth/pull/103)
- HE-Q6 [flaky-or-wrong-timing] Jest test flakes under load (T27), still open. [PR 140](https://github.com/holroydchase-afk/hearth/pull/140)
- HE-Q7 [privacy-leak-not-tested] Real family names, and stories that identify people, sat in docs, tests and commit messages of a public repo; found by a pre-hosting scan, not by any test or check, then removed by a history rewrite (the original commits can't be linked). The rule was held by review only; a hashed-name check was left as a tracker item. Lesson recorded in [fad2714](https://github.com/holroydchase-afk/hearth/commit/fad2714) (docs/eng/LESSONS.md, Oct 29 entry). Eval case: `qa-tdd-miss-name-denylist-case`.

Staff PM
- HE-S1 [thrash-and-reversal] First Share screen read like a form (2/10), redone as the postcard. [PR 129](https://github.com/holroydchase-afk/hearth/pull/129)
- HE-S2 [ambiguous-wording-or-copy] "Autoselect" misread as pre-ticking the last group, reverted in the same PR. [PR 129](https://github.com/holroydchase-afk/hearth/pull/129)
- HE-S3 [missing-criteria] Easy view spec skipped the laptop demo; it enlarged the story panel. [PR 125](https://github.com/holroydchase-afk/hearth/pull/125)
- HE-S4 [missing-criteria] "New for you" counts only the first 20 posts (B18), still open, no test. [PR 111](https://github.com/holroydchase-afk/hearth/pull/111)
- HE-S5 [missing-criteria] Same spec never covered a failed feed load; last visit saved anyway (B17). [PR 111](https://github.com/holroydchase-afk/hearth/pull/111)
- HE-S6 [missing-criteria] Redesign removed Groups, Me and Help with no redirects; old links went blank (tests caught it before deploy). [PR 115](https://github.com/holroydchase-afk/hearth/pull/115)
- HE-S7 [thrash-and-reversal] Redesign swapped Atkinson for the phone font ([PR 114](https://github.com/holroydchase-afk/hearth/pull/114)), reversed six days later ([PR 146](https://github.com/holroydchase-afk/hearth/pull/146)).
- HE-S8 [thrash-and-reversal] Warm tan paper shipped, replaced next day by three themes. [PR 122](https://github.com/holroydchase-afk/hearth/pull/122)

## Energy Scanner

Checked against commits, HANDOFF.md and `docs/reviews/`; ES-R IDs are its review findings.

QA-TDD
- ES-Q1 [real-device-gap] 320px header overflowed on CI only (QA-R3): CI's wider font pushed it 4px off screen. [#46](https://github.com/holroydchase-afk/energy-scanner/pull/46) replaced #45, [8b0fd73](https://github.com/holroydchase-afk/energy-scanner/commit/8b0fd73). Lesson: 320px layout tests need slack for font differences.
- ES-Q2 [real-device-gap] ES-R46 layout fix left the palm reading left-aligned at 900px and wider (ES-R47, P1): rule not limited to photo mode, only photo layout tested at that width. [9b60a17](https://github.com/holroydchase-afk/energy-scanner/commit/9b60a17), fixed in [30a9c24](https://github.com/holroydchase-afk/energy-scanner/commit/30a9c24)
- ES-Q3 [date-clock] Tonight's steps loaded once at startup, so an open tab kept last night's ticks (ES-R36, P0); night key used the UTC date so steps vanished at 10 PM Pacific (ES-R31). No test crossed a night or ran outside UTC. [ee42dd9](https://github.com/holroydchase-afk/energy-scanner/commit/ee42dd9), [f6f21e8](https://github.com/holroydchase-afk/energy-scanner/commit/f6f21e8), [#16](https://github.com/holroydchase-afk/energy-scanner/pull/16)
- ES-Q4 [real-device-gap] Real iPhone photos looked broken (ES-R21, P0): mosaic tiles, jagged edges, washed-out glow, aura on a second person and a ceiling fan. Tests used only made-up images. [59f369e](https://github.com/holroydchase-afk/energy-scanner/commit/59f369e); iPhone rescan still pending.
- ES-Q5 [self-referential-or-skipped-tests] End-to-end test asserted the low-contrast border on the empty check circle, so it passed a border failing 3:1 (TXT-R19, P1). Test fixed first in [777fcdf](https://github.com/holroydchase-afk/energy-scanner/commit/777fcdf), then [5fed521](https://github.com/holroydchase-afk/energy-scanner/commit/5fed521), [#49](https://github.com/holroydchase-afk/energy-scanner/pull/49)

Staff PM
- ES-S1 [wrong-problem-scoped] [#48](https://github.com/holroydchase-afk/energy-scanner/pull/48) scoped as a visual restyle, reviewer 7/10, Chase saw ~4/10 because the issue was too much guiding text; reworked in [#49](https://github.com/holroydchase-afk/energy-scanner/pull/49). Rescore in `docs/reviews/2026-11-22-less-text.md` (in that repo).
- ES-S2 [built-then-cut] M2 built an in-browser camera ([7a11984](https://github.com/holroydchase-afk/energy-scanner/commit/7a11984)); it broke on iPhone and was replaced by the phone's own camera in [#15](https://github.com/holroydchase-afk/energy-scanner/pull/15). Spec never asked whether the native camera already did this.
- ES-S3 [missing-criteria] Plan banned real photos but planned no replacement (ES-R1, P0), so no demo for recruiters. Fixed with an illustrated sample. [30b6cdd](https://github.com/holroydchase-afk/energy-scanner/commit/30b6cdd)
- ES-S4 [done-without-done-check] Bedtime mode shipped in [#12](https://github.com/holroydchase-afk/energy-scanner/pull/12) without the README screenshot or case study in "done" (ES-R2, R3, P0); both told the v1 story. [6a08c1c](https://github.com/holroydchase-afk/energy-scanner/commit/6a08c1c)
- ES-S5 [done-without-done-check] ES-M2.2's check was "the link loads on a phone", but it was marked done and live after a green deploy nobody loaded. [328cd48](https://github.com/holroydchase-afk/energy-scanner/commit/328cd48); Chase's 60-second phone check still open.

## Cohort (repo persona-twins, now Stakeholder Twins)

Only 9 PRs; the agents arrived in PR 5, so the earlier misses show what they should catch. The agents check also went red on PRs 6 to 9 and they merged anyway (process miss, not counted above).

QA-TDD
- CO-Q1 [rename-and-coverage-gaps] Priya-to-Maya rename left one old mention; no test checked for it. [06edf6d](https://github.com/holroydchase-afk/persona-twins/commit/06edf6d), fixed in [1cc88f1](https://github.com/holroydchase-afk/persona-twins/commit/1cc88f1)
- CO-Q2 [rename-and-coverage-gaps] Per-persona voices gave Marcus a female voice and lost the default; two fixes, still unconfirmed, no voice tests. [be78f0e](https://github.com/holroydchase-afk/persona-twins/commit/be78f0e), [72b49ef](https://github.com/holroydchase-afk/persona-twins/commit/72b49ef)
- CO-Q3 [rename-and-coverage-gaps] Dark-mode contrast test passed with its rule missing; qa-tdd caught it before handoff. [PR 8](https://github.com/holroydchase-afk/persona-twins/pull/8)
- CO-Q4 [rename-and-coverage-gaps] Three log-hygiene findings promised for the next PR, still open three PRs later. [PR 5](https://github.com/holroydchase-afk/persona-twins/pull/5)

Staff PM
- CO-S1 [wrong-identity-detail] License named the GitHub login, not the person. [PR 2](https://github.com/holroydchase-afk/persona-twins/pull/2), fixed in [PR 3](https://github.com/holroydchase-afk/persona-twins/pull/3)
- CO-S2 [thrash-and-reversal] Cartoon faces built, removed 6 minutes later; leftover code stayed until [PR 4](https://github.com/holroydchase-afk/persona-twins/pull/4). [5a8a4ce](https://github.com/holroydchase-afk/persona-twins/commit/5a8a4ce)
- CO-S3 [thrash-and-reversal] Legal twin polished in PR 4, cut the next day in [PR 6](https://github.com/holroydchase-afk/persona-twins/pull/6).
- CO-S4 [missing-criteria] Design spec missed the portfolio link and intro needed to go public; one extra PR. [PR 9](https://github.com/holroydchase-afk/persona-twins/pull/9)
- CO-S5 [concurrent-work-collision] Rename and restyle built at the same time and collided; HANDOFF and design spec still out of date. [4cd28fe](https://github.com/holroydchase-afk/persona-twins/commit/4cd28fe), [PR 7](https://github.com/holroydchase-afk/persona-twins/pull/7)

## Crew Clock

From git log, merged PRs, HANDOFF and the post-mortem in PR 44. Read-only research; studio agents not run.

QA-TDD
- CK-Q1 [real-device-gap] Phones kept an old demo build for about 34 hours after a deploy; no test deployed twice and CI served with caching off. [#22](https://github.com/holroydchase-afk/crew-clock/pull/22), [1122130](https://github.com/holroydchase-afk/crew-clock/commit/1122130)
- CK-Q2 [flaky-or-wrong-timing] "Reset sample data" could keep an unsent punch (race); red main after #22 blocked its deploy. [#23](https://github.com/holroydchase-afk/crew-clock/pull/23), [c2677bf](https://github.com/holroydchase-afk/crew-clock/commit/c2677bf)
- CK-Q3 [real-device-gap] Four bugs only a manual live check found: phone message box below the screen, hours 8.4 on Today vs 8.5 on Week. [#32](https://github.com/holroydchase-afk/crew-clock/pull/32), [809d30c](https://github.com/holroydchase-afk/crew-clock/commit/809d30c)
- CK-Q4 [real-device-gap] Week table overflowed at 360px on a Saturday; main red (UX-R29). [#37](https://github.com/holroydchase-afk/crew-clock/pull/37), [3ecdd95](https://github.com/holroydchase-afk/crew-clock/commit/3ecdd95)
- CK-Q5 [date-clock] Smoke test passed only in daytime (before 9 AM the sample day becomes yesterday); same PR fixed the "Which teammate?" list race (UX-4 flake). [#31](https://github.com/holroydchase-afk/crew-clock/pull/31), [e954124](https://github.com/holroydchase-afk/crew-clock/commit/e954124)

Staff PM
- CK-S1 [concurrent-work-collision] Two threads fixed the same four live-demo bugs in parallel; reconciled by a merge. [#32](https://github.com/holroydchase-afk/crew-clock/pull/32), [#34](https://github.com/holroydchase-afk/crew-clock/pull/34), [61b2c9d](https://github.com/holroydchase-afk/crew-clock/commit/61b2c9d)
- CK-S2 [concurrent-work-collision] Two specs contradicted (LIVE-2 "so far" vs UX-R46b no "so far"), settled after both merged. [37a5243](https://github.com/holroydchase-afk/crew-clock/commit/37a5243)
- CK-S3 [undefined-rule] No single rounding rule for hours; Week total 16.1 vs days summing to 16.0; reworked twice. [#29](https://github.com/holroydchase-afk/crew-clock/pull/29), [7f654eb](https://github.com/holroydchase-afk/crew-clock/commit/7f654eb), [#32](https://github.com/holroydchase-afk/crew-clock/pull/32)
- CK-S4 [missing-criteria] Demo-separation spec never enforced "crew app runs only Supabase"; `js/api.js` lines 31 to 37 still route to the Sheets backend when `backendUrl` is set (checked on main Nov 21, still open). [#44](https://github.com/holroydchase-afk/crew-clock/pull/44)
- CK-S5 [missing-criteria] Geofence shipped without a fairness bar or weak-GPS case; later eval: passes 77% of people at 1.5x radius in a hollow; rule unchanged, under Decisions to review. Still open. [#41](https://github.com/holroydchase-afk/crew-clock/pull/41)

## Charlie

The causes in CH-S3 and the figure in CH-S4 come from the Nov 17 review and were not re-checked.

QA-TDD
- CH-Q1 [self-referential-or-skipped-tests] Risk math crashed on zero or negative price, strike or IV; tests checked the math against its own output. [#24](https://github.com/holroydchase-afk/charlie/pull/24)
- CH-Q2 [unhandled-input-edges] Unknown ticker crashed the screener, double clicks made duplicate trades, a $0 close counted as a loss, Delete kept trades. [#17](https://github.com/holroydchase-afk/charlie/pull/17)
- CH-Q3 [self-referential-or-skipped-tests] A security browser test was skipped in CI and the skip looked like a pass. [#29](https://github.com/holroydchase-afk/charlie/pull/29)
- CH-Q4 [self-referential-or-skipped-tests] pypdf 7 broke the PDF-bomb guard because the version had no upper bound. [#47](https://github.com/holroydchase-afk/charlie/pull/47)
- CH-Q5 [self-referential-or-skipped-tests] Market data package never committed; tests passed locally, every import failed on a fresh copy. [028492e](https://github.com/holroydchase-afk/charlie/commit/028492e)

Staff PM
- CH-S1 [missing-criteria] Live Cboe adapter planned against saved samples only; first live run lost puts, one blocked symbol took all live data offline, prices never refreshed. [02203e0](https://github.com/holroydchase-afk/charlie/commit/02203e0)
- CH-S2 [missing-criteria] No spec for mixing live and demo data; live prices beside demo fundamentals under a "Delayed data" label. [#17](https://github.com/holroydchase-afk/charlie/pull/17)
- CH-S3 [missing-criteria] Stale-date fix relied on a Monday rebuild with no check it ran; skipped twice, demo showed Nov 2 on Nov 17. [#27](https://github.com/holroydchase-afk/charlie/pull/27)
- CH-S4 [undefined-rule] Risk sizing undefined for cash-tying trades; a Conservative idea showed a $12,135 max loss. From the MVP, still open. [c08a0e4](https://github.com/holroydchase-afk/charlie/commit/c08a0e4)
- CH-S5 [concurrent-work-collision] Hunch pipeline planned while two P1 demo bugs were live; Chase paused it. [#48](https://github.com/holroydchase-afk/charlie/pull/48)

## Product Studio (portfolio site, pm-tools, studio-agents)

Basis: commit subjects, merge order and Chase's standing rules in project memory; commit bodies are thin, so causes are stated only as far as a subject or rule supports. Treat as lower confidence than the product lists above.

QA-TDD
- PS-Q1 [guard-written-after-the-bug] The home greeting animated and drifted again after earlier fixes; a CI check (HOME-7) arrived only with the fix. [5b9152b](https://github.com/holroydchase-afk/holroydchase-afk.github.io/commit/5b9152b), [#74](https://github.com/holroydchase-afk/holroydchase-afk.github.io/pull/74)
- PS-Q2 [guard-written-after-the-bug] Third-party-host check missed case and quoting variants, rewritten on an HTML parser; HOME-7 had the same weakness for style tags. [31304d3](https://github.com/holroydchase-afk/holroydchase-afk.github.io/commit/31304d3), [9010c6d](https://github.com/holroydchase-afk/holroydchase-afk.github.io/commit/9010c6d), [#73](https://github.com/holroydchase-afk/holroydchase-afk.github.io/pull/73), [#74](https://github.com/holroydchase-afk/holroydchase-afk.github.io/pull/74)
- PS-Q3 [guard-written-after-the-bug] pm-tools Console passed its tests but CodeQL flagged routing lookup and unescape order; fixed after. [473c71b](https://github.com/holroydchase-afk/pm-tools/commit/473c71b), [29161e4](https://github.com/holroydchase-afk/pm-tools/commit/29161e4)
- PS-Q4 [tool-tests-missed-edge-cases] Demo roadmap Undo needed a second pass to restore position quietly after round 4 shipped it. [fdf46a5](https://github.com/holroydchase-afk/pm-tools/commit/fdf46a5), [92b095d](https://github.com/holroydchase-afk/pm-tools/commit/92b095d)
- PS-Q5 [tool-tests-missed-edge-cases] ux-rules passed its tests until qa-tdd review found 8 bugs (50% circles counted as radius, form controls as cards, verdict regex matched "No blocker"). [560dc5e](https://github.com/holroydchase-afk/studio-agents/commit/560dc5e)
- PS-Q6 [tool-tests-missed-edge-cases] story-keeper checker: 6 review findings (strict bullets, leaks outside the block, key shapes, relay). [cd13a90](https://github.com/holroydchase-afk/studio-agents/commit/cd13a90)
- PS-Q7 [tool-tests-missed-edge-cases] qa-tdd's own skip rule was too loose; tightened after review (QA-R1, QA-R2). [5b8df31](https://github.com/holroydchase-afk/studio-agents/commit/5b8df31)

Staff PM
- PS-S1 [built-then-cut] Large portrait built as v68, reverted next step because no 1600px photo exists. [e891dd8](https://github.com/holroydchase-afk/holroydchase-afk.github.io/commit/e891dd8), [aef7602](https://github.com/holroydchase-afk/holroydchase-afk.github.io/commit/aef7602)
- PS-S2 [built-then-cut] Studio and Studio Console pages built, then hidden. [5fd7b4f](https://github.com/holroydchase-afk/holroydchase-afk.github.io/commit/5fd7b4f), [1ee4b7c](https://github.com/holroydchase-afk/pm-tools/commit/1ee4b7c)
- PS-S3 [missing-criteria] Product plans carried dates, against Chase's no-dates rule; fixed in a later PR. [e2ca67b](https://github.com/holroydchase-afk/holroydchase-afk.github.io/commit/e2ca67b), [#71](https://github.com/holroydchase-afk/holroydchase-afk.github.io/pull/71)
- PS-S4 [thrash-and-reversal] Persona Twins card named and copy-edited, then renamed Stakeholder Twins days later. [c93ceb1](https://github.com/holroydchase-afk/holroydchase-afk.github.io/commit/c93ceb1), [8ad1e33](https://github.com/holroydchase-afk/holroydchase-afk.github.io/commit/8ad1e33)
- PS-S5 [thrash-and-reversal] Home work block, skill filter and chips reworked across #80 to #88 (single-select filter, three chips plus View all). [f136716](https://github.com/holroydchase-afk/holroydchase-afk.github.io/commit/f136716), [2f71fc1](https://github.com/holroydchase-afk/holroydchase-afk.github.io/commit/2f71fc1)
- PS-S6 [built-then-cut] Managed Agents recommended as the deploy target with a cost estimate, then not adopted (no paid API route). [03aed0f](https://github.com/holroydchase-afk/studio-agents/commit/03aed0f), [fce428d](https://github.com/holroydchase-afk/studio-agents/commit/fce428d)
- PS-S7 [built-then-cut] focus-coach shipped as an agent, moved out because it is a skill. [86528b7](https://github.com/holroydchase-afk/studio-agents/commit/86528b7)
- PS-S8 [missing-criteria] pm-tools HANDOFF carried stale portfolio facts until a sweep. [9505f7b](https://github.com/holroydchase-afk/pm-tools/commit/9505f7b)

All six products plus Product Studio's own repos and Cohort are in. For any new project, append a section in the same shape and update the tally.

## Scored runs

Scored by running the agent and a fresh grader as Claude Code subagents (no API key). Each run folder under `runs/` holds `results.json`, the generated `results.md` and the saved reports. Agent arm plus a small cross-lane arm (the other agent on the same case); no plain-session arm yet.

| Run | Phase | Result |
|---|---|---|
| 2026-11-22-dev-1 | dev, baseline | 3 of 9 |
| 2026-11-22-dev-2 | dev, after tuning | 7 of 9 |
| 2026-11-22-heldout-1 | held-out, scored once | 7 of 8 |
| 2026-11-22-heldout-2 | fresh held-out (27 batch-2 cases + 4 cross-lane runs), scored once | with agent 23 of 27 (qa-tdd 11 of 11, staff-pm 12 of 16); cross-lane 2 of 4 |
| 2026-11-22-heldout-3 | fresh held-out (20 batch-3 cases), scored once, Opus graders blind to arm | with agent 19 of 20 (qa-tdd 10 of 10, staff-pm 9 of 10); plain session 8 of 20 (qa-tdd 1 of 10, staff-pm 7 of 10); format-neutral re-grade of the qa-tdd reports: agent 10 of 10, plain 9 of 10 |
| 2026-11-22-batch5-dev | dev, 4 dossier staff-pm cases (fixture repo, two traps each), before tuning | agent 1 of 4; plain 0 of 4 (Opus graders blind to arm) |
| 2026-11-22-batch5-heldout | held-out, 6 staff-pm cases (4 dossier plus the 2 triage cases), scored once after tuning | agent 5 of 6; plain 3 of 6. Agent only passed 2 (console page, phone font); tied 3; both missed dream-roles. 6 cases, one run, author knew the traps; demo-criteria case weak (both arms read a real repo outside the sandbox) |
| 2026-11-22-batch6-dev | dev, 4 staff-pm cases built from real past misses (mined from product repos, not written by me) | agent 3 of 4; plain 1 of 4. Read while tuning |
| 2026-11-22-batch6-heldout | held-out, 5 real-miss cases, scored once after one tuning change | agent 0 of 5; plain 0 of 5. No lift shown. 5 cases, one run, graded by Opus blind to arm; sandbox repos were thin (several runs said so) |
| 2026-11-22-batch6-heldout-fullrepo | held-out re-run of 4 of the 5 cases with both arms on a full real-repo copy at the pre-miss commit | agent 1 of 4; plain 0 of 4 (thin-fixture run on the same 4: agent 0, plain 0). SDK case not rebuildable. Full repos changed some premises (feature already built), so not like-for-like |

### Batch 3 (unread held-out)

Batch 3 adds 20 more cases (10 qa-tdd in `qa-tdd-cases-batch3.mjs`, 10 staff-pm in `staff-pm-cases-batch3.mjs`), all `heldout`, now 30 qa-tdd and 34 staff-pm case folders. Each uses a miss id no earlier cases file uses (qa-tdd: CH-Q3, CK-Q2, CO-Q3, CO-Q2, PS-Q3, PS-Q4, PS-Q6, PS-Q7, ES-Q2, CK-Q3; staff-pm: CC-S1, CK-S2, CH-S5, ES-S1, CO-S1, ES-S2, PS-S1, PS-S6, HE-S2, HE-S1) and favours patterns with few or no cases so far. They were scored once in run 2026-11-22-heldout-3 and are now spent: the next change needs a new held-out set.

