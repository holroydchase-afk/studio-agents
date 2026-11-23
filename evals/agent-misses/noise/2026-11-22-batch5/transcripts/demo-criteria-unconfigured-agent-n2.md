# Demo Criteria screen

Answer: Ship the Criteria screen in the demo with a bundled, made-up sample criteria set that the visitor can edit and re-score against sample roles, saved only in their browser. Without it the demo opens on an unconfigured empty screen and a recruiter sees nothing to try. Not ready to build blind: the repo notes say nothing about the criteria file format, so the first step reads it.

Stale or missing from the notes (I read only what the ask gave me; no repo files): format of the criteria file, whether the demo build already has a storage layer, in-flight PRs. Step M1.1 lists them from the repo before any build.

Critical path
1. M1.1 Read-the-repo pass (0.5 session): list in-flight PRs, the criteria file schema, the demo's current Criteria screen state and any "unconfigured" copy. Done when the list is in HANDOFF.
2. M1.2 Sample criteria set (0.5 session): made-up, labeled "Sample", unrelated to the owner's real file. Done when DEMO-1 and DEMO-7 are green.
3. M1.3 Demo loads sample criteria, edits stay in the browser, roles re-score (1 session). Done when DEMO-2 to DEMO-6 are green 3x.
4. M1.4 Real-page regression (0.5 session): the real page still reads the private file and is byte-identical in behaviour. Done when DEMO-8 is green.
5. M1.5 First real run of the real page on Chase's machine with his private file (0.5 session). Done when his Criteria screen shows his file.
6. M1.6 Public-side check after merge (0.5 session): open the built demo, check the Criteria screen, intro line, portfolio card and HANDOFF status. Done when DEMO-9 is signed off by Chase.

Rollback: revert the merge commit and republish the previous demo build; the real page is untouched, so nothing to undo there. Samples-only note: the sample data has no real criteria file, so the real page's first run after the change (M1.5, on the owner's machine, which the demo cannot reach) is a named step; the samples lack a real private file with the owner's actual values and any malformed real entries.

