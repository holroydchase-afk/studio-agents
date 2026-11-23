# Spec: public demo, Criteria screen (Role Radar)

Source: /home/user/role-radar (read only; nothing in that repo was changed).

## Correction to the brief
The brief says the demo has no criteria file. The repo says otherwise:
- `demo/seed.json` has `meta.criteria.spec = "@file:criteria.yaml"`. `scripts/build-demo.mjs` (line 16) swaps that marker for the repo's `criteria.yaml` text when it builds the demo.
- `criteria.yaml` is a fictional "Demo Candidate" file (`owner: Demo Candidate`, `demo: true`). It is not the owner's private file. The private one lives only in the live app's database.
- `tests/demo.test.ts` already asserts the built demo contains `owner: Demo Candidate`.
- `scripts/build-demo.mjs` also inlines js-yaml in the public build, so the Criteria tab does not depend on a CDN.

So the demo already has criteria, and the Criteria screen already works. The page has a separate "no criteria saved yet" state (`renderCriteria`, `app/role-radar.html` ~line 1715): an empty editor with a "Start from the example" button. A recruiter should not see that state in the demo. I have not run the built demo to confirm either state in a browser.

## Goal
A recruiter opens the public demo, goes to Criteria, changes something, and sees the ranking change. No real data, no saving anywhere permanent.

## Spec

**D1. Demo always starts with sample criteria loaded.**
The seed keeps `@file:criteria.yaml`. The build fails if that file is missing or does not parse. Do not ship the demo without it.

**D2. The empty-state fallback must never show in the demo.**
If criteria go missing (seed edited wrongly, reset glitch), the demo falls back to the example text and does not show the blank editor. The blank "No criteria yet" state stays for real installs only.

**D3. The screen is labeled as a sample.**
The card names the candidate as "Demo Candidate (sample)". The existing demo bar covers "made-up data"; Criteria adds one line: "Sample criteria for a made-up candidate. Edit anything; it resets when you reload."

**D4. What a recruiter can do.** These all exist today; each is a check in the acceptance list.
- Search settings card: pay slider, level chips, sector weights, home state, min score, digest size.
- Digest preview re-ranks live as a setting changes (README shows fintech weight 1 to 3 moving a checkout role to the top).
- Scoring and Alerts cards read as plain sentences, using a fixed 9:00 demo clock.
- Advanced: edit as text, with Save and Discard.

**D5. Saving stays in memory.**
Save writes to the in-page fake database only (`demo/mock-claude.js`). No network, no storage that survives a reload, and no scan is triggered. The Save confirmation says "Saved for this visit."

**D6. Private-data guard.**
Criteria text in the demo must pass `npm run check:private`. No real company lists or pay numbers, and the `dream:` block uses made-up names (per RR-DREAM). Chase's real criteria values never enter this repo.

**D7. Open decision, not mine to settle.**
RR-DEMO-1 (queued) plans to swap fictional companies for real ones with invented postings. If that happens, the sample criteria's sector and company names need the same privacy-security pass and new "invented roles" wording. Ask Chase before the next demo publish.

## Acceptance tests (qa-tdd writes red first, in `tests/showcase.test.ts` style)
1. Built public demo: Criteria tab shows the Search settings card, not the "No criteria yet" editor.
2. Moving the pay slider or a sector weight changes the Digest preview order; the fake db write count stays 0 until Save.
3. Save keeps the change for the visit and reload resets it.
4. Seed with `criteria` removed: the build errors, or the page loads the example (per D2). One of the two, tested.
5. Sample label (D3) is visible at 390x844 without scrolling sideways, and targets are at least 48px.
6. `check:private` passes on the built demo.

## Out of scope
Live page and live criteria, the scan, plugin and MCP, README screenshots (not regenerated since the RR-DS restyle).

## Gates
This changes the public demo, so the PR waits for Chase's go. The `Agents:` line needs qa-tdd (code change), plus ux-reviewer and privacy-security (public demo). HANDOFF.md updates in the same PR.
