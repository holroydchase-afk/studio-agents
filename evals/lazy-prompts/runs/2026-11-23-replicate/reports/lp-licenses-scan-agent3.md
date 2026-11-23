No, don't shut the portfolio down. Licenses are a labeling and hygiene job, not a reason to take it offline. I have not scanned the repos yet (I can only see this brief), so everything below is what I'd check, not a finding.

**Goal fit:** serves landing the PM job. A live portfolio is the asset; a license table is also a small "I think about this" signal for recruiters.

**Buy, reuse, build or skip:** reuse. No lawyer, no paid scanner. Use the free `license-checker`/`pip-licenses` style tools plus a one-page table. Build nothing new.

**What actually carries risk (in order):**
1. **AGPL in the shared messenger.** `@holroyd/messenger` is AGPL-3.0-or-later, and Crew Clock bundles it in `js/vendor/` (Hearth uses it too). AGPL is fine for public source, but Crew Clock and the demo must then ship AGPL-compatible terms and a source/license notice. Right now I don't know Crew Clock's own license. This is the one real item.
2. **Public repos with no LICENSE file.** Default is all rights reserved: safe for you, but unclear to a recruiter who clones it. ccwatts is already set (MIT code, CC BY 4.0 methodology). The others likely aren't.
3. **Third-party code in the demos.** Pyodide (Charlie), Expo/React Native (Hearth), MLS libs, fonts. Mostly MIT/MPL/Apache, but each needs a notice file where required.
4. **Sample images and data.** Energy Scanner's rule already says source plus license in `samples/SOURCES.md`; verify it's complete. Charlie and Crew Clock samples must be fictional.
5. **Names.** "Claude", "Munger"-style framing in Charlie, and any Cboe/SEC data terms. Claims must stay paper-only and "not financial advice" as written.

**Critical path**
1. M1.1: privacy-security scans all 9 repos (license file, dependency licenses, vendored code, sample assets), writes one table. Done when every repo has a row. 1 session.
2. M1.2: one PR per repo adding a missing LICENSE and THIRD-PARTY notices, using your decision below. Done when each repo's license matches its dependencies. 1 session.
3. M1.3: portfolio footer links the table. This touches the live site, so it waits for your go. 0.5 session.

**Not doing:** a lawyer review, trademark filings, relicensing Hearth's app code, dependency replacement. Reason: none move the job search; revisit only if Hearth goes beyond the family beta.

**Biggest risk:** the AGPL code inside Crew Clock quietly forcing license terms you didn't choose. Handled by M1.1 first.

**Decision for you (one word):** default license for repos with none, MIT or leave all-rights-reserved? I recommend **MIT** for demo and tool repos, keep AGPL on the messenger, and keep Hearth's app private-ish (no license) until you decide on its future.

I am not a lawyer; this is a hygiene pass, not legal advice.

**Rollback:** each PR is docs and license files only; revert the merge commit. The footer link (M1.3) is removed the same way and redeployed with your go.
**Stale once done:** each repo's README license line, the portfolio footer and the THIRD-PARTY notices; M1.2 updates them in the same PR, and a check confirms the README license name matches the LICENSE file.
lint-ok: SL-6 no sign-in or owner-only behavior changes; this only adds license files and notices
lint-ok: SL-7 no released-version claims change; LIC-5 checks README against LICENSE
lint-ok: SL-8 stale artifacts are listed in the Stale once done line above
lint-ok: SL-4 no new phone screen; the footer link is one line

**Handoffs:** privacy-security runs the scan (table of 9 rows); qa-tdd adds a check that each repo has a LICENSE; engineer opens the per-repo PRs; positioning words the footer.

```spec
verdict: needs-decision
bet: Chase keeps a live portfolio that a recruiter or contributor can clone without license doubt; it worked when all 9 repos show a license row with no conflicts
step: M1.1 | Scan 9 repos and write the license table | every repo has a row | 1 session
step: M1.2 | One PR per repo adds LICENSE and third-party notices | each repo license matches its dependencies | 1 session
step: M1.3 | Link the table from the portfolio footer | footer link resolves after Chase's go | 0.5 session
criterion: LIC-1 | auto | Given each of the 9 repos, when the check runs, then 9 of 9 have a LICENSE file
criterion: LIC-2 | auto | Given Crew Clock vendors the AGPL messenger bundle, when the check runs, then a notice names "AGPL-3.0-or-later"
criterion: LIC-4 | auto | Given a repo with an empty or missing dependency list, when the scan runs, then it reports 0 dependencies and still lists the repo's own license
criterion: LIC-5 | auto | Given each README license line, when the check runs, then it matches the LICENSE file name in 9 of 9 repos
criterion: LIC-3 | manual | Open the portfolio footer on a phone -> the license table link opens and lists 9 rows
cut: Lawyer review | no live revenue or outside users yet
cut: Relicensing Hearth app | not on the job-search path
risk: AGPL terms leaking into Crew Clock | M1.1
decision: Default license for repos with none | MIT, keep AGPL on the messenger
handoff: privacy-security | scan 9 repos and write the table | every repo has a row
handoff: qa-tdd | failing check for LIC-1 and LIC-2 | red for the right reason
handoff: engineer | per-repo LICENSE and notice PRs | LIC-1 green 3x
```