Not doing: a criteria import or upload (a visitor's own data would be a privacy risk), accounts or sharing of criteria, a server-side save, scoring changes, new sample roles beyond what the current demo has.

Biggest risk: the demo runs only on saved sample data, so a green demo says nothing about the real page reading the real file, and the sample criteria could leak the owner's real preferences. Handled by DEMO-7 (scan) and DEMO-8 (real-page regression, which Chase checks on the live page after republish; merging is not deploying).

Feedback loop (trap 1): the demo re-scores roles, so a criteria change changes ranks. DEMO-5 gives one worked example with real numbers, and DEMO-6 covers reset. The real page's existing rules stay as they are; the old "criteria file not found" text is made stale in the demo only.

Decisions for Chase
- Where do demo edits live: browser storage only (recommended) or in-memory per visit.
- Does the Criteria screen in the demo show the raw file text or a form (recommended: whatever the real page shows, so the recruiter sees the real thing).
- Merge: this changes the public demo, so it waits for Chase's go and the open PRs listed in merge order.

Handoffs: qa-tdd writes the failing tests; engineer builds; ux-reviewer checks the Criteria screen in showcase mode; privacy-security scans the sample set and the diff; positioning only if the demo intro copy changes.

```spec
verdict: ready
bet: A recruiter opening the public demo can open the Criteria screen, change a weight, and watch sample roles re-rank; it worked when the Criteria screen shows sample criteria and not an empty or unconfigured state, and a changed weight reorders at least one sample role
step: M1.1 | Read the repo: criteria schema, in-flight PRs, current demo Criteria state | list recorded in HANDOFF | 0.5 session
step: M1.2 | Bundled made-up sample criteria set labeled Sample | DEMO-1 and DEMO-7 green | 0.5 session
step: M1.3 | Demo loads sample criteria, edits saved in the browser only, roles re-score | DEMO-2 to DEMO-6 green 3x | 1 session
step: M1.4 | Real page regression: private criteria file path unchanged | DEMO-8 green | 0.5 session
step: M1.5 | First real run of the real page on Chase's own machine with his private criteria file, after the change | Criteria screen shows his file and DEMO-8 holds | 0.5 session
step: M1.6 | Public side check after Chase merges and republishes | DEMO-9 signed off | 0.5 session
criterion: DEMO-1 | auto | Given the demo build with no criteria file, when the Criteria screen opens, then it shows the bundled sample set with 5 criteria and a visible "Sample data" label, and not an unconfigured or empty message
criterion: DEMO-2 | auto | Given the sample set, when the visitor changes the weight of the first criterion from 20 to 40 and saves, then the screen shows 40 and no network request is made
criterion: DEMO-3 | auto | Given a saved edit and a page reload, when the Criteria screen reopens, then it shows 40; given browser storage is blocked, then the edit still shows 40 until reload and a note says "Not saved"
criterion: DEMO-4 | auto | Given criteria text the parser rejects (for example an empty file or a missing weight), when the visitor saves, then the screen shows an inline error naming line 1, the previous 5 valid criteria stay in force, and all sample roles stay listed
criterion: DEMO-5 | auto | Given a pinned sample role scored 70 with weight 20, when the weight changes to 40 and the role matches that criterion, then the role re-scores using the real scoring function to a new value between 0 and 100 that the test states as an exact number, and the roles list re-sorts by that score
criterion: DEMO-6 | auto | Given edits made, when the visitor presses "Reset to sample" twice in a row, then the criteria equal the bundled set and the second press changes nothing
criterion: DEMO-7 | auto | Given the repo diff and demo bundle, when the privacy scan runs, then it finds 0 matches for the owner's real criteria values, personal names, email addresses or ids, and every sample company and role is made up and labeled
criterion: DEMO-8 | auto | Given the real page build with a criteria file present, when it loads, then it reads that file exactly as before, never loads the sample set, and the existing test suite passes with 0 changed tests
criterion: DEMO-9 | manual | Open the built demo on a small phone and on desktop -> the Criteria screen shows 5 sample criteria, an edit re-ranks the roles, and the intro line, portfolio card and HANDOFF status all describe the demo as running on sample data, with every claim checked against the released demo version
criterion: DEMO-10 | auto | Given a signed-out visitor or any non-owner opening the demo, when the Criteria screen and its network log are inspected, then 0 requests leave the page, no owner criteria value appears, and the sample label is shown
criterion: DEMO-11 | manual | Open the demo Criteria screen at 360px by 640px -> the sample set and the first edit control fit within 2 screens tall and no text is cut off, and each claim in the demo intro and portfolio card matches the built demo
cut: Criteria import or upload | a visitor's own data is a privacy risk and is not needed to prove the bet
cut: Server-side save or sharing criteria | the demo has no backend and keeps data in the visitor's browser only
cut: New scoring rules or extra sample roles | not needed to let a recruiter try the screen
risk: Demo is only tested on saved sample data, so the real page could regress or sample criteria could leak real preferences | DEMO-8
risk: Real page never run on the real file after the change | M1.5
risk: Sample set accidentally copies the owner's real criteria | DEMO-7
decision: Where do demo edits live | Browser storage only with an in-memory fallback, since the demo has no backend
decision: Merge timing | Hold the merge for Chase's go and list open PRs in merge order, since it changes the public demo
handoff: qa-tdd | failing tests for DEMO-1 to DEMO-8 and DEMO-10 | red for the right reason
handoff: engineer | build M1.2 and M1.3 | DEMO-1 to DEMO-8 green 3x
handoff: ux-reviewer | review the demo Criteria screen in showcase mode | no P0 or P1
handoff: privacy-security | scan sample set and diff | no findings at P0 or P1
```

lint-ok: SL-7 DEMO-9 and DEMO-11 check each intro and card claim against the built demo version
