Hi Chase, Staff PM here.

**Answer: no, don't shut the portfolio down.** Public repos with no license are not illegal; they default to "all rights reserved, viewable." The portfolio is the job-search asset. The risks below are fixable in about three sessions.

**Heads up:** I could only see your context pack, not the repos, so I did not run the scan. What follows is what to scan and my best-guess risks, not findings. Nothing here is legal advice.

**Goal fit:** serves "land a senior or staff PM job." A clean licensing story is a small plus to a hiring manager; a takedown notice or an AGPL surprise is a bigger minus.

**Call: reuse, don't build.** Use the standard license-checker tools per repo (for example `license-checker` for npm, `pip-licenses` for Python). No new tooling.

**Where I'd expect real exposure, in order:**
1. **Copyleft inside a demo.** The shared MLS messenger library behind Hearth and Crew Clock is, as I recall, AGPL. If the public Crew Clock demo ships it, AGPL needs source offered to demo users. Confirm per repo, and decide: comply, or swap it out of the demo.
2. **Role Radar and data sources.** Scraping job boards, SEC and Cboe data, and ZipRecruiter can breach terms of service even when the code is fine. Check each source's terms. Keep demos on sample data only.
3. **Images and fonts.** Energy Scanner samples need a recorded source and license (`samples/SOURCES.md`). Check fonts and icons on the portfolio site too.
4. **Missing LICENSE files.** ccwatts is MIT for code and CC BY 4.0 for the methodology. Other public repos should each get an explicit choice: MIT, or "all rights reserved, demo only."
5. **Third-party notices.** Any bundled library that requires attribution needs a notices file.
6. **Names.** Hearth, Charlie and Crew Clock may collide with existing trademarks. A quick search is enough for now.
7. **Employer and IP.** If you have a current employer or a signed IP clause, confirm side projects are clear. That is a lawyer or HR question, not something to scan.

**Next step:** qa-tdd runs the license scan across the public repos in one session (Chase's only job: reply to the one decision below). Output is one table: repo, license found, dependency issues, missing file. privacy-security then takes items 1 and 2.

**Not doing:** hiring a lawyer now (revisit if item 1 or 7 is a real hit), trademark filings, and relicensing anything before the scan.

**Biggest risk:** the AGPL question in item 1, handled in step M1.2.

**Decision for you:** may the scan add LICENSE files directly through PRs? My recommendation is yes: MIT for demo code, except where a dependency forces otherwise, and PRs merge on green with live-demo PRs waiting for your go.

```spec
verdict: needs-decision
bet: Chase and a hiring manager can see every public repo has a clear license and no unresolved copyleft or terms-of-service problem; it worked when the scan table has zero unresolved rows
step: M1.1 | License scan of all public repos into one table | table lists license, dependency issues and missing files per repo | 1 session
step: M1.2 | Resolve AGPL and data-source terms findings | each finding fixed or recorded as accepted | 1 session
step: M1.3 | Add LICENSE and notices files by PR | every public repo has a license file | 0.5 session
criterion: LIC-1 | auto | Given each public repo, when the scan runs, then every repo shows a license value of 1 or more files, or is flagged missing
criterion: LIC-2 | auto | Given a dependency with "AGPL" in its license, when the scan runs, then it is flagged "copyleft" in the table
criterion: LIC-3 | manual | Open the scan table -> each of the 3 data sources (job boards, SEC, Cboe) has a terms verdict
criterion: LIC-4 | manual | Given a signed-out visitor and a different user on a public repo page, then the LICENSE file is visible to both, 2 of 2
cut: Lawyer review | wait for a real copyleft or employer-IP hit
cut: Trademark filings | not on the critical path to a job
risk: AGPL library shipped in a public demo | M1.2
risk: Scraping terms breached by Role Radar | LIC-3
decision: May the scan add LICENSE files by PR | yes, MIT for demo code unless a dependency forces otherwise
handoff: qa-tdd | failing test for LIC-1 and LIC-2, then the scan | table complete, tests green 3x
handoff: privacy-security | review AGPL and data-source terms | each finding fixed or accepted in writing
```

lint-ok: SL-3 license files are added by PR; rollback is reverting the merge commit
