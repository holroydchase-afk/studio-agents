# Agent misses: QA-TDD and Staff PM

Real misses collected from product projects (Chase, Nov 21 to 22). They are the seed for golden eval cases, the same way Energy Scanner's ES-R1..R68 seeded the UX agent evals. Nothing here is a scoring harness yet; that waits for the UX agent eval thread to finish, then reuses its approach (golden cases, fresh grader, held-out set, seeded repeatability, stale-report CI gate).

Rules for entries: one line each, a link to the PR or commit, no personal data. Nothing was filed as an issue upstream. IDs are `<PROJECT>-Q<n>` (QA-TDD) and `<PROJECT>-S<n>` (Staff PM). Pattern tags let us group cases into eval families.

## Tally

| Project | QA-TDD | Staff PM | Status |
|---|---|---|---|
| ccwatts | 5 | 5 | received |
| Role Radar | 9 | 7 (+2 no link) | received |
| Hearth | 6 | 8 | received |
| Cohort (persona-twins repo) | 4 | 5 | received |
| Energy Scanner | 0 | 0 | waiting |
| Charlie | 0 | 0 | waiting |
| Crew Clock | 0 | 0 | waiting |
| **Total** | **24** | **25 (+2)** | |

## Patterns so far

QA-TDD
- **date-clock**: test depends on today's date or timezone and the clock isn't pinned (CC-Q1, Q2, Q3; HE-Q3, Q4). Biggest family, 5 of 24.
- **real-device-gap**: passes in desktop Chrome or fresh browsers, breaks on iPhone Safari, returning visitors, CI fonts (CC-Q4; HE-Q1, Q2, Q5; RR-Q5).
- **flaky-or-wrong-timing**: races, load flakes, timing the tool instead of the app (RR-Q6, Q8; HE-Q6).
- **ci-environment-drift**: runner or image changed (RR-Q7), red main left unfixed (RR-Q9, HE-Q3).
- **matching-and-sorting-edges**: substring match, text-sorted dates, null input (RR-Q1, Q2, Q3).
- **privacy-leak-not-tested**: found by review, not tests (CC-Q5).
- **rename-and-coverage-gaps**: rename left a stale mention, feature with no tests, vacuous test that passes with its rule missing, promised findings left open (CO-Q1..Q4).
- **public-demo-shipped-with-defects** (RR-Q4).

Staff PM
- **missing-criteria**: spec lacks a case (failed load, Windows drive root, redirects, laptop view, phone first screen, rollback) (CC-S2, RR-S6, RR-S7, HE-S3, S4, S5, S6, CO-S4).
- **concurrent-work-collision**: spec overlaps in-flight or live work (CC-S1, RR-S5, CO-S5).
- **thrash-and-reversal**: shipped, then redone within days (RR-S2, S4, HE-S1, S7, S8, CO-S2, S3).
- **wrong-identity-detail**: license named a login, not the person (CO-S1).
- **ambiguous-wording-or-copy**: misread requirement or claim of what isn't true (CC-S4, S5; HE-S2).
- **overlong-page-or-ux-budget** (CC-S3).

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
- Lesson only (history rewritten, case not linkable): real-names leak, [fad2714](https://github.com/holroydchase-afk/hearth/commit/fad2714).

Staff PM
- HE-S1 [thrash-and-reversal] First Share screen read like a form (2/10), redone as the postcard. [PR 129](https://github.com/holroydchase-afk/hearth/pull/129)
- HE-S2 [ambiguous-wording-or-copy] "Autoselect" misread as pre-ticking the last group, reverted in the same PR. [PR 129](https://github.com/holroydchase-afk/hearth/pull/129)
- HE-S3 [missing-criteria] Easy view spec skipped the laptop demo; it enlarged the story panel. [PR 125](https://github.com/holroydchase-afk/hearth/pull/125)
- HE-S4 [missing-criteria] "New for you" counts only the first 20 posts (B18), still open, no test. [PR 111](https://github.com/holroydchase-afk/hearth/pull/111)
- HE-S5 [missing-criteria] Same spec never covered a failed feed load; last visit saved anyway (B17). [PR 111](https://github.com/holroydchase-afk/hearth/pull/111)
- HE-S6 [missing-criteria] Redesign removed Groups, Me and Help with no redirects; old links went blank (tests caught it before deploy). [PR 115](https://github.com/holroydchase-afk/hearth/pull/115)
- HE-S7 [thrash-and-reversal] Redesign swapped Atkinson for the phone font ([PR 114](https://github.com/holroydchase-afk/hearth/pull/114)), reversed six days later ([PR 146](https://github.com/holroydchase-afk/hearth/pull/146)).
- HE-S8 [thrash-and-reversal] Warm tan paper shipped, replaced next day by three themes. [PR 122](https://github.com/holroydchase-afk/hearth/pull/122)

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

## Still to collect

Energy Scanner, Charlie, Crew Clock. Append a section in the same shape and update the tally.
