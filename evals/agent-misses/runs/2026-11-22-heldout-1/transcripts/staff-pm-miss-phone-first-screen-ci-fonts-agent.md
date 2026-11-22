**Answer:** Spec the demo as a phone-first page. A recruiter opens the link on a phone, and the first screen (no scroll) has to show the top ranked roles with score and status, plainly labeled as sample data. CI layout tests only count as evidence if they run at phone width with pinned fonts. A test that passes on a desktop viewport with CI's fallback fonts proves nothing about what a recruiter sees.

The repo told me only two things: recruiters open portfolio links, and layout tests run in CI. I had no CLAUDE.md, HANDOFF.md, personas or anchors, so I am working from the task text alone. IDs use the planning scheme with the product code RR-.

**Bet:** A recruiter who opens the link on a phone understands within about 5 seconds what the tracker does. Proof: the first-screen criteria below pass in CI, plus one manual check on a real phone.

**Critical path (each step is about 1 session)**
1. RR-M1.1 Data and contract. Demo seed with about 8 made-up roles, each with a score from 0 to 100 and a status. The list is sorted by score descending, with ties broken by title. Done when RR-1 to RR-3 have failing tests written. (1 session)
2. RR-M1.2 Pin the CI environment. Self-host the page fonts (or use a system font stack) and have the layout test fail if the intended font did not load. Run Playwright at 390x844 and 360x740. Done when RR-6 and RR-7 are red against a deliberately wrong font. (1 session)
3. RR-M1.3 Build the page. Done when RR-1 to RR-8 are green 3x. (1 to 2 sessions)
4. RR-M1.4 Review. Do ux-reviewer on a real phone and privacy-security on the demo data. Done when there is no P0 or P1. (1 session)

**Acceptance criteria**
- RR-1 (auto): Given 390x844, when the page loads, then at least 3 ranked rows, each with a score and a status, are visible with no scroll.
- RR-2 (auto): Given the seed, when rendered, then rows are ordered by score descending, and each row has a status from a fixed set (for example New, Applied, Interview, Rejected).
- RR-3 (auto): Given any row, then the score is an integer from 0 to 100 and is shown next to its role title. Score is not conveyed by color alone (a number or label is always present).
- RR-4 (auto): Given the page, then a visible "Sample data, not real roles" label appears in the first screen.
- RR-5 (auto): Given a 360px width, then there is no horizontal scroll, and tap targets (any link, filter or row action) are at least 44px.
- RR-6 (auto): Given the CI run, then the test asserts that the document font is the self-hosted font (`document.fonts.check` passes and the computed family matches). If the font fails to load, the test fails rather than falling back silently.
- RR-7 (auto): Given a long role title or company name, when rendered at 360px, then it wraps or truncates with no overlap and no clipped score or status. Include a fixture with the longest plausible title.
- RR-8 (auto): Given the page, then it makes no network calls except to its own origin, with no analytics and no third-party font host.
- RR-9 (manual): Given a real phone on cellular, then the first screen renders legibly within about 3 seconds. Record the device and result.

**Not doing**
- Real roles, recruiter names, scores or any live data. The repo is public, so the demo uses made-up data only.
- Editing, adding roles, login, filters and sort controls. Read-only is enough for a recruiter.
- Desktop-specific layout polish beyond "does not break".
- Pixel-diff screenshot tests. They fail on font drift, which is the problem here; use the font assertion (RR-6) and geometry assertions instead.

**Biggest risk:** Layout tests pass in CI but do not reflect what a phone shows. They run on desktop-sized viewports with the CI runner's fallback fonts, and font metrics change text width and wrapping. Handled by RR-M1.2: pin the viewport and fonts, assert the font loaded, and add RR-9 as the one manual check on a real phone.

**Decisions for Chase**
- Font: self-host one font, or use the system font stack? I recommend the system stack. It is faster on a phone and removes CI font drift entirely, so RR-6 becomes trivial.
- Status vocabulary: I recommend 4 values (New, Applied, Interview, Rejected). OK?
- How many sample rows? I recommend 8, with the top 3 fitting on the first screen.

**Handoffs**
- qa-tdd → write the failing tests for RR-1 to RR-8 at 390x844 and 360x740, plus the font-loaded assertion → done when they are red for the right reasons, then green 3x after the build.
- engineer → build the page and seed after the tests exist → done when RR-1 to RR-8 pass.
- ux-reviewer → review the first screen on a real phone against the recruiter persona → done when there are no P0 or P1 findings.
- privacy-security → check the seed data and the page's network calls → done when RR-4 and RR-8 are confirmed and no real data is present.
- positioning → write the sample-data label and the page intro copy → done when the copy is approved by Chase.